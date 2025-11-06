#!/usr/bin/env node
/**
 * Figma Webhook Server
 * 
 * Automatically receives processed creatives from Apify and triggers Figma plugin
 * 
 * Setup:
 * 1. Run this server: node figma-webhook-server.js
 * 2. Configure Apify webhook to POST to: http://your-server:3000/webhook
 * 3. Plugin will auto-load new creatives
 */

import express from 'express';
import cors from 'cors';
import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.WEBHOOK_PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Apify client
const client = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});

// Store latest creatives for Figma plugin to fetch
let latestCreatives = null;
let latestRunId = null;

/**
 * Webhook endpoint - receives notification from Apify
 */
app.post('/webhook', async (req, res) => {
    try {
        console.log('📥 Received webhook from Apify');
        
        const { resource } = req.body;
        
        if (!resource || !resource.defaultDatasetId) {
            return res.status(400).json({ error: 'Invalid webhook payload' });
        }
        
        const runId = resource.id;
        const datasetId = resource.defaultDatasetId;
        const status = resource.status;
        
        console.log(`🔄 Run ${runId} status: ${status}`);
        
        if (status !== 'SUCCEEDED') {
            console.log('⏭️  Skipping non-successful run');
            return res.json({ message: 'Skipped non-successful run' });
        }
        
        // Fetch dataset
        console.log(`📊 Fetching dataset ${datasetId}...`);
        const dataset = await client.dataset(datasetId).listItems();
        const items = dataset.items;
        
        if (items.length === 0) {
            console.log('⚠️  Dataset is empty');
            return res.json({ message: 'Empty dataset' });
        }
        
        // Store for Figma plugin
        latestCreatives = items;
        latestRunId = runId;
        
        // Also save to file for manual use
        const exportPath = 'figma-export-latest.json';
        await fs.writeFile(exportPath, JSON.stringify(items, null, 2));
        
        console.log(`✅ Processed ${items.length} creatives`);
        console.log(`📄 Saved to ${exportPath}`);
        console.log(`🎨 Ready for Figma! Run ID: ${runId}`);
        
        res.json({
            success: true,
            runId,
            creativesCount: items.length,
            message: 'Creatives ready for Figma'
        });
        
    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Endpoint for Figma plugin to fetch latest creatives
 */
app.get('/latest-creatives', (req, res) => {
    if (!latestCreatives) {
        return res.status(404).json({ 
            error: 'No creatives available yet',
            message: 'Run Apify Actor first'
        });
    }
    
    res.json({
        runId: latestRunId,
        creatives: latestCreatives,
        timestamp: new Date().toISOString()
    });
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        hasCreatives: !!latestCreatives,
        creativesCount: latestCreatives ? latestCreatives.length : 0,
        latestRunId
    });
});

/**
 * Manual trigger - load from Apify Run ID
 */
app.post('/load-from-run', async (req, res) => {
    try {
        const { runId } = req.body;
        
        if (!runId) {
            return res.status(400).json({ error: 'runId required' });
        }
        
        console.log(`📥 Manual load from run ${runId}`);
        
        const run = await client.run(runId).get();
        const datasetId = run.defaultDatasetId;
        
        const dataset = await client.dataset(datasetId).listItems();
        const items = dataset.items;
        
        latestCreatives = items;
        latestRunId = runId;
        
        // Save to file
        const exportPath = 'figma-export-latest.json';
        await fs.writeFile(exportPath, JSON.stringify(items, null, 2));
        
        console.log(`✅ Loaded ${items.length} creatives`);
        
        res.json({
            success: true,
            runId,
            creativesCount: items.length
        });
        
    } catch (error) {
        console.error('❌ Load error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 Figma Webhook Server started!');
    console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook`);
    console.log(`🎨 Figma endpoint: http://localhost:${PORT}/latest-creatives`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health\n`);
    console.log('💡 Configure Apify webhook to POST to the webhook URL above');
});

export default app;


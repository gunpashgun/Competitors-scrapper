#!/usr/bin/env node
/**
 * Apify to Figma Automation Script
 * 
 * Automatically creates creatives in Figma from Apify Dataset
 * Uses Figma REST API to bypass plugin limitations
 * 
 * Usage:
 *   node apify-to-figma.js --dataset-id <id>
 *   node apify-to-figma.js --run-id <id>
 *   node apify-to-figma.js --json dataset.json
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;

// Configuration
const FIGMA_TOKEN = process.env.FIGMA_ACCESS_TOKEN;
const FIGMA_FILE_ID = process.env.FIGMA_FILE_ID || 'YOUR_FILE_ID';
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

if (!FIGMA_TOKEN) {
  console.error('❌ Error: FIGMA_ACCESS_TOKEN not found in .env');
  process.exit(1);
}

// Figma API client
const figmaApi = axios.create({
  baseURL: 'https://api.figma.com/v1',
  headers: {
    'X-Figma-Token': FIGMA_TOKEN
  }
});

// Apify API client
const apifyApi = APIFY_TOKEN ? axios.create({
  baseURL: 'https://api.apify.com/v2',
  headers: {
    'Authorization': `Bearer ${APIFY_TOKEN}`
  }
}) : null;

/**
 * Load dataset from various sources
 */
async function loadDataset(options) {
  const { datasetId, runId, jsonFile } = options;
  
  if (jsonFile) {
    console.log(`📂 Loading from file: ${jsonFile}`);
    const content = await fs.readFile(jsonFile, 'utf-8');
    return JSON.parse(content);
  }
  
  if (!apifyApi) {
    console.error('❌ Error: APIFY_API_TOKEN not found in .env');
    console.log('💡 Add APIFY_API_TOKEN to .env or use --json flag');
    process.exit(1);
  }
  
  if (runId) {
    console.log(`🔄 Loading from Run ID: ${runId}`);
    const runResponse = await apifyApi.get(`/actor-runs/${runId}`);
    const run = runResponse.data.data;
    const defaultDatasetId = run.defaultDatasetId;
    
    const datasetResponse = await apifyApi.get(`/datasets/${defaultDatasetId}/items`);
    return datasetResponse.data;
  }
  
  if (datasetId) {
    console.log(`📊 Loading from Dataset ID: ${datasetId}`);
    const response = await apifyApi.get(`/datasets/${datasetId}/items`);
    return response.data;
  }
  
  throw new Error('Please provide --dataset-id, --run-id, or --json');
}

/**
 * Upload image to Figma
 */
async function uploadImageToFigma(base64Image) {
  // Figma API doesn't have direct image upload
  // We'll use base64 data URLs in the nodes instead
  return `data:image/png;base64,${base64Image}`;
}

/**
 * Generate Figma nodes for a creative
 */
function generateCreativeNodes(data, xOffset = 0, yOffset = 0) {
  const { layoutData } = data;
  const width = layoutData.originalDimensions?.width || 720;
  const height = layoutData.originalDimensions?.height || 1280;
  
  const nodes = [];
  
  // Main frame
  const frameId = `creative-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  nodes.push({
    id: frameId,
    name: `Creative ${width}x${height}`,
    type: 'FRAME',
    x: xOffset,
    y: yOffset,
    width: width,
    height: height,
    clipsContent: true,
    fills: [],
    children: []
  });
  
  // Background image - will be added via image fills API
  // Note: Figma REST API has limitations with image uploads
  // For now, we'll create a placeholder
  
  return nodes;
}

/**
 * Create creatives in Figma via REST API
 */
async function createCreativesInFigma(dataset, options = {}) {
  const { columns = 2, spacing = 100 } = options;
  
  console.log('\n🎨 Creating creatives in Figma...');
  console.log(`📐 Grid: ${columns} columns, ${spacing}px spacing`);
  console.log(`📊 Total creatives: ${dataset.length}\n`);
  
  // Get file structure
  const fileResponse = await figmaApi.get(`/files/${FIGMA_FILE_ID}`);
  const file = fileResponse.data;
  
  console.log(`📄 File: ${file.name}`);
  console.log(`📄 File ID: ${FIGMA_FILE_ID}`);
  
  // Find the first page
  const pages = file.document.children.filter(node => node.type === 'CANVAS');
  if (pages.length === 0) {
    throw new Error('No pages found in Figma file');
  }
  
  const targetPage = pages[0];
  console.log(`📄 Target page: ${targetPage.name}`);
  
  // IMPORTANT: Figma REST API has read-only access for most operations
  // Writing nodes requires Figma Plugin API or manual actions
  
  console.log('\n⚠️  IMPORTANT LIMITATION:');
  console.log('Figma REST API is mostly read-only.');
  console.log('To create nodes, we have two options:\n');
  console.log('1. Use Figma Plugin (current batch plugin)');
  console.log('2. Use Figma\'s Web API (requires authentication flow)\n');
  
  // Export dataset for plugin use
  const exportPath = 'figma-export-dataset.json';
  await fs.writeFile(exportPath, JSON.stringify(dataset, null, 2));
  
  console.log(`✅ Dataset exported to: ${exportPath}`);
  console.log('\n📋 Next steps:');
  console.log('1. Open your Figma file');
  console.log('2. Run the Batch Creative Generator plugin');
  console.log(`3. Load the exported JSON: ${exportPath}\n`);
  
  return {
    exported: exportPath,
    fileId: FIGMA_FILE_ID,
    dataset: dataset
  };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dataset-id') {
      options.datasetId = args[++i];
    } else if (args[i] === '--run-id') {
      options.runId = args[++i];
    } else if (args[i] === '--json') {
      options.jsonFile = args[++i];
    } else if (args[i] === '--file-id') {
      process.env.FIGMA_FILE_ID = args[++i];
    } else if (args[i] === '--columns') {
      options.columns = parseInt(args[++i]);
    } else if (args[i] === '--spacing') {
      options.spacing = parseInt(args[++i]);
    }
  }
  
  if (!options.datasetId && !options.runId && !options.jsonFile) {
    console.log('📖 Usage:');
    console.log('  node apify-to-figma.js --dataset-id <id>');
    console.log('  node apify-to-figma.js --run-id <id>');
    console.log('  node apify-to-figma.js --json dataset.json');
    console.log('\nOptions:');
    console.log('  --file-id <id>     Figma file ID (or set FIGMA_FILE_ID in .env)');
    console.log('  --columns <n>      Grid columns (default: 2)');
    console.log('  --spacing <px>     Grid spacing (default: 100)');
    process.exit(0);
  }
  
  try {
    // Load dataset
    const dataset = await loadDataset(options);
    console.log(`✅ Loaded ${dataset.length} creatives\n`);
    
    // Validate dataset
    for (let i = 0; i < dataset.length; i++) {
      const item = dataset[i];
      if (!item.cleanImageBase64 || !item.layoutData) {
        console.error(`❌ Error: Item ${i + 1} missing required fields`);
        process.exit(1);
      }
    }
    
    // Create in Figma
    const result = await createCreativesInFigma(dataset, {
      columns: options.columns,
      spacing: options.spacing
    });
    
    console.log('🎉 Done!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { loadDataset, createCreativesInFigma };


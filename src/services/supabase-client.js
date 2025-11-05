import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import fetch from 'node-fetch';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export class SupabaseService {
    /**
     * Create a new creative record
     */
    static async createCreative(data) {
        const { data: creative, error } = await supabase
            .from('creatives')
            .insert({
                competitor_name: data.competitorName,
                original_image_url: data.originalImageUrl,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;
        return creative;
    }

    /**
     * Update creative status and data
     */
    static async updateCreative(id, updates) {
        const { data, error } = await supabase
            .from('creatives')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Upload image to Supabase Storage
     */
    static async uploadImage(file, folder = 'generated') {
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
        
        let fileBuffer;
        if (typeof file === 'string' && file.startsWith('http')) {
            // Download from URL
            const response = await fetch(file);
            fileBuffer = Buffer.from(await response.arrayBuffer());
        } else if (typeof file === 'string') {
            // Local file path
            fileBuffer = fs.readFileSync(file);
        } else {
            // Already a buffer
            fileBuffer = file;
        }

        const { data, error } = await supabase.storage
            .from('generated-creatives')
            .upload(fileName, fileBuffer, {
                contentType: 'image/png',
                upsert: false
            });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('generated-creatives')
            .getPublicUrl(fileName);

        return publicUrl;
    }

    /**
     * Get creative by ID
     */
    static async getCreative(id) {
        const { data, error } = await supabase
            .from('creatives')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Get all creatives with optional filters
     */
    static async getCreatives(filters = {}) {
        let query = supabase
            .from('creatives')
            .select('*')
            .order('created_at', { ascending: false });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.competitorName) {
            query = query.eq('competitor_name', filters.competitorName);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data;
    }

    /**
     * Delete creative
     */
    static async deleteCreative(id) {
        const creative = await this.getCreative(id);

        // Delete associated files from storage
        const urlsToDelete = [
            creative.generated_character_url,
            creative.generated_background_url,
            creative.generated_image_url
        ].filter(Boolean);

        for (const url of urlsToDelete) {
            const path = url.split('/generated-creatives/')[1];
            if (path) {
                await supabase.storage
                    .from('generated-creatives')
                    .remove([path]);
            }
        }

        // Delete record
        const { error } = await supabase
            .from('creatives')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
}

export default SupabaseService;


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sql = `
CREATE TABLE IF NOT EXISTS public.creatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_name TEXT,
    original_image_url TEXT NOT NULL,
    analysis JSONB,
    generated_character_url TEXT,
    generated_background_url TEXT,
    generated_image_url TEXT,
    figma_file_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'generating', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creatives_status ON public.creatives(status);
CREATE INDEX IF NOT EXISTS idx_creatives_created_at ON public.creatives(created_at DESC);
`;

console.log('🔧 Creating table via REST API...\n');

// Try using Supabase REST API directly
const url = `${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`;

fetch(url, {
    method: 'POST',
    headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    },
    body: JSON.stringify({ sql })
})
.then(res => {
    console.log('Status:', res.status);
    return res.text();
})
.then(text => {
    console.log('Response:', text);
    if (text.includes('error') || text.includes('Could not find')) {
        console.log('\n❌ RPC не доступен. Создайте таблицу вручную:');
        console.log('\n1. Откройте: https://supabase.com/dashboard/project/' + process.env.SUPABASE_URL.split('//')[1].split('.')[0]);
        console.log('2. SQL Editor → New Query');
        console.log('3. Вставьте SQL из CREATE_TABLE.sql');
        console.log('4. Run');
    } else {
        console.log('\n✅ Table created successfully!');
    }
})
.catch(err => {
    console.error('❌ Error:', err.message);
    console.log('\nСоздайте таблицу вручную через Supabase Dashboard');
});


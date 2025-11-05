-- Create creatives table in Supabase
-- Run this SQL in Supabase Dashboard → SQL Editor

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_creatives_status ON public.creatives(status);
CREATE INDEX IF NOT EXISTS idx_creatives_created_at ON public.creatives(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Enable all operations for service role"
ON public.creatives
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.creatives TO service_role;


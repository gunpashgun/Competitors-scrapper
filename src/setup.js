import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupDatabase() {
    console.log(chalk.blue('🔧 Setting up Supabase database...'));

    // Create creatives table
    const { error: tableError } = await supabase.rpc('exec_sql', {
        sql: `
            CREATE TABLE IF NOT EXISTS creatives (
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

            CREATE INDEX IF NOT EXISTS idx_creatives_status ON creatives(status);
            CREATE INDEX IF NOT EXISTS idx_creatives_created_at ON creatives(created_at DESC);
        `
    });

    if (tableError && !tableError.message.includes('already exists')) {
        console.error(chalk.red('❌ Error creating table:'), tableError);
    } else {
        console.log(chalk.green('✅ Table "creatives" created/verified'));
    }

    // Create storage bucket
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'generated-creatives');

    if (!bucketExists) {
        const { error: bucketError } = await supabase.storage.createBucket('generated-creatives', {
            public: true,
            fileSizeLimit: 10485760 // 10MB
        });

        if (bucketError) {
            console.error(chalk.red('❌ Error creating bucket:'), bucketError);
        } else {
            console.log(chalk.green('✅ Storage bucket "generated-creatives" created'));
        }
    } else {
        console.log(chalk.green('✅ Storage bucket "generated-creatives" already exists'));
    }

    console.log(chalk.blue('\n📋 Setup Summary:'));
    console.log(chalk.white('  • Database URL:'), process.env.SUPABASE_URL);
    console.log(chalk.white('  • Table: creatives'));
    console.log(chalk.white('  • Storage: generated-creatives'));
    console.log(chalk.green('\n✨ Setup completed!\n'));
}

setupDatabase().catch(console.error);


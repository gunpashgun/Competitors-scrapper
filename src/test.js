import { CreativeGenerator } from './index.js';
import { SupabaseService } from './services/supabase-client.js';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test script to verify all components
 */
async function runTests() {
    console.log(chalk.bold.blue('\n🧪 Running Creative Generator Tests\n'));

    // Test 1: Supabase Connection
    console.log(chalk.yellow('Test 1: Supabase Connection'));
    try {
        const testCreative = await SupabaseService.createCreative({
            competitorName: 'Test Competitor',
            originalImageUrl: 'https://example.com/test.jpg'
        });
        console.log(chalk.green('✅ Supabase connection successful'));
        console.log(chalk.gray(`   Created test record: ${testCreative.id}`));
        
        // Clean up
        await SupabaseService.deleteCreative(testCreative.id);
        console.log(chalk.gray('   Cleaned up test record\n'));
    } catch (error) {
        console.log(chalk.red('❌ Supabase connection failed:'), error.message);
        console.log(chalk.gray('   Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY\n'));
    }

    // Test 2: OpenRouter API
    console.log(chalk.yellow('Test 2: OpenRouter API'));
    if (process.env.OPENROUTER_API_KEY) {
        console.log(chalk.green('✅ OpenRouter API key configured'));
        console.log(chalk.gray('   Model: anthropic/claude-3.5-sonnet\n'));
    } else {
        console.log(chalk.red('❌ OpenRouter API key missing'));
        console.log(chalk.gray('   Add OPENROUTER_API_KEY to .env\n'));
    }

    // Test 3: Figma API
    console.log(chalk.yellow('Test 3: Figma API'));
    if (process.env.FIGMA_ACCESS_TOKEN) {
        console.log(chalk.green('✅ Figma token configured'));
        if (process.env.FIGMA_FILE_ID) {
            console.log(chalk.green('✅ Figma file ID configured'));
        } else {
            console.log(chalk.yellow('⚠️  Figma file ID missing'));
            console.log(chalk.gray('   Add FIGMA_FILE_ID to .env'));
        }
        console.log();
    } else {
        console.log(chalk.red('❌ Figma token missing'));
        console.log(chalk.gray('   Add FIGMA_ACCESS_TOKEN to .env\n'));
    }

    // Test 4: Gemini Flash (Image Generation)
    console.log(chalk.yellow('Test 4: Gemini Flash (Image Generation)'));
    if (process.env.OPENROUTER_API_KEY) {
        console.log(chalk.green('✅ Using OpenRouter API for image generation'));
        console.log(chalk.gray('   Model: google/gemini-2.5-flash-image-preview'));
        console.log(chalk.gray('   Characters + Backgrounds via same API\n'));
    } else {
        console.log(chalk.red('❌ OpenRouter API key missing'));
        console.log(chalk.gray('   Add OPENROUTER_API_KEY to .env\n'));
    }

    // Test 6: Brand Configuration
    console.log(chalk.yellow('Test 6: Brand Configuration'));
    const brandName = process.env.BRAND_NAME;
    const brandLogo = process.env.BRAND_LOGO_URL;
    const brandColors = process.env.BRAND_COLORS;

    if (brandName) {
        console.log(chalk.green('✅ Brand name configured:'), brandName);
    } else {
        console.log(chalk.yellow('⚠️  Brand name missing'));
    }

    if (brandLogo) {
        console.log(chalk.green('✅ Brand logo URL configured'));
    } else {
        console.log(chalk.yellow('⚠️  Brand logo URL missing'));
    }

    if (brandColors) {
        console.log(chalk.green('✅ Brand colors configured'));
    } else {
        console.log(chalk.yellow('⚠️  Brand colors missing'));
    }

    console.log();

    // Summary
    console.log(chalk.bold.blue('📊 Test Summary\n'));
    
    const requiredAPIs = {
        'Supabase': !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        'OpenRouter (Analysis)': !!process.env.OPENROUTER_API_KEY,
        'OpenRouter (Images)': !!process.env.OPENROUTER_API_KEY,
        'Figma': !!process.env.FIGMA_ACCESS_TOKEN
    };

    const passedCount = Object.values(requiredAPIs).filter(Boolean).length;
    const totalCount = Object.keys(requiredAPIs).length;

    console.log(chalk.white('Required APIs:'), chalk.bold(`${passedCount}/${totalCount} configured`));
    
    Object.entries(requiredAPIs).forEach(([name, configured]) => {
        const icon = configured ? chalk.green('✅') : chalk.red('❌');
        console.log(`  ${icon} ${name}`);
    });

    console.log();

    if (passedCount === totalCount) {
        console.log(chalk.bold.green('✨ All systems ready! You can start generating creatives.\n'));
        console.log(chalk.white('Try:'), chalk.cyan('npm run full -- --url <image_url> --competitor <name>\n'));
    } else {
        console.log(chalk.bold.yellow('⚠️  Some APIs are missing. Configure them in .env to use all features.\n'));
    }
}

runTests().catch(console.error);


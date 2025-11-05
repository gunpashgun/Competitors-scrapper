#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { CreativeGenerator } from './index.js';
import { SupabaseService } from './services/supabase-client.js';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
    .name('creative-generator')
    .description('AI-powered creative generator from competitor analysis')
    .version('1.0.0');

// Analyze command
program
    .command('analyze')
    .description('Analyze a competitor creative')
    .requiredOption('-u, --url <url>', 'Image URL to analyze')
    .option('-c, --competitor <name>', 'Competitor name', 'Unknown')
    .action(async (options) => {
        const spinner = ora('Analyzing creative...').start();

        try {
            const generator = new CreativeGenerator();
            const result = await generator.analyzeOnly(options.url, options.competitor);

            spinner.succeed('Analysis complete!');

            console.log('\n' + chalk.bold('📊 Analysis Results:'));
            console.log(chalk.gray('─'.repeat(50)));
            console.log(chalk.cyan('ID:'), result.id);
            console.log(chalk.cyan('Headline:'), result.analysis.headline || 'N/A');
            console.log(chalk.cyan('Offer:'), result.analysis.offer || 'N/A');
            console.log(chalk.cyan('CTA:'), result.analysis.cta || 'N/A');
            console.log(chalk.cyan('Style:'), result.analysis.style || 'N/A');
            console.log(chalk.cyan('Has People:'), result.analysis.people?.present ? '✅' : '❌');
            console.log(chalk.gray('─'.repeat(50)));
            console.log(chalk.green('\n✨ Use this ID to generate: '), chalk.bold(result.id));

        } catch (error) {
            spinner.fail('Analysis failed');
            console.error(chalk.red('\n❌ Error:'), error.message);
            process.exit(1);
        }
    });

// Generate command
program
    .command('generate')
    .description('Generate creative from existing analysis')
    .requiredOption('-i, --id <id>', 'Creative ID from analysis')
    .action(async (options) => {
        const spinner = ora('Generating creative...').start();

        try {
            const generator = new CreativeGenerator();
            const result = await generator.generateFromAnalysis(options.id);

            spinner.succeed('Creative generated!');

            console.log('\n' + chalk.bold('🎨 Generated Creative:'));
            console.log(chalk.gray('─'.repeat(50)));
            console.log(chalk.cyan('Final Image:'), result.assets.final);
            console.log(chalk.gray('─'.repeat(50)));

        } catch (error) {
            spinner.fail('Generation failed');
            console.error(chalk.red('\n❌ Error:'), error.message);
            process.exit(1);
        }
    });

// Full cycle command
program
    .command('full')
    .description('Full pipeline: analyze + generate')
    .requiredOption('-u, --url <url>', 'Image URL to analyze')
    .option('-c, --competitor <name>', 'Competitor name', 'Unknown')
    .action(async (options) => {
        console.log(chalk.bold.blue('\n🚀 Starting full creative generation pipeline...\n'));

        try {
            const generator = new CreativeGenerator();
            const result = await generator.generateFromCompetitor(options.url, options.competitor);

            console.log('\n' + chalk.bold.green('✨ SUCCESS!\n'));
            console.log(chalk.bold('🎨 Your New Creative:'));
            console.log(chalk.gray('─'.repeat(50)));
            console.log(chalk.cyan('ID:'), result.id);
            console.log(chalk.cyan('Character:'), result.assets.character || 'N/A');
            console.log(chalk.cyan('Background:'), result.assets.background);
            console.log(chalk.cyan('Final Image:'), chalk.bold.green(result.assets.final));
            console.log(chalk.gray('─'.repeat(50)));

        } catch (error) {
            console.error(chalk.red('\n❌ Pipeline failed:'), error.message);
            console.error(chalk.gray('\nStack:'), error.stack);
            process.exit(1);
        }
    });

// List command
program
    .command('list')
    .description('List all creatives')
    .option('-s, --status <status>', 'Filter by status')
    .option('-l, --limit <number>', 'Limit results', '10')
    .action(async (options) => {
        const spinner = ora('Fetching creatives...').start();

        try {
            const creatives = await SupabaseService.getCreatives({
                status: options.status
            });

            spinner.succeed(`Found ${creatives.length} creatives`);

            console.log('\n' + chalk.bold('📋 Creatives:'));
            console.log(chalk.gray('─'.repeat(80)));

            creatives.slice(0, parseInt(options.limit)).forEach((c, i) => {
                console.log(
                    chalk.cyan(`${i + 1}.`),
                    chalk.bold(c.id.substring(0, 8)),
                    chalk.gray('|'),
                    chalk.white(c.competitor_name || 'Unknown'),
                    chalk.gray('|'),
                    getStatusIcon(c.status),
                    chalk.yellow(c.status)
                );
            });

            console.log(chalk.gray('─'.repeat(80)));

        } catch (error) {
            spinner.fail('Failed to fetch creatives');
            console.error(chalk.red('\n❌ Error:'), error.message);
            process.exit(1);
        }
    });

// View command
program
    .command('view')
    .description('View creative details')
    .requiredOption('-i, --id <id>', 'Creative ID')
    .action(async (options) => {
        const spinner = ora('Fetching creative...').start();

        try {
            const creative = await SupabaseService.getCreative(options.id);

            spinner.succeed('Creative loaded');

            console.log('\n' + chalk.bold('🎨 Creative Details:'));
            console.log(chalk.gray('─'.repeat(80)));
            console.log(chalk.cyan('ID:'), creative.id);
            console.log(chalk.cyan('Competitor:'), creative.competitor_name || 'Unknown');
            console.log(chalk.cyan('Status:'), getStatusIcon(creative.status), chalk.yellow(creative.status));
            console.log(chalk.cyan('Original:'), creative.original_image_url);
            if (creative.generated_character_url) {
                console.log(chalk.cyan('Character:'), creative.generated_character_url);
            }
            if (creative.generated_background_url) {
                console.log(chalk.cyan('Background:'), creative.generated_background_url);
            }
            if (creative.generated_image_url) {
                console.log(chalk.cyan('Final:'), chalk.bold.green(creative.generated_image_url));
            }
            console.log(chalk.cyan('Created:'), new Date(creative.created_at).toLocaleString());
            console.log(chalk.gray('─'.repeat(80)));

            if (creative.analysis) {
                console.log('\n' + chalk.bold('📊 Analysis Summary:'));
                console.log(chalk.gray('─'.repeat(80)));
                console.log(chalk.cyan('Headline:'), creative.analysis.headline || 'N/A');
                console.log(chalk.cyan('Offer:'), creative.analysis.offer || 'N/A');
                console.log(chalk.cyan('CTA:'), creative.analysis.cta || 'N/A');
                console.log(chalk.cyan('Style:'), creative.analysis.style || 'N/A');
                console.log(chalk.gray('─'.repeat(80)));
            }

        } catch (error) {
            spinner.fail('Failed to fetch creative');
            console.error(chalk.red('\n❌ Error:'), error.message);
            process.exit(1);
        }
    });

function getStatusIcon(status) {
    const icons = {
        'pending': '⏳',
        'analyzing': '🔍',
        'generating': '🎨',
        'completed': '✅',
        'failed': '❌'
    };
    return icons[status] || '❓';
}

program.parse();


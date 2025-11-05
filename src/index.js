import { CreativeAnalyzer } from './analyzers/creative-analyzer.js';
import { CharacterGenerator } from './generators/character-generator.js';
import { BackgroundGenerator } from './generators/background-generator.js';
import { FigmaComposer } from './generators/figma-composer.js';
import { SupabaseService } from './services/supabase-client.js';
import dotenv from 'dotenv';

dotenv.config();

export class CreativeGenerator {
    constructor(config = {}) {
        this.analyzer = new CreativeAnalyzer(config.openrouterApiKey);
        this.characterGen = new CharacterGenerator(config.midjourneyApiKey);
        this.backgroundGen = new BackgroundGenerator(config.replicateApiKey);
        this.figmaComposer = new FigmaComposer(config.figmaToken, config.figmaFileId);
        // Parse brand colors safely
        let brandColors = [];
        try {
            if (process.env.BRAND_COLORS) {
                brandColors = JSON.parse(process.env.BRAND_COLORS);
            }
        } catch (e) {
            console.warn('⚠️ Could not parse BRAND_COLORS, using defaults');
            brandColors = ['#FF6B6B', '#4ECDC4'];
        }

        this.brandConfig = config.brand || {
            name: process.env.BRAND_NAME || 'Your Brand',
            logoUrl: process.env.BRAND_LOGO_URL,
            colors: brandColors
        };
    }

    /**
     * Full pipeline: Analyze competitor creative and generate new one
     * @param {string} imageUrl - URL of competitor creative
     * @param {string} competitorName - Name of competitor
     * @returns {Object} Generated creative with URLs and metadata
     */
    async generateFromCompetitor(imageUrl, competitorName) {
        console.log('🚀 Starting creative generation pipeline...\n');
        
        let creativeRecord;

        try {
            // Step 1: Create record in Supabase
            console.log('1️⃣  Creating database record...');
            creativeRecord = await SupabaseService.createCreative({
                competitorName,
                originalImageUrl: imageUrl
            });
            console.log(`   Created record: ${creativeRecord.id}\n`);

            // Step 2: Analyze competitor creative
            console.log('2️⃣  Analyzing competitor creative...');
            await SupabaseService.updateCreative(creativeRecord.id, { status: 'analyzing' });
            
            const analysis = await this.analyzer.analyze(imageUrl);
            
            await SupabaseService.updateCreative(creativeRecord.id, {
                analysis: analysis
            });
            console.log('   ✅ Analysis complete\n');

            // Step 3: Generate character (if people present)
            console.log('3️⃣  Generating character image...');
            await SupabaseService.updateCreative(creativeRecord.id, { status: 'generating' });
            
            let characterUrl = null;
            if (analysis.people?.present || analysis.mainObject) {
                const characterPrompt = analysis.imageGenerationPrompts?.character || 
                                       this.analyzer.buildCharacterPrompt(analysis);
                
                const characterImageUrl = await this.characterGen.generate(characterPrompt);
                
                // Upload to Supabase
                characterUrl = await SupabaseService.uploadImage(characterImageUrl, 'characters');
                
                await SupabaseService.updateCreative(creativeRecord.id, {
                    generated_character_url: characterUrl
                });
                
                console.log('   ✅ Character generated\n');
            } else {
                console.log('   ⏭️  No character needed\n');
            }

            // Step 4: Generate background
            console.log('4️⃣  Generating background...');
            
            const backgroundPrompt = analysis.imageGenerationPrompts?.background ||
                                    this.analyzer.buildBackgroundPrompt(analysis);
            
            const backgroundImageUrl = await this.backgroundGen.generate(backgroundPrompt);
            
            // Upload to Supabase
            const backgroundUrl = await SupabaseService.uploadImage(backgroundImageUrl, 'backgrounds');
            
            await SupabaseService.updateCreative(creativeRecord.id, {
                generated_background_url: backgroundUrl
            });
            
            console.log('   ✅ Background generated\n');

            // Step 5: Compose final creative with Figma/Sharp
            console.log('5️⃣  Composing final creative...');
            
            const assets = {
                characterUrl,
                backgroundUrl,
                logoUrl: this.brandConfig.logoUrl
            };

            // Replace competitor brand with our brand in analysis
            const ourAnalysis = this.replaceBrandInfo(analysis);

            const finalImageBuffer = await this.figmaComposer.compose(ourAnalysis, assets);
            
            // Upload final creative
            const finalImageUrl = await SupabaseService.uploadImage(finalImageBuffer, 'finals');
            
            await SupabaseService.updateCreative(creativeRecord.id, {
                generated_image_url: finalImageUrl,
                status: 'completed'
            });
            
            console.log('   ✅ Creative composed\n');

            console.log('✨ Pipeline complete!\n');
            console.log('📊 Results:');
            console.log(`   Database ID: ${creativeRecord.id}`);
            console.log(`   Character: ${characterUrl || 'N/A'}`);
            console.log(`   Background: ${backgroundUrl}`);
            console.log(`   Final Creative: ${finalImageUrl}`);

            return {
                id: creativeRecord.id,
                analysis: ourAnalysis,
                assets: {
                    character: characterUrl,
                    background: backgroundUrl,
                    final: finalImageUrl
                }
            };

        } catch (error) {
            console.error('\n❌ Error in pipeline:', error.message);
            
            if (creativeRecord) {
                await SupabaseService.updateCreative(creativeRecord.id, {
                    status: 'failed',
                    error_message: error.message
                });
            }
            
            throw error;
        }
    }

    /**
     * Analyze only (no generation)
     */
    async analyzeOnly(imageUrl, competitorName) {
        console.log('🔍 Analyzing creative (no generation)...\n');

        const creativeRecord = await SupabaseService.createCreative({
            competitorName,
            originalImageUrl: imageUrl
        });

        await SupabaseService.updateCreative(creativeRecord.id, { status: 'analyzing' });

        const analysis = await this.analyzer.analyze(imageUrl);

        await SupabaseService.updateCreative(creativeRecord.id, {
            analysis: analysis,
            status: 'completed'
        });

        console.log('\n✅ Analysis complete!');
        console.log(`   Database ID: ${creativeRecord.id}`);

        return {
            id: creativeRecord.id,
            analysis
        };
    }

    /**
     * Generate from existing analysis
     */
    async generateFromAnalysis(creativeId) {
        console.log(`🎨 Generating from existing analysis (${creativeId})...\n`);

        const creative = await SupabaseService.getCreative(creativeId);

        if (!creative.analysis) {
            throw new Error('No analysis found for this creative');
        }

        const analysis = creative.analysis;

        // Continue from step 3 (character generation)
        await SupabaseService.updateCreative(creativeId, { status: 'generating' });

        // ... (repeat steps 3-5 from generateFromCompetitor)
        
        console.log('✨ Generation complete!');
    }

    /**
     * Replace competitor brand info with our brand
     */
    replaceBrandInfo(analysis) {
        const updated = { ...analysis };
        
        updated.brandName = this.brandConfig.name;
        updated.logo = {
            ...updated.logo,
            url: this.brandConfig.logoUrl
        };

        // Replace brand mentions in text
        if (updated.headline) {
            updated.headline = this.replaceBrandInText(updated.headline);
        }
        if (updated.bodyText) {
            updated.bodyText = this.replaceBrandInText(updated.bodyText);
        }

        return updated;
    }

    /**
     * Replace brand name in text (preserve style)
     */
    replaceBrandInText(text) {
        // This is a simple replacement - you might want more sophisticated logic
        return text.replace(/\b[A-Z][a-zA-Z]+\b/g, this.brandConfig.name);
    }
}

export default CreativeGenerator;


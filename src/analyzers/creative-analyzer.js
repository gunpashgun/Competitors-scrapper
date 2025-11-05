import axios from 'axios';
import dotenv from 'dotenv';
import { ANALYSIS_PROMPT } from '../utils/prompt-templates.js';

dotenv.config();

export class CreativeAnalyzer {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.OPENROUTER_API_KEY;
        this.model = 'anthropic/claude-3.5-sonnet';
    }

    /**
     * Analyze a creative image using OpenRouter (Claude Vision)
     * @param {string} imageUrl - URL of the image to analyze
     * @returns {Object} Detailed analysis of the creative
     */
    async analyze(imageUrl) {
        console.log('🔍 Analyzing creative with Claude 3.5 Sonnet...');

        try {
            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: this.model,
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: imageUrl
                                    }
                                },
                                {
                                    type: 'text',
                                    text: ANALYSIS_PROMPT
                                }
                            ]
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 4000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'HTTP-Referer': 'https://creative-generator.app',
                        'X-Title': 'Creative Generator',
                        'Content-Type': 'application/json'
                    }
                }
            );

            const content = response.data.choices[0].message.content;
            
            // Parse JSON from the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Failed to parse JSON from response');
            }

            const analysis = JSON.parse(jsonMatch[0]);
            
            console.log('✅ Analysis completed');
            console.log(`   - Headline: ${analysis.headline}`);
            console.log(`   - Offer: ${analysis.offer}`);
            console.log(`   - CTA: ${analysis.cta}`);
            console.log(`   - Style: ${analysis.style}`);
            console.log(`   - Format: ${analysis.format}`);

            return analysis;

        } catch (error) {
            console.error('❌ Error analyzing creative:', error.message);
            if (error.response) {
                console.error('Response:', error.response.data);
            }
            throw error;
        }
    }

    /**
     * Extract brand information from analysis
     */
    extractBrandInfo(analysis) {
        return {
            name: analysis.brandName || 'Unknown',
            colors: analysis.colors || [],
            logo: analysis.logo || null
        };
    }

    /**
     * Get generation prompts from analysis
     */
    getGenerationPrompts(analysis) {
        return {
            character: this.buildCharacterPrompt(analysis),
            background: this.buildBackgroundPrompt(analysis)
        };
    }

    /**
     * Build Midjourney prompt for character generation
     */
    buildCharacterPrompt(analysis) {
        let prompt = '';

        if (analysis.people?.present) {
            const { type, emotion, age, gender } = analysis.people;
            prompt = `${age || 'young'} ${gender || 'person'} ${type || 'portrait'}, `;
            prompt += `${emotion || 'happy'} expression, `;
            prompt += `${analysis.style === 'realistic' ? 'photorealistic' : analysis.style}, `;
            prompt += 'high quality, professional photography, ';
        } else if (analysis.mainObject) {
            prompt = `${analysis.mainObject}, `;
            prompt += `${analysis.style}, high quality, professional, `;
        }

        // Add secondary objects context
        if (analysis.secondaryObjects?.length > 0) {
            prompt += `with ${analysis.secondaryObjects.slice(0, 2).join(' and ')}, `;
        }

        // Add style modifiers
        prompt += 'clean background, studio lighting, 8k resolution --v 6 --ar 1:1';

        return prompt;
    }

    /**
     * Build Flux prompt for background generation
     */
    buildBackgroundPrompt(analysis) {
        let prompt = '';

        if (analysis.backgroundType === 'gradient') {
            const colors = analysis.colors.slice(0, 3).join(', ');
            prompt = `smooth gradient background, ${colors}, modern, clean, professional`;
        } else if (analysis.backgroundType === 'photo') {
            prompt = `${analysis.backgroundDescription || 'abstract modern'} background, `;
            prompt += 'blurred, out of focus, bokeh effect, professional, ';
            const colors = analysis.colors.slice(0, 2).join(' and ');
            prompt += `${colors} color scheme`;
        } else if (analysis.backgroundType === 'solid') {
            const mainColor = analysis.colors[0] || 'white';
            prompt = `solid ${mainColor} background, clean, minimal, professional`;
        } else {
            prompt = `abstract modern background, ${analysis.colors[0] || 'colorful'}, professional`;
        }

        prompt += ', high quality, 8k resolution, suitable for advertising';

        return prompt;
    }
}

export default CreativeAnalyzer;


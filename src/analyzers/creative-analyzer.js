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
            
            console.log('📄 Raw response preview:', content.substring(0, 500));
            
            // Parse JSON from the response
            // Try to extract JSON, handling markdown code blocks
            let jsonText = content;
            
            // Remove markdown code blocks if present
            if (content.includes('```json')) {
                const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    jsonText = jsonMatch[1];
                }
            } else if (content.includes('```')) {
                const jsonMatch = content.match(/```\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    jsonText = jsonMatch[1];
                }
            } else {
                // Try to find JSON object
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    jsonText = jsonMatch[0];
                }
            }

            let analysis;
            try {
                analysis = JSON.parse(jsonText);
            } catch (parseError) {
                console.error('❌ JSON Parse Error:', parseError.message);
                console.error('📄 Attempted to parse:', jsonText.substring(0, 200));
                throw new Error('Failed to parse JSON from Claude response: ' + parseError.message);
            }
            
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
                console.error('Response status:', error.response.status);
                console.error('Response data:', JSON.stringify(error.response.data, null, 2));
            }
            if (error.request && !error.response) {
                console.error('No response received from API');
            }
            console.error('Full error:', error);
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


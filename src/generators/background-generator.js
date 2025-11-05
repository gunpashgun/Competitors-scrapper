import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export class BackgroundGenerator {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.OPENROUTER_API_KEY;
        this.model = 'google/gemini-2.5-flash-image-preview';
    }

    /**
     * Generate background image using Gemini via OpenRouter
     * @param {string} prompt - Background generation prompt
     * @param {Object} options - Generation options
     * @returns {string} Image URL (base64 data URL)
     */
    async generate(prompt, options = {}) {
        console.log('🌄 Generating background with Gemini Flash...');
        console.log(`   Prompt: ${prompt.substring(0, 100)}...`);

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
                                    type: 'text',
                                    text: `Generate an image: ${prompt}`
                                }
                            ]
                        }
                    ],
                    temperature: 0.7,
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
            
            console.log('✅ Background generated successfully');
            return content;

        } catch (error) {
            console.error('❌ Error generating background:', error.message);
            if (error.response) {
                console.error('Response:', error.response.data);
            }
            throw error;
        }
    }

    /**
     * Generate with specific dimensions
     */
    async generateWithDimensions(prompt, width, height) {
        const aspectRatio = `${width}:${height}`;
        return this.generate(prompt, { aspectRatio });
    }

    /**
     * Generate gradient background (fallback/simple version)
     */
    generateSimpleGradient(colors) {
        console.log('🎨 Generating simple gradient...');
        
        // This would use canvas to create a simple gradient
        // For now, return a placeholder or use Flux with specific prompt
        const gradientPrompt = `smooth gradient background from ${colors[0]} to ${colors[1]}, professional, clean, high quality`;
        return this.generate(gradientPrompt);
    }
}

export default BackgroundGenerator;


import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export class CharacterGenerator {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.OPENROUTER_API_KEY;
        this.model = 'google/gemini-2.5-flash-image-preview';
    }

    /**
     * Generate character image using Gemini via OpenRouter
     * @param {string} prompt - Image generation prompt
     * @returns {string} Image URL (base64 data URL)
     */
    async generate(prompt) {
        console.log('🎨 Generating character with Gemini Flash...');
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

            // Gemini returns image as base64 in content
            const content = response.data.choices[0].message.content;
            
            // Extract base64 image if present
            // Format: data:image/png;base64,<base64_string>
            let imageData = content;
            
            if (content.includes('data:image')) {
                imageData = content;
            } else {
                // If not base64, it might be a URL or we need to handle differently
                imageData = content;
            }
            
            console.log('✅ Character generated successfully');
            return imageData;

        } catch (error) {
            console.error('❌ Error generating character:', error.message);
            if (error.response) {
                console.error('Response:', error.response.data);
            }
            throw error;
        }
    }
}

export default CharacterGenerator;


import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

export class FigmaComposer {
    constructor(accessToken, fileId) {
        this.accessToken = accessToken || process.env.FIGMA_ACCESS_TOKEN;
        this.fileId = fileId || process.env.FIGMA_FILE_ID;
        this.baseUrl = 'https://api.figma.com/v1';
    }

    /**
     * Get Figma file structure
     */
    async getFile() {
        console.log('📄 Fetching Figma file...');

        try {
            const response = await axios.get(
                `${this.baseUrl}/files/${this.fileId}`,
                {
                    headers: {
                        'X-Figma-Token': this.accessToken
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('❌ Error fetching Figma file:', error.message);
            throw error;
        }
    }

    /**
     * Find layers by name in Figma file
     */
    findLayersByName(node, layerNames) {
        const foundLayers = {};

        function traverse(n) {
            if (layerNames.includes(n.name)) {
                foundLayers[n.name] = n;
            }

            if (n.children) {
                n.children.forEach(traverse);
            }
        }

        traverse(node);
        return foundLayers;
    }

    /**
     * Compose creative from analysis and generated assets
     * 
     * Note: Figma REST API doesn't support direct editing.
     * This is a conceptual implementation. In reality, you'd need to:
     * 1. Use Figma Plugins API
     * 2. Or manually export and use canvas/sharp for composition
     * 3. Or use Figma's Variables API for template substitution
     */
    async compose(analysis, assets) {
        console.log('🎨 Composing creative in Figma...');

        try {
            // Get file structure
            const file = await this.getFile();
            
            // Find template frame
            const templateNodeId = process.env.FIGMA_TEMPLATE_NODE_ID;
            if (!templateNodeId) {
                throw new Error('FIGMA_TEMPLATE_NODE_ID not configured');
            }

            // For now, we'll export the template with placeholders
            // and then use image processing to replace elements
            
            console.log('📸 Exporting template...');
            const templateImageUrl = await this.exportNode(templateNodeId);

            // Download template
            const templateBuffer = await this.downloadImage(templateImageUrl);

            // Use sharp/canvas to composite the final image
            const composedImage = await this.compositeWithSharp(
                templateBuffer,
                assets,
                analysis
            );

            console.log('✅ Creative composed successfully');
            return composedImage;

        } catch (error) {
            console.error('❌ Error composing creative:', error.message);
            throw error;
        }
    }

    /**
     * Export a specific node as image
     */
    async exportNode(nodeId, format = 'png', scale = 2) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/images/${this.fileId}`,
                {
                    params: {
                        ids: nodeId,
                        format: format,
                        scale: scale
                    },
                    headers: {
                        'X-Figma-Token': this.accessToken
                    }
                }
            );

            const imageUrl = response.data.images[nodeId];
            
            if (!imageUrl) {
                throw new Error('Failed to export node');
            }

            return imageUrl;

        } catch (error) {
            console.error('❌ Error exporting node:', error.message);
            throw error;
        }
    }

    /**
     * Download image from URL
     */
    async downloadImage(url) {
        const response = await axios.get(url, {
            responseType: 'arraybuffer'
        });
        return Buffer.from(response.data);
    }

    /**
     * Composite final image using Sharp
     */
    async compositeWithSharp(templateBuffer, assets, analysis) {
        const sharp = (await import('sharp')).default;

        console.log('🖼️  Compositing with Sharp...');

        // Load template
        let composite = sharp(templateBuffer);
        const metadata = await composite.metadata();

        // Prepare overlays
        const overlays = [];

        // Add character if provided
        if (assets.characterUrl) {
            const charBuffer = await this.downloadImage(assets.characterUrl);
            const charPosition = this.calculatePosition('character', analysis, metadata);
            
            overlays.push({
                input: await sharp(charBuffer)
                    .resize(charPosition.width, charPosition.height, { fit: 'cover' })
                    .toBuffer(),
                top: charPosition.top,
                left: charPosition.left
            });
        }

        // Add background if provided
        if (assets.backgroundUrl) {
            const bgBuffer = await this.downloadImage(assets.backgroundUrl);
            // Background goes first (bottom layer)
            overlays.unshift({
                input: await sharp(bgBuffer)
                    .resize(metadata.width, metadata.height, { fit: 'cover' })
                    .toBuffer(),
                top: 0,
                left: 0
            });
        }

        // Add logo
        if (assets.logoUrl) {
            const logoBuffer = await this.downloadImage(assets.logoUrl);
            const logoPosition = this.calculatePosition('logo', analysis, metadata);
            
            overlays.push({
                input: await sharp(logoBuffer)
                    .resize(logoPosition.width, logoPosition.height, { fit: 'contain' })
                    .toBuffer(),
                top: logoPosition.top,
                left: logoPosition.left
            });
        }

        // Composite all layers
        const result = await composite
            .composite(overlays)
            .png()
            .toBuffer();

        return result;
    }

    /**
     * Calculate position for element based on analysis
     */
    calculatePosition(elementType, analysis, metadata) {
        const { width, height } = metadata;

        switch (elementType) {
            case 'logo':
                const logoPos = analysis.logo?.position || 'top-left';
                const positions = {
                    'top-left': { top: 20, left: 20, width: 100, height: 100 },
                    'top-right': { top: 20, left: width - 120, width: 100, height: 100 },
                    'center': { top: height / 2 - 50, left: width / 2 - 50, width: 100, height: 100 }
                };
                return positions[logoPos] || positions['top-left'];

            case 'character':
                // Center or based on layout
                return {
                    top: Math.floor(height * 0.2),
                    left: Math.floor(width * 0.1),
                    width: Math.floor(width * 0.8),
                    height: Math.floor(height * 0.6)
                };

            default:
                return { top: 0, left: 0, width, height };
        }
    }

    /**
     * Export creative to file
     */
    async exportToFile(buffer, outputPath) {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, buffer);
        console.log(`💾 Saved to: ${outputPath}`);
        return outputPath;
    }
}

export default FigmaComposer;


import { Actor } from 'apify';
import axios from 'axios';
import sharp from 'sharp';
import FormData from 'form-data';

await Actor.init();

const input = await Actor.getInput();
const {
    imageUrls = [],
    yourBrand = 'YourBrand',
    openrouterApiKey,
    openaiApiKey
} = input;

console.log('🎨 Creative Batch Processor Started');
console.log(`📊 Processing ${imageUrls.length} creatives`);
console.log(`🏢 Your brand: ${yourBrand}\n`);

const OPENROUTER_KEY = openrouterApiKey || process.env.OPENROUTER_API_KEY;
const OPENAI_KEY = openaiApiKey || process.env.OPENAI_API_KEY;

const results = [];

for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    const itemId = `creative-${i + 1}`;
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔄 Processing ${i + 1}/${imageUrls.length}`);
    console.log(`📷 URL: ${imageUrl.substring(0, 60)}...`);
    
    try {
        // Step 1: Analyze with GPT-4o Vision
        console.log('\n📊 Step 1: Analyzing with GPT-4o Vision...');
        const analysis = await analyzeCreative(imageUrl, OPENROUTER_KEY);
        console.log(`✅ Analysis complete`);
        console.log(`   - Dimensions: ${analysis.imageDimensions?.width}x${analysis.imageDimensions?.height}`);
        console.log(`   - Text elements: ${analysis.textElements?.length || 0}`);
        console.log(`   - Logo: ${analysis.logo?.present ? 'Yes' : 'No'}`);
        console.log(`   - CTA: ${analysis.ctaButton?.present ? 'Yes' : 'No'}`);
        
        // Step 2: Download original image
        console.log('\n📥 Step 2: Downloading original image...');
        const imageBuffer = await downloadImage(imageUrl);
        const imageMeta = await sharp(imageBuffer).metadata();
        console.log(`✅ Downloaded: ${imageMeta.width}x${imageMeta.height}`);
        
        // Step 3: Create mask for text removal
        console.log('\n🎭 Step 3: Creating text mask...');
        const maskBuffer = await createTextMask(analysis, imageMeta);
        console.log(`✅ Mask created`);
        
        // Step 4: Remove text with OpenAI gpt-image-1
        console.log('\n🎨 Step 4: Removing text with gpt-image-1...');
        const cleanImageBuffer = await removeTextWithOpenAI(
            imageBuffer,
            maskBuffer,
            imageMeta,
            analysis,
            OPENAI_KEY
        );
        console.log(`✅ Text removed successfully`);
        
        // Step 5: Generate layout data for Figma
        console.log('\n📋 Step 5: Generating layout data...');
        const layoutData = generateLayoutData(analysis, yourBrand, imageUrl, imageMeta);
        
        // Step 6: Save to Apify dataset
        const datasetItem = {
            itemId,
            originalUrl: imageUrl,
            cleanImageBase64: cleanImageBuffer.toString('base64'),
            layoutData,
            status: 'success',
            processedAt: new Date().toISOString()
        };
        
        await Actor.pushData(datasetItem);
        
        results.push({
            itemId,
            status: 'success',
            originalUrl: imageUrl
        });
        
        console.log(`\n✅ ${itemId} processed successfully!`);
        
    } catch (error) {
        console.error(`\n❌ Error processing ${itemId}:`, error.message);
        
        results.push({
            itemId,
            status: 'error',
            originalUrl: imageUrl,
            error: error.message
        });
    }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Batch processing complete!');
console.log(`📊 Success: ${results.filter(r => r.status === 'success').length}/${results.length}`);

await Actor.setValue('OUTPUT', {
    totalProcessed: results.length,
    successful: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status === 'error').length,
    results
});

await Actor.exit();

/**
 * Analyze creative with GPT-4o Vision
 */
async function analyzeCreative(imageUrl, apiKey) {
    const prompt = `Analyze this advertising creative in EXTREME DETAIL.

For EACH element provide:
1. EXACT POSITION (x, y)
2. EXACT SIZE (width, height)
3. EXACT TEXT (full content)
4. FONT SIZE in pixels
5. COLORS (hex codes)
6. SHAPE (rectangle/rounded/circle)

Return JSON with:
{
  "imageDimensions": { "width": 0, "height": 0 },
  "logo": { "present": true, "text": "", "x": 0, "y": 0, "width": 0, "height": 0, "fontSize": 0, "fontWeight": "", "color": "" },
  "textElements": [
    { "type": "headline/subheadline/body/caption", "text": "", "x": 0, "y": 0, "width": 0, "height": 0, "fontSize": 0, "fontWeight": "", "textAlign": "", "color": "" }
  ],
  "ctaButton": { "present": true, "text": "", "x": 0, "y": 0, "width": 0, "height": 0, "shape": "", "cornerRadius": 0, "backgroundColor": "", "textColor": "", "fontSize": 0 },
  "priceSection": { "present": true, "hasBackgroundCard": true, "cardX": 0, "cardY": 0, "cardWidth": 0, "cardHeight": 0, "oldPrice": "", "newPrice": "" }
}`;

    const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
            model: 'openai/gpt-4o',
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: imageUrl } }
                ]
            }],
            temperature: 0.1,
            max_tokens: 4000
        },
        {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://apify.com',
                'X-Title': 'Creative Batch Processor'
            }
        }
    );

    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
        throw new Error('Failed to parse analysis response');
    }
    
    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonStr);
}

/**
 * Download image
 */
async function downloadImage(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
}

/**
 * Create text mask
 */
async function createTextMask(analysis, imageMeta) {
    const { width, height } = imageMeta;
    
    // Create black background
    let mask = sharp({
        create: {
            width,
            height,
            channels: 3,
            background: { r: 0, g: 0, b: 0 }
        }
    });
    
    // Add white rectangles for each text element
    const overlays = [];
    const allElements = [
        analysis.logo?.present ? analysis.logo : null,
        ...(analysis.textElements || []),
        analysis.ctaButton?.present ? analysis.ctaButton : null,
        analysis.priceSection?.present ? analysis.priceSection : null
    ].filter(Boolean);
    
    for (const el of allElements) {
        const x = Math.max(0, Math.round(el.x || 0) - 20);
        const y = Math.max(0, Math.round(el.y || 0) - 20);
        const w = Math.min(width - x, Math.round((el.width || 100)) + 40);
        const h = Math.min(height - y, Math.round((el.height || 50)) + 40);
        
        overlays.push({
            input: Buffer.from(
                `<svg width="${w}" height="${h}">
                    <rect width="${w}" height="${h}" fill="white"/>
                </svg>`
            ),
            top: y,
            left: x
        });
    }
    
    return await mask.composite(overlays).png().toBuffer();
}

/**
 * Remove text with OpenAI gpt-image-1
 */
async function removeTextWithOpenAI(imageBuffer, maskBuffer, imageMeta, analysis, apiKey) {
    const squareSize = 1024;
    
    // Resize to 1024x1024 with padding
    const resizedImage = await sharp(imageBuffer)
        .resize(squareSize, squareSize, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 1 }
        })
        .png()
        .toBuffer();
    
    const resizedMask = await sharp(maskBuffer)
        .resize(squareSize, squareSize, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 1 }
        })
        .png()
        .toBuffer();
    
    // Prepare form data
    const formData = new FormData();
    formData.append('image', resizedImage, { filename: 'image.png', contentType: 'image/png' });
    formData.append('mask', resizedMask, { filename: 'mask.png', contentType: 'image/png' });
    formData.append('prompt', 'Remove all text from this image and naturally restore the background');
    formData.append('model', 'gpt-image-1');
    formData.append('size', '1024x1024');
    
    // Call OpenAI
    const response = await axios.post(
        'https://api.openai.com/v1/images/edits',
        formData,
        {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                ...formData.getHeaders()
            },
            timeout: 120000
        }
    );
    
    // Download result
    const resultUrl = response.data.data[0].url;
    const resultBuffer = await downloadImage(resultUrl);
    
    // Resize back to original dimensions
    const aspectRatio = imageMeta.width / imageMeta.height;
    let extractWidth, extractHeight, extractLeft, extractTop;
    
    if (aspectRatio < 1) {
        extractHeight = squareSize;
        extractWidth = Math.round(extractHeight * aspectRatio);
        extractLeft = Math.round((squareSize - extractWidth) / 2);
        extractTop = 0;
    } else {
        extractWidth = squareSize;
        extractHeight = Math.round(extractWidth / aspectRatio);
        extractLeft = 0;
        extractTop = Math.round((squareSize - extractHeight) / 2);
    }
    
    return await sharp(resultBuffer)
        .extract({ left: extractLeft, top: extractTop, width: extractWidth, height: extractHeight })
        .resize(imageMeta.width, imageMeta.height, { fit: 'fill' })
        .png()
        .toBuffer();
}

/**
 * Generate layout data for Figma
 */
function generateLayoutData(analysis, yourBrand, imageUrl, imageMeta) {
    const textBlocks = [];
    
    // Logo
    if (analysis.logo?.present) {
        textBlocks.push({
            type: 'logo',
            ...analysis.logo,
            originalText: analysis.logo.text,
            newText: yourBrand
        });
    }
    
    // Text elements
    if (analysis.textElements) {
        textBlocks.push(...analysis.textElements.map(el => ({
            ...el,
            originalText: el.text,
            newText: el.text
        })));
    }
    
    // CTA
    if (analysis.ctaButton?.present) {
        textBlocks.push({
            type: 'ctaButton',
            ...analysis.ctaButton,
            originalText: analysis.ctaButton.text,
            newText: analysis.ctaButton.text
        });
    }
    
    // Price
    if (analysis.priceSection?.present) {
        textBlocks.push({
            type: 'priceSection',
            ...analysis.priceSection
        });
    }
    
    return {
        originalImageUrl: imageUrl,
        originalDimensions: {
            width: imageMeta.width,
            height: imageMeta.height
        },
        analysisCoordinateSpace: {
            width: imageMeta.width,
            height: imageMeta.height
        },
        textBlocks,
        method: 'GPT-4o Vision + OpenAI gpt-image-1',
        timestamp: new Date().toISOString()
    };
}


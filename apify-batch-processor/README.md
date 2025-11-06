# Creative Batch Processor

Automatically process multiple competitor creatives:

## Features

1. **Analyze** with GPT-4o Vision - detect all text elements, positions, sizes
2. **Remove text** with OpenAI gpt-image-1 - clean background restoration
3. **Generate layout** - JSON for Figma plugin with exact coordinates
4. **Batch processing** - handle multiple creatives at once

## Input

```json
{
  "imageUrls": [
    "https://scontent.xx.fbcdn.net/v/t45.1600-4/...",
    "https://scontent.xx.fbcdn.net/v/t45.1600-4/..."
  ],
  "yourBrand": "Algonova"
}
```

## Output

Dataset with processed creatives:

```json
{
  "itemId": "creative-1",
  "originalUrl": "https://...",
  "cleanImageBase64": "iVBORw0KGgoAAAANS...",
  "layoutData": {
    "originalDimensions": { "width": 720, "height": 1280 },
    "textBlocks": [
      {
        "type": "logo",
        "x": 320,
        "y": 50,
        "originalText": "competitor",
        "newText": "Algonova"
      }
    ]
  },
  "status": "success"
}
```

## Usage with Figma Plugin

1. Run this actor with competitor image URLs
2. Copy dataset results
3. In Figma plugin: paste batch data or dataset ID
4. Plugin creates multiple frames with your brand

## API Keys Required

- **OpenRouter API Key** - for GPT-4o Vision analysis
- **OpenAI API Key** - for gpt-image-1 text removal

Set in Actor Settings → Environment variables


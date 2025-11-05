# 🎨 Creative Generator

AI-powered creative generation system that analyzes competitor ads and generates new creatives using:
- **OpenRouter** (Claude 3.5 Sonnet) for image analysis
- **Midjourney** for character/people generation
- **Flux** (Replicate) for background generation
- **Figma API** for template-based composition
- **Supabase** for storage and database

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Setup Supabase
```bash
npm run setup
```
This will create necessary tables and storage buckets.

### 3. Configure .env
Fill in the required API keys in `.env` file.

### 4. Analyze a competitor creative
```bash
npm run analyze -- --url "https://example.com/ad-image.jpg"
```

### 5. Generate a new creative
```bash
npm run generate -- --id <creative_id>
```

### 6. Full cycle (analyze + generate)
```bash
npm run full-cycle -- --url "https://example.com/ad-image.jpg"
```

## 📊 Workflow

```
Competitor Ad Image
       ↓
[OpenRouter Analysis] → Extract all elements
       ↓
[Midjourney] → Generate characters
       ↓
[Flux/Replicate] → Generate backgrounds
       ↓
[Figma API] → Compose final creative
       ↓
[Supabase Storage] → Save result
```

## 🗄️ Database Schema

### Table: `creatives`
- `id` (uuid, primary key)
- `competitor_name` (text)
- `original_image_url` (text)
- `analysis` (jsonb) - Full analysis from OpenRouter
- `generated_image_url` (text)
- `figma_file_id` (text)
- `status` (text: analyzing/generating/completed/failed)
- `created_at` (timestamp)

### Storage Bucket: `generated-creatives`
- Original competitor images
- Generated character images
- Generated background images
- Final composed creatives

## 🎯 Figma Template Requirements

Your Figma template should have these layers:
- `Background` - background layer (will be replaced)
- `Main Image` - main character/product image
- `Logo` - your brand logo
- `Headline` - text layer for headline
- `Offer` - text layer for offer/discount
- `Body Text` - main text content
- `CTA Button` - call-to-action button shape
- `CTA Text` - text on the button

## 🔑 Required API Keys

1. **Supabase** - Already configured ✅
2. **OpenRouter** - For image analysis
3. **Figma** - Already configured ✅
4. **Midjourney** - For character generation
5. **Replicate** - For Flux background generation

## 📝 Example Usage

```javascript
// Analyze
const analysis = await analyzeCreative('https://example.com/image.jpg');

// Generate
const creative = await generateCreative(analysis);

// Save to Supabase
await saveToSupabase(creative);
```

## 🛠️ Development

```bash
npm run test    # Run tests
npm run setup   # Setup Supabase tables
```

## 📦 Project Structure

```
Creative-Generator/
├── src/
│   ├── index.js                  # Main entry point
│   ├── cli.js                    # CLI interface
│   ├── setup.js                  # Supabase setup
│   ├── analyzers/
│   │   └── creative-analyzer.js  # OpenRouter image analysis
│   ├── generators/
│   │   ├── character-generator.js # Midjourney integration
│   │   ├── background-generator.js # Flux integration
│   │   └── figma-composer.js      # Figma API composition
│   ├── services/
│   │   └── supabase-client.js    # Supabase integration
│   └── utils/
│       ├── prompt-templates.js   # Analysis prompts
│       └── image-utils.js        # Image processing utilities
├── config/
│   └── figma-templates.json      # Figma template IDs
├── generated-creatives/          # Local output
└── .env
```


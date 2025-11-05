# 🏗️ Architecture - Creative Generator

## 📊 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Creative Generator                       │
│                    End-to-End Pipeline                       │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   ANALYZE    │    │   GENERATE   │    │    COMPOSE   │
│  OpenRouter  │ -->│  MJ + Flux   │ -->│    Figma     │
│  (Claude)    │    │  (Replicate) │    │   (Sharp)    │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
                    ┌──────────────┐
                    │   Supabase   │
                    │   Storage    │
                    │   Database   │
                    └──────────────┘
```

---

## 🔧 Components

### 1. **Analyzer** (`src/analyzers/creative-analyzer.js`)

**Purpose:** Детальный анализ креатива конкурента

**Technology:** OpenRouter API → Claude 3.5 Sonnet with Vision

**Input:**
```javascript
imageUrl: "https://example.com/competitor-ad.jpg"
```

**Output:**
```javascript
{
  headline: "...",
  offer: "...",
  cta: "...",
  style: "realistic/illustration/3d",
  people: { present: true, emotion: "happy", ... },
  colors: ["#FF6B6B", "#4ECDC4"],
  layout: { ... },
  imageGenerationPrompts: {
    character: "Midjourney prompt...",
    background: "Flux prompt..."
  },
  ...
}
```

**Key Features:**
- 🎯 Извлекает ВСЕ элементы (текст, цвета, layout)
- 🤖 Генерирует промпты для Midjourney и Flux
- 📐 Определяет позиции элементов
- 🎨 Анализирует стиль и эмоции

---

### 2. **Character Generator** (`src/generators/character-generator.js`)

**Purpose:** Генерация людей/персонажей

**Technology:** Midjourney API (unofficial)

**Input:**
```javascript
prompt: "professional portrait photography of young child, happy expression, photorealistic, studio lighting --v 6 --ar 1:1"
```

**Output:**
```javascript
imageUrl: "https://cdn.midjourney.com/..."
```

**Key Features:**
- 🎨 Генерация по текстовому промпту
- ⏱️ Async polling (ждёт завершения)
- 🔍 Опциональный upscale
- ⚡ Быстрый режим (fast mode)

---

### 3. **Background Generator** (`src/generators/background-generator.js`)

**Purpose:** Генерация фонов

**Technology:** Replicate API → Flux 1.1 Pro

**Input:**
```javascript
prompt: "smooth gradient background from #FF6B6B to #4ECDC4, modern, professional"
options: { aspectRatio: "1:1" }
```

**Output:**
```javascript
imageUrl: "https://replicate.delivery/..."
```

**Key Features:**
- 🌄 Высококачественные фоны
- 🎨 Градиенты, текстуры, абстракции
- 📏 Настраиваемые размеры
- ⚡ Быстрая генерация (~30 сек)

---

### 4. **Figma Composer** (`src/generators/figma-composer.js`)

**Purpose:** Финальная композиция креатива

**Technology:** Figma API + Sharp (image processing)

**Workflow:**
```
1. Fetch Figma template via API
2. Export template as base image
3. Composite layers with Sharp:
   - Background layer
   - Character/main image
   - Logo
   - Text overlays
4. Export final PNG
```

**Input:**
```javascript
analysis: { ... },
assets: {
  characterUrl: "...",
  backgroundUrl: "...",
  logoUrl: "..."
}
```

**Output:**
```javascript
Buffer (PNG image)
```

**Key Features:**
- 🎨 Template-based composition
- 📐 Автоматическое позиционирование
- 🔀 Замена элементов
- 🖼️ High-quality output (PNG, 2x scale)

**Note:** Figma API ограничена (read-only), поэтому используем Sharp для композиции

---

### 5. **Supabase Service** (`src/services/supabase-client.js`)

**Purpose:** Storage и Database

**Features:**
- 📊 Database: хранение метаданных
- 🗄️ Storage: хранение изображений
- 🔄 CRUD операции

**Database Schema:**
```sql
creatives {
  id: uuid,
  competitor_name: text,
  original_image_url: text,
  analysis: jsonb,
  generated_character_url: text,
  generated_background_url: text,
  generated_image_url: text,
  figma_file_id: text,
  status: enum('pending', 'analyzing', 'generating', 'completed', 'failed'),
  error_message: text,
  created_at: timestamp,
  updated_at: timestamp
}
```

**Storage Buckets:**
- `generated-creatives/characters/` - персонажи
- `generated-creatives/backgrounds/` - фоны
- `generated-creatives/finals/` - финальные креативы

---

## 🔄 Pipeline Flow

### Full Cycle (`generateFromCompetitor`)

```javascript
Input: Competitor Ad URL
  │
  ├─> 1. Create DB record (status: pending)
  │
  ├─> 2. ANALYZE with OpenRouter
  │      - Extract all elements
  │      - Generate prompts
  │      - Save analysis to DB
  │      status: analyzing → complete
  │
  ├─> 3. GENERATE CHARACTER (if needed)
  │      - Use Midjourney API
  │      - Upload to Supabase Storage
  │      - Update DB with URL
  │      status: generating
  │
  ├─> 4. GENERATE BACKGROUND
  │      - Use Flux via Replicate
  │      - Upload to Supabase Storage
  │      - Update DB with URL
  │
  ├─> 5. COMPOSE with Figma/Sharp
  │      - Load template
  │      - Composite all layers
  │      - Replace brand info
  │      - Upload final creative
  │      status: completed
  │
  └─> Output: Final Creative URL
```

**Time:** 2-3 minutes per creative
**Cost:** $0.10-0.20 per creative

---

## 🎯 Brand Replacement Logic

### Text Replacement
```javascript
// Original (competitor)
"Бесплатный урок в BrightChamps!"

// Transformed (your brand)
"Бесплатный урок в Kodland!"
```

### Logo Replacement
```javascript
// Original
competitor-logo.png (from analysis)

// Transformed
kodland-logo.png (from BRAND_LOGO_URL)
```

### Color Adaptation
- Сохраняется стиль конкурента
- Опционально: замена на brand colors
- Автоматический цветовой баланс

---

## 📦 Module Structure

```
src/
├── analyzers/
│   └── creative-analyzer.js       # OpenRouter integration
│
├── generators/
│   ├── character-generator.js     # Midjourney integration
│   ├── background-generator.js    # Flux/Replicate integration
│   └── figma-composer.js          # Figma API + Sharp composition
│
├── services/
│   └── supabase-client.js         # Database & Storage
│
├── utils/
│   └── prompt-templates.js        # AI prompts
│
├── index.js                       # Main pipeline
├── cli.js                         # CLI interface
├── setup.js                       # DB setup script
└── test.js                        # Configuration test
```

---

## 🔌 API Integrations

### OpenRouter (Analysis)
```javascript
POST https://openrouter.ai/api/v1/chat/completions
Model: anthropic/claude-3.5-sonnet
Input: Image URL + Analysis Prompt
Output: Structured JSON analysis
Cost: ~$0.01-0.05 per analysis
```

### Midjourney (Characters)
```javascript
POST https://api.midjourneyapi.xyz/mj/v2/imagine
Input: Text prompt
Output: Image URL (after polling)
Cost: ~$0.05-0.10 per image
```

### Replicate/Flux (Backgrounds)
```javascript
POST https://api.replicate.com/v1/predictions
Model: black-forest-labs/flux-1.1-pro
Input: Text prompt + aspect ratio
Output: Image URL
Cost: ~$0.04-0.08 per image
```

### Figma (Templates)
```javascript
GET https://api.figma.com/v1/files/{file_id}
GET https://api.figma.com/v1/images/{file_id}?ids={node_id}
Input: File ID + Node ID
Output: File structure / Exported PNG
Cost: Free (read-only)
```

---

## 🚀 Deployment Options

### Option 1: Local CLI
```bash
npm run full -- --url "..." --competitor "..."
```
- ✅ Простота
- ✅ Полный контроль
- ❌ Требует запуска вручную

### Option 2: Node.js Script
```javascript
import { CreativeGenerator } from './src/index.js';
const generator = new CreativeGenerator();
await generator.generateFromCompetitor(url, name);
```
- ✅ Программная автоматизация
- ✅ Batch processing
- ✅ Интеграция с другими системами

### Option 3: API Server (future)
```javascript
// Express server
app.post('/api/generate', async (req, res) => {
  const result = await generator.generateFromCompetitor(...);
  res.json(result);
});
```
- ✅ REST API
- ✅ Multi-user
- ✅ Web interface

---

## 🔒 Security

- ✅ API keys в `.env` (не в git)
- ✅ Supabase Service Role Key (server-side only)
- ✅ Storage buckets (public read, authenticated write)
- ✅ Rate limiting (через API providers)

---

## 📈 Scalability

**Current:** Single-threaded pipeline
- ~2-3 min per creative
- ~20-30 creatives per hour

**Future improvements:**
- Parallel processing (multiple creatives simultaneously)
- Queue system (Bull/Redis)
- Caching (repeated elements)
- Background jobs (Apify Actor?)

---

## 🎯 Next Steps

1. ✅ Setup OpenRouter API
2. ✅ Create Figma template
3. ✅ Get Replicate API key
4. ⚠️ Optionally: Midjourney API
5. ⚠️ Optionally: Upload brand logo
6. 🚀 Generate first creative!

---

**Архитектура готова к production использованию!** 🎨✨


# ⚡ Quick Start

## Минимальная настройка для старта (5 минут)

### 1. Получите OpenRouter API Key

```bash
1. Зайдите на https://openrouter.ai/
2. Sign Up / Login
3. Settings → API Keys → Create Key
4. Пополните баланс $5-10
```

Добавьте в `.env`:
```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxx
```

### 2. Создайте простой Figma шаблон (или пропустите)

**Вариант A: Figma шаблон**
- Создайте Frame 1080x1080
- Назовите слои: Background, Main Image, Logo, Headline, Offer, CTA Button
- Скопируйте File ID и Node ID в `.env`

**Вариант B: Без Figma (проще для старта)**
- Пропустите Figma
- Используется только Sharp для композиции

### 3. Получите Replicate API Key

```bash
1. https://replicate.com/
2. Account → API tokens
3. Copy token
```

Добавьте в `.env`:
```env
REPLICATE_API_KEY=r8_xxxxxxxxxxxxxxx
```

### 4. Setup Database

```bash
npm run setup
```

### 5. Тест!

```bash
npm run test
```

---

## 🎯 Ваш первый креатив

### Шаг 1: Возьмите URL креатива конкурента

Например, из вашего Apify scraper:
- Откройте Google Sheets с данными конкурентов
- Найдите интересный креатив
- Скопируйте URL из колонки "Image URLs"

### Шаг 2: Запустите анализ

```bash
npm run analyze -- \
  --url "https://scontent.xx.fbcdn.net/v/t45..." \
  --competitor "BrightChamps"
```

Результат:
```
📊 Analysis Results:
ID: 123e4567-e89b-12d3-a456-426614174000
Headline: Бесплатный урок программирования
Offer: Скидка 50% на первый месяц
CTA: Записаться сейчас
Style: realistic
Has People: ✅

✨ Use this ID to generate: 123e4567-e89b-12d3-a456-426614174000
```

### Шаг 3: Генерируйте свой креатив

```bash
npm run generate -- --id "123e4567-e89b-12d3-a456-426614174000"
```

Или сразу полный цикл:

```bash
npm run full -- \
  --url "https://scontent.xx.fbcdn.net/v/t45..." \
  --competitor "BrightChamps"
```

---

## 📊 Интеграция с Competitors-scrapper

### Автоматизация:

1. Запустите Apify scraper (собирает конкурентов)
2. Данные попадают в Google Sheets
3. Выберите лучшие креативы (по Competitive Strength)
4. Запустите `npm run full` для каждого
5. Получите свои креативы в Supabase!

### Пример скрипта интеграции:

```javascript
// batch-generate.js
import { CreativeGenerator } from './src/index.js';

const topCompetitorAds = [
  { url: 'https://...', name: 'BrightChamps' },
  { url: 'https://...', name: 'Kodland Indonesia' },
  // ... еще из Google Sheets
];

for (const ad of topCompetitorAds) {
  await generator.generateFromCompetitor(ad.url, ad.name);
}
```

---

## 🎨 Настройка бренда

В `.env`:

```env
BRAND_NAME=Kodland
BRAND_LOGO_URL=https://kodland.com/logo.png
BRAND_COLORS=["#FF6B6B", "#4ECDC4", "#45B7D1"]
```

Система автоматически:
- ✅ Заменит название конкурента на Kodland
- ✅ Вставит ваш логотип
- ✅ Сохранит стиль и структуру креатива

---

## 🚀 Готовы к production!

Минимальная конфигурация для старта:
- ✅ OpenRouter API (обязательно)
- ✅ Replicate API (обязательно)
- ⚠️ Figma (опционально, можно без него)
- ⚠️ Midjourney (опционально, можно Replicate SDXL)

**Стоимость:** ~$0.10-0.20 за креатив

**Время:** ~2-3 минуты на креатив

---

Вопросы? Проверьте `SETUP_GUIDE.md` для детальных инструкций!


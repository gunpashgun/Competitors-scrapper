# 🚀 Apify Setup Guide

## Архитектура решения

```
┌─────────────────────────────────────────────────────────┐
│ Actor 1: Creative Scraper (уже существует)             │
│ ├─ Собирает креативы конкурентов из Meta Ad Library    │
│ └─ Сохраняет в Google Sheets с ad_id и image_url       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Actor 2: Creative Batch Processor (НОВЫЙ!)             │
│ ├─ Input: массив image URLs                            │
│ ├─ Анализирует каждый с GPT-4o Vision                  │
│ ├─ Удаляет текст с OpenAI gpt-image-1                  │
│ ├─ Генерирует layout JSON для Figma                    │
│ └─ Output: Dataset с clean images + layouts            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Figma Plugin: Creative Generator                        │
│ ├─ Загружает batch из Apify Dataset                    │
│ └─ Создает N фреймов с вашим брендом                   │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Шаг 1: Деплой Actor 2

### Вариант A: Через Git (рекомендуется)

1. **Запушить код в Git**:
```bash
cd /Users/pavelloucker/Documents/Creative-Generator
git add apify-batch-processor/
git commit -m "Add Creative Batch Processor actor"
git push origin main
```

2. **Настроить Actor в Apify Console**:
   - Откройте: https://console.apify.com/organization/MLuL6fSrXc3YfYDhQ/actors/xJuSLc35Wj7ZnePKZ/source
   - **Settings** → **Source** → **Git repository**
   - Repository: ваш репозиторий
   - Branch: `main`
   - **Root directory**: `apify-batch-processor` ⚠️ **ВАЖНО!**
   - Save

3. **Установить API Keys**:
   - **Settings** → **Environment variables**
   - Добавить:
     - `OPENROUTER_API_KEY` = ваш ключ
     - `OPENAI_API_KEY` = ваш ключ

4. **Build & Deploy**:
   - Нажмите **Build** → дождитесь завершения
   - Протестируйте на вкладке **Console**

### Вариант B: Загрузить файлы напрямую

1. В Apify Console выберите **Source type**: **Multiple source files**
2. Загрузите все файлы из `apify-batch-processor/`:
   - `src/main.js`
   - `package.json`
   - `Dockerfile`
   - `.actor/actor.json`
   - `.actor/input_schema.json`
   - `README.md`

---

## 🧪 Шаг 2: Протестировать Actor

### Тестовый Input:

```json
{
  "imageUrls": [
    "https://osokxlweresllgbclkme.supabase.co/storage/v1/object/public/assets/573872464_1134613832158311_8885341090045370299_n.jpg"
  ],
  "yourBrand": "Algonova"
}
```

### Ожидаемый Output:

Dataset с одним элементом:
```json
{
  "itemId": "creative-1",
  "originalUrl": "https://...",
  "cleanImageBase64": "iVBORw0KGgo...",
  "layoutData": {
    "textBlocks": [...]
  },
  "status": "success"
}
```

---

## 🔗 Шаг 3: Интеграция с Figma Plugin

### Обновить Figma Plugin UI:

Добавить новое поле для batch обработки:

```html
<!-- В figma-plugin/ui.html -->

<div class="form-group">
  <label for="apifyDatasetId">📦 Apify Dataset ID (Batch)</label>
  <input type="text" id="apifyDatasetId" placeholder="dataset-abc123">
  <button onclick="loadFromApifyDataset()">Load Batch</button>
</div>
```

### Обновить Figma Plugin Code:

```javascript
// В figma-plugin/code.js

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'load-apify-batch') {
    const { datasetId, apifyToken } = msg.data;
    
    // Fetch dataset from Apify
    const response = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`
    );
    const items = await response.json();
    
    // Create frame for each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Decode base64 image
      const imageBytes = Uint8Array.from(atob(item.cleanImageBase64), c => c.charCodeAt(0));
      
      // Create creative from layout
      await createCreativeFromLayout({
        cleanImageBytes: Array.from(imageBytes),
        layout: item.layoutData,
        layoutSourceName: item.itemId
      });
      
      // Position frames in grid
      const frame = figma.currentPage.selection[0];
      frame.x = (i % 3) * 800;
      frame.y = Math.floor(i / 3) * 1400;
    }
    
    figma.notify(`✅ Created ${items.length} creatives from batch!`);
  }
};
```

---

## 🎯 Шаг 4: End-to-End Workflow

### Полный сценарий использования:

1. **Собрать креативы конкурентов** (Actor 1):
   ```json
   Input: { "competitors": ["kodland", "digikidz"] }
   Output: Google Sheets с ad_id, image_url, активность
   ```

2. **Выбрать лучшие креативы**:
   - Открыть Google Sheets
   - Отфильтровать по активности (например, >30 дней)
   - Скопировать 3-5 image URLs

3. **Обработать batch** (Actor 2):
   ```json
   Input: {
     "imageUrls": ["url1", "url2", "url3"],
     "yourBrand": "Algonova"
   }
   Output: Dataset ID
   ```

4. **Создать креативы в Figma**:
   - Открыть Figma plugin
   - Вставить Dataset ID
   - Нажать "Load Batch"
   - Редактировать тексты если нужно
   - Экспортировать

---

## 💡 Продвинутые сценарии

### Автоматический пайплайн через Apify Schedules:

1. **Schedule 1**: Каждую неделю запускать Actor 1 (scraper)
2. **Schedule 2**: Каждую неделю брать топ-5 креативов и запускать Actor 2
3. Получать email с Dataset ID

### Интеграция с Zapier:

1. Trigger: Новый row в Google Sheets
2. Action: Запустить Actor 2 с image URL
3. Action: Отправить Dataset ID в Slack

---

## 🐛 Troubleshooting

### "OPENROUTER_API_KEY not found"
- Проверьте Environment Variables в Settings актора
- Убедитесь что ключ валидный на https://openrouter.ai/keys

### "OpenAI API quota exceeded"
- Проверьте баланс на https://platform.openai.com/usage
- Добавьте payment method

### "Image too large"
- Максимальный размер для gpt-image-1: 4MB
- Actor автоматически ресайзит до 1024x1024

### Dataset пустой
- Проверьте логи актора в Console
- Убедитесь что image URLs доступны (не 403/404)

---

## 📊 Стоимость

### На 1 креатив:
- GPT-4o Vision анализ: ~$0.02
- OpenAI gpt-image-1: ~$0.15
- Итого: **~$0.17 на креатив**

### Batch из 10 креативов:
- **~$1.70**
- Runtime: ~5-10 минут

### Оптимизация:
- Кешировать анализ креативов
- Использовать более дешевые модели для простых креативов
- Batch обработка выгоднее чем по одному

---

## 🎉 Готово!

Теперь у вас полностью автоматический пайплайн:

1. ✅ Сбор креативов конкурентов
2. ✅ Batch анализ + удаление текста
3. ✅ Генерация в Figma с вашим брендом

Вопросы? Пишите в Slack! 🚀


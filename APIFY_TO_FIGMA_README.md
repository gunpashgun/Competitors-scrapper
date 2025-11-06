# 🚀 Apify to Figma Automation

Автоматический экспорт обработанных креативов из Apify в удобный формат для Figma плагина.

## 🎯 Цель

Упростить workflow: вместо ручного копирования JSON из Apify, скрипт автоматически:
1. Загружает Dataset из Apify (по ID или Run ID)
2. Экспортирует в файл для плагина
3. Показывает инструкции для следующих шагов

## 📦 Установка

Все зависимости уже установлены в проекте.

## 🔑 Настройка

Добавьте в `.env`:

```bash
# Figma
FIGMA_ACCESS_TOKEN=figd_...  # Уже есть
FIGMA_FILE_ID=YOUR_FILE_ID   # ID вашего Figma файла

# Apify (опционально, для автозагрузки)
APIFY_API_TOKEN=apify_api_... # Ваш Apify API token
```

### Получить Figma File ID:

1. Откройте файл в Figma
2. URL выглядит так: `https://www.figma.com/file/ABC123DEF456/MyFile`
3. `ABC123DEF456` - это ваш File ID

### Получить Apify API Token:

1. https://console.apify.com/account/integrations
2. **API tokens** → **Create new token**
3. Скопируйте и добавьте в `.env`

## 🚀 Использование

### Вариант 1: Из Apify Dataset ID

```bash
node apify-to-figma.js --dataset-id YOUR_DATASET_ID
```

### Вариант 2: Из Apify Run ID

```bash
node apify-to-figma.js --run-id YOUR_RUN_ID
```

### Вариант 3: Из локального JSON

```bash
node apify-to-figma.js --json dataset.json
```

### Опции:

```bash
--file-id <id>     # Figma file ID (или из .env)
--columns <n>      # Колонок в сетке (default: 2)
--spacing <px>     # Отступ между креативами (default: 100)
```

## 📖 Пример

```bash
# Загрузить Dataset и подготовить для Figma
node apify-to-figma.js --run-id kHpZ9X7TqP3mNvL8w

# С кастомными настройками
node apify-to-figma.js \
  --dataset-id abc123def456 \
  --columns 3 \
  --spacing 150
```

## 📊 Output

Скрипт создаёт файл `figma-export-dataset.json` который можно загрузить в Figma плагин:

```
✅ Dataset exported to: figma-export-dataset.json

📋 Next steps:
1. Open your Figma file
2. Run the Batch Creative Generator plugin
3. Load the exported JSON: figma-export-dataset.json
```

## 🔄 Полный Workflow

```
1. Apify Scraper
   ↓
   Google Sheets (Ad IDs + URLs)

2. Apify Batch Processor
   ↓
   Dataset (cleanImageBase64 + layoutData)

3. apify-to-figma.js
   ↓
   figma-export-dataset.json

4. Figma Plugin
   ↓
   Ready-to-edit Creatives! 🎉
```

## ⚠️ Ограничения Figma REST API

Figma REST API имеет **read-only** доступ для большинства операций. Это означает:

- ❌ Нельзя создавать nodes через REST API
- ❌ Нельзя загружать изображения через REST API
- ✅ Можно читать структуру файла
- ✅ Можно экспортировать изображения

**Поэтому** мы используем **Figma Plugin**, который имеет полный доступ к созданию и редактированию nodes.

Этот скрипт - это **helper** для автоматизации загрузки данных из Apify, но финальная генерация креативов происходит в плагине.

## 🎯 Планы на будущее

Возможные улучшения:

1. **Webhook integration**: Автоматический запуск при завершении Apify Run
2. **Direct Figma integration**: Использовать Figma Web API (требует OAuth)
3. **Batch export**: Автоматический экспорт готовых креативов из Figma

## 🐛 Troubleshooting

### "APIFY_API_TOKEN not found"

Либо добавьте токен в `.env`, либо используйте `--json` для загрузки из файла.

### "FIGMA_FILE_ID not set"

Добавьте `FIGMA_FILE_ID` в `.env` или передайте через `--file-id`.

### Dataset не найден

Проверьте:
- Dataset ID правильный
- Run завершился успешно
- Apify API token действителен

## 📚 Дополнительно

- [Figma Plugin README](figma-plugin/BATCH_PLUGIN_README.md)
- [Apify Setup Guide](APIFY_SETUP.md)


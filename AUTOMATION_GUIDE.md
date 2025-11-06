# 🤖 Полная Автоматизация Workflow

## 🎯 Цель

Полностью автоматизировать процесс: **Apify → Figma** без ручного копирования JSON.

---

## 📊 Архитектура

```
┌─────────────────┐
│  Apify Scraper  │ Находит конкурентов
└────────┬────────┘
         │ Ad IDs + Image URLs
         ↓
┌─────────────────────┐
│ Apify Batch         │ Анализ + Inpainting
│ Processor           │
└────────┬────────────┘
         │ Webhook
         ↓
┌─────────────────────┐
│ Webhook Server      │ Принимает уведомление
│ (Node.js)           │ Сохраняет данные
└────────┬────────────┘
         │ HTTP API
         ↓
┌─────────────────────┐
│ Figma Plugin        │ Авто-загрузка
│ (кнопка Auto-Load)  │ Генерация креативов
└─────────────────────┘
```

---

## 🚀 Варианты Автоматизации

### Вариант 1: Webhook Server (Полная автоматизация)

**Преимущества:**
- ✅ Полностью автоматично
- ✅ Плагин сам загружает данные
- ✅ Не нужно копировать JSON

**Как работает:**

1. **Запустите Webhook Server:**
   ```bash
   node figma-webhook-server.js
   ```

2. **Настройте Apify Webhook:**
   - Apify Console → Actor → Integrations → Webhooks
   - Event: `Actor run succeeded`
   - URL: `http://your-server:3000/webhook`

3. **В Figma плагине:**
   - Нажмите **"🔄 Auto-Load Latest"**
   - Данные загрузятся автоматически!

---

### Вариант 2: Ручная загрузка через команду (Полу-автоматизация)

**Преимущества:**
- ✅ Не нужен webhook
- ✅ Прост в настройке
- ⚠️ Требует одну команду после Apify Run

**Как работает:**

1. **Запустите Apify Batch Processor**

2. **Скопируйте Run ID** из Apify Console

3. **Запустите команду:**
   ```bash
   node apify-to-figma.js --run-id YOUR_RUN_ID
   ```

4. **Загрузите в Figma:**
   - Откройте `figma-export-dataset.json`
   - Вставьте в плагин

---

### Вариант 3: Интеграция с Google Sheets (Cloud)

**Преимущества:**
- ✅ Работает из любого места
- ✅ Не нужен локальный сервер
- ✅ Можно настроить автообновление

**Как работает:**

1. **Настройте Google Apps Script** (будет создан отдельно)
2. **Apify → Google Sheets** (webhook)
3. **Figma Plugin → Google Sheets** (API)

---

## 🔧 Настройка Webhook Server

### 1. Установка зависимостей

```bash
cd /Users/pavelloucker/Documents/Creative-Generator
npm install express cors apify-client
```

### 2. Запуск сервера

```bash
node figma-webhook-server.js
```

Сервер запустится на `http://localhost:3000`

### 3. Настройка Apify Webhook

1. Откройте Apify Console
2. Перейдите в Actor → **Integrations** → **Webhooks**
3. Создайте новый webhook:
   - **Event type**: `Actor run succeeded`
   - **Request URL**: `http://your-server-ip:3000/webhook`
   - **Payload template**: Default

### 4. (Опционально) Деплой на сервер

Для production используйте:

**Option A: Heroku**
```bash
heroku create
git push heroku main
heroku config:set APIFY_API_TOKEN=your_token
```

**Option B: DigitalOcean/AWS**
- Используйте PM2 для запуска
- Настройте reverse proxy (Nginx)
- Добавьте HTTPS (Let's Encrypt)

---

## 🎨 Использование в Figma

### Метод 1: Auto-Load (с webhook server)

1. **Убедитесь что webhook server запущен**
   ```bash
   node figma-webhook-server.js
   ```

2. **В Figma плагине:**
   - Нажмите **"🔄 Auto-Load Latest"**
   - Данные загрузятся из `http://localhost:3000/latest-creatives`
   - Нажмите **"🚀 Generate Creatives"**

### Метод 2: Ручная вставка (без server)

1. **Получите JSON из Apify:**
   - Storage → Datasets → Download JSON

2. **В Figma плагине:**
   - Вставьте JSON в текстовое поле
   - Нажмите **"🚀 Generate Creatives"**

---

## 📡 API Endpoints

Webhook Server предоставляет следующие endpoints:

### `POST /webhook`
Принимает уведомления от Apify.

**Request (от Apify):**
```json
{
  "resource": {
    "id": "run_id",
    "status": "SUCCEEDED",
    "defaultDatasetId": "dataset_id"
  }
}
```

**Response:**
```json
{
  "success": true,
  "runId": "run_id",
  "creativesCount": 2
}
```

---

### `GET /latest-creatives`
Возвращает последние обработанные креативы для Figma.

**Response:**
```json
{
  "runId": "abc123",
  "creatives": [
    {
      "itemId": "creative-1",
      "cleanImageBase64": "iVBORw0KG...",
      "layoutData": { ... }
    }
  ],
  "timestamp": "2025-11-06T19:00:00.000Z"
}
```

---

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "hasCreatives": true,
  "creativesCount": 2,
  "latestRunId": "abc123"
}
```

---

### `POST /load-from-run`
Ручная загрузка из конкретного Run ID.

**Request:**
```json
{
  "runId": "abc123"
}
```

**Response:**
```json
{
  "success": true,
  "runId": "abc123",
  "creativesCount": 2
}
```

---

## 🔐 Безопасность

### Для Production:

1. **Добавьте аутентификацию:**
   ```javascript
   app.use((req, res, next) => {
     const token = req.headers['x-auth-token'];
     if (token !== process.env.WEBHOOK_SECRET) {
       return res.status(401).json({ error: 'Unauthorized' });
     }
     next();
   });
   ```

2. **Используйте HTTPS**

3. **Ограничьте CORS:**
   ```javascript
   app.use(cors({
     origin: 'https://www.figma.com'
   }));
   ```

---

## 🐛 Troubleshooting

### Webhook server не получает данные

1. Проверьте что сервер запущен:
   ```bash
   curl http://localhost:3000/health
   ```

2. Проверьте webhook в Apify:
   - Apify Console → Webhooks → View logs

3. Убедитесь что URL правильный (не localhost для cloud Apify)

---

### Auto-Load не работает в Figma

1. Проверьте что URL указан правильно
2. Webhook server должен быть запущен
3. Проверьте network access в `manifest-batch.json`

---

### CORS ошибки

Добавьте ваш домен в `figma-webhook-server.js`:
```javascript
app.use(cors({
  origin: ['https://www.figma.com', 'http://localhost:3000']
}));
```

---

## 📊 Мониторинг

### Логи Webhook Server

Сервер выводит подробные логи:
```
📥 Received webhook from Apify
🔄 Run abc123 status: SUCCEEDED
📊 Fetching dataset def456...
✅ Processed 2 creatives
📄 Saved to figma-export-latest.json
```

### Логи Apify

Проверьте в Apify Console → Run → Logs:
```
✅ Batch processing complete!
📊 Success: 2/2
```

---

## 🎯 Полный Workflow (Production Ready)

1. **Scraper запускается по расписанию** (каждый день)
2. **Находит новые креативы** → Google Sheets
3. **Batch Processor автоматически запускается** (webhook или cron)
4. **Обрабатывает креативы** → Dataset
5. **Отправляет webhook** на ваш сервер
6. **Сервер сохраняет данные**
7. **Figma плагин Auto-Load** загружает последние креативы
8. **Дизайнер просто нажимает Generate** 🎉

---

## 📝 Следующие шаги

- [ ] Настроить webhook server в production (Heroku/AWS)
- [ ] Добавить аутентификацию
- [ ] Настроить мониторинг (Sentry/LogRocket)
- [ ] Добавить интеграцию с Slack (уведомления)
- [ ] Создать Dashboard для статистики


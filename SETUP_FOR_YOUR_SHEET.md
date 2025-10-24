# 🎯 Настройка для вашей таблицы

## 📊 Ваша таблица
**Название:** Competitors  
**URL:** https://docs.google.com/spreadsheets/d/1eTampXg4CjPCPD5q6-GYIqcFeNQRHmdfScCL3zcvlIw/edit  
**Spreadsheet ID:** `1eTampXg4CjPCPD5q6-GYIqcFeNQRHmdfScCL3zcvlIw`

---

## ⚡ Быстрая настройка (5 минут)

### Шаг 1: Создайте Service Account

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте проект (если еще нет)
3. Перейдите: **IAM & Admin** → **Service Accounts**
4. Нажмите **Create Service Account**
5. Название: `apify-sheets-exporter`
6. Нажмите **Create and Continue** → **Done**

### Шаг 2: Создайте JSON ключ

1. Нажмите на созданный Service Account
2. Вкладка **Keys** → **Add Key** → **Create New Key**
3. Тип: **JSON**
4. Нажмите **Create** - файл скачается автоматически

### Шаг 3: Включите Google Sheets API

1. В Google Cloud: **APIs & Services** → **Library**
2. Найдите "Google Sheets API"
3. Нажмите **Enable**

### Шаг 4: Предоставьте доступ к таблице

1. Откройте скачанный JSON файл
2. Найдите поле `client_email`, например:
   ```
   "client_email": "apify-sheets-exporter@your-project.iam.gserviceaccount.com"
   ```
3. Откройте вашу таблицу: https://docs.google.com/spreadsheets/d/1eTampXg4CjPCPD5q6-GYIqcFeNQRHmdfScCL3zcvlIw/edit
4. Нажмите кнопку **Share** (Поделиться) в правом верхнем углу
5. Вставьте `client_email` из JSON файла
6. Выберите роль: **Editor** (Редактор)
7. Снимите галочку **Notify people** (не уведомлять)
8. Нажмите **Share**

### Шаг 5: Настройте Input в Apify

Используйте готовый файл `INPUT_EXAMPLE.json` или скопируйте конфигурацию:

```json
{
    "searchTerms": "kursus coding anak\nbelajar programming anak\ncoding untuk anak",
    "country": "ID",
    "maxPages": 10,
    "minActiveDays": 7,
    "useProxy": false,
    "enableGoogleSheets": true,
    "googleSheetsSpreadsheetId": "1eTampXg4CjPCPD5q6-GYIqcFeNQRHmdfScCL3zcvlIw",
    "googleSheetsName": "Competitor Ads",
    "googleServiceAccountKey": "{ ВСТАВЬТЕ СЮДА ВЕСЬ JSON ИЗ СКАЧАННОГО ФАЙЛА }"
}
```

**ВАЖНО:** В поле `googleServiceAccountKey` вставьте **весь JSON** из скачанного файла, включая фигурные скобки `{ }`.

Пример JSON ключа (вставьте целиком):
```json
{
  "type": "service_account",
  "project_id": "your-project-123456",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "apify-sheets-exporter@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

### Шаг 6: Запустите Actor 🚀

1. Запустите Actor через Apify Console
2. Дождитесь завершения
3. Откройте таблицу: https://docs.google.com/spreadsheets/d/1eTampXg4CjPCPD5q6-GYIqcFeNQRHmdfScCL3zcvlIw/edit
4. Данные появятся на листе **"Competitor Ads"**!

---

## 📊 Что будет в таблице?

После успешного запуска вы увидите:

### Заголовки (первая строка):
- Ad ID, Advertiser Name, Ad Text, Active Days
- Total Images, Total Videos, Has Carousel, Has Video
- Media Type, Age Targeting, Course Subjects
- Offers, Pricing Info
- Quality Score, Content Relevance, Media Quality
- Effectiveness Score, Content Type, Age Focus
- Competitive Strength, Search Term, Scraped At
- Image URLs, Video URLs

### Данные:
Каждая строка = одно рекламное объявление конкурента с полной информацией

### Форматирование:
- ✅ Заголовки жирным шрифтом
- ✅ Темный фон у заголовков
- ✅ Первая строка закреплена
- ✅ 24 колонки с детальными данными

---

## 🔍 Что можно делать с данными?

1. **Фильтровать** по Quality Score, Competitive Strength
2. **Сортировать** по Active Days (самые успешные объявления)
3. **Анализировать** какие темы популярны у конкурентов
4. **Изучать** тексты и офферы конкурентов
5. **Просматривать медиа** через ссылки в колонках Image URLs и Video URLs
6. **Создавать графики** для визуализации

---

## ⚠️ Важно знать

1. **Данные перезаписываются** при каждом запуске Actor
2. **Чтобы сохранить историю** - меняйте `googleSheetsName` для каждого запуска:
   ```json
   "googleSheetsName": "Competitor Ads 2025-01-15"
   ```
3. **Лист создается автоматически** если его нет
4. **Максимум 5 млн ячеек** на одну таблицу (лимит Google Sheets)

---

## 🆘 Решение проблем

### ❌ "The caller does not have permission"
→ Убедитесь, что вы дали доступ **Editor** для `client_email` из Service Account

### ❌ "Invalid credentials"
→ Проверьте, что скопировали **весь JSON** целиком, включая `{ }` в начале и конце

### ❌ "Unable to parse range"
→ Проверьте Spreadsheet ID: `1eTampXg4CjPCPD5q6-GYIqcFeNQRHmdfScCL3zcvlIw`

### ❌ "Access not configured"
→ Убедитесь, что включили **Google Sheets API** в Google Cloud Console

---

## 💡 Полезные советы

1. **Первый запуск** - используйте минимум поисковых запросов для теста
2. **Проверяйте логи** Actor на наличие ошибок экспорта
3. **Сохраняйте JSON ключ** в безопасном месте
4. **Используйте фильтры** Google Sheets для анализа конкурентов
5. **Настройте Schedule** в Apify для регулярного обновления данных

---

## 📞 Что дальше?

После первого успешного запуска:
1. ✅ Проверьте данные в таблице
2. ✅ Настройте расписание автоматических запусков
3. ✅ Создайте дашборд для визуализации
4. ✅ Анализируйте стратегии конкурентов

---

**Готово!** Ваша таблица настроена и готова к приему данных! 🎉

**Ссылка на таблицу:** https://docs.google.com/spreadsheets/d/1eTampXg4CjPCPD5q6-GYIqcFeNQRHmdfScCL3zcvlIw/edit


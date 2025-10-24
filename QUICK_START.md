# ⚡ Быстрый старт - Google Sheets интеграция

## 🎯 За 5 минут настроите экспорт в Google Sheets

### Шаг 1: Google Cloud (2 минуты)

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект
3. Перейдите в **IAM & Admin → Service Accounts**
4. Создайте Service Account: `apify-sheets-exporter`
5. Нажмите **Keys → Add Key → Create New Key → JSON**
6. Скачайте JSON файл (сохраните его!)

### Шаг 2: Включите API (30 секунд)

1. В Google Cloud: **APIs & Services → Library**
2. Найдите "Google Sheets API"
3. Нажмите **Enable**

### Шаг 3: Google Sheets (1 минута)

1. Создайте новую таблицу на [sheets.google.com](https://sheets.google.com)
2. Скопируйте ID из URL:
   ```
   https://docs.google.com/spreadsheets/d/1BxiMVs0X...upms/edit
                                          ^^^^^^^^
                                          Этот ID
   ```
3. Откройте JSON файл, найдите `client_email`
4. В Google Sheets нажмите **Share** (Поделиться)
5. Вставьте `client_email`, выберите **Editor**, нажмите **Share**

### Шаг 4: Настройка Apify (1 минута)

В Input вашего Actor включите:

```json
{
  "enableGoogleSheets": true,
  "googleSheetsSpreadsheetId": "ВАШ_ID_ИЗ_ШАГА_3",
  "googleSheetsName": "Competitor Ads",
  "googleServiceAccountKey": "{ ВЕСЬ_JSON_ИЗ_СКАЧАННОГО_ФАЙЛА }"
}
```

### Шаг 5: Запустите! 🚀

Нажмите **Start** - данные автоматически появятся в Google Sheets!

---

## 📖 Подробная инструкция

См. [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md)

## ❓ Частые вопросы

**Q: Где взять Spreadsheet ID?**  
A: Это часть URL вашей Google таблицы между `/d/` и `/edit`

**Q: Что делать с JSON ключом?**  
A: Скопируйте весь содержимое файла и вставьте в поле `googleServiceAccountKey`

**Q: Нужно ли вручную создавать лист?**  
A: Нет, он создастся автоматически с названием из `googleSheetsName`

**Q: Данные перезаписываются?**  
A: Да, при каждом запуске лист очищается и заполняется новыми данными

**Q: Можно ли накапливать данные?**  
A: Да, используйте разные названия листов для каждого запуска

## 🆘 Проблемы?

- ❌ "Invalid JSON" → Проверьте, что скопировали весь JSON целиком
- ❌ "No permission" → Убедитесь, что предоставили доступ к таблице Service Account
- ❌ "Unable to parse" → Проверьте Spreadsheet ID

## 💡 Совет

Сначала протестируйте на тестовой таблице, чтобы убедиться, что все работает!


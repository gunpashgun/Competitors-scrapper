# 📊 Настройка интеграции с Google Sheets

Это руководство поможет настроить автоматическую выгрузку данных из вашего Apify Actor в Google Sheets.

## 🎯 Шаг 1: Создание Google Cloud Project

1. Перейдите на [Google Cloud Console](https://console.cloud.google.com/)
2. Нажмите **"Select a project"** → **"New Project"**
3. Введите название проекта (например: `apify-competitor-scraper`)
4. Нажмите **"Create"**

## 🔑 Шаг 2: Создание Service Account

1. В Google Cloud Console перейдите в меню:
   ```
   IAM & Admin → Service Accounts
   ```

2. Нажмите **"+ CREATE SERVICE ACCOUNT"**

3. Заполните данные:
   - **Service account name**: `apify-sheets-exporter`
   - **Service account ID**: (автоматически заполнится)
   - **Description**: `Service account for Apify to export data to Google Sheets`

4. Нажмите **"CREATE AND CONTINUE"**

5. На шаге "Grant this service account access to project" нажмите **"CONTINUE"** (роли не требуются)

6. На шаге "Grant users access to this service account" нажмите **"DONE"**

## 🗝️ Шаг 3: Создание JSON ключа

1. Найдите созданный Service Account в списке

2. Нажмите на него, затем перейдите на вкладку **"KEYS"**

3. Нажмите **"ADD KEY"** → **"Create new key"**

4. Выберите тип **"JSON"**

5. Нажмите **"CREATE"**

6. **JSON файл автоматически скачается** на ваш компьютер
   - Сохраните его в безопасном месте
   - Этот файл содержит приватные ключи - не делитесь им!

## 📋 Шаг 4: Включение Google Sheets API

1. В Google Cloud Console перейдите:
   ```
   APIs & Services → Library
   ```

2. Найдите **"Google Sheets API"**

3. Нажмите на него и кликните **"ENABLE"**

4. Дождитесь активации API (обычно несколько секунд)

## 📊 Шаг 5: Создание и настройка Google Sheets

1. Создайте новую таблицу на [Google Sheets](https://sheets.google.com)

2. Скопируйте **Spreadsheet ID** из URL:
   ```
   https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
                                          ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
                                          Это ваш Spreadsheet ID
   ```

3. **ВАЖНО**: Откройте скачанный JSON файл и найдите поле `client_email`:
   ```json
   {
     "type": "service_account",
     "project_id": "...",
     "client_email": "apify-sheets-exporter@your-project.iam.gserviceaccount.com",
     ...
   }
   ```

4. **Предоставьте доступ**: В Google Sheets нажмите кнопку **"Share"** (Поделиться)
   - Вставьте email из `client_email`
   - Выберите роль **"Editor"** (Редактор)
   - Снимите галочку **"Notify people"** (уведомлять)
   - Нажмите **"Share"**

## ⚙️ Шаг 6: Настройка Apify Actor

1. Откройте ваш Actor на Apify Console

2. Перейдите в **"Input"**

3. Заполните следующие поля:

   ### ✅ Export to Google Sheets
   Включите эту опцию (установите `true`)

   ### 📋 Google Sheets Spreadsheet ID
   Вставьте ID из шага 5 (например: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`)

   ### 📄 Sheet Name
   Название листа в таблице (по умолчанию: `Competitor Ads`)
   - Лист будет создан автоматически, если не существует

   ### 🔐 Google Service Account Key (JSON)
   Откройте скачанный JSON файл и скопируйте **ВЕСЬ** его содержимое:
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
   
   Вставьте весь JSON как есть в поле **Google Service Account Key (JSON)**

## 🚀 Шаг 7: Запуск и проверка

1. Нажмите **"Start"** для запуска Actor

2. Дождитесь завершения сбора данных

3. В логах вы увидите:
   ```
   📊 Starting export to Google Sheets...
   ✅ Successfully exported XX ads to Google Sheets
   🔗 View your data: https://docs.google.com/spreadsheets/d/YOUR_ID
   ```

4. Откройте вашу Google Sheets таблицу - данные должны появиться автоматически!

## 📊 Структура экспортируемых данных

Данные будут экспортированы в следующих колонках:

| Колонка | Описание |
|---------|----------|
| Ad ID | Уникальный идентификатор объявления |
| Advertiser Name | Название рекламодателя |
| Ad Text | Текст объявления |
| Active Days | Количество дней активности |
| Total Images | Количество изображений |
| Total Videos | Количество видео |
| Has Carousel | Есть ли карусель |
| Has Video | Есть ли видео |
| Media Type | Тип медиа (video/carousel/single_image) |
| Age Targeting | Возрастной таргетинг |
| Course Subjects | Предметы курсов |
| Offers | Специальные предложения |
| Pricing Info | Информация о ценах |
| Quality Score | Оценка качества рекламы |
| Content Relevance | Релевантность контента |
| Media Quality | Качество медиа |
| Effectiveness Score | Оценка эффективности |
| Content Type | Тип контента |
| Age Focus | Фокус по возрасту |
| Competitive Strength | Конкурентная сила |
| Search Term | Поисковый запрос |
| Scraped At | Дата и время сбора |
| Image URLs | Ссылки на изображения |
| Video URLs | Ссылки на видео |

## 🎨 Форматирование

Таблица автоматически форматируется:
- ✅ Заголовки выделены жирным шрифтом
- ✅ Первая строка закреплена (freeze)
- ✅ Темный фон для заголовков
- ✅ Белый текст для заголовков

## ⚠️ Важные замечания

1. **Безопасность JSON ключа**:
   - Никогда не публикуйте JSON ключ в открытом доступе
   - Не коммитьте его в Git
   - Apify хранит его в зашифрованном виде (isSecret: true)

2. **Лимиты Google Sheets API**:
   - Бесплатный тариф: 100 запросов/100 секунд на пользователя
   - Обычно достаточно для большинства случаев

3. **Перезапись данных**:
   - При каждом запуске **лист очищается** и данные записываются заново
   - Это позволяет всегда иметь актуальные данные
   - Если нужно накапливать данные, создавайте новые листы с разными названиями

## 🐛 Решение проблем

### Ошибка: "Invalid Service Account JSON"
- Убедитесь, что скопировали весь JSON целиком
- Проверьте, что JSON валидный (можно проверить на jsonlint.com)

### Ошибка: "The caller does not have permission"
- Убедитесь, что вы предоставили доступ Service Account email к Google Sheets
- Проверьте, что роль **"Editor"** выбрана

### Ошибка: "Unable to parse range"
- Проверьте, что Spreadsheet ID правильный
- Убедитесь, что Google Sheets API включен в проекте

### Данные не экспортируются
- Проверьте, что опция **"Export to Google Sheets"** включена
- Убедитесь, что все поля заполнены (Spreadsheet ID, Sheet Name, Service Account Key)
- Проверьте логи Actor на наличие ошибок

## 💡 Полезные советы

1. **Тестирование**: Создайте тестовую таблицу для первых запусков
2. **Мониторинг**: Добавьте Google Sheets в закладки для быстрого доступа
3. **Автоматизация**: Настройте расписание запусков Actor в Apify для регулярного обновления данных
4. **Фильтры**: Используйте встроенные фильтры Google Sheets для анализа данных
5. **Графики**: Создавайте графики и дашборды на основе экспортированных данных

## 📞 Поддержка

Если у вас возникли проблемы:
1. Проверьте логи Actor в Apify Console
2. Убедитесь, что все шаги выполнены правильно
3. Проверьте права доступа к Google Sheets

---

**Готово!** 🎉 Теперь ваши данные автоматически экспортируются в Google Sheets после каждого запуска Actor.


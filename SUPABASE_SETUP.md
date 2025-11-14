# 🗄️ Supabase Setup Guide

## Что делает интеграция с Supabase?

Автоматически сохраняет **активные креативы конкурентов (10-20 дней)** в базу данных Supabase после каждого запуска скрейпера.

### 🖼️ Хранение изображений:
- ✅ Скачивает изображения с Facebook
- ✅ Загружает в Supabase Storage (bucket: `competitor-creatives`)
- ✅ Сохраняет публичные URL в базу данных
- ✅ Архивация на долгосрочное хранение (внешние ссылки могут протухнуть)

---

## 📋 Шаги настройки

### 1. Создайте таблицу в Supabase

1. Откройте ваш проект в Supabase: https://supabase.com/dashboard
2. Перейдите в **SQL Editor**
3. Скопируйте и выполните SQL из файла `CREATE_SUPABASE_TABLE.sql`
4. Таблица `competitor_creatives` будет создана

### 1.1. Storage Bucket (создается автоматически)

Агент автоматически создаст публичный bucket `competitor-creatives` при первом запуске.

Если хотите создать вручную:
1. Перейдите в **Storage** в Supabase Dashboard
2. Нажмите **"New bucket"**
3. Имя: `competitor-creatives`
4. Выберите **Public bucket**
5. File size limit: 10 MB

### 2. Получите credentials

1. В Supabase Dashboard перейдите в **Settings** → **API**
2. Скопируйте:
   - **Project URL** (например: `https://xyzcompany.supabase.co`)
   - **anon/public key** (начинается с `eyJhbG...`)

### 3. Настройте Apify Actor

В INPUT настройках актора:

```json
{
  "enableSupabase": true,
  "supabaseUrl": "https://your-project.supabase.co",
  "supabaseKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 🗂️ Структура таблицы

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | BIGSERIAL | Автоинкремент ID |
| `competitor_name` | TEXT | Название конкурента |
| `ad_id` | TEXT | Уникальный ID креатива (Facebook Library ID) |
| `launch_date` | DATE | Дата запуска рекламы |
| `active_days` | INTEGER | Сколько дней откручивается (10-20) |
| `image_url` | TEXT | URL изображения креатива |
| `ad_text` | TEXT | Текст объявления |
| `landing_page_url` | TEXT | Ссылка на landing page |
| `cta_button` | TEXT | Текст CTA кнопки |
| `advertiser_name` | TEXT | Имя рекламодателя |
| `created_at` | TIMESTAMP | Дата добавления в БД |
| `updated_at` | TIMESTAMP | Дата последнего обновления |

---

## 🎯 Фильтрация

Агент автоматически **сохраняет только креативы с 10-20 активными днями**:

```javascript
activeDays >= 10 && activeDays <= 20
```

Если нужно изменить диапазон, отредактируйте функцию `saveToSupabase` в `src/main.js`.

---

## 🔍 Как посмотреть данные

### Вариант 1: Supabase Table Editor
1. Откройте Supabase Dashboard
2. Перейдите в **Table Editor**
3. Выберите таблицу `competitor_creatives`

### Вариант 2: SQL Query
```sql
-- Все креативы
SELECT * FROM competitor_creatives 
ORDER BY created_at DESC;

-- По конкуренту
SELECT * FROM competitor_creatives 
WHERE competitor_name = 'Kodland Indonesia'
ORDER BY active_days DESC;

-- Статистика
SELECT 
    competitor_name,
    COUNT(*) as total_creatives,
    AVG(active_days) as avg_active_days
FROM competitor_creatives
GROUP BY competitor_name
ORDER BY total_creatives DESC;
```

---

## ⚙️ Настройки безопасности (Row Level Security)

Для продакшена рекомендуется настроить RLS:

```sql
-- Включить RLS
ALTER TABLE competitor_creatives ENABLE ROW LEVEL SECURITY;

-- Разрешить вставку с anon key
CREATE POLICY "Allow insert for anon" ON competitor_creatives
    FOR INSERT TO anon
    USING (true);

-- Разрешить обновление с anon key
CREATE POLICY "Allow update for anon" ON competitor_creatives
    FOR UPDATE TO anon
    USING (true);

-- Разрешить чтение всем
CREATE POLICY "Allow read for all" ON competitor_creatives
    FOR SELECT
    USING (true);
```

---

## 🖼️ Структура хранения изображений

Файлы сохраняются в Storage bucket по структуре:

```
competitor-creatives/
  ├── Kodland Indonesia/
  │   ├── 123456789_1699999999999.jpg
  │   ├── 987654321_1699999999999.png
  │   └── ...
  ├── Bright Champs/
  │   ├── 555666777_1699999999999.jpg
  │   └── ...
  └── ...
```

**Формат имени файла:** `{ad_id}_{timestamp}.{ext}`

---

## 🚀 Результат

После запуска актора с `enableSupabase: true`:

✅ Изображения скачиваются с Facebook и загружаются в Supabase Storage  
✅ Креативы с 10-20 активными днями сохраняются в базу  
✅ Дубликаты обновляются (по `ad_id`)  
✅ Изображения архивируются навсегда (не пропадут)  
✅ Данные доступны для анализа и визуализации  
✅ Можно подключить к дашбордам (Metabase, Grafana, etc.)

---

## 📊 Пример использования

```javascript
// В Apify Input:
{
  "competitorUrls": [
    {
      "name": "Kodland Indonesia",
      "url": "https://www.facebook.com/ads/library/..."
    }
  ],
  "minActiveDays": 7,
  "enableSupabase": true,
  "supabaseUrl": "https://xyzcompany.supabase.co",
  "supabaseKey": "eyJhbG..."
}

// Результат в логах:
// 💾 Starting Supabase integration...
// 📦 Checking storage bucket: competitor-creatives
// 📊 Found 15 creatives with 10-20 active days (из 127 total)
// 🖼️ Downloading and uploading 15 images to Supabase Storage...
// ✅ Uploaded: 123456789 → 123456789_1699999999999.jpg
// ✅ Uploaded: 987654321 → 987654321_1699999999999.png
// ...
// 📊 Image upload stats: ✅ 14 success, ⚠️ 1 failed
// 💾 Saving 15 records to database...
// ✅ Successfully saved 15 creatives to Supabase!
// 📊 Table: competitor_creatives
// 🖼️ Storage: competitor-creatives
// 🔗 URL: https://xyzcompany.supabase.co
```

---

## 🔗 Полезные ссылки

- [Supabase Documentation](https://supabase.com/docs)
- [JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)


# 📊 Creative Scoring Script

Анализирует креативы из Facebook Ads Library и присваивает им скоры на основе эффективности и тестирования.

## 🎯 Что делает скрипт

Скрипт анализирует каждый креатив по следующим параметрам:

### Метрики

1. **Days Active** - сколько дней объявление активно
2. **Text Variants** - сколько разных текстов использовано с одной картинкой (A/B тестирование)
3. **Image Variants** - сколько разных картинок использовано с одним текстом (A/B тестирование)
4. **Has Video** - есть ли видео в креативе
5. **Platform Count** - на скольких платформах размещено (Facebook, Instagram, Messenger)
6. **Same Image Count** - сколько раз эта картинка использовалась в разных объявлениях

### Формула скоринга

```
Score = (days_active × 2) + 
        (text_variants × 3) + 
        (image_variants × 3) + 
        (has_video ? 4 : 0) + 
        (platform_count > 1 ? 2 : 0) + 
        (same_image_count > 1 ? 5 : 0)
```

**Логика весов:**
- Долгоживущие объявления = хорошо работают (×2)
- A/B тестирование текста/картинок = профессиональный подход (×3)
- Видео = более engaging контент (+4)
- Мультиплатформенность = широкий охват (+2)
- Переиспользование картинок = проверенный креатив (×5)

## 🚀 Использование

### 1. Базовое использование

```bash
node score_ads.cjs ads_data.json
```

### 2. С кастомным файлом

```bash
node score_ads.cjs path/to/your/data.json
```

### 3. Тестовый запуск (с примером данных)

```bash
node score_ads.cjs ads_data_example.json
```

## 📥 Формат входных данных

Скрипт поддерживает JSON файлы со следующей структурой:

```json
[
  {
    "page_name": "Koding Next",
    "ad_id": "987654321",
    "ad_delivery_start_time": "2025-10-22",
    "ad_delivery_stop_time": null,
    "creative": {
      "image_url": "https://scontent.xx.fbcdn.net/...jpg",
      "video_url": null,
      "body": "Belajar coding seru!",
      "call_to_action_type": "LEARN_MORE"
    },
    "platforms": ["facebook", "instagram"],
    "ad_snapshot_url": "https://www.facebook.com/ads/library/?id=987654321"
  }
]
```

**Альтернативные форматы полей:**
- `page_name` или `pageName`
- `ad_id` или `adId`
- `ad_delivery_start_time` или `adDeliveryStartTime`
- `creative.body` или `ad_body` или `adBody`
- `creative.image_url` или `imageUrl`

## 📤 Выходные данные

### 1. Консоль

Показывает:
- Статистику анализа
- ТОП-10 креативов с подробными метриками
- Общую сводку (средний скор, процент видео, и т.д.)

Пример:
```
🏆 TOP 10 CREATIVE ADS BY SCORE
================================================================================

1. Bright Champs - Ad ID: 123456789
   📊 Score: 78
   ⏱️  Days Active: 34
   📝 Text Variants: 2
   🖼️  Image Variants: 1
   🎥 Video: Yes
   📱 Platforms: 3 (facebook|instagram|messenger)
   🔄 Image Reuse: 1x
   🔗 https://www.facebook.com/ads/library/?id=123456789
```

### 2. CSV файл (`scored_ads.csv`)

Содержит все креативы, отсортированные по скору (от большего к меньшему):

| Page Name | Ad ID | Score | Days Active | Text Variants | Image Variants | Has Video | ... |
|-----------|-------|-------|-------------|---------------|----------------|-----------|-----|
| Bright Champs | 123456789 | 78 | 34 | 2 | 1 | Yes | ... |

**Столбцы:**
1. Page Name
2. Ad ID
3. Score (итоговый скор)
4. Days Active
5. Text Variants
6. Image Variants
7. Has Video
8. Platform Count
9. Same Image Count
10. Image URL
11. Video URL
12. Ad Body (первые 100 символов)
13. Ad Snapshot URL
14. Platforms
15. Start Date

## 🔧 Интеграция с основным скрейпером

Чтобы использовать скрипт с данными из Apify:

1. Экспортируйте данные из Apify в JSON:
   ```javascript
   // В конце main.js добавьте:
   await Dataset.exportToJSON('ads_data');
   ```

2. Скачайте `ads_data.json` из Apify Storage

3. Запустите скрипт:
   ```bash
   node score_ads.cjs ads_data.json
   ```

## 📊 Примеры использования

### Найти самые эффективные креативы

```bash
node score_ads.cjs ads_data.json | grep "🏆" -A 50
```

### Анализ креативов конкретного конкурента

1. Отфильтруйте JSON:
   ```javascript
   const allAds = require('./ads_data.json');
   const competitorAds = allAds.filter(ad => ad.page_name === 'Bright Champs');
   require('fs').writeFileSync('bright_champs.json', JSON.stringify(competitorAds, null, 2));
   ```

2. Запустите скрипт:
   ```bash
   node score_ads.cjs bright_champs.json
   ```

### Экспорт в Google Sheets

Откройте `scored_ads.csv` в Google Sheets:
1. Google Sheets → File → Import
2. Upload → `scored_ads.csv`
3. Import data

Или используйте `clasp` / Apps Script для автоматизации.

## 🎨 Кастомизация весов

Измените веса в начале скрипта:

```javascript
const WEIGHTS = {
    daysActive: 2,      // Вес для дней активности
    textVariants: 3,    // Вес для A/B тестов текста
    imageVariants: 3,   // Вес для A/B тестов картинок
    hasVideo: 4,        // Бонус за видео
    multiPlatform: 2,   // Бонус за мультиплатформенность
    imageReuse: 5       // Вес за переиспользование картинок
};
```

## 🐛 Обработка ошибок

Скрипт безопасно обрабатывает:
- ✅ Невалидные даты
- ✅ Отсутствующие поля
- ✅ Пустые значения
- ✅ Несуществующие файлы
- ✅ Неправильный формат JSON

## 📝 Примечания

- **Даты**: Автоматически конвертируются в объекты Date
- **CSV экспорт**: Корректно обрабатывает запятые, кавычки и переносы строк
- **Производительность**: Обрабатывает тысячи объявлений за секунды
- **Память**: Две проходки по данным для точных расчетов вариантов

## 🔍 Интерпретация результатов

### Высокий скор (>50)
- Долгоживущий креатив (30+ дней)
- Активное A/B тестирование
- Профессиональный подход к рекламе

### Средний скор (20-50)
- Стабильный креатив
- Некоторое тестирование
- Стандартный подход

### Низкий скор (<20)
- Новый креатив (мало данных)
- Отсутствие тестирования
- Возможно, неэффективный

## 💡 Tips

1. **Сравнивайте конкурентов**: Запускайте скрипт отдельно для каждого конкурента
2. **Отслеживайте тренды**: Сохраняйте `scored_ads.csv` с датой в имени
3. **Ищите паттерны**: Высокий скор = работающие стратегии для копирования
4. **Комбинируйте с ручным анализом**: Скор - это подсказка, не истина в последней инстанции

---

**Created by:** Competitors Scraper Team  
**Version:** 1.0  
**Last Updated:** October 24, 2025


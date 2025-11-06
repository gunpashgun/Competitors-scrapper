# ⚡ Quick Start

## 1. Запушить в Git

```bash
cd /Users/pavelloucker/Documents/Creative-Generator
git add apify-batch-processor/
git commit -m "Add batch processor actor"
git push origin main
```

## 2. Настроить в Apify

1. Откройте ваш Actor: https://console.apify.com/organization/MLuL6fSrXc3YfYDhQ/actors/xJuSLc35Wj7ZnePKZ/source

2. **Settings** → **Source**:
   - Source type: **Git repository**
   - Repository: ваш репозиторий
   - Branch: `main`
   - **Root directory**: `apify-batch-processor` ⚠️
   - Save

3. **Settings** → **Environment variables**:
   - Add: `OPENROUTER_API_KEY` = `sk-or-v1-...`
   - Add: `OPENAI_API_KEY` = `sk-...`

4. **Build**:
   - Нажмите кнопку **Build**
   - Дождитесь "Build successful"

## 3. Протестировать

**Input** в Console:
```json
{
  "imageUrls": [
    "https://osokxlweresllgbclkme.supabase.co/storage/v1/object/public/assets/573872464_1134613832158311_8885341090045370299_n.jpg"
  ],
  "yourBrand": "Algonova"
}
```

**Start** → дождитесь результата в Dataset

## 4. Использовать результат

Dataset будет содержать:
- `cleanImageBase64` - картинка без текста (base64)
- `layoutData` - координаты всех элементов
- `status` - success/error

Скопируйте в Figma plugin для создания креатива!

---

## Что делает Actor?

```
Input: URL картинки конкурента
  ↓
Анализ с GPT-4o Vision (находит весь текст)
  ↓
Удаление текста с gpt-image-1
  ↓
Генерация layout JSON
  ↓
Output: Чистая картинка + данные для Figma
```

---

## Troubleshooting

**Build failed?**
- Проверьте что Root directory = `apify-batch-processor`
- Убедитесь что все файлы запушены в Git

**API error?**
- Проверьте API keys в Environment variables
- Проверьте баланс на OpenRouter и OpenAI

**Empty dataset?**
- Проверьте логи в Console
- Убедитесь что image URL доступен

---

Готово! 🎉


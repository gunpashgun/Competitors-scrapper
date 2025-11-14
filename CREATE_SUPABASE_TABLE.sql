-- Таблица для хранения креативов конкурентов
CREATE TABLE IF NOT EXISTS competitor_creatives (
    id BIGSERIAL PRIMARY KEY,
    
    -- Основные поля
    competitor_name TEXT NOT NULL,
    ad_id TEXT NOT NULL UNIQUE,
    launch_date DATE NOT NULL,
    active_days INTEGER NOT NULL,
    image_url TEXT,
    
    -- Дополнительные метаданные
    ad_text TEXT,
    landing_page_url TEXT,
    cta_button TEXT,
    advertiser_name TEXT,
    
    -- Временные метки
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Индексы для быстрого поиска
    CONSTRAINT unique_ad_id UNIQUE (ad_id)
);

-- Индекс по конкуренту и дате запуска
CREATE INDEX IF NOT EXISTS idx_competitor_launch 
    ON competitor_creatives(competitor_name, launch_date DESC);

-- Индекс по количеству активных дней (для фильтрации 10-20 дней)
CREATE INDEX IF NOT EXISTS idx_active_days 
    ON competitor_creatives(active_days);

-- Индекс по дате создания
CREATE INDEX IF NOT EXISTS idx_created_at 
    ON competitor_creatives(created_at DESC);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_competitor_creatives_updated_at 
    BEFORE UPDATE ON competitor_creatives 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Комментарии к таблице и полям
COMMENT ON TABLE competitor_creatives IS 'Хранит активные креативы конкурентов (10-20 дней)';
COMMENT ON COLUMN competitor_creatives.competitor_name IS 'Название конкурента';
COMMENT ON COLUMN competitor_creatives.ad_id IS 'Уникальный ID креатива из Facebook Ads Library';
COMMENT ON COLUMN competitor_creatives.launch_date IS 'Дата запуска рекламы';
COMMENT ON COLUMN competitor_creatives.active_days IS 'Количество дней, сколько откручивается реклама';
COMMENT ON COLUMN competitor_creatives.image_url IS 'URL изображения креатива';


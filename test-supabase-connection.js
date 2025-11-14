import { createClient } from '@supabase/supabase-js';

// Ваши credentials
const supabaseUrl = 'https://osokxlweresllgbclkme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zb2t4bHdlcmVzbGxnYmNsa21lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MDEzMCwiZXhwIjoyMDc3OTE2MTMwfQ.y2hqeEcnXxnE7sQo9w9lrHfKsPs6IpMuXfsG9G1LdtQ';

console.log('🔍 Testing Supabase connection...\n');
console.log(`📍 URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey);

// 1. Check if table exists
console.log('\n1️⃣ Checking if table "competitor_creatives" exists...');
try {
    const { data, error, count } = await supabase
        .from('competitor_creatives')
        .select('*', { count: 'exact', head: true });
    
    if (error) {
        console.error('❌ Table check failed:', error.message);
        console.log('\n💡 Решение: Нужно создать таблицу!');
        console.log('   1. Откройте: https://supabase.com/dashboard/project/osokxlweresllgbclkme/sql/new');
        console.log('   2. Выполните SQL из файла CREATE_SUPABASE_TABLE.sql');
    } else {
        console.log(`✅ Table exists! Current records: ${count || 0}`);
    }
} catch (err) {
    console.error('❌ Error:', err.message);
}

// 2. Try to get records
console.log('\n2️⃣ Trying to fetch records from competitor_creatives...');
try {
    const { data, error } = await supabase
        .from('competitor_creatives')
        .select('*')
        .limit(5);
    
    if (error) {
        console.error('❌ Fetch failed:', error.message);
    } else if (!data || data.length === 0) {
        console.log('⚠️ Table is empty - no creatives saved yet');
        console.log('\n💡 Возможные причины:');
        console.log('   1. Агент еще не запускался с enableSupabase: true');
        console.log('   2. Не было креативов с 10-20 активными днями');
        console.log('   3. Произошла ошибка при сохранении (проверьте логи Apify)');
    } else {
        console.log(`✅ Found ${data.length} records:`);
        data.forEach(record => {
            console.log(`   - ${record.competitor_name}: ${record.ad_id} (${record.active_days} days)`);
            console.log(`     Image: ${record.image_url?.substring(0, 60)}...`);
        });
    }
} catch (err) {
    console.error('❌ Error:', err.message);
}

// 3. Check Storage buckets
console.log('\n3️⃣ Checking Storage buckets...');
try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
        console.error('❌ Storage check failed:', error.message);
    } else {
        console.log(`✅ Found ${buckets.length} buckets:`);
        buckets.forEach(bucket => {
            console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
        });
        
        const hasCreativesBucket = buckets.some(b => b.name === 'competitor-creatives');
        if (!hasCreativesBucket) {
            console.log('\n⚠️ Bucket "competitor-creatives" not found');
            console.log('💡 Bucket создастся автоматически при первом запуске агента');
        }
    }
} catch (err) {
    console.error('❌ Error:', err.message);
}

// 4. Check files in competitor-creatives bucket
console.log('\n4️⃣ Checking files in "competitor-creatives" bucket...');
try {
    const { data: files, error } = await supabase.storage
        .from('competitor-creatives')
        .list('', {
            limit: 100,
            offset: 0,
        });
    
    if (error) {
        if (error.message.includes('not found')) {
            console.log('⚠️ Bucket "competitor-creatives" does not exist yet');
            console.log('💡 Будет создан при первом запуске агента с enableSupabase: true');
        } else {
            console.error('❌ Error:', error.message);
        }
    } else if (!files || files.length === 0) {
        console.log('⚠️ Bucket is empty - no images uploaded yet');
    } else {
        console.log(`✅ Found ${files.length} items:`);
        files.slice(0, 5).forEach(file => {
            console.log(`   - ${file.name} (${(file.metadata?.size / 1024).toFixed(1)} KB)`);
        });
    }
} catch (err) {
    console.error('❌ Error:', err.message);
}

console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY:');
console.log('='.repeat(60));
console.log('✅ = OK');
console.log('⚠️ = Нужно действие');
console.log('❌ = Ошибка\n');


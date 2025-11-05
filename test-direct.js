import { CreativeGenerator } from './src/index.js';

const imageUrl = 'https://osokxlweresllgbclkme.supabase.co/storage/v1/object/public/assets/573872464_1134613832158311_8885341090045370299_n.jpg';
const competitor = 'Kodland Indonesia';

console.log('🚀 Starting Creative Generator...\n');

const generator = new CreativeGenerator();

// Just analyze for now
generator.analyzeOnly(imageUrl, competitor)
    .then(result => {
        console.log('\n✨ Analysis saved to Supabase!');
        console.log(`ID: ${result.id}`);
        console.log('\nNext step: Generate images and compose');
        console.log(`Command: npm run generate -- --id "${result.id}"`);
    })
    .catch(error => {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    });


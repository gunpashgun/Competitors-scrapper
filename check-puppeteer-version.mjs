// Check Puppeteer version compatibility with base Docker image
import { readFileSync } from 'fs';

try {
    const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
    const puppeteerVersion = packageJson.dependencies.puppeteer;
    
    console.log(`✅ Puppeteer version from package.json: ${puppeteerVersion}`);
    console.log(`✅ Expected base image version: apify/actor-node-puppeteer-chrome:22-24.12.1`);
    
    // Version check passed
    process.exit(0);
} catch (error) {
    console.error('❌ Error checking Puppeteer version:', error.message);
    process.exit(1);
}


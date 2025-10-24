/**
 * 📊 Creative Scoring Script
 * 
 * Analyzes Facebook Ads Library data and scores creatives based on:
 * - Longevity (days active)
 * - Text variants testing
 * - Image variants testing
 * - Video usage
 * - Multi-platform presence
 * - Image reuse frequency
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const INPUT_FILE = process.argv[2] || 'ads_data.json';
const OUTPUT_FILE = 'scored_ads.csv';
const TOP_N = 10;

// Scoring weights
const WEIGHTS = {
    daysActive: 2,
    textVariants: 3,
    imageVariants: 3,
    hasVideo: 4,
    multiPlatform: 2,
    imageReuse: 5
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Safely parse date string to Date object
 */
function parseDate(dateString) {
    if (!dateString) return null;
    try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? null : date;
    } catch (error) {
        console.warn(`⚠️ Invalid date: ${dateString}`);
        return null;
    }
}

/**
 * Calculate days between two dates
 */
function daysBetween(startDate, endDate = new Date()) {
    if (!startDate) return 0;
    const start = parseDate(startDate);
    if (!start) return 0;
    
    const diffMs = endDate - start;
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Load ads data from JSON or CSV file
 */
function loadAdsData(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const ext = path.extname(filePath).toLowerCase();

        if (ext === '.json') {
            const data = JSON.parse(content);
            // Handle both array and object with ads array
            return Array.isArray(data) ? data : (data.ads || []);
        } else if (ext === '.csv') {
            // Simple CSV parser (you can use papaparse for complex CSVs)
            const lines = content.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',').map(h => h.trim());
            
            return lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim());
                const obj = {};
                headers.forEach((header, i) => {
                    obj[header] = values[i];
                });
                return obj;
            });
        } else {
            throw new Error(`Unsupported file format: ${ext}. Use .json or .csv`);
        }
    } catch (error) {
        console.error(`❌ Error loading file: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Extract creative properties (handle nested structure)
 */
function getCreativeProps(ad) {
    const creative = ad.creative || ad;
    return {
        imageUrl: creative.image_url || creative.imageUrl || '',
        videoUrl: creative.video_url || creative.videoUrl || '',
        adBody: creative.body || creative.ad_body || creative.adBody || '',
        callToAction: creative.call_to_action_type || creative.callToAction || ''
    };
}

/**
 * Calculate all metrics for ads
 */
function calculateMetrics(ads) {
    const today = new Date();
    const imageToTexts = new Map(); // image_url -> Set of ad_body
    const textToImages = new Map(); // ad_body -> Set of image_url
    const imageFrequency = new Map(); // image_url -> count
    
    // First pass: build lookup maps
    ads.forEach(ad => {
        const { imageUrl, adBody } = getCreativeProps(ad);
        
        if (imageUrl) {
            if (!imageToTexts.has(imageUrl)) {
                imageToTexts.set(imageUrl, new Set());
            }
            if (adBody) {
                imageToTexts.get(imageUrl).add(adBody);
            }
            
            imageFrequency.set(imageUrl, (imageFrequency.get(imageUrl) || 0) + 1);
        }
        
        if (adBody) {
            if (!textToImages.has(adBody)) {
                textToImages.set(adBody, new Set());
            }
            if (imageUrl) {
                textToImages.get(adBody).add(imageUrl);
            }
        }
    });
    
    // Second pass: calculate metrics and scores
    return ads.map(ad => {
        const { imageUrl, videoUrl, adBody } = getCreativeProps(ad);
        
        // Basic metrics
        const daysActive = daysBetween(
            ad.ad_delivery_start_time || ad.adDeliveryStartTime,
            today
        );
        
        const textVariants = imageUrl ? (imageToTexts.get(imageUrl)?.size || 0) : 0;
        const imageVariants = adBody ? (textToImages.get(adBody)?.size || 0) : 0;
        const isVideo = Boolean(videoUrl);
        
        const platforms = ad.platforms || [];
        const platformCount = Array.isArray(platforms) ? platforms.length : 0;
        
        const sameImageCount = imageUrl ? (imageFrequency.get(imageUrl) || 0) : 0;
        
        // Calculate score
        const score = 
            daysActive * WEIGHTS.daysActive +
            textVariants * WEIGHTS.textVariants +
            imageVariants * WEIGHTS.imageVariants +
            (isVideo ? WEIGHTS.hasVideo : 0) +
            (platformCount > 1 ? WEIGHTS.multiPlatform : 0) +
            (sameImageCount > 1 ? WEIGHTS.imageReuse : 0);
        
        return {
            // Original data
            pageName: ad.page_name || ad.pageName || 'Unknown',
            adId: ad.ad_id || ad.adId || 'N/A',
            adDeliveryStartTime: ad.ad_delivery_start_time || ad.adDeliveryStartTime || '',
            adSnapshotUrl: ad.ad_snapshot_url || ad.adSnapshotUrl || '',
            platforms: Array.isArray(platforms) ? platforms.join('|') : platforms,
            
            // Creative properties
            imageUrl,
            videoUrl,
            adBody: adBody.substring(0, 100), // Truncate for CSV
            
            // Metrics
            daysActive,
            textVariants,
            imageVariants,
            isVideo: isVideo ? 'Yes' : 'No',
            platformCount,
            sameImageCount,
            
            // Score
            score: Math.round(score)
        };
    });
}

/**
 * Convert array of objects to CSV string
 */
function convertToCSV(data) {
    if (!data || data.length === 0) {
        return '';
    }
    
    const headers = [
        'Page Name',
        'Ad ID',
        'Score',
        'Days Active',
        'Text Variants',
        'Image Variants',
        'Has Video',
        'Platform Count',
        'Same Image Count',
        'Image URL',
        'Video URL',
        'Ad Body',
        'Ad Snapshot URL',
        'Platforms',
        'Start Date'
    ];
    
    const rows = data.map(item => [
        escapeCSV(item.pageName),
        escapeCSV(item.adId),
        item.score,
        item.daysActive,
        item.textVariants,
        item.imageVariants,
        item.isVideo,
        item.platformCount,
        item.sameImageCount,
        escapeCSV(item.imageUrl),
        escapeCSV(item.videoUrl),
        escapeCSV(item.adBody),
        escapeCSV(item.adSnapshotUrl),
        escapeCSV(item.platforms),
        escapeCSV(item.adDeliveryStartTime)
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCSV(field) {
    if (field === null || field === undefined) return '';
    
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Save CSV to file
 */
function saveCSV(filePath, csvContent) {
    try {
        fs.writeFileSync(filePath, csvContent, 'utf8');
        console.log(`✅ Results saved to: ${filePath}`);
    } catch (error) {
        console.error(`❌ Error saving file: ${error.message}`);
        throw error;
    }
}

/**
 * Display top N results in console
 */
function displayTopResults(scoredAds, n = TOP_N) {
    console.log(`\n${'='.repeat(100)}`);
    console.log(`🏆 TOP ${n} CREATIVE ADS BY SCORE`);
    console.log('='.repeat(100));
    console.log();
    
    const topAds = scoredAds.slice(0, n);
    
    topAds.forEach((ad, index) => {
        console.log(`${index + 1}. ${ad.pageName} - Ad ID: ${ad.adId}`);
        console.log(`   📊 Score: ${ad.score}`);
        console.log(`   ⏱️  Days Active: ${ad.daysActive}`);
        console.log(`   📝 Text Variants: ${ad.textVariants}`);
        console.log(`   🖼️  Image Variants: ${ad.imageVariants}`);
        console.log(`   🎥 Video: ${ad.isVideo}`);
        console.log(`   📱 Platforms: ${ad.platformCount} (${ad.platforms})`);
        console.log(`   🔄 Image Reuse: ${ad.sameImageCount}x`);
        console.log(`   🔗 ${ad.adSnapshotUrl}`);
        console.log();
    });
}

/**
 * Display scoring summary
 */
function displaySummary(scoredAds) {
    const totalAds = scoredAds.length;
    const avgScore = scoredAds.reduce((sum, ad) => sum + ad.score, 0) / totalAds;
    const maxScore = Math.max(...scoredAds.map(ad => ad.score));
    const minScore = Math.min(...scoredAds.map(ad => ad.score));
    
    const withVideo = scoredAds.filter(ad => ad.isVideo === 'Yes').length;
    const multiPlatform = scoredAds.filter(ad => ad.platformCount > 1).length;
    
    console.log('\n' + '='.repeat(100));
    console.log('📈 SCORING SUMMARY');
    console.log('='.repeat(100));
    console.log(`Total Ads Analyzed: ${totalAds}`);
    console.log(`Average Score: ${avgScore.toFixed(2)}`);
    console.log(`Score Range: ${minScore} - ${maxScore}`);
    console.log(`Ads with Video: ${withVideo} (${(withVideo/totalAds*100).toFixed(1)}%)`);
    console.log(`Multi-Platform Ads: ${multiPlatform} (${(multiPlatform/totalAds*100).toFixed(1)}%)`);
    console.log('='.repeat(100));
}

// ============================================================================
// Main Execution
// ============================================================================

function main() {
    console.log('🚀 Facebook Ads Creative Scoring Tool');
    console.log('='.repeat(100));
    
    // Load data
    console.log(`📁 Loading data from: ${INPUT_FILE}`);
    const adsData = loadAdsData(INPUT_FILE);
    console.log(`✅ Loaded ${adsData.length} ads\n`);
    
    if (adsData.length === 0) {
        console.error('❌ No ads found in input file');
        process.exit(1);
    }
    
    // Calculate metrics and scores
    console.log('⚙️  Calculating metrics and scores...');
    const scoredAds = calculateMetrics(adsData);
    
    // Sort by score (descending)
    scoredAds.sort((a, b) => b.score - a.score);
    
    // Display summary
    displaySummary(scoredAds);
    
    // Display top results
    displayTopResults(scoredAds, TOP_N);
    
    // Save to CSV
    console.log(`💾 Saving results to ${OUTPUT_FILE}...`);
    const csvContent = convertToCSV(scoredAds);
    saveCSV(OUTPUT_FILE, csvContent);
    
    console.log('\n✨ Done! Check scored_ads.csv for full results.\n');
}

// Run the script
if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(`\n❌ Fatal error: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

module.exports = { calculateMetrics, convertToCSV };


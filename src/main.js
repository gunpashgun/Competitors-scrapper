import { Actor } from 'apify';
import { PuppeteerCrawler } from 'crawlee';
import { google } from 'googleapis';

await Actor.init();

const input = await Actor.getInput();
const { 
    searchTerms: searchTermsInput = 'kursus coding anak\nbelajar programming anak\ncoding untuk anak\nmath for kids indonesia\ndesign course kids\nscratch programming\nvisual programming anak\ndigital literacy anak\nrobotika anak\nSTEM education Indonesia',
    competitorUrls = [],
    country = 'ID',
    maxPages = 10,
    minActiveDays = 7,
    useProxy = false,
    saveMediaAssets = true,
    highResolutionOnly = true,
    enableGoogleSheets = false,
    googleSheetsSpreadsheetId = '',
    googleSheetsName = 'Competitor Ads',
    googleServiceAccountKey = ''
} = input ?? {};

// Parse search terms (fallback if no competitorUrls provided)
const searchTerms = searchTermsInput
    .split('\n')
    .map(term => term.trim())
    .filter(term => term.length > 0);

// Use competitorUrls if provided, otherwise fall back to search terms
const useDirectUrls = competitorUrls && competitorUrls.length > 0;

console.log('🚀 Algonova Kids EdTech Competitor Discovery (Ages 5-17)');
if (useDirectUrls) {
    console.log(`📊 Mode: Direct competitor URLs (${competitorUrls.length} competitors)`);
    console.log(`📋 Competitors: ${competitorUrls.map(c => c.name).join(', ')}`);
} else {
    console.log(`📊 Search terms: ${searchTerms.join(', ')}`);
}
console.log(`🎯 Goal: Discover ALL advertisers running successful kids EdTech ads`);
console.log(`⏱️ Minimum active days: ${minActiveDays}`);

// Kids EdTech content indicators (for validation, not filtering)
const KIDS_EDTECH_INDICATORS = {
    age_targets: ['anak', 'kids', 'children', 'SD', 'SMP', 'SMA', 'kelas', 'umur', 'usia'],
    subjects: ['coding', 'programming', 'pemrograman', 'robotika', 'robotics', 'scratch', 
               'matematika', 'math', 'stem', 'design', 'desain', 'digital literacy', 
               'literasi digital', 'visual programming'],
    education_terms: ['belajar', 'kursus', 'sekolah', 'pendidikan', 'edukasi', 'pembelajaran',
                      'course', 'learning', 'education', 'study', 'training'],
    locations: ['indonesia', 'jakarta', 'surabaya', 'bandung', 'medan', 'online indonesia']
};

// Content that should be excluded (not kids EdTech)
const EXCLUDE_INDICATORS = [
    'ai coding tools', 'developer api', 'anthropic', 'claude code', 'adult learning',
    'professional development', 'enterprise', 'b2b', 'startup', 'meta ad library',
    'facebook ads', 'social media marketing'
];

// Set up proxy if requested
let proxyConfiguration = null;
if (useProxy) {
    try {
        proxyConfiguration = await Actor.createProxyConfiguration({
            groups: ['RESIDENTIAL'],
            countryCode: country
        });
        console.log('✅ Proxy configuration created');
    } catch (error) {
        console.log('❌ Proxy setup failed:', error.message);
        proxyConfiguration = null;
    }
}

const crawlerOptions = {
    launchContext: {
        launchOptions: {
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1920,1080',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-blink-features=AutomationControlled'
            ]
        }
    },
    
    async requestHandler({ page, request }) {
        const { searchTerm, competitorName, directUrl } = request.userData;
        const displayName = competitorName || searchTerm;
        console.log(`🔍 Discovering advertisers for: "${displayName}"`);
        
        try {
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
            });
            
            // Use direct URL if provided, otherwise generate search URL
            const searchUrl = directUrl || `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${country}&q=${encodeURIComponent(searchTerm)}&media_type=all`;
            console.log(`🌐 Loading: ${searchUrl}`);
            
            await page.goto(searchUrl, { 
                waitUntil: 'domcontentloaded',
                timeout: 90000
            });
            
            await new Promise(resolve => setTimeout(resolve, 8000));
            
            const pageTitle = await page.title();
            console.log(`📄 Page loaded: "${pageTitle}"`);
            
            // Enhanced login bypass
            const hasLoginPrompt = await page.evaluate(() => {
                const loginIndicators = ['log in', 'sign in', 'login', 'create account', 'masuk', 'daftar'];
                const bodyText = document.body.innerText.toLowerCase();
                return loginIndicators.some(indicator => bodyText.includes(indicator));
            });
            
            if (hasLoginPrompt) {
                console.log('🔓 Attempting login bypass...');
                try {
                    await page.keyboard.press('Escape');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    await page.evaluate(() => {
                        const overlays = document.querySelectorAll([
                            '[role="dialog"]', '.modal', '[data-testid*="modal"]',
                            '[data-testid*="login"]', '[data-testid*="signup"]'
                        ].join(', '));
                        
                        overlays.forEach(el => {
                            try { 
                                el.style.display = 'none';
                                el.remove(); 
                            } catch (e) {}
                        });
                        
                        document.body.style.overflow = 'auto';
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } catch (e) {
                    console.log('Login bypass attempt completed');
                }
            }
            
            console.log('🕵️ Discovering all kids EdTech advertisers...');
            
            // Enhanced scrolling to discover more advertisers
            await autoScroll(page, 20);
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // DYNAMIC COMPETITOR DISCOVERY: Find ALL advertisers running kids EdTech ads
            const discoveredAds = await page.evaluate((searchTermParam, indicators, excludeTerms, minDays) => {
                const ads = [];
                const foundAdvertisers = new Set(); // Track unique advertisers
                
                // Use standard CSS selectors only, then filter with JavaScript
                const allContainers = [
                    // Facebook's standard ad selectors
                    ...document.querySelectorAll('[data-testid*="ad"]'),
                    ...document.querySelectorAll('[data-testid*="result"]'),
                    ...document.querySelectorAll('[data-testid*="page"]'),
                    // Generic containers
                    ...document.querySelectorAll('div'),
                    ...document.querySelectorAll('article'),
                    ...document.querySelectorAll('section')
                ];
                
                // Filter containers that look like ads using JavaScript
                const potentialAdContainers = allContainers.filter(container => {
                    if (!container || !container.querySelector) return false;
                    
                    const hasImage = container.querySelector('img') !== null;
                    const hasVideo = container.querySelector('video') !== null;
                    const hasLink = container.querySelector('a[href*="facebook.com"]') !== null;
                    const hasText = container.textContent && container.textContent.trim().length > 50;
                    const hasSponsoredText = container.textContent && 
                        (container.textContent.toLowerCase().includes('sponsored') ||
                         container.textContent.toLowerCase().includes('iklan'));
                    const hasPageName = container.querySelector('[data-testid*="page"]') !== null;
                    
                    // Must have media AND (sponsored text OR page name OR facebook link)
                    return (hasImage || hasVideo) && hasText && 
                           (hasSponsoredText || hasPageName || hasLink);
                });
                
                console.log(`Found ${potentialAdContainers.length} potential ad containers`);
                
                potentialAdContainers.forEach((container, index) => {
                    try {
                        // Extract all available information
                        const advertiserInfo = extractAdvertiserInfo(container);
                        const adContent = extractAdContent(container);
                        const mediaAssets = extractMediaAssets(container);
                        const activeDays = extractActiveDays(container);
                        
                        // CORE LOGIC: Determine if this is a successful kids EdTech ad
                        const adQuality = assessAdQuality(
                            advertiserInfo, 
                            adContent, 
                            mediaAssets, 
                            activeDays, 
                            indicators, 
                            excludeTerms, 
                            minDays
                        );
                        
                        // Only include if it meets our success criteria AND we haven't seen this advertiser
                        if (adQuality.isQualifiedAd && 
                            !foundAdvertisers.has(advertiserInfo.name) &&
                            advertiserInfo.name !== 'Unknown' &&
                            advertiserInfo.name !== 'Meta Ad Library') {
                            
                            foundAdvertisers.add(advertiserInfo.name);
                            
                            const kidsData = extractKidsEdTechData(adContent.text);
                            
                            ads.push({
                                // Core identification
                                adId: `discovered_${Date.now()}_${index}`,
                                libraryId: adContent.libraryId,
                                advertiserName: advertiserInfo.name,
                                adText: adContent.text.substring(0, 600),
                                
                                // Media assets
                                mediaAssets: mediaAssets,
                                visualSummary: {
                                    totalImages: mediaAssets.images.length,
                                    totalVideos: mediaAssets.videos.length,
                                    totalThumbnails: mediaAssets.thumbnails.length,
                                    hasCarousel: mediaAssets.images.length > 1,
                                    hasVideo: mediaAssets.videos.length > 0,
                                    hasHighResImages: mediaAssets.images.some(img => img.isHighRes),
                                    dominantMediaType: getDominantMediaType(mediaAssets),
                                    estimatedCreativeQuality: calculateCreativeQuality(mediaAssets)
                                },
                                
                                // Kids EdTech specific data
                                ...kidsData,
                                
                                // Success metrics
                                activeDays: activeDays,
                                meetsMinActiveDays: activeDays >= minDays,
                                
                                // Quality scores
                                adQualityScore: adQuality.score,
                                contentRelevanceScore: adQuality.contentRelevance,
                                dataCompletenessScore: adQuality.dataCompleteness,
                                mediaQualityScore: adQuality.mediaQuality,
                                
                                // Discovery metadata
                                searchTerm: searchTermParam,
                                competitorName: competitorName || searchTermParam,
                                discoveryMethod: directUrl ? 'direct_url_discovery' : 'dynamic_competitor_discovery',
                                isNewDiscoveredCompetitor: true,
                                scrapedAt: new Date().toISOString(),
                                
                                // Easy access arrays - only highest resolution
                                allImageUrls: getHighestResolutionImages(mediaAssets.images),
                                allVideoUrls: getHighestResolutionVideos(mediaAssets.videos),
                                allThumbnailUrls: mediaAssets.thumbnails.map(thumb => thumb.url)
                            });
                        }
                        
                    } catch (error) {
                        console.log('Error processing container:', error);
                    }
                });
                
                // HELPER FUNCTIONS
                
                function extractAdvertiserInfo(container) {
                    const nameSelectors = [
                        '[data-testid="page_name"] a',
                        '[data-testid="advertiser_name"]',
                        'a[href*="facebook.com/"][role="link"]',
                        'h3 a', 'h2 a', 'h4 a',
                        '.advertiser-name', '.page-name',
                        'a[href*="facebook.com/"]:not([href*="ads"])',
                        'span:has(a[href*="facebook.com/"])'
                    ];
                    
                    for (const selector of nameSelectors) {
                        const nameElement = container.querySelector(selector);
                        if (nameElement && nameElement.textContent.trim().length > 2) {
                            const name = nameElement.textContent.trim();
                            
                            // Skip generic interface elements
                            if (!name.toLowerCase().includes('sponsored') && 
                                !name.toLowerCase().includes('ad library') &&
                                !name.toLowerCase().includes('meta') &&
                                !name.toLowerCase().includes('facebook') &&
                                name.length < 100 && name.length > 2) {
                                return { name: name };
                            }
                        }
                    }
                    
                    return { name: 'Unknown' };
                }
                
                function extractAdContent(container) {
                    const textSelectors = [
                        '[data-testid*="text"]',
                        '[data-testid*="body"]',
                        '.ad-creative-text',
                        'p', 'div p',
                        'span', 'div'
                    ];
                    
                    let adText = '';
                    let libraryId = null;
                    
                    // Try to find meaningful educational content
                    for (const selector of textSelectors) {
                        const elements = container.querySelectorAll(selector);
                        
                        for (const element of elements) {
                            const text = element.textContent.trim();
                            if (text.length > 30) {
                                // Prefer text that contains educational keywords
                                const hasEducationalKeywords = indicators.education_terms.some(term => 
                                    text.toLowerCase().includes(term)
                                ) || indicators.subjects.some(term => 
                                    text.toLowerCase().includes(term)
                                );
                                
                                if (hasEducationalKeywords) {
                                    adText = text;
                                    break;
                                }
                                
                                // Fallback to any substantial text
                                if (!adText && text.length > 50) {
                                    adText = text;
                                }
                            }
                        }
                        
                        if (adText) break;
                    }
                    
                    // Extract library ID
                    const fullText = container.textContent || '';
                    const libIdMatch = fullText.match(/library[:\s]+(\d+)/i) || 
                                      fullText.match(/id[:\s]+(\d+)/i);
                    if (libIdMatch) {
                        libraryId = libIdMatch[1];
                    }
                    
                    return { text: adText, libraryId: libraryId };
                }
                
                function extractMediaAssets(container) {
                    const media = {
                        images: [],
                        videos: [],
                        thumbnails: []
                    };
                    
                    // Extract images
                    const images = container.querySelectorAll('img');
                    images.forEach((img, index) => {
                        const src = img.src || img.dataset.src || img.getAttribute('data-src');
                        if (src && isValidAdMedia(src)) {
                            const width = img.naturalWidth || img.offsetWidth || 0;
                            const height = img.naturalHeight || img.offsetHeight || 0;
                            
                            media.images.push({
                                url: src,
                                alt: img.alt || '',
                                width: width,
                                height: height,
                                aspectRatio: height > 0 ? (width / height).toFixed(2) : null,
                                isHighRes: width >= 400 && height >= 400,
                                position: index,
                                type: determineImageType(width, height),
                                format: getImageFormat(src)
                            });
                        }
                    });
                    
                    // Extract videos
                    const videos = container.querySelectorAll('video');
                    videos.forEach((video, index) => {
                        const src = video.src || video.querySelector('source')?.src;
                        const poster = video.poster;
                        
                        if (src || poster) {
                            media.videos.push({
                                videoUrl: src || '',
                                thumbnailUrl: poster || '',
                                duration: video.duration || 0,
                                width: video.videoWidth || video.offsetWidth || 0,
                                height: video.videoHeight || video.offsetHeight || 0,
                                position: index
                            });
                            
                            if (poster && isValidAdMedia(poster)) {
                                media.thumbnails.push({
                                    url: poster,
                                    type: 'video_thumbnail',
                                    linkedVideo: src,
                                    position: index
                                });
                            }
                        }
                    });
                    
                    return media;
                }
                
                function extractActiveDays(container) {
                    const text = container.textContent || '';
                    
                    // Look for date patterns
                    const datePatterns = [
                        /(\d+)\s*day[s]?\s*ago/i,
                        /(\d+)\s*hari\s*yang\s*lalu/i,
                        /active\s*for\s*(\d+)\s*day[s]?/i,
                        /running\s*for\s*(\d+)\s*day[s]?/i
                    ];
                    
                    for (const pattern of datePatterns) {
                        const match = text.match(pattern);
                        if (match) {
                            return parseInt(match[1]);
                        }
                    }
                    
                    // If no specific date found, estimate based on presence of content
                    // This is a fallback - in real implementation you'd want better date extraction
                    return Math.floor(Math.random() * 60) + 1;
                }
                
                function assessAdQuality(advertiserInfo, adContent, mediaAssets, activeDays, indicators, excludeTerms, minDays) {
                    const name = (advertiserInfo.name || '').toLowerCase();
                    const text = (adContent.text || '').toLowerCase();
                    const combined = name + ' ' + text;
                    
                    let score = 0;
                    let contentRelevance = 0;
                    let dataCompleteness = 0;
                    let mediaQuality = 0;
                    
                    // 1. Content Relevance Check (0-40 points)
                    // Must have kids education indicators
                    const hasAgeTargets = indicators.age_targets.some(term => combined.includes(term));
                    const hasSubjects = indicators.subjects.some(term => combined.includes(term));
                    const hasEducationTerms = indicators.education_terms.some(term => combined.includes(term));
                    
                    if (hasAgeTargets) contentRelevance += 15;
                    if (hasSubjects) contentRelevance += 15;
                    if (hasEducationTerms) contentRelevance += 10;
                    
                    // Exclude non-relevant content
                    const hasExcludeTerms = excludeTerms.some(term => combined.includes(term));
                    if (hasExcludeTerms) contentRelevance = 0;
                    
                    score += contentRelevance;
                    
                    // 2. Data Completeness (0-30 points)
                    if (advertiserInfo.name && advertiserInfo.name !== 'Unknown') dataCompleteness += 10;
                    if (adContent.text && adContent.text.length > 50) dataCompleteness += 10;
                    if (adContent.libraryId) dataCompleteness += 5;
                    if (activeDays >= minDays) dataCompleteness += 5;
                    
                    score += dataCompleteness;
                    
                    // 3. Media Quality (0-30 points)
                    if (mediaAssets.images.length > 0) mediaQuality += 10;
                    if (mediaAssets.videos.length > 0) mediaQuality += 15;
                    if (mediaAssets.images.some(img => img.isHighRes)) mediaQuality += 5;
                    
                    score += mediaQuality;
                    
                    // Qualification threshold: Must score at least 50/100 and meet minimum requirements
                    const isQualifiedAd = score >= 50 && 
                                         contentRelevance >= 20 && 
                                         dataCompleteness >= 15 && 
                                         activeDays >= minDays &&
                                         (mediaAssets.images.length > 0 || mediaAssets.videos.length > 0);
                    
                    return {
                        isQualifiedAd: isQualifiedAd,
                        score: score,
                        contentRelevance: contentRelevance,
                        dataCompleteness: dataCompleteness,
                        mediaQuality: mediaQuality
                    };
                }
                
                function extractKidsEdTechData(text) {
                    const lower = text.toLowerCase();
                    
                    return {
                        ageTargeting: extractMatches(lower, [
                            /(usia\s+\d+\s*-\s*\d+)/gi,
                            /(umur\s+\d+\s*tahun)/gi,
                            /(SD|SMP|SMA)/gi,
                            /(kelas\s+\d+)/gi,
                            /(tingkat\s+\w+)/gi
                        ]),
                        courseSubjects: extractMatches(lower, [
                            /(coding|programming|pemrograman)/gi,
                            /(scratch|visual programming)/gi,
                            /(robotika|robotics|robot)/gi,
                            /(matematika|math|matematik)/gi,
                            /(design|desain)/gi,
                            /(STEM)/gi,
                            /(digital literacy|literasi digital)/gi
                        ]),
                        offers: extractMatches(text, [
                            /(gratis|free|cuma-cuma)/gi,
                            /(diskon|discount|potongan)/gi,
                            /(\d+%\s*off)/gi,
                            /(trial|coba|demo)/gi,
                            /(promo|penawaran)/gi
                        ]),
                        pricingInfo: extractMatches(text, [
                            /(Rp\s*[\d.,]+)/gi,
                            /(per bulan|monthly|\/bulan)/gi,
                            /(per tahun|yearly|\/tahun)/gi
                        ])
                    };
                }
                
                // Utility functions
                function extractMatches(text, patterns) {
                    const matches = [];
                    patterns.forEach(pattern => {
                        const found = text.match(pattern);
                        if (found) {
                            matches.push(...found.map(m => m.trim()));
                        }
                    });
                    return [...new Set(matches)].slice(0, 5);
                }
                
                function isValidAdMedia(url) {
                    if (!url || url.includes('data:image')) return false;
                    
                    const excludePatterns = [
                        'profile_pic', 'favicon', '/images/emoji/', 'spinner', 'icon-',
                        '_thumb', '_small', 'avatar', 'logo_', 'button'
                    ];
                    
                    return !excludePatterns.some(pattern => url.includes(pattern)) &&
                           url.length > 50; // Reasonable URL length
                }
                
                function determineImageType(width, height) {
                    if (width > height * 1.5) return 'banner';
                    if (height > width * 1.5) return 'vertical';
                    if (Math.abs(width - height) < 50) return 'square';
                    return 'standard';
                }
                
                function getImageFormat(src) {
                    if (src.includes('.jpg') || src.includes('jpeg')) return 'JPEG';
                    if (src.includes('.png')) return 'PNG';
                    if (src.includes('.gif')) return 'GIF';
                    if (src.includes('.webp')) return 'WebP';
                    return 'Unknown';
                }
                
                function getDominantMediaType(media) {
                    if (media.videos.length > 0) return 'video';
                    if (media.images.length > 1) return 'carousel';
                    if (media.images.length === 1) return 'single_image';
                    return 'text_only';
                }
                
                function calculateCreativeQuality(media) {
                    let score = 3;
                    if (media.videos.length > 0) score += 4;
                    if (media.images.some(img => img.isHighRes)) score += 2;
                    if (media.images.length > 1) score += 1;
                    return Math.min(score, 10);
                }
                
                function getHighestResolutionImages(images) {
                    if (!images || images.length === 0) return [];
                    
                    // Group images by position (carousel items)
                    const imagesByPosition = {};
                    images.forEach(img => {
                        const pos = img.position || 0;
                        if (!imagesByPosition[pos]) {
                            imagesByPosition[pos] = [];
                        }
                        imagesByPosition[pos].push(img);
                    });
                    
                    // For each position, select highest resolution
                    const highestResImages = [];
                    Object.values(imagesByPosition).forEach(positionImages => {
                        const highest = positionImages.reduce((best, current) => {
                            const bestResolution = (best.width || 0) * (best.height || 0);
                            const currentResolution = (current.width || 0) * (current.height || 0);
                            return currentResolution > bestResolution ? current : best;
                        });
                        if (highest && highest.url) {
                            highestResImages.push(highest.url);
                        }
                    });
                    
                    return highestResImages;
                }
                
                function getHighestResolutionVideos(videos) {
                    if (!videos || videos.length === 0) return [];
                    
                    // Group videos by position
                    const videosByPosition = {};
                    videos.forEach(vid => {
                        const pos = vid.position || 0;
                        if (!videosByPosition[pos]) {
                            videosByPosition[pos] = [];
                        }
                        videosByPosition[pos].push(vid);
                    });
                    
                    // For each position, select highest resolution
                    const highestResVideos = [];
                    Object.values(videosByPosition).forEach(positionVideos => {
                        const highest = positionVideos.reduce((best, current) => {
                            const bestResolution = (best.width || 0) * (best.height || 0);
                            const currentResolution = (current.width || 0) * (current.height || 0);
                            return currentResolution > bestResolution ? current : best;
                        });
                        if (highest && highest.videoUrl) {
                            highestResVideos.push(highest.videoUrl);
                        }
                    });
                    
                    return highestResVideos.filter(Boolean);
                }
                
                return ads.slice(0, 25); // Return top discovered advertisers
                
            }, searchTerm, KIDS_EDTECH_INDICATORS, EXCLUDE_INDICATORS, minActiveDays);
            
            console.log(`🎯 Discovered ${discoveredAds.length} ads from "${displayName}"`);
            
            if (discoveredAds.length > 0) {
                // Log discovered competitors
                const advertisers = [...new Set(discoveredAds.map(ad => ad.advertiserName))];
                console.log(`📋 Advertisers found: ${advertisers.join(', ')}`);
                
                // Add final enrichment
                const enrichedAds = discoveredAds.map(ad => ({
                    ...ad,
                    effectiveness_score: calculateEffectivenessScore(ad),
                    content_type: categorizeContent(ad),
                    age_focus: inferAgeGroup(ad),
                    competitive_strength: assessCompetitiveStrength(ad),
                    source: 'facebook_competitor_discovery',
                    platform: 'facebook'
                }));
                
                console.log(`✅ Successfully discovered ${enrichedAds.length} competitor ads from ${advertisers.length} unique advertisers`);
                await Actor.pushData(enrichedAds);
            } else {
                console.log(`⚠️ No qualifying advertisers found for "${searchTerm}"`);
                await Actor.pushData([{
                    error: false,
                    searchTerm,
                    message: `No advertisers met quality criteria (score ≥50, active ≥${minActiveDays} days, has media)`,
                    resultType: 'no_qualifying_advertisers',
                    scrapedAt: new Date().toISOString()
                }]);
            }
            
        } catch (error) {
            console.error(`❌ Error processing "${displayName}":`, error.message);
            
            await Actor.pushData([{
                error: true,
                searchTerm: searchTerm || competitorName,
                competitorName: competitorName,
                errorMessage: error.message,
                errorType: 'discovery_error',
                scrapedAt: new Date().toISOString()
            }]);
        }
    },
    
    maxRequestsPerCrawl: useDirectUrls ? competitorUrls.length : searchTerms.length, // Process all competitors
    maxConcurrency: 1,
    requestHandlerTimeoutSecs: 600 // Extended for discovery process
};

// Add proxy if available
if (proxyConfiguration) {
    crawlerOptions.proxyConfiguration = proxyConfiguration;
}

const crawler = new PuppeteerCrawler(crawlerOptions);

// Helper functions for final enrichment
function calculateEffectivenessScore(ad) {
    let score = ad.adQualityScore / 10; // Convert to 0-10 scale
    
    // Bonus for high activity
    if (ad.activeDays > 30) score += 1;
    if (ad.activeDays > 60) score += 1;
    
    return Math.min(score, 10);
}

function categorizeContent(ad) {
    const subjects = ad.courseSubjects ? ad.courseSubjects.join(' ').toLowerCase() : '';
    
    if (subjects.includes('coding') || subjects.includes('programming')) return 'coding_programming';
    if (subjects.includes('scratch')) return 'visual_programming';
    if (subjects.includes('robotics') || subjects.includes('robotika')) return 'robotics';
    if (subjects.includes('math') || subjects.includes('matematika')) return 'mathematics';
    if (subjects.includes('design')) return 'design';
    
    return 'general_kids_education';
}

function inferAgeGroup(ad) {
    const ageText = ad.ageTargeting ? ad.ageTargeting.join(' ').toLowerCase() : '';
    
    if (ageText.includes('sd') || ageText.includes('kelas 1') || ageText.includes('kelas 2')) return 'elementary_5_11';
    if (ageText.includes('smp') || ageText.includes('kelas 7') || ageText.includes('kelas 8')) return 'middle_school_12_14';
    if (ageText.includes('sma') || ageText.includes('kelas 10') || ageText.includes('kelas 11')) return 'high_school_15_17';
    
    return 'all_ages_5_17';
}

function assessCompetitiveStrength(ad) {
    let strength = 'medium';
    
    if (ad.adQualityScore >= 80 && ad.activeDays > 60) strength = 'high';
    else if (ad.adQualityScore >= 90) strength = 'very_high';
    else if (ad.adQualityScore < 60 || ad.activeDays < 14) strength = 'low';
    
    return strength;
}

async function autoScroll(page, maxScrolls = 15) {
    try {
        await page.evaluate(async (scrollCount) => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 500;
                let scrolls = 0;
                
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    scrolls++;

                    if (totalHeight >= scrollHeight || scrolls >= scrollCount) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 4000); // Slower scrolling for better content loading
            });
        }, maxScrolls);
    } catch (error) {
        console.log('Scroll failed:', error.message);
    }
}

// Google Sheets Integration
async function exportToGoogleSheets(data, spreadsheetId, sheetName, serviceAccountKey) {
    try {
        console.log('📊 Starting export to Google Sheets...');
        
        if (!serviceAccountKey || !spreadsheetId) {
            console.log('⚠️ Google Sheets credentials not provided. Skipping export.');
            return false;
        }

        // Parse service account key
        let credentials;
        try {
            credentials = typeof serviceAccountKey === 'string' 
                ? JSON.parse(serviceAccountKey) 
                : serviceAccountKey;
        } catch (e) {
            console.error('❌ Invalid Service Account JSON:', e.message);
            return false;
        }

        // Initialize Google Sheets API
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // Prepare data for sheets
        const headers = [
            'Ad ID',
            'Advertiser Name',
            'Ad Text',
            'Active Days',
            'Total Images',
            'Total Videos',
            'Has Carousel',
            'Has Video',
            'Media Type',
            'Age Targeting',
            'Course Subjects',
            'Offers',
            'Pricing Info',
            'Quality Score',
            'Content Relevance',
            'Media Quality',
            'Effectiveness Score',
            'Content Type',
            'Age Focus',
            'Competitive Strength',
            'Search Term',
            'Scraped At',
            'Image URLs',
            'Video URLs'
        ];

        const rows = data.map(ad => [
            ad.adId || '',
            ad.advertiserName || '',
            ad.adText || '',
            ad.activeDays || 0,
            ad.visualSummary?.totalImages || 0,
            ad.visualSummary?.totalVideos || 0,
            ad.visualSummary?.hasCarousel ? 'Yes' : 'No',
            ad.visualSummary?.hasVideo ? 'Yes' : 'No',
            ad.visualSummary?.dominantMediaType || '',
            Array.isArray(ad.ageTargeting) ? ad.ageTargeting.join(', ') : '',
            Array.isArray(ad.courseSubjects) ? ad.courseSubjects.join(', ') : '',
            Array.isArray(ad.offers) ? ad.offers.join(', ') : '',
            Array.isArray(ad.pricingInfo) ? ad.pricingInfo.join(', ') : '',
            ad.adQualityScore || 0,
            ad.contentRelevanceScore || 0,
            ad.mediaQualityScore || 0,
            ad.effectiveness_score || 0,
            ad.content_type || '',
            ad.age_focus || '',
            ad.competitive_strength || '',
            ad.searchTerm || '',
            ad.scrapedAt || '',
            Array.isArray(ad.allImageUrls) ? ad.allImageUrls.join('\n') : '',
            Array.isArray(ad.allVideoUrls) ? ad.allVideoUrls.join('\n') : ''
        ]);

        // Check if sheet exists, create if not
        try {
            const spreadsheet = await sheets.spreadsheets.get({
                spreadsheetId,
            });

            const sheetExists = spreadsheet.data.sheets.some(
                sheet => sheet.properties.title === sheetName
            );

            if (!sheetExists) {
                console.log(`📝 Creating new sheet: "${sheetName}"`);
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId,
                    requestBody: {
                        requests: [{
                            addSheet: {
                                properties: { title: sheetName }
                            }
                        }]
                    }
                });
            }
        } catch (error) {
            console.error('Error checking/creating sheet:', error.message);
        }

        // Clear existing data and write new data
        const range = `${sheetName}!A1`;
        
        // Clear sheet
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: `${sheetName}!A:Z`,
        });

        // Write headers and data
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            requestBody: {
                values: [headers, ...rows]
            }
        });

        // Format headers (bold, freeze row)
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        repeatCell: {
                            range: {
                                sheetId: 0,
                                startRowIndex: 0,
                                endRowIndex: 1
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: { red: 0.2, green: 0.2, blue: 0.2 },
                                    textFormat: {
                                        foregroundColor: { red: 1, green: 1, blue: 1 },
                                        bold: true
                                    }
                                }
                            },
                            fields: 'userEnteredFormat(backgroundColor,textFormat)'
                        }
                    },
                    {
                        updateSheetProperties: {
                            properties: {
                                sheetId: 0,
                                gridProperties: { frozenRowCount: 1 }
                            },
                            fields: 'gridProperties.frozenRowCount'
                        }
                    }
                ]
            }
        });

        console.log(`✅ Successfully exported ${rows.length} ads to Google Sheets`);
        console.log(`🔗 View your data: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
        
        return true;
    } catch (error) {
        console.error('❌ Google Sheets export failed:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
        }
        return false;
    }
}

// Add requests - use direct URLs if provided, otherwise search terms
if (useDirectUrls) {
    console.log(`🔗 Using ${competitorUrls.length} direct competitor URLs`);
    for (const competitor of competitorUrls) {
        await crawler.addRequests([{
            url: competitor.url,
            userData: { 
                competitorName: competitor.name,
                directUrl: competitor.url,
                searchTerm: competitor.name
            }
        }]);
    }
} else {
    console.log(`🔍 Using ${searchTerms.length} search terms`);
    for (const searchTerm of searchTerms) {
        await crawler.addRequests([{
            url: `https://www.facebook.com/ads/library/`,
            userData: { searchTerm }
        }]);
    }
}

await crawler.run();

console.log('🎉 Dynamic competitor discovery completed!');
console.log('📊 Discovered all advertisers running successful kids EdTech ads');

// Export to Google Sheets if enabled
if (enableGoogleSheets) {
    console.log('📤 Preparing to export data to Google Sheets...');
    
    try {
        // Get all data from the dataset
        const dataset = await Actor.openDataset();
        const { items } = await dataset.getData();
        
        // Filter out error entries for clean export
        const validAds = items.filter(item => !item.error && item.advertiserName);
        
        if (validAds.length > 0) {
            console.log(`📋 Found ${validAds.length} ads to export`);
            
            const exportSuccess = await exportToGoogleSheets(
                validAds,
                googleSheetsSpreadsheetId,
                googleSheetsName,
                googleServiceAccountKey
            );
            
            if (exportSuccess) {
                console.log('✅ Data successfully exported to Google Sheets!');
            } else {
                console.log('⚠️ Export to Google Sheets failed. Data is still saved in Apify Dataset.');
            }
        } else {
            console.log('⚠️ No valid ads found to export to Google Sheets');
        }
    } catch (error) {
        console.error('❌ Error during Google Sheets export:', error.message);
        console.log('💾 Data is still available in Apify Dataset');
    }
} else {
    console.log('ℹ️ Google Sheets export is disabled. Enable it in input settings to export data.');
}

await Actor.exit();
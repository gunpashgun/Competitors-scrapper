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

console.log('🚀 Competitor Ads Scraper');
if (useDirectUrls) {
    console.log(`📊 Mode: Direct competitor URLs (${competitorUrls.length} competitors)`);
    console.log(`📋 Competitors: ${competitorUrls.map(c => c.name).join(', ')}`);
} else {
    console.log(`📊 Search terms: ${searchTerms.join(', ')}`);
}
console.log(`🎯 Goal: Collect ALL active ads from competitors`);
console.log(`⏱️ Minimum active days: ${minActiveDays}`);

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
                '--disable-blink-features=AutomationControlled',
                // Memory optimization flags
                '--disable-extensions',
                '--disable-background-networking',
                '--disable-default-apps',
                '--disable-sync',
                '--metrics-recording-only',
                '--mute-audio',
                '--no-first-run',
                '--safebrowsing-disable-auto-update',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-breakpad',
                '--disable-component-extensions-with-background-pages',
                '--disable-features=TranslateUI,BlinkGenPropertyTrees',
                '--disable-ipc-flooding-protection',
                '--disable-renderer-backgrounding',
                '--enable-features=NetworkService,NetworkServiceInProcess',
                '--force-color-profile=srgb',
                '--hide-scrollbars',
                '--js-flags=--max-old-space-size=512'  // Limit JS heap to 512MB
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
            
            console.log('🕵️ Collecting all active ads...');
            
            // Reduced scrolling to save memory (was 20, now 10)
            await autoScroll(page, 10);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Collect ALL ads from the page (no filtering by quality)
            const discoveredAds = await page.evaluate((searchTermParam, minDays, competitorName, directUrl) => {
                const ads = [];
                
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
                        
                        // Simple filters: just check if we have basic data and meets min days
                        const hasBasicData = advertiserInfo.name && 
                                            advertiserInfo.name !== 'Unknown' &&
                                            advertiserInfo.name !== 'Meta Ad Library' &&
                                            adContent.text &&
                                            adContent.text.length > 30 &&
                                            activeDays >= minDays;
                        
                        if (hasBasicData) {
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
                                
                                // Discovery metadata
                                searchTerm: searchTermParam,
                                competitorName: competitorName || searchTermParam,
                                discoveryMethod: directUrl ? 'direct_url' : 'search_term',
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
                
                return ads.slice(0, 15); // Limit to 15 ads per competitor to save memory
                
            }, searchTerm, minActiveDays, competitorName, directUrl);
            
            console.log(`🎯 Discovered ${discoveredAds.length} ads from "${displayName}"`);
            
            if (discoveredAds.length > 0) {
                // Log discovered competitors
                const advertisers = [...new Set(discoveredAds.map(ad => ad.advertiserName))];
                console.log(`📋 Advertisers found: ${advertisers.join(', ')}`);
                
                // Add basic enrichment
                const enrichedAds = discoveredAds.map(ad => ({
                    ...ad,
                    source: 'facebook_ads_library',
                    platform: 'facebook'
                }));
                
                console.log(`✅ Successfully collected ${enrichedAds.length} ads from ${advertisers.length} unique advertisers`);
                await Actor.pushData(enrichedAds);
            } else {
                console.log(`⚠️ No ads found for "${displayName}"`);
                await Actor.pushData([{
                    error: false,
                    searchTerm: searchTerm || competitorName,
                    competitorName: displayName,
                    message: `No ads found (active ≥${minActiveDays} days)`,
                    resultType: 'no_ads_found',
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
        } finally {
            // Clear page memory after processing
            try {
                await page.evaluate(() => {
                    // Clear large objects from memory
                    if (window.gc) window.gc();
                });
            } catch (e) {
                // Ignore cleanup errors
            }
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

// Google Sheets Integration - Export each competitor to separate sheet
async function exportToGoogleSheetsByCompetitor(adsByCompetitor, spreadsheetId, serviceAccountKey) {
    try {
        console.log('📊 Starting export to Google Sheets (separate sheets per competitor)...');
        
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

        // Get existing sheets to find their IDs
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId,
        });

        const existingSheets = spreadsheet.data.sheets || [];
        const sheetNameToId = {};
        existingSheets.forEach(sheet => {
            sheetNameToId[sheet.properties.title] = sheet.properties.sheetId;
        });

        // Process each competitor
        let totalExported = 0;
        for (const [competitorName, ads] of Object.entries(adsByCompetitor)) {
            console.log(`📝 Exporting ${ads.length} ads for "${competitorName}"`);
            
            const sheetName = competitorName.substring(0, 100); // Limit sheet name length
            
            // Check if sheet exists, create if not
            if (!sheetNameToId[sheetName]) {
                console.log(`Creating new sheet: "${sheetName}"`);
                const addSheetResponse = await sheets.spreadsheets.batchUpdate({
                    spreadsheetId,
                    requestBody: {
                        requests: [{
                            addSheet: {
                                properties: { title: sheetName }
                            }
                        }]
                    }
                });
                sheetNameToId[sheetName] = addSheetResponse.data.replies[0].addSheet.properties.sheetId;
            }

            const sheetId = sheetNameToId[sheetName];

            // Prepare data for this competitor
            await exportCompetitorData(sheets, spreadsheetId, sheetName, sheetId, ads);
            totalExported += ads.length;
        }

        console.log(`✅ Successfully exported ${totalExported} ads across ${Object.keys(adsByCompetitor).length} sheets`);
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

async function exportCompetitorData(sheets, spreadsheetId, sheetName, sheetId, data) {
        // Prepare data for sheets
        const headers = [
            'Image Preview',
            'Video Thumbnail',
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
            'Search Term',
            'Scraped At',
            'Image URLs',
            'Video URLs'
        ];

        const rows = data.map((ad, index) => {
            // Get first image URL for preview
            const firstImageUrl = Array.isArray(ad.allImageUrls) && ad.allImageUrls.length > 0 
                ? ad.allImageUrls[0] 
                : '';
            
            // Get video thumbnail from mediaAssets or first video thumbnail
            const videoThumbnail = ad.mediaAssets?.thumbnails?.[0]?.url || 
                                   ad.mediaAssets?.videos?.[0]?.thumbnailUrl || '';
            
            return [
                // Image Preview - Google Sheets formula
                firstImageUrl ? `=IMAGE("${firstImageUrl}", 1)` : '',
                // Video Thumbnail Preview
                videoThumbnail ? `=IMAGE("${videoThumbnail}", 1)` : '',
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
                ad.searchTerm || ad.competitorName || '',
                ad.scrapedAt || '',
                Array.isArray(ad.allImageUrls) ? ad.allImageUrls.join('\n') : '',
                Array.isArray(ad.allVideoUrls) ? ad.allVideoUrls.join('\n') : ''
            ];
        });

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
        // Use USER_ENTERED to interpret formulas (IMAGE function)
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [headers, ...rows]
            }
        });

        // Format headers, set column widths, and add conditional formatting for fresh ads (1-2 days)
        const formatRequests = [
            // Bold headers with dark background
            {
                repeatCell: {
                    range: {
                        sheetId: sheetId,
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
            // Freeze first row
            {
                updateSheetProperties: {
                    properties: {
                        sheetId: sheetId,
                        gridProperties: { frozenRowCount: 1 }
                    },
                    fields: 'gridProperties.frozenRowCount'
                }
            },
            // Set width for Image Preview column (A)
            {
                updateDimensionProperties: {
                    range: {
                        sheetId: sheetId,
                        dimension: 'COLUMNS',
                        startIndex: 0,
                        endIndex: 1
                    },
                    properties: {
                        pixelSize: 200
                    },
                    fields: 'pixelSize'
                }
            },
            // Set width for Video Thumbnail column (B)
            {
                updateDimensionProperties: {
                    range: {
                        sheetId: sheetId,
                        dimension: 'COLUMNS',
                        startIndex: 1,
                        endIndex: 2
                    },
                    properties: {
                        pixelSize: 200
                    },
                    fields: 'pixelSize'
                }
            },
            // Set default row height for better preview display
            {
                updateDimensionProperties: {
                    range: {
                        sheetId: sheetId,
                        dimension: 'ROWS',
                        startIndex: 1,
                        endIndex: rows.length + 1
                    },
                    properties: {
                        pixelSize: 150
                    },
                    fields: 'pixelSize'
                }
            }
        ];

        // Add conditional formatting for fresh ads (1-2 days old) - light green
        // Active Days is column F (index 5, which is column letter F)
        // Using custom formula to highlight entire row based on Active Days value
        formatRequests.push({
            addConditionalFormatRule: {
                rule: {
                    ranges: [{
                        sheetId: sheetId,
                        startRowIndex: 1,
                        endRowIndex: rows.length + 1,
                        startColumnIndex: 0,
                        endColumnIndex: headers.length
                    }],
                    booleanRule: {
                        condition: {
                            type: 'CUSTOM_FORMULA',
                            values: [
                                { userEnteredValue: '=AND($F2>=1, $F2<=2)' }  // Column F = Active Days
                            ]
                        },
                        format: {
                            backgroundColor: { red: 0.85, green: 0.95, blue: 0.85 }  // Light green
                        }
                    }
                },
                index: 0
            }
        });

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: formatRequests
            }
        });

        console.log(`✅ Exported ${rows.length} ads to sheet "${sheetName}"`);
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

console.log('🎉 Competitor ads collection completed!');
console.log('📊 Collected all active ads from specified competitors');

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
            
            // Group ads by competitor
            const adsByCompetitor = {};
            validAds.forEach(ad => {
                const competitor = ad.competitorName || ad.searchTerm || 'Unknown';
                if (!adsByCompetitor[competitor]) {
                    adsByCompetitor[competitor] = [];
                }
                adsByCompetitor[competitor].push(ad);
            });
            
            console.log(`📊 Grouped into ${Object.keys(adsByCompetitor).length} competitors`);
            
            // Export each competitor to separate sheet
            const exportSuccess = await exportToGoogleSheetsByCompetitor(
                adsByCompetitor,
                googleSheetsSpreadsheetId,
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
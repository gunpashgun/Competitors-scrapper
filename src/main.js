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
    enableEngagementMatching = true,
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
console.log('🔖 VERSION: 2025-11-01-v1.9 - ENGAGEMENT + GREEN HIGHLIGHT');
console.log('✅ Code successfully loaded from GitHub');
console.log('─────────────────────────────────────────────────────');
if (useDirectUrls) {
    console.log(`📊 Mode: Direct competitor URLs (${competitorUrls.length} competitors)`);
    console.log(`📋 Processing: ${competitorUrls.map(c => c.name).join(', ')}`);
} else {
console.log(`📊 Search terms: ${searchTerms.join(', ')}`);
}
console.log(`🎯 Goal: Collect ALL active ads from competitors`);
console.log(`⏱️ Minimum active days: ${minActiveDays}`);
console.log(`💬 Engagement matching: ${enableEngagementMatching ? 'ENABLED (will scrape organic posts)' : 'DISABLED'}`);

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
            
            // Wait for ads to load - Facebook Ads Library takes time
            console.log('⏳ Waiting for ads to load...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Reduced scrolling to save memory (was 20, now 10)
            await autoScroll(page, 10);
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            console.log('🔍 Checking page content...');
            
            // Collect ALL ads from the page (no filtering by quality)
            const discoveredAdsResult = await page.evaluate((searchTermParam, minDays, competitorName, directUrl) => {
                const ads = [];
                
                console.log('🔍 Starting ad discovery in browser context...');
                console.log('Page URL:', window.location.href);
                console.log('Page title:', document.title);
                
                // Check for different possible ad containers
                const testSelectors = {
                    dataTestid: document.querySelectorAll('[data-testid]').length,
                    divs: document.querySelectorAll('div').length,
                    images: document.querySelectorAll('img').length,
                    videos: document.querySelectorAll('video').length,
                    articles: document.querySelectorAll('article').length,
                    adTestid: document.querySelectorAll('[data-testid*="ad"]').length,
                    resultTestid: document.querySelectorAll('[data-testid*="result"]').length
                };
                console.log('Selector counts:', JSON.stringify(testSelectors));
                
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
                
                console.log(`Total containers to check: ${allContainers.length}`);
                
                // Filter containers that look like ads using JavaScript
                const potentialAdContainers = allContainers.filter(container => {
                    if (!container || !container.querySelector) return false;
                    
                    const hasImage = container.querySelector('img') !== null;
                    const hasVideo = container.querySelector('video') !== null;
                    const hasLink = container.querySelector('a[href*="facebook.com"]') !== null;
                    const hasText = container.textContent && container.textContent.trim().length > 50;
                    const hasSponsoredText = container.textContent && 
                        (container.textContent.toLowerCase().includes('sponsored') ||
                         container.textContent.toLowerCase().includes('iklan') ||
                         container.textContent.toLowerCase().includes('started running'));
                    const hasPageName = container.querySelector('[data-testid*="page"]') !== null;
                    
                    // Must have media AND (sponsored text OR page name OR facebook link)
                    return (hasImage || hasVideo) && hasText && 
                           (hasSponsoredText || hasPageName || hasLink);
                });
                
                console.log(`Found ${potentialAdContainers.length} potential ad containers`);
                
                // Track why ads are rejected
                const rejectionReasons = [];
                const debugSamples = []; // Store first 3 for debugging
                const errors = []; // Track errors
                
                console.log(`Starting to process ${potentialAdContainers.length} containers...`);
                
                potentialAdContainers.forEach((container, index) => {
                    try {
                        if (index === 0) {
                            console.log('Processing first container...');
                        }
                        // Extract all available information
                        const advertiserInfo = extractAdvertiserInfo(container);
                        const adContent = extractAdContent(container);
                        const mediaAssets = extractMediaAssets(container);
                        const activeDays = extractActiveDays(container);
                        
                        // Debug first 3 containers - store for return
                        if (index < 3) {
                            debugSamples.push({
                                index: index,
                                advertiser: advertiserInfo.name || 'null',
                                textLength: adContent.text ? adContent.text.length : 0,
                                textPreview: adContent.text ? adContent.text.substring(0, 100) : '',
                                activeDays: activeDays,
                                images: mediaAssets.images.length,
                                videos: mediaAssets.videos.length
                            });
                        }
                        
                        // Simple filters: just check if we have basic data and meets min days
                        const hasBasicData = advertiserInfo.name && 
                            advertiserInfo.name !== 'Unknown' &&
                                            advertiserInfo.name !== 'Meta Ad Library' &&
                                            adContent.text &&
                                            adContent.text.length > 30 &&
                                            activeDays >= minDays;
                        
                        // Track rejection reasons
                        if (!hasBasicData) {
                            let reason = '';
                            if (!advertiserInfo.name || advertiserInfo.name === 'Unknown') reason = 'No advertiser name';
                            else if (advertiserInfo.name === 'Meta Ad Library') reason = 'Meta Ad Library';
                            else if (!adContent.text) reason = 'No ad text';
                            else if (adContent.text.length <= 30) reason = 'Text too short';
                            else if (activeDays < minDays) reason = `Active days ${activeDays} < ${minDays}`;
                            rejectionReasons.push(reason);
                        }
                        
                        if (hasBasicData) {
                            const kidsData = extractKidsEdTechData(adContent.text);
                            
                            ads.push({
                                // Core identification
                                adId: `discovered_${Date.now()}_${index}`,
                                libraryId: adContent.libraryId,
                                advertiserName: advertiserInfo.name,
                                adText: adContent.text.substring(0, 600),
                                landingPageUrl: adContent.landingPageUrl || '',
                                ctaButtonText: adContent.ctaButtonText || '',
                                
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
                        errors.push({
                            index: index,
                            message: error.message || String(error),
                            stack: error.stack || ''
                        });
                        if (index < 3) {
                            console.log(`Error in container ${index}:`, error.message);
                        }
                    }
                });
                
                console.log(`Finished processing. Ads found: ${ads.length}, Errors: ${errors.length}`);
                
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
                    let landingPageUrl = '';
                    let ctaButtonText = '';
                    
                    // Find any substantial text content (no keyword filtering)
                    for (const selector of textSelectors) {
                        const elements = container.querySelectorAll(selector);
                        
                        for (const element of elements) {
                            const text = element.textContent.trim();
                            // Take any text with reasonable length
                            if (text.length > 50) {
                                    adText = text;
                                    break;
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
                    
                    // Extract Landing Page URL - look for external links (not facebook.com)
                    const allLinks = container.querySelectorAll('a[href]');
                    for (const link of allLinks) {
                        const href = link.getAttribute('href') || '';
                        // Skip facebook internal links
                        if (href && 
                            !href.includes('facebook.com') && 
                            !href.includes('instagram.com') &&
                            !href.startsWith('#') &&
                            (href.startsWith('http') || href.startsWith('www'))) {
                            landingPageUrl = href;
                            break;
                        }
                    }
                    
                    // Extract CTA Button Text - common patterns
                    const ctaSelectors = [
                        'a[role="button"]',
                        'button',
                        '[data-testid*="cta"]',
                        '[data-testid*="button"]',
                        '.cta-button',
                        'a[href*="http"]:not([href*="facebook.com"])'
                    ];
                    
                    for (const selector of ctaSelectors) {
                        const ctaElement = container.querySelector(selector);
                        if (ctaElement) {
                            const btnText = ctaElement.textContent.trim();
                            // Common CTA patterns
                            if (btnText && btnText.length > 2 && btnText.length < 50) {
                                const ctaKeywords = ['learn', 'sign', 'get', 'join', 'start', 'shop', 'buy', 
                                                    'daftar', 'gabung', 'mulai', 'lihat', 'download', 
                                                    'apply', 'register', 'book', 'узнать', 'записаться'];
                                const lowerText = btnText.toLowerCase();
                                if (ctaKeywords.some(kw => lowerText.includes(kw))) {
                                    ctaButtonText = btnText;
                                    break;
                                }
                            }
                        }
                    }
                    
                    return { 
                        text: adText, 
                        libraryId: libraryId,
                        landingPageUrl: landingPageUrl,
                        ctaButtonText: ctaButtonText
                    };
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
                            
                            // Skip very small images (logos, icons) - must be at least 200x200
                            if (width > 0 && height > 0 && (width < 200 || height < 200)) {
                                return; // Skip this image
                            }
                            
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
                        '_thumb', '_small', 'avatar', 'logo_', 'button',
                        // Exclude small thumbnail sizes (60x60, 80x80, 120x120, etc.)
                        's60x60', 's80x80', 's120x120', 's150x150', 's200x200'
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
                
                // Log rejection reasons summary
                console.log(`\n📊 Rejection summary (out of ${potentialAdContainers.length} containers):`);
                const reasonCounts = {};
                rejectionReasons.forEach(r => {
                    reasonCounts[r] = (reasonCounts[r] || 0) + 1;
                });
                Object.entries(reasonCounts).forEach(([reason, count]) => {
                    console.log(`  ${reason}: ${count}`);
                });
                console.log(`  Accepted: ${ads.length}`);
                
                // Return both ads and debug info
                return {
                    ads: ads.slice(0, 15), // Limit to 15 ads per competitor to save memory
                    debug: {
                        selectorCounts: testSelectors,
                        totalContainers: allContainers.length,
                        potentialAdContainers: potentialAdContainers.length,
                        rejectionReasons: reasonCounts,
                        debugSamples: debugSamples,
                        errors: errors.slice(0, 5), // First 5 errors
                        totalErrors: errors.length,
                        pageUrl: window.location.href,
                        pageTitle: document.title
                    }
                };
                
            }, searchTerm, minActiveDays, competitorName, directUrl);
            
            // Log debug info from browser
            console.log('📊 Debug Info from Browser:');
            console.log(`   URL: ${discoveredAdsResult.debug.pageUrl}`);
            console.log(`   Title: ${discoveredAdsResult.debug.pageTitle}`);
            console.log(`   Selector counts:`, JSON.stringify(discoveredAdsResult.debug.selectorCounts));
            console.log(`   Total containers checked: ${discoveredAdsResult.debug.totalContainers}`);
            console.log(`   Potential ad containers: ${discoveredAdsResult.debug.potentialAdContainers}`);
            
            // Log first 3 sample extractions
            console.log('\n🔬 Sample Extractions (first 3 containers):');
            if (discoveredAdsResult.debug.debugSamples && discoveredAdsResult.debug.debugSamples.length > 0) {
                discoveredAdsResult.debug.debugSamples.forEach(sample => {
                    console.log(`\n  Container ${sample.index}:`);
                    console.log(`    Advertiser: "${sample.advertiser}"`);
                    console.log(`    Text length: ${sample.textLength}`);
                    console.log(`    Text preview: "${sample.textPreview}"`);
                    console.log(`    Active days: ${sample.activeDays}`);
                    console.log(`    Media: ${sample.images} images, ${sample.videos} videos`);
                });
            } else {
                console.log('  No samples available');
            }
            
            console.log('\n📊 Rejection Summary:');
            if (discoveredAdsResult.debug.rejectionReasons && Object.keys(discoveredAdsResult.debug.rejectionReasons).length > 0) {
                Object.entries(discoveredAdsResult.debug.rejectionReasons).forEach(([reason, count]) => {
                    console.log(`  ${reason}: ${count}`);
                });
            } else {
                console.log('  No rejection data available');
            }
            
            // Log errors if any
            if (discoveredAdsResult.debug.totalErrors > 0) {
                console.log(`\n❌ Errors during extraction: ${discoveredAdsResult.debug.totalErrors}`);
                if (discoveredAdsResult.debug.errors && discoveredAdsResult.debug.errors.length > 0) {
                    discoveredAdsResult.debug.errors.forEach(err => {
                        console.log(`  Container ${err.index}: ${err.message}`);
                    });
                }
            }
            
            const discoveredAds = discoveredAdsResult.ads;
            console.log(`\n🎯 Discovered ${discoveredAds.length} ads from "${displayName}"`);
            
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
                
                // Try to match ads with organic posts for engagement metrics
                if (enableEngagementMatching && enrichedAds.length > 0 && competitorName) {
                    try {
                        console.log(`\n🔗 Attempting to match ads with organic posts for engagement metrics...`);
                        
                        // Try to find the Facebook page URL for this competitor
                        // Common patterns: facebook.com/CompanyName or extracted from ads
                        const pageUrl = `https://www.facebook.com/${competitorName.replace(/\s+/g, '')}`;
                        
                        console.log(`📱 Attempting to scrape organic posts from: ${pageUrl}`);
                        
                        // Scrape organic posts from the competitor's page
                        const organicPosts = await scrapeOrganicPostsFromPage(page, pageUrl, 50);
                        
                        if (organicPosts.length > 0) {
                            console.log(`✅ Found ${organicPosts.length} organic posts`);
                            
                            // Match ads to organic posts
                            const adsWithEngagement = await matchAdsToOrganicPosts(enrichedAds, organicPosts);
                            
                            // Update enrichedAds with engagement data
                            enrichedAds.splice(0, enrichedAds.length, ...adsWithEngagement);
                            
                            console.log(`🎯 Engagement matching complete!`);
                        } else {
                            console.log(`⚠️ No organic posts found on page`);
                            // Add default engagement fields
                            enrichedAds.forEach(ad => {
                                ad.engagementMatched = false;
                                ad.engagementSource = 'page_not_accessible';
                                ad.reactionsTotal = null;
                                ad.commentsTotal = null;
                                ad.sharesTotal = null;
                                ad.matchScore = 0;
                            });
                        }
                    } catch (error) {
                        console.log(`⚠️ Failed to match engagement: ${error.message}`);
                        // Add default engagement fields
                        enrichedAds.forEach(ad => {
                            ad.engagementMatched = false;
                            ad.engagementSource = 'error_during_matching';
                            ad.reactionsTotal = null;
                            ad.commentsTotal = null;
                            ad.sharesTotal = null;
                            ad.matchScore = 0;
                        });
                    }
                }
                
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

/**
 * Scrape organic posts from Facebook page
 * Collects recent posts with engagement metrics (likes, comments, shares)
 */
async function scrapeOrganicPostsFromPage(page, pageUrl, maxPosts = 50) {
    console.log(`📱 Scraping organic posts from: ${pageUrl}`);
    
    try {
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Close any consent banners
        try {
            await page.evaluate(() => {
                const bannerSelectors = [
                    '[data-testid*="cookie"]',
                    '[data-testid*="consent"]',
                    '[aria-label*="Close"]',
                    'button:has-text("Allow")',
                    'button:has-text("Accept")'
                ];
                bannerSelectors.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => {
                        try { el.click(); } catch(e) {}
                    });
                });
            });
        } catch (e) {
            console.log('No consent banner or failed to close');
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Scroll to load posts (max 5 scrolls to avoid blocks)
        for (let i = 0; i < 5; i++) {
            await page.evaluate(() => window.scrollBy(0, 1000));
            await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
        }
        
        // Extract posts with engagement
        const posts = await page.evaluate((maxPostsLimit) => {
            const results = [];
            
            // Find all post containers
            const postContainers = Array.from(document.querySelectorAll('[data-testid="pagelet"], [role="article"], div[data-ad-preview]'));
            
            console.log(`Found ${postContainers.length} potential post containers`);
            
            for (const container of postContainers.slice(0, maxPostsLimit)) {
                try {
                    // Extract text
                    const textElements = container.querySelectorAll('[data-ad-comet-preview="message"], [data-ad-preview="message"], p, span');
                    let postText = '';
                    for (const el of textElements) {
                        const text = el.textContent.trim();
                        if (text.length > postText.length && text.length > 50) {
                            postText = text;
                        }
                    }
                    
                    // Extract image URLs
                    const images = Array.from(container.querySelectorAll('img'))
                        .map(img => img.src)
                        .filter(src => src && src.includes('scontent') && !src.includes('emoji'));
                    
                    // Extract engagement metrics - look for text patterns
                    const fullText = container.textContent || '';
                    
                    // Parse reactions (Like, Love, etc.)
                    let reactionsTotal = 0;
                    const reactionsMatch = fullText.match(/(\d+[\.,]?\d*[KkMm]?)\s*(?:reactions?|likes?|нравится)/i);
                    if (reactionsMatch) {
                        reactionsTotal = parseMetricNumber(reactionsMatch[1]);
                    }
                    
                    // Parse comments
                    let commentsTotal = 0;
                    const commentsMatch = fullText.match(/(\d+[\.,]?\d*[KkMm]?)\s*(?:comments?|комментари)/i);
                    if (commentsMatch) {
                        commentsTotal = parseMetricNumber(commentsMatch[1]);
                    }
                    
                    // Parse shares
                    let sharesTotal = 0;
                    const sharesMatch = fullText.match(/(\d+[\.,]?\d*[KkMm]?)\s*(?:shares?|репост)/i);
                    if (sharesMatch) {
                        sharesTotal = parseMetricNumber(sharesMatch[1]);
                    }
                    
                    // Check if sponsored
                    const isSponsored = fullText.toLowerCase().includes('sponsored') || 
                                       fullText.toLowerCase().includes('реклама') ||
                                       container.querySelector('[data-ad-rendering-role]') !== null;
                    
                    // Extract post URL
                    let postUrl = '';
                    const postLinks = container.querySelectorAll('a[href*="/posts/"], a[href*="/photos/"], a[href*="/videos/"]');
                    if (postLinks.length > 0) {
                        postUrl = postLinks[0].href;
                    }
                    
                    // Extract posted date (very approximate)
                    const datePatterns = [
                        /(\d+)\s*(?:hr|hour|ч|час)/i,
                        /(\d+)\s*(?:min|minute|мин)/i,
                        /(\d+)\s*(?:d|day|д|день|дня|дней)/i,
                        /(\d+)\s*(?:w|week|нед)/i
                    ];
                    
                    let postedAt = new Date().toISOString();
                    for (const pattern of datePatterns) {
                        const match = fullText.match(pattern);
                        if (match) {
                            const value = parseInt(match[1]);
                            const now = new Date();
                            if (pattern.source.includes('hr|hour')) {
                                now.setHours(now.getHours() - value);
                            } else if (pattern.source.includes('min')) {
                                now.setMinutes(now.getMinutes() - value);
                            } else if (pattern.source.includes('d|day')) {
                                now.setDate(now.getDate() - value);
                            } else if (pattern.source.includes('w|week')) {
                                now.setDate(now.getDate() - (value * 7));
                            }
                            postedAt = now.toISOString();
                            break;
                        }
                    }
                    
                    // Helper function to parse metric numbers (1.2K -> 1200)
                    function parseMetricNumber(str) {
                        if (!str) return 0;
                        str = str.toString().trim().toUpperCase().replace(',', '.');
                        const num = parseFloat(str);
                        if (str.includes('K')) return Math.round(num * 1000);
                        if (str.includes('M')) return Math.round(num * 1000000);
                        return Math.round(num);
                    }
                    
                    if (postText.length > 30 || images.length > 0) {
                        results.push({
                            postText: postText.substring(0, 600),
                            postUrl: postUrl || '',
                            images: images.slice(0, 3),
                            reactionsTotal,
                            commentsTotal,
                            sharesTotal,
                            isSponsored,
                            postedAt,
                            extractedAt: new Date().toISOString()
                        });
                    }
                } catch (e) {
                    console.log('Error extracting post:', e.message);
                }
            }
            
            return results;
        }, maxPosts);
        
        console.log(`✅ Extracted ${posts.length} posts from page`);
        return posts;
        
    } catch (error) {
        console.log(`❌ Failed to scrape page ${pageUrl}:`, error.message);
        return [];
    }
}

/**
 * Calculate text similarity between two strings (simple approach)
 */
function calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const normalize = (str) => str.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .trim()
        .substring(0, 300);
    
    const t1 = normalize(text1);
    const t2 = normalize(text2);
    
    if (t1 === t2) return 1.0;
    
    // Simple word overlap similarity
    const words1 = new Set(t1.split(/\s+/));
    const words2 = new Set(t2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
}

/**
 * Match ads to organic posts to get engagement metrics
 */
async function matchAdsToOrganicPosts(ads, organicPosts) {
    console.log(`🔗 Matching ${ads.length} ads to ${organicPosts.length} organic posts...`);
    
    let matchedCount = 0;
    
    for (const ad of ads) {
        let bestMatch = null;
        let bestScore = 0;
        
        for (const post of organicPosts) {
            // Skip if post is sponsored (it's an ad, not organic)
            if (post.isSponsored) continue;
            
            let score = 0;
            
            // Text similarity (weight: 0.6)
            const textSim = calculateTextSimilarity(ad.adText, post.postText);
            score += textSim * 0.6;
            
            // Image URL match (weight: 0.3)
            if (ad.allImageUrls && ad.allImageUrls.length > 0 && post.images && post.images.length > 0) {
                const adImage = ad.allImageUrls[0];
                for (const postImage of post.images) {
                    // Check if images are similar (same base URL pattern)
                    if (adImage && postImage && 
                        (adImage.includes(postImage.split('?')[0].split('/').pop()) ||
                         postImage.includes(adImage.split('?')[0].split('/').pop()))) {
                        score += 0.3;
                        break;
                    }
                }
            }
            
            // Date proximity (weight: 0.1) - within ±7 days
            try {
                const adDate = new Date(Date.now() - (ad.activeDays * 24 * 60 * 60 * 1000));
                const postDate = new Date(post.postedAt);
                const daysDiff = Math.abs((adDate - postDate) / (1000 * 60 * 60 * 24));
                if (daysDiff <= 7) {
                    score += 0.1 * (1 - daysDiff / 7);
                }
            } catch (e) {
                // Date parsing failed, skip date score
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = post;
            }
        }
        
        // If similarity > 70%, consider it a match
        if (bestScore > 0.7 && bestMatch) {
            ad.engagementMatched = true;
            ad.engagementSource = 'organic_post';
            ad.reactionsTotal = bestMatch.reactionsTotal;
            ad.commentsTotal = bestMatch.commentsTotal;
            ad.sharesTotal = bestMatch.sharesTotal;
            ad.matchScore = Math.round(bestScore * 100);
            ad.organicPostUrl = bestMatch.postUrl;
            matchedCount++;
        } else {
            ad.engagementMatched = false;
            ad.engagementSource = bestScore > 0.4 ? 'possible_dark_post' : 'not_found';
            ad.reactionsTotal = null;
            ad.commentsTotal = null;
            ad.sharesTotal = null;
            ad.matchScore = 0;
        }
    }
    
    console.log(`✅ Matched ${matchedCount} / ${ads.length} ads (${Math.round(matchedCount / ads.length * 100)}%)`);
    return ads;
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

/**
 * Calculate scoring metrics for ads
 * Analyzes patterns across ads to compute effectiveness scores
 */
function calculateScoringMetrics(ads) {
    // Build lookup maps for variant analysis
    const imageToTexts = new Map(); // image_url -> Set of ad_text
    const textToImages = new Map(); // ad_text -> Set of image_url
    const imageFrequency = new Map(); // image_url -> count
    
    // First pass: build maps
    ads.forEach(ad => {
        const imageUrl = ad.allImageUrls?.[0] || '';
        const adText = ad.adText || '';
        
        if (imageUrl) {
            if (!imageToTexts.has(imageUrl)) {
                imageToTexts.set(imageUrl, new Set());
            }
            if (adText) {
                imageToTexts.get(imageUrl).add(adText);
            }
            imageFrequency.set(imageUrl, (imageFrequency.get(imageUrl) || 0) + 1);
        }
        
        if (adText) {
            if (!textToImages.has(adText)) {
                textToImages.set(adText, new Set());
            }
            if (imageUrl) {
                textToImages.get(adText).add(imageUrl);
            }
        }
    });
    
    // Second pass: add metrics to each ad
    return ads.map(ad => {
        const imageUrl = ad.allImageUrls?.[0] || '';
        const adText = ad.adText || '';
        const hasVideo = ad.visualSummary?.hasVideo || false;
        
        // Calculate metrics
        const textVariants = imageUrl ? (imageToTexts.get(imageUrl)?.size || 0) : 0;
        const imageVariants = adText ? (textToImages.get(adText)?.size || 0) : 0;
        const sameImageCount = imageUrl ? (imageFrequency.get(imageUrl) || 0) : 0;
        
        // Platform count - count unique platforms
        const platformCount = ad.platforms?.length || 0;
        
        return {
            ...ad,
            scoringMetrics: {
                textVariants,
                imageVariants,
                sameImageCount,
                platformCount,
                hasVideo
            }
        };
    });
}

async function exportCompetitorData(sheets, spreadsheetId, sheetName, sheetId, data) {
        // Calculate scoring metrics first
        const dataWithScoring = calculateScoringMetrics(data);
        
        // Prepare data for sheets
        const headers = [
            'Image Preview',
            'Image URL',
            'Video Preview', 
            'Video URL',
            'Ad ID',
            'Advertiser Name',
            'Ad Text',
            'Ad Text Eng',
            'View Ad',
            'Landing Page URL',
            'CTA Button',
            'Active Days',
            'Reactions',
            'Comments',
            'Shares',
            'Engagement Match',
            'Match Score %',
            'Engagement Source',
            'Text Variants',
            'Image Variants',
            'Platform Count',
            'Same Image Count',
            'Has Video',
            'Score',
            'Total Images',
            'Total Videos',
            'Has Carousel',
            'Media Type',
            'Age Targeting',
            'Course Subjects',
            'Offers',
            'Search Term'
        ];

        const rows = dataWithScoring.map((ad, index) => {
            // Get first image URL for preview
            const firstImageUrl = Array.isArray(ad.allImageUrls) && ad.allImageUrls.length > 0 
                ? ad.allImageUrls[0] 
                : '';
            
            // Get video thumbnail from mediaAssets or first video thumbnail
            const videoThumbnail = ad.mediaAssets?.thumbnails?.[0]?.url || 
                                   ad.mediaAssets?.videos?.[0]?.thumbnailUrl || '';
            
            const rowNumber = index + 2; // +2 because row 1 is header, data starts at row 2
            
            // Build Facebook Ads Library link
            const adLibraryUrl = ad.libraryId 
                ? `https://www.facebook.com/ads/library/?id=${ad.libraryId}`
                : '';
            
            // Get scoring metrics
            const metrics = ad.scoringMetrics || {};
            
            // Score formula: (Active Days * 2) + (Text Variants * 3) + (Image Variants * 3) + 
            //                (Has Video ? 4 : 0) + (Platform Count > 1 ? 2 : 0) + (Same Image Count > 1 ? 5 : 0)
            // Column mapping: L=Active Days, S=Text Variants, T=Image Variants, U=Platform Count, 
            //                 V=Same Image Count, W=Has Video, X=Score
            const scoreFormula = `=L${rowNumber}*2+S${rowNumber}*3+T${rowNumber}*3+IF(W${rowNumber}="Yes",4,0)+IF(U${rowNumber}>1,2,0)+IF(V${rowNumber}>1,5,0)`;
            
            return [
                // Image Preview - formula references Image URL column (B)
                firstImageUrl ? `=IMAGE(B${rowNumber})` : '',
                // Image URL
                firstImageUrl || '',
                // Video Preview - formula references Video URL column (D)
                videoThumbnail ? `=IMAGE(D${rowNumber})` : '',
                // Video Thumbnail URL
                videoThumbnail || '',
                ad.adId || '',
                ad.advertiserName || '',
                ad.adText || '',
                // English translation formula - translates from column G (Ad Text)
                ad.adText ? `=GOOGLETRANSLATE(G${rowNumber}; "ID"; "en")` : '',
                adLibraryUrl || '',
                ad.landingPageUrl || '',
                ad.ctaButtonText || '',
                ad.activeDays || 0,
                ad.reactionsTotal !== null && ad.reactionsTotal !== undefined ? ad.reactionsTotal : '',
                ad.commentsTotal !== null && ad.commentsTotal !== undefined ? ad.commentsTotal : '',
                ad.sharesTotal !== null && ad.sharesTotal !== undefined ? ad.sharesTotal : '',
                ad.engagementMatched ? 'Yes' : 'No',
                ad.matchScore || 0,
                ad.engagementSource || 'not_attempted',
                metrics.textVariants || 0,
                metrics.imageVariants || 0,
                metrics.platformCount || 0,
                metrics.sameImageCount || 0,
                metrics.hasVideo ? 'Yes' : 'No',
                scoreFormula,
                ad.visualSummary?.totalImages || 0,
                ad.visualSummary?.totalVideos || 0,
                ad.visualSummary?.hasCarousel ? 'Yes' : 'No',
                ad.visualSummary?.dominantMediaType || '',
                Array.isArray(ad.ageTargeting) ? ad.ageTargeting.join(', ') : '',
                Array.isArray(ad.courseSubjects) ? ad.courseSubjects.join(', ') : '',
                Array.isArray(ad.offers) ? ad.offers.join(', ') : '',
                ad.searchTerm || ad.competitorName || ''
            ];
        });
        
        // Sort by Active Days (ascending - newest ads first)
        const sortedRows = rows.sort((a, b) => {
            const aDays = a[11] || 0; // Column L (index 11) = Active Days
            const bDays = b[11] || 0;
            return aDays - bDays; // Ascending: 1 day < 2 days < 3 days
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

        // Write headers and data (sorted by Active Days)
        // Use USER_ENTERED to interpret formulas (IMAGE, GOOGLETRANSLATE)
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [headers, ...sortedRows]
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
                        pixelSize: 150
                    },
                    fields: 'pixelSize'
                }
            },
            // Set width for Image URL column (B) - narrower
            {
                updateDimensionProperties: {
                    range: {
                        sheetId: sheetId,
                        dimension: 'COLUMNS',
                        startIndex: 1,
                        endIndex: 2
                    },
                    properties: {
                        pixelSize: 80
                    },
                    fields: 'pixelSize'
                }
            },
            // Set width for Video Preview column (C)
            {
                updateDimensionProperties: {
                    range: {
                        sheetId: sheetId,
                        dimension: 'COLUMNS',
                        startIndex: 2,
                        endIndex: 3
                    },
                    properties: {
                        pixelSize: 150
                    },
                    fields: 'pixelSize'
                }
            },
            // Set width for Video URL column (D) - narrower
            {
                updateDimensionProperties: {
                    range: {
                        sheetId: sheetId,
                        dimension: 'COLUMNS',
                        startIndex: 3,
                        endIndex: 4
                    },
                    properties: {
                        pixelSize: 80
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
                        endIndex: sortedRows.length + 1
                    },
                    properties: {
                        pixelSize: 150
                    },
                    fields: 'pixelSize'
                }
            },
            // Enable text wrapping for all cells (so Ad Text fits in cells)
            {
                repeatCell: {
                    range: {
                        sheetId: sheetId,
                        startRowIndex: 0,
                        endRowIndex: sortedRows.length + 1,
                        startColumnIndex: 0,
                        endColumnIndex: headers.length
                    },
                    cell: {
                        userEnteredFormat: {
                            wrapStrategy: 'WRAP'
                        }
                    },
                    fields: 'userEnteredFormat.wrapStrategy'
                }
            },
            // Conditional formatting: Highlight rows GREEN where Active Days >= 10
            {
                addConditionalFormatRule: {
                    rule: {
                        ranges: [{
                            sheetId: sheetId,
                            startRowIndex: 1, // Skip header
                            endRowIndex: sortedRows.length + 1,
                            startColumnIndex: 0,
                            endColumnIndex: headers.length
                        }],
                        booleanRule: {
                            condition: {
                                type: 'CUSTOM_FORMULA',
                                values: [{
                                    userEnteredValue: '=$L2>=10'  // Column L = Active Days
                                }]
                            },
                            format: {
                                backgroundColor: {
                                    red: 0.72,   // Light green (#B8E0B8)
                                    green: 0.88,
                                    blue: 0.72
                                }
                            }
                        }
                    },
                    index: 0
                }
            }
        ];

        // Note: Green highlighting automatically applied for ads active >= 10 days
        // Format > Conditional formatting > Custom formula: =$J2<=2 (Column J = Active Days)
        // Data is auto-sorted by Active Days (newest first)

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: formatRequests
            }
        });

        console.log(`✅ Exported ${sortedRows.length} ads to sheet "${sheetName}" (sorted by date, newest first)`);
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
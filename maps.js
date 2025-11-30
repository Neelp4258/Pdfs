#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');
const ExcelJS = require('exceljs');

class GoogleMapsExtractor {
    constructor(options = {}) {
        this.browser = null;
        this.page = null;
        this.results = [];
        this.stopExtraction = false;
        this.searchQuery = '';
        this.headless = options.headless || false;
    }

    async initialize() {
        console.log('🚀 Initializing Google Maps Extractor...');

        const launchOptions = {
            headless: this.headless ? 'new' : false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-extensions',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1920,1080'
            ],
            ignoreDefaultArgs: ['--enable-automation']
        };

        // For production/Replit environment
        if (process.env.NODE_ENV === 'production' || process.env.REPLIT_ENVIRONMENT) {
            console.log('🏭 Production/Replit environment detected');
            
            if (process.env.PUPPETEER_EXECUTABLE_PATH) {
                launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
                console.log('🔍 Using executable path:', process.env.PUPPETEER_EXECUTABLE_PATH);
            } else {
                const possiblePaths = [
                    '/usr/bin/chromium',
                    '/usr/bin/chromium-browser',
                    '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium'
                ];
                
                for (const chromiumPath of possiblePaths) {
                    if (fs.existsSync(chromiumPath)) {
                        launchOptions.executablePath = chromiumPath;
                        console.log('🔍 Using system Chromium at:', chromiumPath);
                        break;
                    }
                }
            }
        }

        try {
            this.browser = await puppeteer.launch(launchOptions);
            console.log('✅ Browser launched successfully');
            
            this.page = await this.browser.newPage();
            await this.page.setViewport({ width: 1920, height: 1080 });
            
            // Disable automation detection
            await this.page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => false
                });
            });
            
            console.log('✅ Browser page initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to launch browser:', error.message);
            throw error;
        }
    }

    async searchGoogleMaps(searchQuery) {
        try {
            console.log('🌐 Opening Google Maps...');
            await this.page.goto('https://www.google.com/maps', { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            await this.sleep(3000);

            // Handle cookie consent
            try {
                const acceptButtons = await this.page.$$('button');
                for (const button of acceptButtons) {
                    const text = await this.page.evaluate(el => el.textContent, button);
                    if (text && (text.includes('Accept') || text.includes('Reject') || text.includes('Got it'))) {
                        await button.click();
                        await this.sleep(1000);
                        break;
                    }
                }
            } catch (e) {
                // Cookie consent not found
            }

            console.log(`🔍 Searching for: "${searchQuery}"`);
            
            // Find search box
            const searchBoxSelectors = [
                'input#searchboxinput',
                'input[name="q"]',
                'input[aria-label*="Search"]'
            ];
            
            let searchBox = null;
            for (const selector of searchBoxSelectors) {
                try {
                    searchBox = await this.page.$(selector);
                    if (searchBox) break;
                } catch (e) {
                    continue;
                }
            }
            
            if (!searchBox) {
                console.error('❌ Could not find search box');
                return false;
            }

            // Type and search
            await searchBox.click();
            await this.sleep(500);
            await searchBox.type(searchQuery, { delay: 100 });
            await this.sleep(1000);
            await this.page.keyboard.press('Enter');
            
            console.log('⏳ Waiting for results to load...');
            await this.sleep(5000);

            // Verify results
            try {
                await this.page.waitForSelector('div[role="feed"]', { timeout: 15000 });
                console.log('✅ Search results detected!');
                return true;
            } catch (e) {
                console.error('❌ No search results found');
                return false;
            }
        } catch (error) {
            console.error('❌ Error:', error.message);
            return false;
        }
    }

    async extractPhoneFromText(text) {
        if (!text) return null;
        text = text.trim();
        const phonePatterns = [
            /[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}/,
            /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
            /\b\d{10}\b/
        ];
        for (const pattern of phonePatterns) {
            const matches = text.match(pattern);
            if (matches && matches[0].length >= 10) return matches[0].trim();
        }
        return null;
    }

    async extractListingDetailsFromPanel() {
        const details = {
            name: null, phone: null, email: null, website: null,
            address: null, rating: null, reviews_count: null,
            category: null, hours: null, price_level: null
        };

        try {
            await this.sleep(2000);

            // Extract name
            const nameSelectors = ['h1.DUwDvf.fontHeadlineLarge', 'h1[class*="fontHeadlineLarge"]', 'h1.DUwDvf', '[role="main"] h1'];
            for (const selector of nameSelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        const text = await this.page.evaluate(el => el.textContent, element);
                        if (text) {
                            details.name = text.trim();
                            break;
                        }
                    }
                } catch (e) { continue; }
            }

            // Extract category
            try {
                const categoryElement = await this.page.$('button[jsaction*="category"] .DkEaL, .DkEaL');
                if (categoryElement) {
                    const text = await this.page.evaluate(el => el.textContent, categoryElement);
                    if (text) details.category = text.trim();
                }
            } catch (e) {}

            // Extract info from buttons
            try {
                const infoButtons = await this.page.$$('button[data-item-id], button[data-tooltip], a[data-item-id]');
                for (const button of infoButtons) {
                    const itemId = await this.page.evaluate(el => el.getAttribute('data-item-id') || '', button);
                    const ariaLabel = await this.page.evaluate(el => el.getAttribute('aria-label') || '', button);
                    const text = await this.page.evaluate(el => el.textContent || '', button);

                    if (itemId.toLowerCase().includes('phone') || ariaLabel.toLowerCase().includes('phone')) {
                        if (ariaLabel && ariaLabel.includes(':')) {
                            details.phone = ariaLabel.split(':', 2)[1].trim();
                        } else if (text) {
                            const phone = await this.extractPhoneFromText(text);
                            if (phone) details.phone = phone;
                        }
                    }
                    else if (itemId.toLowerCase().includes('website') || ariaLabel.toLowerCase().includes('website')) {
                        if (text && (text.includes('.') || text.toLowerCase().includes('http'))) {
                            details.website = text.trim();
                        }
                    }
                    else if (itemId.toLowerCase().includes('address') || ariaLabel.toLowerCase().includes('address')) {
                        if (ariaLabel && ariaLabel.includes(':')) {
                            details.address = ariaLabel.split(':', 2)[1].trim();
                        } else if (text) {
                            details.address = text.trim();
                        }
                    }
                }
            } catch (e) {}

            // Alternative phone
            if (!details.phone) {
                try {
                    const phoneLinks = await this.page.$$('a[href^="tel:"]');
                    if (phoneLinks.length > 0) {
                        const href = await this.page.evaluate(el => el.getAttribute('href'), phoneLinks[0]);
                        details.phone = href.replace('tel:', '').trim();
                    }
                } catch (e) {}
            }

            // Rating and reviews
            try {
                const ratingElement = await this.page.$('span[role="img"][aria-label*="stars"], span.MW4etd');
                if (ratingElement) {
                    const ratingText = await this.page.evaluate(el => el.getAttribute('aria-label') || el.textContent, ratingElement);
                    if (ratingText) {
                        const match = ratingText.match(/([\d.]+)/);
                        if (match) details.rating = match[1];
                    }
                }
                const reviewElement = await this.page.$('span.UY7F9 a span, .UY7F9');
                if (reviewElement) {
                    const reviewText = await this.page.evaluate(el => el.textContent, reviewElement);
                    if (reviewText) {
                        const match = reviewText.match(/([\d,]+)/);
                        if (match) details.reviews_count = match[1].replace(/,/g, '');
                    }
                }
            } catch (e) {}

            // Email
            try {
                const panelText = await this.page.evaluate(() => {
                    const panel = document.querySelector('div[role="main"]');
                    return panel ? panel.textContent : '';
                });
                const emailMatch = panelText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
                if (emailMatch) details.email = emailMatch[0];
            } catch (e) {}

            console.log(`✅ ${details.name || 'Unknown'} - Phone: ${details.phone || 'N/A'}`);
        } catch (error) {
            console.error('❌ Error extracting:', error.message);
        }
        return details;
    }

    async clickListingByIndex(index) {
        try {
            const listings = await this.page.$$('div[role="feed"] a[href*="/maps/place/"]');
            if (index >= listings.length) return false;
            const listing = listings[index];
            await this.page.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), listing);
            await this.sleep(1000);
            await listing.click();
            await this.sleep(2000);
            return true;
        } catch (error) {
            console.error(`❌ Error clicking ${index}:`, error.message);
            return false;
        }
    }

    async getTotalResultsCount() {
        try {
            const listings = await this.page.$$('div[role="feed"] a[href*="/maps/place/"]');
            return listings.length;
        } catch (e) {
            return 0;
        }
    }

    async scrollResultsPanel() {
        try {
            const beforeScroll = await this.getTotalResultsCount();
            await this.page.evaluate(() => {
                const panel = document.querySelector('div[role="feed"]');
                if (panel) panel.scrollTop = panel.scrollHeight;
            });
            await this.sleep(3000);
            const afterScroll = await this.getTotalResultsCount();
            return afterScroll > beforeScroll;
        } catch (error) {
            return false;
        }
    }

    async extractAllResults() {
        const processedIndices = new Set();
        let consecutiveFailures = 0;
        let noNewResultsCount = 0;

        console.log('\n' + '='.repeat(60));
        console.log('EXTRACTION IN PROGRESS');
        console.log('='.repeat(60));
        console.log('Press CTRL+C to STOP and SAVE');
        console.log('='.repeat(60) + '\n');

        try {
            while (!this.stopExtraction) {
                const totalListings = await this.getTotalResultsCount();
                if (totalListings === 0) break;

                for (let i = 0; i < totalListings; i++) {
                    if (this.stopExtraction || processedIndices.has(i)) continue;
                    console.log(`📍 ${i + 1}/${totalListings} (Total: ${this.results.length})`);

                    try {
                        if (await this.clickListingByIndex(i)) {
                            const details = await this.extractListingDetailsFromPanel();
                            if (details.name) {
                                this.results.push(details);
                                processedIndices.add(i);
                                consecutiveFailures = 0;
                            } else {
                                consecutiveFailures++;
                            }
                        } else {
                            consecutiveFailures++;
                        }
                    } catch (error) {
                        consecutiveFailures++;
                    }

                    if (consecutiveFailures > 3) {
                        if (!await this.scrollResultsPanel()) noNewResultsCount++;
                        else noNewResultsCount = 0;
                        consecutiveFailures = 0;
                    }
                }

                if (this.stopExtraction) break;

                if (!await this.scrollResultsPanel()) {
                    noNewResultsCount++;
                } else {
                    noNewResultsCount = 0;
                }

                if (noNewResultsCount > 3) {
                    console.log(`✅ Complete! Total: ${this.results.length}`);
                    break;
                }
                await this.sleep(1000);
            }
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
        return this.results;
    }

    async saveToExcel(filename = 'google_maps_results.xlsx') {
        if (this.results.length === 0) return false;
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Google Maps Data');

            worksheet.columns = [
                { header: 'Name', key: 'name', width: 25 },
                { header: 'Phone', key: 'phone', width: 15 },
                { header: 'Email', key: 'email', width: 25 },
                { header: 'Website', key: 'website', width: 30 },
                { header: 'Address', key: 'address', width: 35 },
                { header: 'Rating', key: 'rating', width: 10 },
                { header: 'Reviews', key: 'reviews_count', width: 12 },
                { header: 'Category', key: 'category', width: 20 },
                { header: 'Hours', key: 'hours', width: 20 },
                { header: 'Price', key: 'price_level', width: 12 },
                { header: 'Date', key: 'extraction_date', width: 18 },
                { header: 'Query', key: 'search_query', width: 20 }
            ];

            const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
            this.results.forEach(result => {
                worksheet.addRow({ ...result, extraction_date: timestamp, search_query: this.searchQuery || 'N/A' });
            });

            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
            worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
            worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

            worksheet.eachRow((row, rowNumber) => {
                row.eachCell(cell => {
                    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                });
                if (rowNumber > 1 && rowNumber % 2 === 0) {
                    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
                }
            });

            await workbook.xlsx.writeFile(filename);
            console.log(`✅ Saved: ${filename}`);
            return true;
        } catch (error) {
            console.error('❌ Save error:', error.message);
            return false;
        }
    }

    async close() {
        try {
            if (this.browser) {
                await this.browser.close();
                console.log('🔒 Browser closed');
            }
        } catch (e) {}
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    promptUser(question) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        return new Promise(resolve => {
            rl.question(question, (answer) => {
                rl.close();
                resolve(answer.trim());
            });
        });
    }
}

// SIGINT handler
process.on('SIGINT', async () => {
    console.log('\n\n🛑 STOPPING...');
    if (global.extractor) {
        global.extractor.stopExtraction = true;
        if (global.extractor.results.length > 0) {
            const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
            const filename = `maps_stopped_${timestamp}.xlsx`;
            if (await global.extractor.saveToExcel(filename)) {
                console.log(`✅ Saved: ${filename} (${global.extractor.results.length} results)`);
            }
        }
        await global.extractor.close();
    }
    console.log('✅ Stopped!\n');
    process.exit(0);
});

// Main
(async () => {
    const extractor = new GoogleMapsExtractor({ headless: false });
    global.extractor = extractor;

    try {
        await extractor.initialize();
        
        console.log('\n' + '='.repeat(60));
        console.log('🗺️  GOOGLE MAPS EXTRACTOR');
        console.log('='.repeat(60));
        
        const searchQuery = await extractor.promptUser('\n📍 Enter search (e.g., "restaurants in NYC"): ');
        if (!searchQuery || searchQuery.trim() === '') {
            console.log('❌ Search required!');
            await extractor.close();
            process.exit(1);
        }
        
        extractor.searchQuery = searchQuery;
        
        if (await extractor.searchGoogleMaps(searchQuery)) {
            console.log('\n🚀 Starting extraction...\n');
            const results = await extractor.extractAllResults();
            
            const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
            const cleanQuery = searchQuery.replace(/[^\w\s-]/g, '').replace(/[-\s]+/g, '_');
            const filename = `maps_${cleanQuery}_${timestamp}.xlsx`;
            
            if (await extractor.saveToExcel(filename)) {
                console.log('\n' + '='.repeat(60));
                console.log('✅ COMPLETE');
                console.log('='.repeat(60));
                console.log(`Extracted: ${results.length} results`);
                console.log(`File: ${filename}`);
            }
        } else {
            console.log('❌ Search failed');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (extractor.results.length > 0) {
            const filename = `maps_emergency_${Date.now()}.xlsx`;
            await extractor.saveToExcel(filename);
        }
    } finally {
        await extractor.close();
    }
})();

module.exports = GoogleMapsExtractor;
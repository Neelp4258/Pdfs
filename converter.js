const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class EnhancedHTMLToPDFConverter {
    constructor(options = {}) {
        this.browser = null;
        this.defaultOptions = {
            format: 'A4',
            margin: {
                top: '12mm',
                right: '10mm',
                bottom: '14mm',
                left: '10mm'
            },
            printBackground: true,
            preferCSSPageSize: true,
            displayHeaderFooter: false,
            scale: 1.0,
            landscape: false,
            letterheadMode: 'all', // 'all' or 'first'
            // Add font options
            fontSupport: {
                hindi: true,
                embed: true
            },
            ...options
        };
    }

    async initialize() {
        if (this.browser) return;

        const launchOptions = {
            headless: 'new',
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
                '--disable-plugins',
                '--disable-background-networking',
                '--disable-client-side-phishing-detection',
                '--disable-default-apps',
                '--disable-hang-monitor',
                '--disable-popup-blocking',
                '--disable-prompt-on-repost',
                '--disable-sync',
                '--disable-translate',
                '--metrics-recording-only',
                '--no-default-browser-check',
                '--safebrowsing-disable-auto-update',
                '--enable-automation',
                '--password-store=basic',
                '--use-mock-keychain',
                '--font-render-hinting=none', // Improve non-Latin text rendering
            ]
        };

        console.log('🚀 Launching Puppeteer with Chrome...');
        
        // For production environments like Replit
        if (process.env.NODE_ENV === 'production' || process.env.REPLIT_ENVIRONMENT) {
            console.log('🏭 Production/Replit environment detected');
            
            if (process.env.PUPPETEER_EXECUTABLE_PATH) {
                launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
                console.log('🔍 Using executable path:', process.env.PUPPETEER_EXECUTABLE_PATH);
            } else {
                // Try to use system Chromium in Replit
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
            console.log('✅ Puppeteer browser launched successfully');
            
            // Test browser functionality
            const page = await this.browser.newPage();
            await page.setViewport({ width: 1200, height: 800 });
            await page.setContent('<html><body><h1>Test</h1></body></html>');
            await page.close();
            console.log('✅ Browser test completed successfully');
            
        } catch (error) {
            console.error('❌ Failed to launch browser:', error.message);
            throw new Error(`Browser launch failed: ${error.message}`);
        }

        // Set up print-specific configurations
        await this.setupPrintStyles();
    }

    async setupPrintStyles() {
        // This method sets up global print styles that will be injected into pages
        this.printCSS = `
            @media print {
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                img, table, h1, h2, h3, h4, h5, h6, ul, ol, p {
                    page-break-inside: avoid;
                }
                h1, h2, h3, h4, h5, h6 {
                    page-break-after: avoid;
                }
            }
        `;
        
        // Add Hindi font support CSS
        this.hindiFontCSS = `
            @import url('https://fonts.googleapis.com/css2?family=Hind:wght@300;400;500;600;700&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap');
            
            /* Ensure Hindi characters display properly */
            [lang="hi"], .hindi, *:lang(hi) {
                font-family: 'Noto Sans Devanagari', 'Hind', 'Arial Unicode MS', sans-serif !important;
                font-feature-settings: "kern" 1;
                text-rendering: optimizeLegibility;
            }
        `;
    }

    async loadLocalFonts() {
        // This function would load fonts locally if needed
        // Could be enhanced to load fonts from a local directory
        return {};
    }

    async processHindiText(htmlContent) {
        // Add lang attribute to elements with Hindi text if not already present
        // This is a simple approach; a more sophisticated one would detect Hindi characters
        let processedHTML = htmlContent;

        // Add HTML language attribute if not present
        if (!processedHTML.includes('<html lang="hi"') && !processedHTML.includes('<html lang="en"')) {
            processedHTML = processedHTML.replace('<html', '<html lang="hi"');
        }

        // Ensure charset is UTF-8
        if (!processedHTML.includes('<meta charset="UTF-8">') && !processedHTML.includes('charset=utf-8')) {
            processedHTML = processedHTML.replace('<head>', '<head>\n<meta charset="UTF-8">');
        }

        return processedHTML;
    }

    async convertHTMLToPDF(htmlContent, outputPath, customOptions = {}) {
        if (!this.browser) {
            throw new Error('Converter not initialized. Call initialize() first.');
        }

        const options = { ...this.defaultOptions, ...customOptions };
        const tempHtmlPath = path.join(__dirname, 'temp', `temp_${uuidv4()}.html`);
        
        try {
            // Ensure temp and output directories exist
            await fs.ensureDir(path.dirname(tempHtmlPath));
            await fs.ensureDir(path.dirname(outputPath));

            let processedHTML = htmlContent;
            
            // Process Hindi text if fontSupport.hindi is enabled
            if (options.fontSupport && options.fontSupport.hindi) {
                processedHTML = await this.processHindiText(processedHTML);
            }
            
            let pdfOptions = {
                format: options.format,
                landscape: options.landscape,
                margin: options.margin,
                printBackground: options.printBackground,
                preferCSSPageSize: options.preferCSSPageSize,
                scale: options.scale,
                // Add font-specific options
                printBackground: true,
                omitBackground: false,
            };

            // Enhanced CSS with font support
            const enhancedCSS = `
                <style>
                    ${this.printCSS}
                    ${options.fontSupport && options.fontSupport.hindi ? this.hindiFontCSS : ''}
                </style>
            `;

            // Check if HTML has head tag, if not wrap it
            if (!processedHTML.includes('<head>')) {
                processedHTML = `
                    <!DOCTYPE html>
                    <html lang="hi">
                    <head>
                        <meta charset="UTF-8">
                        ${enhancedCSS}
                    </head>
                    <body>
                        ${processedHTML}
                    </body>
                    </html>
                `;
            } else {
                // Insert CSS into existing head
                processedHTML = processedHTML.replace('</head>', `${enhancedCSS}</head>`);
            }

            // Write temporary HTML file
            await fs.writeFile(tempHtmlPath, processedHTML, 'utf8');

            // Create new page and navigate to HTML
            const page = await this.browser.newPage();
            
            // Set appropriate font settings
            await page.evaluateOnNewDocument(() => {
                // This ensures fonts render correctly
                if (document.fonts && document.fonts.ready) {
                    document.fonts.ready.then(() => {
                        console.log('Fonts loaded successfully');
                    });
                }
            });
            
            await page.setViewport({ width: 1200, height: 800 });
            
            // Set extra HTTP headers for font loading
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'hi,en-US;q=0.9,en;q=0.8'
            });
            
            await page.goto(`file://${tempHtmlPath}`, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });
            
            // Wait for all fonts to load
            await page.waitForFunction(() => document.fonts ? document.fonts.ready : true, { timeout: 5000 })
                .catch(err => console.warn('Font loading timeout:', err.message));

            // Wait a bit for any Web Fonts to render
            await page.waitForTimeout(1000);

            // Generate PDF with font handling
            const pdfBuffer = await page.pdf(pdfOptions);
            await fs.writeFile(outputPath, pdfBuffer);

            await page.close();

            // Clean up temporary file
            await fs.remove(tempHtmlPath);

            // Get file stats
            const stats = await fs.stat(outputPath);
            
            console.log(`✅ PDF generated successfully: ${path.basename(outputPath)}`);
            console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);

            return {
                success: true,
                outputPath: outputPath,
                fileSize: stats.size,
                pageCount: 1 // Simplified - would need more complex calculation for actual page count
            };

        } catch (error) {
            // Clean up on error
            try {
                await fs.remove(tempHtmlPath);
            } catch (cleanupError) {
                // Ignore cleanup errors
            }
            
            console.error('❌ PDF conversion failed:', error.message);
            throw error;
        }
    }

    async convertFile(inputPath, outputPath, options = {}) {
        // Read the HTML file with UTF-8 encoding
        const htmlContent = await fs.readFile(inputPath, 'utf8');
        return this.convertHTMLToPDF(htmlContent, outputPath, options);
    }

    async convertURL(url, outputPath, options = {}) {
        const page = await this.browser.newPage();
        
        // Set Hindi language preference
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'hi,en-US;q=0.9,en;q=0.8'
        });
        
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
        const htmlContent = await page.content();
        await page.close();
        
        return this.convertHTMLToPDF(htmlContent, outputPath, options);
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            console.log('🔒 Browser closed successfully');
        }
    }
}

module.exports = EnhancedHTMLToPDFConverter;
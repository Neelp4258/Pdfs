const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class HTMLToPDFConverter {
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
                '--use-mock-keychain'
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
    }

    async loadLogosAsDataURI() {
        const logoData = {};
        const logoFiles = [
            { name: 'trivanta.png', folder: 'assets' },
            { name: 'logo.png', folder: 'assets' }
        ];
        
        for (const logoFile of logoFiles) {
            const logoPath = path.join(__dirname, logoFile.folder, logoFile.name);
            try {
                if (await fs.pathExists(logoPath)) {
                    const logoBuffer = await fs.readFile(logoPath);
                    const base64 = logoBuffer.toString('base64');
                    logoData[logoFile.name] = `data:image/png;base64,${base64}`;
                    console.log(`📋 Loaded logo: ${logoFile.name}`);
                } else {
                    console.warn(`⚠️ Logo file not found: ${logoPath}`);
                    // Create a simple placeholder data URI
                    logoData[logoFile.name] = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjY2NjIi8+Cjwvc3ZnPgo=';
                }
            } catch (error) {
                console.warn(`⚠️ Error loading logo ${logoFile.name}: ${error.message}`);
                // Fallback placeholder
                logoData[logoFile.name] = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjY2NjIi8+Cjwvc3ZnPgo=';
            }
        }
        
        return logoData;
    }

    generateLetterheadCSS(letterheadType = 'trivanta', letterheadMode = 'all', landscape = false, format = 'A4') {
        const isFirstOnly = letterheadMode === 'first';
        
        // Adjust margins based on orientation and format
        const topMargin = landscape ? '10mm' : '12mm';
        const sideMargin = landscape ? '12mm' : '10mm';
        const bottomMargin = landscape ? '12mm' : '14mm';
        
        let letterheadCSS = `
            @page {
                size: ${format} ${landscape ? 'landscape' : 'portrait'};
                margin: ${topMargin} ${sideMargin} ${bottomMargin} ${sideMargin};
            }
        `;

        if (isFirstOnly) {
            letterheadCSS += `
                @page:first {
                    margin-top: ${landscape ? '32mm' : '35mm'};
                }
            `;
        } else {
            letterheadCSS += `
                @page {
                    margin-top: ${landscape ? '32mm' : '35mm'};
                }
            `;
        }

        letterheadCSS += `
            html, body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            body {
                margin: 0 !important;
                padding-top: 0 !important;
                padding-bottom: 16mm !important;
                background: #ffffff !important;
            }
            
            * {
                box-sizing: border-box;
            }
        `;

        return letterheadCSS;
    }

    async generateLetterheadTemplates(letterheadType, letterheadMode, logoData, landscape = false) {
        const isFirstOnly = letterheadMode === 'first';
        
        // Create header template
        let headerTemplate = `
            <div style="font-size: 12px; width: 100%; padding: 10px 20px; margin: 0; 
                        font-family: 'Times New Roman', serif;">
        `;

        if (letterheadType === 'dazzlo') {
            headerTemplate += `
                <table style="width: 100%; border-collapse: collapse; margin: 0; padding: 0;">
                    <tr>
                        <td style="width: 60px; vertical-align: middle; padding: 0;">
                            ${logoData['logo.png'] ? `<img src="${logoData['logo.png']}" style="width: 50px; height: 50px;" alt="Dazzlo Logo">` : ''}
                        </td>
                        <td style="padding-left: 20px; vertical-align: middle;">
                            <div style="font-size: 20px; font-weight: bold; color: #333; margin-bottom: 5px;">
                                Dazzlo Enterprises Pvt Ltd
                            </div>
                            <div style="font-size: 11px; font-style: italic; color: #666;">
                                Redefining lifestyle with Innovations and Dreams
                            </div>
                        </td>
                        <td style="text-align: right; vertical-align: middle; font-size: 10px; font-weight: bold; color: #333;">
                            Tel: +91 9373015503<br>
                            Email: info@dazzlo.co.in<br>
                            Address: Kalyan, Maharashtra 421301
                        </td>
                    </tr>
                </table>
            `;
        } else {
            // Trivanta letterhead
            headerTemplate += `
                <table style="width: 100%; border-collapse: collapse; margin: 0; padding: 0;">
                    <tr>
                        <td style="width: 60px; vertical-align: middle; padding: 0;">
                            ${logoData['trivanta.png'] ? `<img src="${logoData['trivanta.png']}" style="width: 50px; height: 50px;" alt="Trivanta Logo">` : ''}
                        </td>
                        <td style="padding-left: 20px; vertical-align: middle;">
                            <div style="font-size: 18px; font-weight: bold; color: #1a365d; margin-bottom: 5px;">
                                Trivanta Edge
                            </div>
                            <div style="font-size: 9px; font-style: italic; color: #2c5282;">
                                From Land to Legacy – with Edge
                            </div>
                        </td>
                        <td style="text-align: right; vertical-align: middle; font-size: 8px; font-weight: bold; color: #1a365d;">
                            sales@trivantaedge.com<br>
                            info@trivantaedge.com<br>
                            +91 9373015503<br>
                            Kalyan, Maharashtra
                        </td>
                    </tr>
                </table>
            `;
        }

        headerTemplate += '</div>';

        // Footer template
        const footerTemplate = letterheadType === 'dazzlo' 
            ? '<div style="font-size: 10px; text-align: center; padding: 5px;">info@dazzlo.co.in | www.dazzlo.co.in</div>'
            : '<div style="font-size: 10px; text-align: center; padding: 5px;">© 2025 Trivanta Edge. All rights reserved. | <strong>www.trivantaedge.com</strong></div>';

        return { headerTemplate, footerTemplate };
    }

    adjustMarginsForLetterhead(originalMargin, landscape = false) {
        const margin = typeof originalMargin === 'object' ? originalMargin : {
            top: '12mm', right: '10mm', bottom: '14mm', left: '10mm'
        };

        // Add extra top margin for letterhead header
        const headerHeight = landscape ? '25mm' : '30mm';
        const topMargin = this.addMargin(margin.top || '12mm', headerHeight);
        
        return {
            ...margin,
            top: topMargin,
            bottom: this.addMargin(margin.bottom || '14mm', '10mm')
        };
    }

    addMargin(original, additional) {
        const originalNum = parseFloat(original);
        const additionalNum = parseFloat(additional);
        const unit = original.replace(/[\d.]/g, '') || 'mm';
        
        return `${originalNum + additionalNum}${unit}`;
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
            let pdfOptions = {
                format: options.format,
                landscape: options.landscape,
                margin: options.margin,
                printBackground: options.printBackground,
                preferCSSPageSize: options.preferCSSPageSize,
                scale: options.scale
            };

            // Handle letterhead
            if (options.letterhead) {
                const logoData = await this.loadLogosAsDataURI();
                const { headerTemplate, footerTemplate } = await this.generateLetterheadTemplates(
                    options.letterheadType, 
                    options.letterheadMode, 
                    logoData, 
                    options.landscape
                );

                // Adjust margins for letterhead
                pdfOptions.margin = this.adjustMarginsForLetterhead(options.margin, options.landscape);
                pdfOptions.displayHeaderFooter = true;
                pdfOptions.headerTemplate = headerTemplate;
                pdfOptions.footerTemplate = footerTemplate;
            }

            // Add enhanced CSS
            const enhancedCSS = `
                <style>
                    ${this.printCSS}
                    ${options.letterhead ? this.generateLetterheadCSS(options.letterheadType, options.letterheadMode, options.landscape, options.format) : ''}
                </style>
            `;

            // Check if HTML has head tag, if not wrap it
            if (!processedHTML.includes('<head>')) {
                processedHTML = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
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
            await page.setViewport({ width: 1200, height: 800 });
            await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle0' });

            // Generate PDF
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
        const htmlContent = await fs.readFile(inputPath, 'utf8');
        return this.convertHTMLToPDF(htmlContent, outputPath, options);
    }

    async convertURL(url, outputPath, options = {}) {
        const page = await this.browser.newPage();
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

module.exports = HTMLToPDFConverter;
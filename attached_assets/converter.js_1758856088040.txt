const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class UltimateHTMLToPDFConverter {
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
        
        // For production environments like Render or when Chromium is available
        if (process.env.NODE_ENV === 'production' || process.env.REPLIT_ENVIRONMENT) {
            console.log('🏭 Production/Replit environment detected');
            
            if (process.env.PUPPETEER_EXECUTABLE_PATH) {
                launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
                console.log('🔍 Using executable path:', process.env.PUPPETEER_EXECUTABLE_PATH);
            } else {
                // Try to use system Chromium in Replit
                const fs = require('fs');
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
        const logoFiles = ['trivanta.png', 'logo.png'];
        
        for (const logoFile of logoFiles) {
            const logoPath = path.join(__dirname, '..', 'public', logoFile);
            try {
                if (await fs.pathExists(logoPath)) {
                    const logoBuffer = await fs.readFile(logoPath);
                    const base64 = logoBuffer.toString('base64');
                    logoData[logoFile] = `data:image/png;base64,${base64}`;
                    console.log(`📋 Loaded logo: ${logoFile}`);
                } else {
                    console.warn(`⚠️ Logo file not found: ${logoPath}`);
                }
            } catch (error) {
                console.warn(`⚠️ Error loading logo ${logoFile}: ${error.message}`);
            }
        }
        
        return logoData;
    }

    enhanceHTMLForLetterhead(htmlContent) {
        // Just enhance with print-friendly CSS, no letterhead injection
        return this.enhanceHTML(htmlContent);
    }

    async generateLetterheadTemplates(letterheadType, letterheadMode, logoData) {
        const isFirstOnly = letterheadMode === 'first';
        
        // Create header template - for first page only, we'll use page number to conditionally show
        let headerTemplate = '';
        
        if (isFirstOnly) {
            // For first page only - use pageNumber template variable
            headerTemplate = `
                <div style="font-size: 12px; width: 100%; padding: 10px 20px; margin: 0; 
                            font-family: 'Times New Roman', serif;">
                    <style>
                        .letterhead-header { display: none; }
                        .letterhead-header.page-1 { display: block; }
                    </style>
                    <div class="letterhead-header page-<span class="pageNumber"></span>">
            `;
        } else {
            // For all pages
            headerTemplate = `
                <div style="font-size: 12px; width: 100%; padding: 10px 20px; margin: 0; 
                            font-family: 'Times New Roman', serif;">
                    <div class="letterhead-header">
            `;
        }

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
        // Convert margin object to ensure we have all sides
        const margin = typeof originalMargin === 'object' ? originalMargin : {
            top: '12mm', right: '10mm', bottom: '14mm', left: '10mm'
        };

        // Add extra top margin for letterhead header
        const headerHeight = landscape ? '25mm' : '30mm';
        const topMargin = this.addMargin(margin.top || '12mm', headerHeight);
        
        return {
            ...margin,
            top: topMargin,
            bottom: this.addMargin(margin.bottom || '14mm', '10mm') // Extra for footer
        };
    }

    addMargin(original, additional) {
        // Simple margin addition - convert to numbers and add
        const originalNum = parseFloat(original);
        const additionalNum = parseFloat(additional);
        const unit = original.replace(/[\d.]/g, '') || 'mm';
        
        return `${originalNum + additionalNum}${unit}`;
    }

    generateLetterheadCSS(letterheadType = 'trivanta', letterheadMode = 'all', landscape = false) {
        const isFirstOnly = letterheadMode === 'first';
        
        // Adjust margins based on orientation
        const topMargin = landscape ? '10mm' : '12mm';
        const sideMargin = landscape ? '12mm' : '10mm';
        const bottomMargin = landscape ? '12mm' : '14mm';
        
        let letterheadCSS = `
            @page {
                size: A4 ${landscape ? 'landscape' : 'portrait'};
                margin: ${topMargin} ${sideMargin} ${bottomMargin} ${sideMargin};
            }
            
            @page:first {
                margin-top: ${landscape ? '32mm' : '35mm'};
            }
        `;

        if (!isFirstOnly) {
            letterheadCSS += `
                @page:not(:first) {
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
            
            .pdf-header, .pdf-header *, .pdf-header table, .pdf-header td, .pdf-header tr, .pdf-header img {
                border: none !important;
                outline: none !important;
                box-shadow: none !important;
                background: transparent !important;
            }
            
            .pdf-header {
                position: fixed !important;
                top: 0 !important; 
                left: 0 !important; 
                right: 0 !important;
                height: ${landscape ? '28mm' : '31mm'} !important;
                box-sizing: border-box !important;
                padding: ${landscape ? '10px 20px' : '15px 25px'} !important;
                background: #ffffff !important;
                font-family: 'Times New Roman', serif !important;
                z-index: 1000 !important;
                overflow: hidden !important;
        `;

        if (isFirstOnly) {
            letterheadCSS += `
                display: block !important;
            }
            
            .pdf-header.not-first-page {
                display: none !important;
            `;
        } else {
            letterheadCSS += `
                display: block !important;
            `;
        }

        // Add letterhead-specific styling
        if (letterheadType === 'dazzlo') {
            letterheadCSS += `
                border-bottom: 3px solid #d4af37 !important;
            }
            
            .pdf-header table {
                width: 100% !important;
                border-collapse: collapse !important;
                border: none !important;
                margin: 0 !important;
                padding: 0 !important;
                border-spacing: 0 !important;
                background: transparent !important;
            }
            
            .pdf-header td {
                border: none !important;
                outline: none !important;
                padding: 0 !important;
                margin: 0 !important;
                background: transparent !important;
                vertical-align: middle !important;
            }
            
            .pdf-header .company-name {
                font-size: ${landscape ? '20px' : '24px'} !important; 
                font-weight: bold !important; 
                color: #333 !important;
                margin-bottom: 6px !important;
                line-height: 1.2 !important;
            }
            
            .pdf-header .tagline {
                font-size: ${landscape ? '11px' : '13px'} !important; 
                font-style: italic !important; 
                color: #666 !important;
                line-height: 1.2 !important;
            }
            
            .pdf-header .contact-info {
                font-size: ${landscape ? '10px' : '12px'} !important; 
                font-weight: bold !important; 
                line-height: 1.4 !important; 
                color: #333 !important;
                text-align: right !important;
            }
            
            .pdf-header img {
                width: ${landscape ? '50px' : '60px'} !important;
                height: ${landscape ? '50px' : '60px'} !important;
                border: none !important;
                outline: none !important;
                display: block !important;
            }`;
        } else {
            // Trivanta letterhead
            letterheadCSS += `
                border-bottom: 3px solid #2c5282 !important;
            }
            
            .pdf-header table {
                width: 100% !important;
                border-collapse: collapse !important;
                border: none !important;
                margin: 0 !important;
                padding: 0 !important;
                border-spacing: 0 !important;
                background: transparent !important;
            }
            
            .pdf-header td {
                border: none !important;
                outline: none !important;
                padding: 0 !important;
                margin: 0 !important;
                background: transparent !important;
                vertical-align: middle !important;
            }
            
            .pdf-header .company-name {
                font-size: ${landscape ? '18px' : '22px'} !important; 
                font-weight: bold !important; 
                color: #1a365d !important;
                margin-bottom: 5px !important;
                line-height: 1.2 !important;
            }
            
            .pdf-header .tagline {
                font-size: ${landscape ? '9px' : '11px'} !important; 
                font-style: italic !important; 
                color: #2c5282 !important;
                line-height: 1.2 !important;
            }
            
            .pdf-header .contact-info {
                font-size: ${landscape ? '8px' : '10px'} !important; 
                font-weight: bold !important; 
                line-height: 1.4 !important; 
                color: #1a365d !important;
                text-align: right !important;
            }
            
            .pdf-header img {
                width: ${landscape ? '50px' : '60px'} !important;
                height: ${landscape ? '50px' : '60px'} !important;
                border: none !important;
                outline: none !important;
                display: block !important;
            }`;
        }

        letterheadCSS += `
            .pdf-footer {
                position: fixed !important;
                bottom: 0 !important; 
                left: 0 !important; 
                right: 0 !important;
                height: 12mm !important;
                box-sizing: border-box !important;
                border-top: 1px solid #ddd !important;
                text-align: center !important;
                padding: 8px 0 !important;
                font: italic ${landscape ? '9px' : '10px'} 'Times New Roman', serif !important;
                color: #666 !important;
                background: #ffffff !important;
                z-index: 1000 !important;
            }
            
            .pdf-footer .website { 
                font-weight: bold !important; 
                color: #1a365d !important; 
            }
        `;

        return letterheadCSS;
    }

    generateLetterheadHTML(letterheadType = 'trivanta', letterheadMode = 'all') {
        let headerHTML, footerHTML;

        if (letterheadType === 'dazzlo') {
            headerHTML = `
                <div class="pdf-header${letterheadMode === 'first' ? ' first-page-only' : ''}">
                    <table>
                        <tr>
                            <td style="width: 60px;">
                                <img src="logo.png" alt="Dazzlo Logo">
                            </td>
                            <td style="padding-left: 25px;">
                                <div class="company-name">Dazzlo Enterprises Pvt Ltd</div>
                                <div class="tagline">Redefining lifestyle with Innovations and Dreams</div>
                            </td>
                            <td class="contact-info">
                                Tel: +91 9373015503<br>
                                Email: info@dazzlo.co.in<br>
                                Address: Kalyan, Maharashtra 421301
                            </td>
                        </tr>
                    </table>
                </div>
            `;

            footerHTML = `
                <div class="pdf-footer">
                    info@dazzlo.co.in | www.dazzlo.co.in
                </div>
            `;
        } else {
            headerHTML = `
                <div class="pdf-header${letterheadMode === 'first' ? ' first-page-only' : ''}">
                    <table>
                        <tr>
                            <td style="width: 60px;">
                                <img src="trivanta.png" alt="Trivanta Logo">
                            </td>
                            <td style="padding-left: 20px;">
                                <div class="company-name">Trivanta Edge</div>
                                <div class="tagline">From Land to Legacy – with Edge</div>
                            </td>
                            <td class="contact-info">
                                sales@trivantaedge.com<br>
                                info@trivantaedge.com<br>
                                +91 9373015503<br>
                                Kalyan, Maharashtra
                            </td>
                        </tr>
                    </table>
                </div>
            `;

            footerHTML = `
                <div class="pdf-footer">
                    © 2025 Trivanta Edge. All rights reserved. | <span class="website">www.trivantaedge.com</span>
                </div>
            `;
        }

        return { headerHTML, footerHTML };
    }

    wrapWithLetterhead(htmlContent, baseDir, letterheadType = 'trivanta', letterheadMode = 'all', landscape = false) {
        // Extract head and body content
        const headMatch = htmlContent.match(/<head[\s\S]*?>([\s\S]*?)<\/head>/i);
        const bodyMatch = htmlContent.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i);
        
        const innerHead = headMatch ? headMatch[1] : '';
        const innerBody = bodyMatch ? bodyMatch[1] : htmlContent;

        const letterheadCSS = this.generateLetterheadCSS(letterheadType, letterheadMode, landscape);
        const { headerHTML, footerHTML } = this.generateLetterheadHTML(letterheadType, letterheadMode);

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    ${innerHead}
    <style>${letterheadCSS}</style>
</head>
<body>
    ${headerHTML}
    ${footerHTML}
    ${innerBody}
</body>
</html>`;
    }

    async convertHTMLToPDF(htmlContent, outputPath, customOptions = {}) {
        if (!this.browser) {
            throw new Error('Converter not initialized. Call initialize() first.');
        }

        const options = { ...this.defaultOptions, ...customOptions };
        const tempHtmlPath = path.join(__dirname, '..', 'temp', `temp_${uuidv4()}.html`);
        
        try {
            // Ensure temp directory exists
            await fs.ensureDir(path.dirname(tempHtmlPath));

            // Enhance HTML with print-friendly CSS
            let enhancedHTML = this.enhanceHTML(htmlContent);

            // Add letterhead if requested
            if (options.letterhead) {
                const baseDir = path.dirname(tempHtmlPath);
                
                // Load logos from public directory and convert to data URIs
                const logoData = await this.loadLogosAsDataURI();
                
                // Don't wrap with letterhead - we'll use headerTemplate instead
                enhancedHTML = this.enhanceHTMLForLetterhead(enhancedHTML);
            }

            // Write enhanced HTML to temporary file
            await fs.writeFile(tempHtmlPath, enhancedHTML, 'utf8');

            const page = await this.browser.newPage();
            
            // Set viewport and user agent
            await page.setViewport({ width: 1200, height: 800 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            
            // Navigate to the temporary HTML file
            await page.goto(`file://${tempHtmlPath}`, { 
                waitUntil: ['networkidle0', 'domcontentloaded'],
                timeout: 30000
            });

            // Wait for images to load
            await page.evaluate(() => {
                return Promise.all(
                    Array.from(document.images)
                        .filter(img => !img.complete)
                        .map(img => new Promise(resolve => {
                            img.onload = img.onerror = resolve;
                        }))
                );
            });

            // Additional wait for any dynamic content
            await page.waitForTimeout(1000);

            // Generate PDF with letterhead header/footer if needed
            const pdfOptions = {
                format: options.format,
                margin: options.margin,
                printBackground: options.printBackground,
                preferCSSPageSize: false, // Let us control margins
                scale: options.scale,
                landscape: options.landscape,
                timeout: 60000
            };

            if (options.letterhead) {
                const { headerTemplate, footerTemplate } = await this.generateLetterheadTemplates(
                    options.letterheadType || 'trivanta',
                    options.letterheadMode || 'all',
                    logoData
                );
                
                pdfOptions.displayHeaderFooter = true;
                pdfOptions.headerTemplate = headerTemplate;
                pdfOptions.footerTemplate = footerTemplate;
                
                // Adjust margins to account for header/footer
                const adjustedMargin = this.adjustMarginsForLetterhead(options.margin, options.landscape);
                pdfOptions.margin = adjustedMargin;
            }

            const pdfBuffer = await page.pdf(pdfOptions);

            await page.close();

            // Write PDF to output path
            await fs.writeFile(outputPath, pdfBuffer);

            return {
                success: true,
                outputPath,
                fileSize: pdfBuffer.length,
                pageCount: await this.getPageCount(outputPath)
            };

        } catch (error) {
            throw new Error(`PDF conversion failed: ${error.message}`);
        } finally {
            // Clean up temporary files
            try {
                await fs.remove(tempHtmlPath);
                
                // Clean up logo files from temp directory
                if (options.letterhead) {
                    const tempDir = path.dirname(tempHtmlPath);
                    const logoFiles = ['trivanta.png', 'logo.png'];
                    for (const logoFile of logoFiles) {
                        const logoPath = path.join(tempDir, logoFile);
                        if (await fs.pathExists(logoPath)) {
                            await fs.remove(logoPath);
                        }
                    }
                }
            } catch (cleanupError) {
                console.warn('Warning: Could not clean up temporary files:', cleanupError.message);
            }
        }
    }

    enhanceHTML(htmlContent) {
        const printCSS = `
            <style>
                /* Print-friendly enhancements */
                * {
                    box-sizing: border-box;
                }
                
                body {
                    margin: 0;
                    padding: 0;
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }
                
                /* Prevent overlapping */
                div, p, h1, h2, h3, h4, h5, h6 {
                    margin: 0;
                    padding: 0;
                    page-break-inside: avoid;
                }
                
                /* Table improvements */
                table {
                    border-collapse: collapse;
                    width: 100%;
                    page-break-inside: avoid;
                }
                
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                
                /* Image handling */
                img {
                    max-width: 100%;
                    height: auto;
                    page-break-inside: avoid;
                }
                
                /* List improvements */
                ul, ol {
                    page-break-inside: avoid;
                }
                
                li {
                    page-break-inside: avoid;
                }
                
                /* Code blocks */
                pre, code {
                    page-break-inside: avoid;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }
                
                /* Print-specific rules */
                @media print {
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    
                    /* Page break controls */
                    h1, h2, h3, h4, h5, h6 {
                        page-break-after: avoid;
                    }
                    
                    img, table, pre, code {
                        page-break-inside: avoid;
                    }
                    
                    /* Orphans and widows control */
                    p {
                        orphans: 3;
                        widows: 3;
                    }
                }
            </style>
        `;

        // Insert the CSS into the HTML head
        if (htmlContent.includes('</head>')) {
            return htmlContent.replace('</head>', `${printCSS}</head>`);
        } else {
            return `<html><head>${printCSS}</head><body>${htmlContent}</body></html>`;
        }
    }

    async getPageCount(pdfPath) {
        try {
            const buffer = await fs.readFile(pdfPath);
            const match = buffer.toString().match(/\/Count\s+(\d+)/);
            return match ? parseInt(match[1]) : 1;
        } catch (error) {
            return 1; // Default to 1 page if we can't determine
        }
    }

    async convertFile(inputPath, outputPath, options = {}) {
        const htmlContent = await fs.readFile(inputPath, 'utf8');
        return this.convertHTMLToPDF(htmlContent, outputPath, options);
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            console.log('🔄 PDF converter browser closed');
        }
    }
}

module.exports = UltimateHTMLToPDFConverter
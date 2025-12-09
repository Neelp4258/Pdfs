#!/usr/bin/env node

const readline = require('readline-sync');
const HTMLToPDFConverter = require('./converter');
const fs = require('fs-extra');
const path = require('path');

class InteractiveHTMLToPDFCLI {
    constructor() {
        this.converter = null;
        this.options = {
            format: 'A4',
            landscape: false,
            margin: { top: '12mm', right: '10mm', bottom: '14mm', left: '10mm' },
            scale: 1.0,
            letterhead: false,
            letterheadType: 'trivanta',
            letterheadMode: 'all'
        };
    }

    displayWelcome() {
        console.log('\n' + '='.repeat(60));
        console.log('🚀 HTML to PDF Converter');
        console.log('📄 Interactive Terminal-Based PDF Generator');
        console.log('🏢 Letterhead Support for Trivanta Edge & Dazzlo');
        console.log('='.repeat(60) + '\n');
    }

    displayHelp() {
        console.log(`
📖 HTML to PDF Converter - Help

This tool converts HTML files, URLs, or HTML content to professional PDF documents
with optional letterhead support for Trivanta Edge and Dazzlo companies.

Features:
✨ High-fidelity HTML to PDF conversion
📏 Multiple page formats: A4, A3, Letter, Legal, PowerPoint sizes
🔄 Portrait and landscape orientation
🏢 Professional letterheads with company branding
📄 Letterhead on all pages or first page only
🔐 Password-protected letterhead access
💼 Support for HTML files, URLs, and direct content

Supported Input Types:
• HTML files (.html)
• Web URLs (http:// or https://)
• Direct HTML content input
• Stdin input (use '-' as input)

Page Formats:
• A4 (210 x 297 mm)
• A3 (297 x 420 mm)
• Letter (8.5 x 11 inches)
• Legal (8.5 x 14 inches)
• PPT Standard 4:3 (10 x 7.5 inches)
• PPT Widescreen 16:9 (13.33 x 7.5 inches)
• PPT Widescreen 16:10 (10 x 6.25 inches)

Letterhead Companies:
• Trivanta Edge - Real estate and property development
• Dazzlo Enterprises - Lifestyle and innovation solutions

Password required for letterhead access (configure via LETTERHEAD_PASSWORD environment variable)
        `);
    }

    promptForInput() {
        console.log('📁 INPUT SELECTION');
        console.log('──────────────────');
        
        const inputTypes = [
            'HTML File (.html)',
            'Web URL (http/https)',
            'Direct HTML Content',
            'Read from stdin',
            'Show help',
            'Exit'
        ];

        const inputChoice = readline.keyInSelect(inputTypes, 'Select input type:', { 
            cancel: false,
            guide: false 
        });

        switch (inputChoice) {
            case 0: // HTML File
                return this.getFileInput();
            case 1: // URL
                return this.getURLInput();
            case 2: // Direct HTML
                return this.getDirectHTMLInput();
            case 3: // Stdin
                return this.getStdinInput();
            case 4: // Help
                this.displayHelp();
                return this.promptForInput();
            case 5: // Exit
                console.log('\n👋 Goodbye!');
                process.exit(0);
            default:
                console.log('❌ Invalid selection. Please try again.');
                return this.promptForInput();
        }
    }

    getFileInput() {
        while (true) {
            const filePath = readline.question('📁 Enter HTML file path: ');
            
            if (fs.existsSync(filePath) && filePath.endsWith('.html')) {
                return { type: 'file', path: filePath };
            } else if (!fs.existsSync(filePath)) {
                console.log('❌ File not found. Please check the path and try again.');
            } else {
                console.log('❌ Please provide a valid .html file.');
            }
        }
    }

    getURLInput() {
        while (true) {
            const url = readline.question('🌐 Enter URL (http:// or https://): ');
            
            try {
                new URL(url);
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    return { type: 'url', url: url };
                } else {
                    console.log('❌ URL must start with http:// or https://');
                }
            } catch (error) {
                console.log('❌ Invalid URL format. Please try again.');
            }
        }
    }

    getDirectHTMLInput() {
        console.log('✏️  Enter HTML content (press Enter twice to finish):');
        console.log('──────────────────────────────────────────────────');
        
        let htmlContent = '';
        let emptyLineCount = 0;
        
        while (emptyLineCount < 2) {
            const line = readline.question('');
            if (line.trim() === '') {
                emptyLineCount++;
            } else {
                emptyLineCount = 0;
            }
            htmlContent += line + '\n';
        }
        
        return { type: 'content', content: htmlContent.trim() };
    }

    getStdinInput() {
        console.log('📖 Reading from stdin...');
        console.log('💡 Tip: You can pipe content like: echo "<html>...</html>" | node cli.js');
        
        return new Promise((resolve) => {
            let data = '';
            process.stdin.on('data', chunk => data += chunk);
            process.stdin.on('end', () => resolve({ type: 'content', content: data }));
        });
    }

    promptForOutput() {
        let outputPath;
        
        while (true) {
            outputPath = readline.question('💾 Enter output PDF file path (e.g., output.pdf): ');
            
            if (!outputPath.endsWith('.pdf')) {
                outputPath += '.pdf';
            }
            
            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            
            try {
                fs.ensureDirSync(outputDir);
                break;
            } catch (error) {
                console.log(`❌ Cannot create directory: ${outputDir}. Please try a different path.`);
            }
        }
        
        return outputPath;
    }

    promptForPageFormat() {
        console.log('\n📏 PAGE FORMAT');
        console.log('──────────────');

        const formats = [
            'A4 (210 x 297 mm)',
            'A3 (297 x 420 mm)',
            'Letter (8.5 x 11 in)',
            'Legal (8.5 x 14 in)',
            'PPT Standard 4:3 (10 x 7.5 in)',
            'PPT Widescreen 16:9 (13.33 x 7.5 in)',
            'PPT Widescreen 16:10 (10 x 6.25 in)'
        ];
        const formatKeys = ['A4', 'A3', 'Letter', 'Legal', 'PPT_4_3', 'PPT_16_9', 'PPT_16_10'];

        const choice = readline.keyInSelect(formats, 'Select page format:', {
            cancel: false,
            guide: false
        });

        this.options.format = formatKeys[choice] || 'A4';
        console.log(`✅ Selected format: ${this.options.format}`);
    }

    promptForOrientation() {
        console.log('\n🔄 PAGE ORIENTATION');
        console.log('──────────────────');
        
        const orientations = ['Portrait (↕)', 'Landscape (↔)'];
        const choice = readline.keyInSelect(orientations, 'Select orientation:', { 
            cancel: false,
            guide: false 
        });
        
        this.options.landscape = choice === 1;
        console.log(`✅ Selected orientation: ${this.options.landscape ? 'Landscape' : 'Portrait'}`);
    }

    promptForLetterhead() {
        console.log('\n🏢 LETTERHEAD OPTIONS');
        console.log('────────────────────');
        
        const useLetterhead = readline.keyInYNStrict('Add letterhead to PDF?');
        
        if (!useLetterhead) {
            this.options.letterhead = false;
            console.log('✅ No letterhead will be added');
            return;
        }

        // Check if letterhead password is configured
        if (!process.env.LETTERHEAD_PASSWORD && process.env.NODE_ENV === 'production') {
            console.log('❌ Letterhead access disabled. Set LETTERHEAD_PASSWORD environment variable.');
            this.options.letterhead = false;
            return;
        }
        
        // Prompt for password
        const password = readline.question('🔐 Enter letterhead password: ', { hideEchoBack: true });
        
        // Store password for validation in converter
        this.options.password = password;
        this.options.letterhead = true;
        console.log('🔐 Password will be validated during conversion');

        // Select letterhead type
        console.log('\n🏢 LETTERHEAD TYPE');
        console.log('─────────────────');
        
        const companies = [
            'Trivanta Edge - Real estate and property development',
            'Dazzlo Enterprises - Lifestyle and innovation solutions'
        ];
        const companyKeys = ['trivanta', 'dazzlo'];
        
        const companyChoice = readline.keyInSelect(companies, 'Select company letterhead:', { 
            cancel: false,
            guide: false 
        });
        
        this.options.letterheadType = companyKeys[companyChoice] || 'trivanta';
        console.log(`✅ Selected: ${this.options.letterheadType === 'trivanta' ? 'Trivanta Edge' : 'Dazzlo Enterprises'}`);

        // Select letterhead mode
        console.log('\n📄 LETTERHEAD PLACEMENT');
        console.log('──────────────────────');
        
        const modes = [
            'All pages - Letterhead on every page',
            'First page only - Letterhead on first page only'
        ];
        const modeKeys = ['all', 'first'];
        
        const modeChoice = readline.keyInSelect(modes, 'Select letterhead placement:', { 
            cancel: false,
            guide: false 
        });
        
        this.options.letterheadMode = modeKeys[modeChoice] || 'all';
        console.log(`✅ Letterhead will appear on: ${this.options.letterheadMode === 'all' ? 'All pages' : 'First page only'}`);
    }

    promptForAdvancedOptions() {
        console.log('\n⚙️  ADVANCED OPTIONS');
        console.log('───────────────────');
        
        const useAdvanced = readline.keyInYNStrict('Configure advanced options (margins, scale)?');
        
        if (!useAdvanced) {
            console.log('✅ Using default advanced settings');
            return;
        }

        // Margin presets
        const marginPresets = [
            'Small margins (10mm, 8mm, 12mm, 8mm)',
            'Medium margins (12mm, 10mm, 14mm, 10mm) - Default',
            'Large margins (20mm, 15mm, 20mm, 15mm)',
            'Custom margins'
        ];
        
        const marginChoice = readline.keyInSelect(marginPresets, 'Select margin preset:', { 
            cancel: false,
            guide: false 
        });
        
        switch (marginChoice) {
            case 0:
                this.options.margin = { top: '10mm', right: '8mm', bottom: '12mm', left: '8mm' };
                break;
            case 1:
                this.options.margin = { top: '12mm', right: '10mm', bottom: '14mm', left: '10mm' };
                break;
            case 2:
                this.options.margin = { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' };
                break;
            case 3:
                // Custom margins
                this.options.margin = {
                    top: readline.question('Top margin (e.g., 12mm): ') || '12mm',
                    right: readline.question('Right margin (e.g., 10mm): ') || '10mm',
                    bottom: readline.question('Bottom margin (e.g., 14mm): ') || '14mm',
                    left: readline.question('Left margin (e.g., 10mm): ') || '10mm'
                };
                break;
        }

        // Scale factor
        const scaleInput = readline.question('Scale factor (0.8-1.2, default 1.0): ');
        const scale = parseFloat(scaleInput) || 1.0;
        
        if (scale >= 0.8 && scale <= 1.2) {
            this.options.scale = scale;
        } else {
            console.log('⚠️  Scale out of range. Using default 1.0');
            this.options.scale = 1.0;
        }
        
        console.log('✅ Advanced options configured');
    }

    displaySummary() {
        console.log('\n📋 CONVERSION SUMMARY');
        console.log('────────────────────');
        console.log(`📏 Format: ${this.options.format}`);
        console.log(`🔄 Orientation: ${this.options.landscape ? 'Landscape' : 'Portrait'}`);
        console.log(`📐 Margins: ${JSON.stringify(this.options.margin)}`);
        console.log(`🔍 Scale: ${this.options.scale}`);
        console.log(`🏢 Letterhead: ${this.options.letterhead ? 'Yes' : 'No'}`);
        
        if (this.options.letterhead) {
            console.log(`🏢 Company: ${this.options.letterheadType === 'trivanta' ? 'Trivanta Edge' : 'Dazzlo Enterprises'}`);
            console.log(`📄 Placement: ${this.options.letterheadMode === 'all' ? 'All pages' : 'First page only'}`);
        }
    }

    async convertToPDF(input, outputPath) {
        try {
            console.log('\n🔄 CONVERTING TO PDF');
            console.log('───────────────────');
            console.log('🚀 Initializing converter...');
            
            this.converter = new HTMLToPDFConverter();
            await this.converter.initialize();
            
            console.log('✅ Converter initialized successfully');
            console.log('📄 Converting HTML to PDF...');

            let result;
            
            switch (input.type) {
                case 'file':
                    result = await this.converter.convertFile(input.path, outputPath, this.options);
                    break;
                case 'url':
                    result = await this.converter.convertURL(input.url, outputPath, this.options);
                    break;
                case 'content':
                    result = await this.converter.convertHTMLToPDF(input.content, outputPath, this.options);
                    break;
                default:
                    throw new Error('Invalid input type');
            }

            console.log('\n🎉 CONVERSION COMPLETED');
            console.log('──────────────────────');
            console.log(`✅ PDF saved to: ${outputPath}`);
            console.log(`📊 File size: ${(result.fileSize / 1024).toFixed(2)} KB`);
            console.log(`📑 Pages: ${result.pageCount}`);
            
            if (this.options.letterhead) {
                const companyName = this.options.letterheadType === 'trivanta' ? 'Trivanta Edge' : 'Dazzlo Enterprises';
                const placement = this.options.letterheadMode === 'all' ? 'all pages' : 'first page only';
                console.log(`🏢 ${companyName} letterhead applied to ${placement}`);
            }

            return result;

        } catch (error) {
            console.error('\n❌ CONVERSION FAILED');
            console.error('──────────────────');
            console.error(`Error: ${error.message}`);
            throw error;
        } finally {
            if (this.converter) {
                await this.converter.close();
            }
        }
    }

    async run() {
        try {
            this.displayWelcome();
            
            // Get input
            const input = await this.promptForInput();
            
            // Get output path
            const outputPath = this.promptForOutput();
            
            // Configure options
            this.promptForPageFormat();
            this.promptForOrientation();
            this.promptForLetterhead();
            this.promptForAdvancedOptions();
            
            // Show summary
            this.displaySummary();
            
            // Confirm conversion
            console.log('\n🚀 READY TO CONVERT');
            console.log('──────────────────');
            const proceed = readline.keyInYNStrict('Proceed with conversion?');
            
            if (!proceed) {
                console.log('❌ Conversion cancelled by user');
                return;
            }
            
            // Convert
            await this.convertToPDF(input, outputPath);
            
        } catch (error) {
            console.error(`\n💥 Fatal error: ${error.message}`);
            process.exit(1);
        }
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Conversion cancelled by user. Goodbye!');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n👋 Conversion terminated. Goodbye!');
    process.exit(0);
});

// Run the CLI
if (require.main === module) {
    const cli = new InteractiveHTMLToPDFCLI();
    cli.run().catch(error => {
        console.error(`Fatal error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = InteractiveHTMLToPDFCLI;
#!/usr/bin/env node

const UltimateHTMLToPDFConverter = require('./src/converter');
const fs = require('fs-extra');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    console.log(`
🚀 Ultimate HTML to PDF Converter - CLI

Usage: node cli.js <input> <output> [options]

Arguments:
  input     HTML file path, URL, or '-' for stdin
  output    Output PDF file path

Options:
  --format <format>         Page format (A4, A3, Letter, Legal, Tabloid) [default: A4]
  --landscape              Use landscape orientation
  --portrait               Use portrait orientation [default]
  --margin <size>          Margin size (small, medium, large) [default: medium]
  --scale <scale>          Scale factor (0.8-1.2) [default: 1.0]
  --letterhead             Add letterhead to pages (trivanta or dazzlo) [requires password]
  --letterhead-type        Letterhead type: trivanta (default) or dazzlo
  --letterhead-mode        Letterhead mode: all (default) or first
  --password <pwd>         Password for letterhead access (required: 102005)
  --help, -h              Show this help message

Examples:
  # Convert HTML file
  node cli.js input.html output.pdf

  # Convert with letterhead on all pages
  node cli.js input.html output.pdf --letterhead --password 102005

  # Convert with letterhead only on first page
  node cli.js input.html output.pdf --letterhead --letterhead-mode first --password 102005

  # Convert from URL in landscape
  node cli.js https://example.com output.pdf --landscape --format A3

  # Convert from stdin with Dazzlo letterhead
  echo "<html><body><h1>Hello</h1></body></html>" | node cli.js - output.pdf --letterhead --letterhead-type dazzlo --password 102005

  # Convert with custom options in portrait
  node cli.js input.html output.pdf --portrait --format Letter --margin large --scale 1.1 --letterhead --letterhead-mode all --password 102005
`);
    process.exit(0);
}

async function main() {
    try {
        const input = args[0];
        const output = args[1];
        
        if (!input || !output) {
            console.error('❌ Error: Input and output paths are required');
            console.log('Use --help for usage information');
            process.exit(1);
        }

        // Parse options
        const options = {
            format: 'A4',
            landscape: false,
            margin: { top: '12mm', right: '10mm', bottom: '14mm', left: '10mm' },
            scale: 1.0,
            letterhead: false,
            letterheadType: 'trivanta',
            letterheadMode: 'all',
            password: null
        };

        for (let i = 2; i < args.length; i++) {
            const arg = args[i];
            
            switch (arg) {
                case '--format':
                    options.format = args[++i];
                    break;
                case '--landscape':
                    options.landscape = true;
                    break;
                case '--portrait':
                    options.landscape = false;
                    break;
                case '--margin':
                    const marginSize = args[++i];
                    switch (marginSize) {
                        case 'small':
                            options.margin = { top: '10mm', right: '8mm', bottom: '12mm', left: '8mm' };
                            break;
                        case 'large':
                            options.margin = { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' };
                            break;
                        default:
                            options.margin = { top: '12mm', right: '10mm', bottom: '14mm', left: '10mm' };
                    }
                    break;
                case '--scale':
                    options.scale = parseFloat(args[++i]);
                    if (options.scale < 0.8 || options.scale > 1.2) {
                        console.warn('⚠️  Warning: Scale should be between 0.8 and 1.2');
                    }
                    break;
                case '--letterhead':
                    options.letterhead = true;
                    break;
                case '--letterhead-type':
                    const type = args[++i];
                    if (type === 'trivanta' || type === 'dazzlo') {
                        options.letterheadType = type;
                    } else {
                        console.warn('⚠️  Warning: Invalid letterhead type. Using default (trivanta)');
                    }
                    break;
                case '--letterhead-mode':
                    const mode = args[++i];
                    if (mode === 'all' || mode === 'first') {
                        options.letterheadMode = mode;
                    } else {
                        console.warn('⚠️  Warning: Invalid letterhead mode. Using default (all)');
                    }
                    break;
                case '--password':
                    options.password = args[++i];
                    break;
                default:
                    console.warn(`⚠️  Warning: Unknown option ${arg}`);
            }
        }

        console.log('🚀 Initializing Ultimate HTML to PDF Converter...');
        
        // Initialize converter
        const converter = new UltimateHTMLToPDFConverter();
        await converter.initialize();
        
        console.log('✅ Ultimate HTML to PDF Converter initialized successfully');

        let htmlContent;

        // Read input
        if (input === '-') {
            // Read from stdin
            console.log('📖 Reading HTML from stdin...');
            htmlContent = await new Promise((resolve) => {
                let data = '';
                process.stdin.on('data', chunk => data += chunk);
                process.stdin.on('end', () => resolve(data));
            });
        } else if (input.startsWith('http://') || input.startsWith('https://')) {
            // Fetch from URL
            console.log(`🌐 Fetching HTML from URL: ${input}`);
            const page = await converter.browser.newPage();
            await page.goto(input, { waitUntil: 'networkidle0' });
            htmlContent = await page.content();
            await page.close();
        } else {
            // Read from file
            console.log(`📁 Reading HTML file: ${input}`);
            if (!await fs.pathExists(input)) {
                throw new Error(`File not found: ${input}`);
            }
            htmlContent = await fs.readFile(input, 'utf8');
        }

        // Ensure output directory exists
        await fs.ensureDir(path.dirname(output));

        // Check password for letterhead access
        if (options.letterhead) {
            if (!options.password) {
                throw new Error('Invalid password for letterhead access.');
            }
        }

        console.log('🔄 Converting HTML to PDF...');
        console.log(`📋 Format: ${options.format}, Orientation: ${options.landscape ? 'Landscape' : 'Portrait'}`);
        if (options.letterhead) {
            console.log(`🏢 Letterhead: ${options.letterheadType === 'dazzlo' ? 'Dazzlo Enterprises' : 'Trivanta Edge'} (${options.letterheadMode} pages)`);
        }
        
        // Convert to PDF
        const result = await converter.convertHTMLToPDF(htmlContent, output, options);
        
        console.log('✅ PDF generated successfully:', output);
        console.log('✅ Conversion completed successfully!');
        console.log(`📄 Output: ${path.basename(output)}`);
        console.log(`📊 File size: ${(result.fileSize / 1024).toFixed(2)} KB`);
        console.log(`📑 Pages: ${result.pageCount}`);
        
        if (options.letterhead) {
            const letterheadType = options.letterheadType || 'trivanta';
            const letterheadMode = options.letterheadMode || 'all';
            console.log(`🏢 Letterhead: ${letterheadType === 'dazzlo' ? 'Dazzlo Enterprises' : 'Trivanta Edge'} branding applied to ${letterheadMode} pages`);
        }

        // Clean up
        await converter.close();

    } catch (error) {
        console.error('❌ Conversion failed:', error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Conversion cancelled by user. Goodbye!');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Conversion terminated. Goodbye!');
    process.exit(0);
});

// Run the converter
main();Password is required for letterhead access. Use --password option.');
            }
            if (options.password !== '102005') {
                throw new Error('
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const UltimateHTMLToPDFConverter = require('./converter');

// Debug environment variables
console.log('🔍 Environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PUPPETEER_SKIP_CHROMIUM_DOWNLOAD:', process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD);
console.log('PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/assets', express.static(path.join(__dirname, '..')));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        fs.ensureDirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'text/html' || file.originalname.endsWith('.html')) {
            cb(null, true);
        } else {
            cb(new Error('Only HTML files are allowed!'), false);
        }
    }
});

let converter = null;

// Initialize converter on startup
async function initializeConverter() {
    try {
        console.log('🚀 Initializing DazzloDocs HTML to PDF Converter...');
        converter = new UltimateHTMLToPDFConverter();
        await converter.initialize();
        console.log('✅ DazzloDocs converter initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize converter:', error);
        console.error('This might be due to missing Chrome installation');
        
        // In production, we want to exit if Chrome is not available
        if (process.env.NODE_ENV === 'production') {
            console.error('🔴 Exiting due to converter initialization failure in production');
            process.exit(1);
        }
    }
}

// Root route - serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        converter: converter ? 'initialized' : 'not initialized',
        chrome: process.env.PUPPETEER_EXECUTABLE_PATH || 'auto-detect',
        memory: process.memoryUsage(),
        version: require('../package.json').version
    };
    
    res.json(health);
});

// Download endpoint for generated PDFs
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '..', 'outputs', filename);
    
    if (fs.existsSync(filePath)) {
        res.download(filePath, filename, (err) => {
            if (err) {
                console.error('❌ Download error:', err);
                res.status(500).json({ error: 'Download failed' });
            } else {
                // Clean up the file after successful download
                setTimeout(() => {
                    fs.remove(filePath).catch(console.error);
                }, 5000); // Wait 5 seconds before cleanup
            }
        });
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

// Convert HTML string to PDF
app.post('/convert/html', async (req, res) => {
    try {
        if (!converter) {
            return res.status(503).json({ error: 'PDF converter not available. Please try again later.' });
        }

        const { 
            html, 
            format, 
            landscape, 
            margin, 
            scale, 
            letterhead, 
            letterheadType, 
            letterheadMode, 
            password 
        } = req.body;
        
        if (!html) {
            return res.status(400).json({ error: 'HTML content is required' });
        }

        // Check password for letterhead access
        if (letterhead && password !== '102005') {
            return res.status(401).json({ error: 'Invalid password for letterhead access' });
        }

        const filename = `dazzlodocs_${Date.now()}.pdf`;
        const outputPath = path.join(__dirname, '..', 'outputs', filename);
        await fs.ensureDir(path.dirname(outputPath));

        const options = {
            format: format || 'A4',
            landscape: landscape || false,
            margin: margin || { top: '12mm', right: '10mm', bottom: '14mm', left: '10mm' },
            scale: scale || 1.0,
            letterhead: letterhead || false,
            letterheadType: letterheadType || 'trivanta',
            letterheadMode: letterheadMode || 'all'
        };

        console.log(`🔄 Converting HTML to PDF: ${filename}`);
        console.log(`📋 Options: ${JSON.stringify(options, null, 2)}`);
        
        const result = await converter.convertHTMLToPDF(html, outputPath, options);
        
        // Get file stats
        const stats = await fs.stat(outputPath);
        const fileSize = stats.size;
        
        console.log(`✅ PDF generated successfully: ${filename} (${fileSize} bytes)`);
        
        res.json({
            success: true,
            filename: filename,
            fileSize: fileSize,
            pageCount: result.pageCount || 1,
            downloadUrl: `/download/${filename}`,
            options: options
        });

    } catch (error) {
        console.error('❌ HTML conversion error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Convert uploaded HTML file to PDF
app.post('/convert/file', upload.single('htmlFile'), async (req, res) => {
    try {
        if (!converter) {
            return res.status(503).json({ error: 'PDF converter not available. Please try again later.' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No HTML file uploaded' });
        }

        const { 
            format, 
            landscape, 
            margin, 
            scale, 
            letterhead, 
            letterheadType, 
            letterheadMode, 
            password 
        } = req.body;

        // Check password for letterhead access
        if (letterhead === 'true' && password !== '102005') {
            return res.status(401).json({ error: 'Invalid password for letterhead access' });
        }

        const inputPath = req.file.path;
        const filename = `dazzlodocs_${Date.now()}.pdf`;
        const outputPath = path.join(__dirname, '..', 'outputs', filename);
        
        await fs.ensureDir(path.dirname(outputPath));

        const options = {
            format: format || 'A4',
            landscape: landscape === 'true',
            margin: margin ? JSON.parse(margin) : { top: '12mm', right: '10mm', bottom: '14mm', left: '10mm' },
            scale: parseFloat(scale) || 1.0,
            letterhead: letterhead === 'true',
            letterheadType: letterheadType || 'trivanta',
            letterheadMode: letterheadMode || 'all'
        };

        console.log(`🔄 Converting uploaded file to PDF: ${filename}`);
        console.log(`📋 Options: ${JSON.stringify(options, null, 2)}`);
        
        const result = await converter.convertFile(inputPath, outputPath, options);
        
        // Clean up uploaded file
        await fs.remove(inputPath);

        // Get file stats
        const stats = await fs.stat(outputPath);
        const fileSize = stats.size;
        
        console.log(`✅ PDF generated successfully: ${filename} (${fileSize} bytes)`);
        
        res.json({
            success: true,
            filename: filename,
            fileSize: fileSize,
            pageCount: result.pageCount || 1,
            downloadUrl: `/download/${filename}`,
            options: options
        });

    } catch (error) {
        console.error('❌ File conversion error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Convert URL to PDF
app.post('/convert/url', async (req, res) => {
    try {
        if (!converter) {
            return res.status(503).json({ error: 'PDF converter not available. Please try again later.' });
        }

        const { 
            url, 
            format, 
            landscape, 
            margin, 
            scale, 
            letterhead, 
            letterheadType, 
            letterheadMode, 
            password 
        } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Basic URL validation
        try {
            new URL(url);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        // Check password for letterhead access
        if (letterhead && password !== '102005') {
            return res.status(401).json({ error: 'Invalid password for letterhead access' });
        }

        // Use Puppeteer to fetch the HTML content
        const page = await converter.browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
        const htmlContent = await page.content();
        await page.close();

        const filename = `dazzlodocs_${Date.now()}.pdf`;
        const outputPath = path.join(__dirname, '..', 'outputs', filename);
        await fs.ensureDir(path.dirname(outputPath));

        const options = {
            format: format || 'A4',
            landscape: landscape || false,
            margin: margin || { top: '12mm', right: '10mm', bottom: '14mm', left: '10mm' },
            scale: scale || 1.0,
            letterhead: letterhead || false,
            letterheadType: letterheadType || 'trivanta',
            letterheadMode: letterheadMode || 'all'
        };

        console.log(`🔄 Converting URL to PDF: ${url} -> ${filename}`);
        console.log(`📋 Options: ${JSON.stringify(options, null, 2)}`);
        
        const result = await converter.convertHTMLToPDF(htmlContent, outputPath, options);
        
        // Get file stats
        const stats = await fs.stat(outputPath);
        const fileSize = stats.size;
        
        console.log(`✅ PDF generated successfully: ${filename} (${fileSize} bytes)`);
        
        res.json({
            success: true,
            filename: filename,
            fileSize: fileSize,
            pageCount: result.pageCount || 1,
            downloadUrl: `/download/${filename}`,
            options: options
        });

    } catch (error) {
        console.error('❌ URL conversion error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get available options
app.get('/options', (req, res) => {
    res.json({
        formats: ['A4', 'A3', 'Letter', 'Legal', 'Tabloid'],
        margins: {
            small: { top: '10mm', right: '8mm', bottom: '12mm', left: '8mm' },
            medium: { top: '12mm', right: '10mm', bottom: '14mm', left: '10mm' },
            large: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
        },
        orientations: ['portrait', 'landscape'],
        features: [
            'High-fidelity CSS rendering',
            'Perfect page breaks',
            'No overlapping content',
            'Image support (PNG, JPG, SVG, WebP)',
            'Table formatting',
            'Custom fonts',
            'Background support',
            'Professional letterhead support',
            'Portrait and landscape orientation',
            'Letterhead on all pages or first page only'
        ],
        letterhead: {
            enabled: true,
            types: ['trivanta', 'dazzlo'],
            modes: ['all', 'first'],
            description: 'Add professional letterhead to pages',
            includes: ['Company logo', 'Contact information', 'Professional footer'],
            companies: {
                trivanta: {
                    name: 'Trivanta Edge',
                    tagline: 'From Land to Legacy – with Edge',
                    contact: {
                        email: ['sales@trivantaedge.com', 'info@trivantaedge.com'],
                        phone: '+91 9373015503',
                        location: 'Kalyan, Maharashtra'
                    }
                },
                dazzlo: {
                    name: 'Dazzlo Enterprises Pvt Ltd',
                    tagline: 'Redefining lifestyle with Innovations and Dreams',
                    contact: {
                        email: 'info@dazzlo.co.in',
                        phone: '+91 9373015503',
                        location: 'Kalyan, Maharashtra 421301'
                    }
                }
            }
        },
        version: require('../package.json').version
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error);
    res.status(500).json({ 
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message 
    });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n🔄 Received ${signal}. Shutting down gracefully...`);
    
    if (converter) {
        console.log('🔄 Closing PDF converter...');
        await converter.close();
    }
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start server
app.listen(PORT, '0.0.0.0', async () => {
    console.log('🚀 DazzloDocs Server Starting...');
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`🔗 Health check: http://0.0.0.0:${PORT}/health`);
    console.log(`🎨 Web interface: http://0.0.0.0:${PORT}`);
    
    // Initialize converter after server starts
    await initializeConverter();
    
    console.log('✅ DazzloDocs is ready to convert HTML to PDF!');
});
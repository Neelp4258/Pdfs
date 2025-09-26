# HTML to PDF Converter

An interactive terminal-based HTML to PDF converter with professional letterhead support for Trivanta Edge and Dazzlo Enterprises.

## Features

- 🚀 High-fidelity HTML to PDF conversion using Puppeteer
- 📏 Multiple page formats: A4, A3, Letter, Legal
- 🔄 Portrait and landscape orientation support
- 🏢 Professional letterhead templates for Trivanta Edge and Dazzlo
- 📄 Letterhead placement options: all pages or first page only
- 🔐 Password-protected letterhead access
- 💼 Multiple input types: HTML files, URLs, direct content, stdin
- ⚙️ Advanced options: custom margins, scale factors

## Quick Start

Run the interactive converter:

```bash
node cli.js
```

The CLI will guide you through:
1. Input selection (HTML file, URL, direct content, or stdin)
2. Output file path
3. Page format and orientation
4. Letterhead options (password required for access)
5. Advanced settings (margins, scale)

## Input Types

- **HTML Files**: Select any .html file from your system
- **URLs**: Convert web pages directly from HTTP/HTTPS URLs
- **Direct Content**: Type or paste HTML content directly
- **Stdin**: Pipe content from other commands

## Letterhead Support

### Available Companies
- **Trivanta Edge**: Real estate and property development
- **Dazzlo Enterprises**: Lifestyle and innovation solutions

### Access Requirements
- Password protection via LETTERHEAD_PASSWORD environment variable
- Letterhead can be applied to all pages or first page only
- In production, environment variable must be set to enable letterhead access

## Examples

### Convert HTML file with letterhead
```bash
node cli.js
# Follow prompts to select file and configure letterhead
```

### Pipe HTML content
```bash
echo "<html><body><h1>Hello</h1></body></html>" | node cli.js
```

## Advanced Features

- Custom margin settings (small, medium, large, or custom)
- Scale factors from 0.8 to 1.2
- Professional header and footer templates
- Optimized for print with exact color reproduction

## Technical Requirements

- Node.js 16+ 
- Puppeteer (automatically installs Chromium)
- Sufficient disk space for temporary files

## Output

Generated PDFs are saved to your specified location with:
- High-quality rendering
- Exact CSS color reproduction
- Professional letterhead formatting
- Optimized file sizes
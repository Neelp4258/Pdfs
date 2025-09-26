# HTML to PDF Converter

## Overview

This is an interactive terminal-based HTML to PDF converter that transforms HTML content into professional PDF documents. The application uses Puppeteer for high-fidelity HTML to PDF conversion and includes specialized letterhead support for two companies: Trivanta Edge (real estate) and Dazzlo Enterprises (lifestyle and innovation). The tool supports multiple input types including HTML files, URLs, direct content input, and stdin, with extensive customization options for page formatting, orientation, margins, and letterhead placement.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Conversion Engine
- **Puppeteer-based PDF Generation**: Uses Puppeteer with headless Chrome for accurate HTML rendering and PDF conversion
- **Modular Converter Class**: The `HTMLToPDFConverter` class encapsulates all PDF generation logic with configurable options
- **Browser Instance Management**: Manages browser lifecycle with proper initialization and cleanup

### Input Processing System
- **Multi-format Input Support**: Handles HTML files, web URLs, direct HTML content, and stdin input
- **Content Validation**: Validates input sources and formats before processing
- **Temporary File Management**: Uses UUID-based temporary file naming for processing

### CLI Interface Architecture
- **Interactive Terminal Interface**: Uses readline-sync for user-friendly command-line interactions
- **Command-line Argument Parsing**: Supports both interactive mode and direct CLI arguments
- **Progressive Configuration**: Guides users through step-by-step option selection

### Letterhead System
- **Company-specific Templates**: Supports two predefined letterhead templates (Trivanta Edge and Dazzlo Enterprises)
- **Password Protection**: Requires authentication via environment variable or CLI password (password: 102005)
- **Flexible Placement Options**: Letterhead can be applied to all pages or first page only
- **Template Injection**: Dynamically injects letterhead HTML/CSS into source content

### PDF Configuration Management
- **Format Support**: Multiple page formats (A4, A3, Letter, Legal, Tabloid)
- **Orientation Control**: Portrait and landscape orientation options
- **Margin Customization**: Configurable margins with preset sizes (small, medium, large)
- **Scale Factor Control**: Adjustable scale factors for content sizing
- **Print Background**: Ensures CSS backgrounds and colors are preserved

### Error Handling and Validation
- **Input Validation**: Validates file paths, URLs, and content before processing
- **Browser Error Management**: Handles Puppeteer browser launch and page loading errors
- **Output Path Validation**: Ensures output directories exist and are writable

## External Dependencies

### Core Dependencies
- **Puppeteer (v21.11.0)**: Primary engine for HTML to PDF conversion and browser automation
- **fs-extra (v11.3.2)**: Enhanced file system operations with promise support
- **readline-sync (v1.4.10)**: Synchronous readline interface for interactive CLI
- **uuid (v9.0.1)**: Unique identifier generation for temporary files

### Runtime Environment
- **Node.js**: JavaScript runtime environment
- **Chromium Browser**: Downloaded automatically by Puppeteer for PDF rendering
- **Environment Variables**: LETTERHEAD_PASSWORD for letterhead access control

### System Integration
- **File System Access**: Reads HTML files, writes PDF outputs, manages temporary files
- **Network Access**: Fetches content from HTTP/HTTPS URLs
- **Process I/O**: Supports stdin input for pipeline integration
- **Terminal Interface**: Interactive command-line interface with formatted output

### Optional Web Server Components
- **Express.js Framework**: Web server implementation (in attached files)
- **Multer**: File upload handling middleware
- **CORS**: Cross-origin resource sharing support
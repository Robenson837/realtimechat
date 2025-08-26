const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { auth } = require('../middleware/auth');
const puppeteer = require('puppeteer');
const mammoth = require('mammoth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'uploads', getUploadFolder(file.fieldname));
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 1
    },
    fileFilter: (req, file, cb) => {
        // Check file type based on fieldname
        const allowedTypes = getAllowedTypes(file.fieldname);
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`));
        }
    }
});

function getUploadFolder(fieldname) {
    switch (fieldname) {
        case 'avatar':
            return 'avatars';
        case 'image':
            return 'images';
        case 'file':
            return 'files';
        default:
            return 'misc';
    }
}

function getAllowedTypes(fieldname) {
    switch (fieldname) {
        case 'avatar':
            return ['image/jpeg', 'image/png', 'image/webp'];
        case 'image':
            return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        case 'file':
            return [
                'image/jpeg', 'image/png', 'image/webp', 'image/gif',
                'video/webm', 'video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'text/plain',
                'application/zip',
                'application/x-rar-compressed'
            ];
        default:
            return [];
    }
}

// Ensure upload directories exist
const ensureUploadDirs = async () => {
    const dirs = ['avatars', 'images', 'files', 'misc'];
    for (const dir of dirs) {
        const dirPath = path.join(__dirname, '..', 'uploads', dir);
        try {
            await fs.access(dirPath);
        } catch (error) {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }
};

ensureUploadDirs();

// Function to generate PDF thumbnail using Puppeteer - clean page preview only
const generatePdfThumbnail = async (filePath, thumbnailPath) => {
    let browser = null;
    try {
        // Create a temporary HTML file that embeds the PDF cleanly
        const pdfUrl = `file://${filePath.replace(/\\/g, '/')}`;
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        margin: 0; 
                        padding: 0; 
                        background: white; 
                        overflow: hidden;
                        font-family: Arial, sans-serif;
                    }
                    embed { 
                        width: 100%; 
                        height: 100vh; 
                        border: none;
                        display: block;
                    }
                </style>
            </head>
            <body>
                <embed src="${pdfUrl}" type="application/pdf" style="transform: scale(1.2); transform-origin: top left;">
            </body>
            </html>
        `;
        
        const tempHtmlPath = filePath.replace(path.extname(filePath), '_temp.html');
        await fs.writeFile(tempHtmlPath, htmlContent);
        
        browser = await puppeteer.launch({ 
            headless: 'new',
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-plugins',
                '--disable-extensions'
            ]
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 800, height: 600 });
        
        // Hide scrollbars and toolbars
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(document, 'hidden', { value: false, writable: false });
        });
        
        await page.goto(`file://${tempHtmlPath}`, { 
            waitUntil: 'networkidle0', 
            timeout: 15000 
        });
        
        // Wait a bit more for PDF to fully render
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Capture only the document content area (avoiding toolbars)
        const screenshot = await page.screenshot({ 
            type: 'png',
            clip: { x: 50, y: 50, width: 700, height: 350 } // Clean content area only
        });
        
        // Process with Sharp - clean resize for message integration
        await sharp(screenshot)
            .resize(280, 140, { 
                fit: 'cover', 
                position: 'top',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .jpeg({ quality: 85 })
            .toFile(thumbnailPath);
        
        // Clean up temp HTML file
        await fs.unlink(tempHtmlPath);
        
        return true;
    } catch (error) {
        console.warn('Error generating PDF thumbnail:', error.message);
        
        // Create fallback thumbnail if PDF rendering fails
        try {
            const svg = `
                <svg width="280" height="140" xmlns="http://www.w3.org/2000/svg">
                    <rect width="280" height="140" fill="#ffffff"/>
                    <rect x="20" y="20" width="240" height="100" fill="#f8f9fa" stroke="#e0e0e0"/>
                    <rect x="30" y="30" width="60" height="8" fill="#dc3545" opacity="0.3"/>
                    <rect x="30" y="45" width="180" height="4" fill="#333" opacity="0.2"/>
                    <rect x="30" y="55" width="160" height="4" fill="#333" opacity="0.2"/>
                    <rect x="30" y="65" width="140" height="4" fill="#333" opacity="0.2"/>
                    <rect x="30" y="75" width="120" height="4" fill="#333" opacity="0.2"/>
                    <rect x="30" y="85" width="100" height="4" fill="#333" opacity="0.2"/>
                </svg>
            `;
            
            await sharp(Buffer.from(svg))
                .jpeg({ quality: 85 })
                .toFile(thumbnailPath);
                
            return true;
        } catch (fallbackError) {
            console.warn('Error generating PDF fallback thumbnail:', fallbackError.message);
            return false;
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

// Function to generate Word document thumbnail using mammoth - clean page preview
const generateWordThumbnail = async (filePath, thumbnailPath) => {
    try {
        const fileBuffer = await fs.readFile(filePath);
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        const text = result.value.substring(0, 400); // More content for cleaner look
        
        if (!text.trim()) {
            return false;
        }
        
        // Create clean page preview - only content, no headers
        const lines = text.split('\n').filter(line => line.trim()).slice(0, 12); // More lines to fill space
        
        const svg = `
            <svg width="280" height="140" xmlns="http://www.w3.org/2000/svg">
                <rect width="280" height="140" fill="#ffffff"/>
                <text x="15" y="20" font-family="Arial, sans-serif" font-size="9" fill="#2c3e50" line-height="1.4">
                    ${lines.map((line, i) => 
                        `<tspan x="15" y="${20 + i * 11}">${line.substring(0, 42).replace(/[<>&"]/g, (match) => {
                            const entities = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' };
                            return entities[match];
                        })}</tspan>`
                    ).join('')}
                </text>
            </svg>
        `;
        
        await sharp(Buffer.from(svg))
            .jpeg({ quality: 85 })
            .toFile(thumbnailPath);
            
        return true;
    } catch (error) {
        console.warn('Error generating Word thumbnail:', error.message);
        return false;
    }
};

// Function to generate text file thumbnail - clean page preview
const generateTextThumbnail = async (filePath, thumbnailPath) => {
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const previewContent = fileContent.substring(0, 400); // More content
        const lines = previewContent.split('\n').slice(0, 14); // More lines
        
        const svg = `
            <svg width="280" height="140" xmlns="http://www.w3.org/2000/svg">
                <rect width="280" height="140" fill="#ffffff"/>
                <text x="15" y="15" font-family="monospace" font-size="8" fill="#2c3e50">
                    ${lines.map((line, i) => 
                        `<tspan x="15" y="${15 + i * 10}">${line.substring(0, 40).replace(/[<>&"]/g, (match) => {
                            const entities = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' };
                            return entities[match];
                        })}</tspan>`
                    ).join('')}
                </text>
            </svg>
        `;
        
        await sharp(Buffer.from(svg))
            .jpeg({ quality: 85 })
            .toFile(thumbnailPath);
            
        return true;
    } catch (error) {
        console.warn('Error generating text thumbnail:', error.message);
        return false;
    }
};

// Main function to generate document thumbnails
const generateDocumentThumbnail = async (filePath, mimeType) => {
    try {
        const filename = path.basename(filePath, path.extname(filePath));
        const thumbnailFilename = `thumb-${filename}.jpg`;
        const thumbnailPath = path.join(path.dirname(filePath), thumbnailFilename);

        let success = false;

        if (mimeType === 'application/pdf') {
            success = await generatePdfThumbnail(filePath, thumbnailPath);
        } else if (mimeType.includes('word') || 
                   mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                   mimeType === 'application/msword') {
            success = await generateWordThumbnail(filePath, thumbnailPath);
        } else if (mimeType === 'text/plain') {
            success = await generateTextThumbnail(filePath, thumbnailPath);
        } else if (mimeType.includes('excel') || mimeType.includes('powerpoint') || 
                   mimeType.includes('spreadsheetml') || mimeType.includes('presentationml')) {
            // For Excel and PowerPoint, create a clean minimal preview
            const docType = mimeType.includes('excel') || mimeType.includes('spreadsheetml') ? 'Excel' : 'PowerPoint';
            const color = docType === 'Excel' ? '#217346' : '#d24726';
            
            // Create a clean spreadsheet/presentation layout
            const content = docType === 'Excel' ? 
                `<rect x="15" y="15" width="250" height="110" fill="#ffffff" stroke="#e0e0e0"/>
                 <line x1="15" y1="35" x2="265" y2="35" stroke="#e0e0e0"/>
                 <line x1="15" y1="55" x2="265" y2="55" stroke="#e0e0e0"/>
                 <line x1="15" y1="75" x2="265" y2="75" stroke="#e0e0e0"/>
                 <line x1="15" y1="95" x2="265" y2="95" stroke="#e0e0e0"/>
                 <line x1="65" y1="15" x2="65" y2="125" stroke="#e0e0e0"/>
                 <line x1="115" y1="15" x2="115" y2="125" stroke="#e0e0e0"/>
                 <line x1="165" y1="15" x2="165" y2="125" stroke="#e0e0e0"/>
                 <line x1="215" y1="15" x2="215" y2="125" stroke="#e0e0e0"/>` :
                `<rect x="20" y="20" width="240" height="100" fill="#ffffff" stroke="#e0e0e0"/>
                 <rect x="30" y="30" width="60" height="8" fill="${color}" opacity="0.3"/>
                 <rect x="30" y="45" width="180" height="4" fill="#333" opacity="0.2"/>
                 <rect x="30" y="55" width="160" height="4" fill="#333" opacity="0.2"/>
                 <rect x="30" y="65" width="140" height="4" fill="#333" opacity="0.2"/>
                 <rect x="30" y="85" width="100" height="20" fill="${color}" opacity="0.2"/>`;
            
            const svg = `
                <svg width="280" height="140" xmlns="http://www.w3.org/2000/svg">
                    <rect width="280" height="140" fill="#ffffff"/>
                    ${content}
                </svg>
            `;
            
            await sharp(Buffer.from(svg))
                .jpeg({ quality: 85 })
                .toFile(thumbnailPath);
                
            success = true;
        }

        return success ? `/uploads/files/${thumbnailFilename}` : null;
    } catch (error) {
        console.warn('Error generating document thumbnail:', error.message);
        return null;
    }
};

// @route   POST /api/upload/avatar
// @desc    Upload user avatar
// @access  Private
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const inputPath = req.file.path;
        const filename = 'avatar-' + req.user._id + '-' + Date.now() + '.webp';
        const outputPath = path.join(__dirname, '..', 'uploads', 'avatars', filename);

        // Process image with sharp
        await sharp(inputPath)
            .resize(200, 200, {
                fit: 'cover',
                position: 'center'
            })
            .webp({ quality: 85 })
            .toFile(outputPath);

        // Remove original file
        await fs.unlink(inputPath);

        // Update user avatar in database
        const { getModels } = require('../models');
        const { User } = getModels();
        await User.findByIdAndUpdate(req.user._id, {
            avatar: `/uploads/avatars/${filename}`
        });

        res.json({
            success: true,
            message: 'Avatar uploaded successfully',
            data: {
                filename,
                url: `/uploads/avatars/${filename}`
            }
        });

    } catch (error) {
        console.error('Avatar upload error:', error);
        
        // Clean up file if it exists
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error cleaning up file:', unlinkError);
            }
        }

        res.status(500).json({
            success: false,
            message: 'Error uploading avatar'
        });
    }
});

// @route   POST /api/upload/image
// @desc    Upload image for messages
// @access  Private
router.post('/image', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const inputPath = req.file.path;
        const filename = 'image-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + '.webp';
        const outputPath = path.join(__dirname, '..', 'uploads', 'images', filename);
        const thumbnailPath = path.join(__dirname, '..', 'uploads', 'images', 'thumb-' + filename);

        // Get image metadata
        const metadata = await sharp(inputPath).metadata();

        // Process main image
        let imageSharp = sharp(inputPath);
        
        // Resize if too large
        if (metadata.width > 1920 || metadata.height > 1920) {
            imageSharp = imageSharp.resize(1920, 1920, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }

        await imageSharp
            .webp({ quality: 85 })
            .toFile(outputPath);

        // Create thumbnail
        await sharp(inputPath)
            .resize(300, 300, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({ quality: 70 })
            .toFile(thumbnailPath);

        // Remove original file (with delay for Windows file handle release)
        setTimeout(async () => {
            try {
                await fs.unlink(inputPath);
            } catch (cleanupError) {
                console.warn('Could not clean up original file:', cleanupError.message);
            }
        }, 100);

        res.json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
                filename,
                originalName: req.file.originalname,
                url: `/uploads/images/${filename}`,
                thumbnail: `/uploads/images/thumb-${filename}`,
                size: (await fs.stat(outputPath)).size,
                dimensions: {
                    width: metadata.width,
                    height: metadata.height
                }
            }
        });

    } catch (error) {
        console.error('Image upload error:', error);
        
        // Clean up file if it exists
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error cleaning up file:', unlinkError);
            }
        }

        res.status(500).json({
            success: false,
            message: 'Error uploading image'
        });
    }
});

// @route   POST /api/upload/file
// @desc    Upload file for messages
// @access  Private
router.post('/file', auth, upload.single('file'), async (req, res) => {
    try {
        console.log('📁 File upload attempt:', {
            hasFile: !!req.file,
            filename: req.file?.originalname,
            mimetype: req.file?.mimetype,
            size: req.file?.size
        });

        if (!req.file) {
            console.error('❌ No file uploaded in request');
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const filename = req.file.filename;
        const filePath = req.file.path;
        
        // Generate thumbnail for images and documents
        let thumbnail = null;
        if (req.file.mimetype.startsWith('image/')) {
            const thumbnailFilename = 'thumb-' + filename;
            const thumbnailPath = path.join(path.dirname(filePath), thumbnailFilename);
            
            try {
                await sharp(filePath)
                    .resize(300, 300, {
                        fit: 'inside',
                        withoutEnlargement: true
                    })
                    .webp({ quality: 70 })
                    .toFile(thumbnailPath);
                
                thumbnail = `/uploads/files/thumb-${filename}`;
            } catch (thumbnailError) {
                console.warn('Error generating image thumbnail:', thumbnailError);
            }
        } else {
            // Try to generate document thumbnail
            thumbnail = await generateDocumentThumbnail(filePath, req.file.mimetype);
        }

        res.json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                filename,
                originalName: req.file.originalname,
                url: `/uploads/files/${filename}`,
                thumbnail,
                size: req.file.size,
                mimeType: req.file.mimetype
            }
        });

    } catch (error) {
        console.error('File upload error:', error);
        
        // Clean up file if it exists
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error cleaning up file:', unlinkError);
            }
        }

        res.status(500).json({
            success: false,
            message: 'Error uploading file'
        });
    }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    console.error('🚨 Upload error:', {
        type: error.constructor.name,
        message: error.message,
        code: error.code,
        field: error.field,
        stack: error.stack
    });

    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 50MB'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Maximum is 1 file'
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Unexpected field name'
            });
        }
    }
    
    if (error.message.includes('Invalid file type')) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
    
    // Log unhandled errors
    console.error('🚨 Unhandled upload error:', error);
    res.status(500).json({
        success: false,
        message: 'Upload error: ' + error.message
    });
});

// @route   GET /api/upload/preview/:filename
// @desc    Preview document content (Word docs converted to HTML)
// @access  Private
router.get('/preview/:filename', auth, async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, '..', 'uploads', 'files', filename);
        
        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Get file extension
        const extension = path.extname(filename).toLowerCase();
        
        if (extension === '.docx' || extension === '.doc') {
            try {
                const fileBuffer = await fs.readFile(filePath);
                const result = await mammoth.convertToHtml({ buffer: fileBuffer });
                
                const htmlContent = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <title>${filename}</title>
                        <style>
                            * {
                                margin: 0;
                                padding: 0;
                                box-sizing: border-box;
                            }
                            html, body {
                                height: 100%;
                                background: #e5e5e5;
                                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            }
                            .document-container {
                                display: flex;
                                justify-content: center;
                                align-items: flex-start;
                                min-height: 100vh;
                                padding: 20px;
                                background: #e5e5e5;
                            }
                            .document-page {
                                width: 210mm;
                                min-height: 297mm;
                                background: white;
                                padding: 2.54cm;
                                margin: 0;
                                box-shadow: 0 0 10px rgba(0,0,0,0.2);
                                border-radius: 4px;
                                position: relative;
                                overflow: visible;
                                font-size: 11pt;
                                line-height: 1.15;
                                font-family: 'Calibri', Arial, sans-serif;
                            }
                            .document-page::before {
                                content: '';
                                position: absolute;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                border: 1px solid #d1d1d1;
                                border-radius: 4px;
                                pointer-events: none;
                            }
                            h1, h2, h3, h4, h5, h6 {
                                color: #333;
                                margin-top: 16pt;
                                margin-bottom: 8pt;
                                font-weight: bold;
                            }
                            h1 { font-size: 18pt; }
                            h2 { font-size: 16pt; }
                            h3 { font-size: 14pt; }
                            h4, h5, h6 { font-size: 12pt; }
                            p {
                                margin-bottom: 8pt;
                                text-align: justify;
                                orphans: 2;
                                widows: 2;
                            }
                            table {
                                border-collapse: collapse;
                                width: 100%;
                                margin: 12pt 0;
                                font-size: 10pt;
                            }
                            table, th, td {
                                border: 1px solid #a6a6a6;
                            }
                            th, td {
                                padding: 4pt 6pt;
                                text-align: left;
                                vertical-align: top;
                            }
                            th {
                                background-color: #f2f2f2;
                                font-weight: bold;
                            }
                            ul, ol {
                                margin-left: 18pt;
                                margin-bottom: 8pt;
                            }
                            li {
                                margin-bottom: 4pt;
                            }
                            .page-break {
                                page-break-before: always;
                                margin-top: 30px;
                                padding-top: 30px;
                                border-top: 2px dashed #ccc;
                            }
                            @media print {
                                .document-container {
                                    background: white;
                                    padding: 0;
                                }
                                .document-page {
                                    box-shadow: none;
                                    border-radius: 0;
                                }
                                .document-page::before {
                                    display: none;
                                }
                                .page-break {
                                    border-top: none;
                                    margin-top: 0;
                                    padding-top: 0;
                                }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="document-container">
                            <div class="document-page">
                                ${result.value}
                            </div>
                        </div>
                    </body>
                    </html>
                `;
                
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                return res.send(htmlContent);
                
            } catch (error) {
                console.error('Error converting Word document:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error processing Word document'
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                message: 'Unsupported file type for preview'
            });
        }

    } catch (error) {
        console.error('Preview error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating preview'
        });
    }
});

module.exports = router;
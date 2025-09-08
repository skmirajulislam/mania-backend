const multer = require('multer');
const { uploadFile } = require('../services/cloudinaryService');

// Configure memory storage for multer
const storage = multer.memoryStorage();

// Set file size limits
const FILE_SIZE_LIMIT = {
    IMAGE: 5 * 1024 * 1024,  // 5MB for images
    VIDEO: 10 * 1024 * 1024  // 10MB for videos
};

// Filter files by type and check size
const fileFilter = (req, file, cb) => {
    // First check file type
    if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
        return cb(new Error('Only images and videos are allowed'), false);
    }

    // Store file type for size validation in the uploadToCloudinary middleware
    req.fileType = file.mimetype.startsWith('image/') ? 'IMAGE' : 'VIDEO';
    cb(null, true);
};

// Configure multer upload with dynamic file size limit
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: FILE_SIZE_LIMIT.VIDEO // Use the larger limit, we'll do specific checks later
    }
});

// Middleware to handle size validation and Cloudinary upload after multer
const uploadToCloudinary = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Check file size based on file type (more precise check)
        const fileType = req.fileType || (req.file.mimetype.startsWith('image/') ? 'IMAGE' : 'VIDEO');
        const maxSize = FILE_SIZE_LIMIT[fileType];

        if (req.file.size > maxSize) {
            return res.status(400).json({
                error: `File too large. ${fileType.toLowerCase()} must be less than ${maxSize / (1024 * 1024)}MB`
            });
        }

        const fileUrl = await uploadFile(req.file);
        req.fileUrl = fileUrl;
        next();
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
};

module.exports = { upload, uploadToCloudinary };

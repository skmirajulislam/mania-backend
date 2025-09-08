const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload file to Cloudinary
const uploadFile = async (file) => {
    if (!file) throw new Error('File is required');

    try {
        // Convert buffer to base64 string
        const fileStr = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

        // Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(fileStr, {
            folder: 'grand_hotel',
            resource_type: 'auto' // auto-detect if it's an image or video
        });

        return uploadResult.secure_url; // Return the secure URL of the uploaded file
    } catch (error) {
        console.error('Cloudinary Upload Error:', error);
        throw new Error('Error uploading file to Cloudinary');
    }
};

// Delete file from Cloudinary
const deleteFile = async (fileUrl) => {
    try {
        // Extract public_id from URL
        const splitUrl = fileUrl.split('/');
        const filename = splitUrl[splitUrl.length - 1];
        const publicId = `grand_hotel/${filename.split('.')[0]}`;

        // Delete from Cloudinary
        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === 'ok';
    } catch (error) {
        console.error('Cloudinary Delete Error:', error);
        throw new Error('Error deleting file from Cloudinary');
    }
};

module.exports = {
    uploadFile,
    deleteFile
};

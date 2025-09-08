const GalleryItem = require('../models/GalleryItem');
const { deleteFile } = require('../services/cloudinaryService');

// Get all gallery items
const getAllGalleryItems = async (req, res) => {
    try {
        const gallery = await GalleryItem.find().sort({ createdAt: -1 });
        res.json(gallery);
    } catch (error) {
        console.error('Error getting gallery:', error);
        res.status(500).json({ error: 'Failed to get gallery' });
    }
};

// Add gallery item (admin only)
const createGalleryItem = async (req, res) => {
    try {
        const { type, category, caption } = req.body;

        const galleryItem = new GalleryItem({
            type,
            category,
            caption,
            url: req.fileUrl
        });

        await galleryItem.save();
        res.status(201).json({ success: true, item: galleryItem });
    } catch (error) {
        console.error('Error adding gallery item:', error);
        res.status(500).json({ error: 'Failed to add gallery item' });
    }
};

// Delete gallery item (admin only)
const deleteGalleryItem = async (req, res) => {
    try {
        const galleryItem = await GalleryItem.findById(req.params.id);

        if (!galleryItem) {
            return res.status(404).json({ error: 'Gallery item not found' });
        }

        // Delete file from Cloudinary
        try {
            await deleteFile(galleryItem.url);
        } catch (error) {
            console.error('Error deleting file from Cloudinary:', error);
            // Continue with deletion even if Cloudinary deletion fails
        }

        // Delete database entry
        await GalleryItem.findByIdAndDelete(req.params.id);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting gallery item:', error);
        res.status(500).json({ error: 'Failed to delete gallery item' });
    }
};

module.exports = {
    getAllGalleryItems,
    createGalleryItem,
    deleteGalleryItem
};

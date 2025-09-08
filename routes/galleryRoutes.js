const express = require('express');
const { getAllGalleryItems, createGalleryItem, deleteGalleryItem } = require('../controllers/galleryController');
const { auth, authorize } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');

const router = express.Router();

// Gallery routes
router.get('/', getAllGalleryItems);
router.post('/', auth, authorize(['admin']), upload.single('file'), uploadToCloudinary, createGalleryItem);
router.delete('/:id', auth, authorize(['admin']), deleteGalleryItem);

module.exports = router;

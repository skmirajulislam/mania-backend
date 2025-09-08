const express = require('express');
const { getAllMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } = require('../controllers/menuController');
const { auth, authorize } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');

const router = express.Router();

// Menu routes
router.get('/', getAllMenuItems);
router.post('/', auth, authorize(['admin', 'manager', 'ceo']), upload.single('image'), uploadToCloudinary, createMenuItem);
router.put('/:id', auth, authorize(['admin', 'manager', 'ceo']), updateMenuItem);
router.delete('/:id', auth, authorize(['admin', 'manager', 'ceo']), deleteMenuItem);

module.exports = router;

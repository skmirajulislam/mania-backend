const express = require('express');
const router = express.Router();
const roomCategoryController = require('../controllers/roomCategoryController');
const { auth, authorize } = require('../middleware/auth');

// Public routes (for viewing categories)
router.get('/', roomCategoryController.getAllCategories);
router.get('/:id', roomCategoryController.getCategory);

// Protected routes (admin/manager/ceo only)
router.use(auth);
router.use(authorize(['admin', 'manager', 'ceo']));

router.post('/', roomCategoryController.createCategory);
router.put('/:id', roomCategoryController.updateCategory);
router.delete('/:id', roomCategoryController.deleteCategory);

// Admin only route for hard delete
router.delete('/:id/hard', authorize(['admin', 'ceo']), roomCategoryController.hardDeleteCategory);

module.exports = router;

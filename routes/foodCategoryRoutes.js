const express = require('express');
const router = express.Router();
const foodCategoryController = require('../controllers/foodCategoryController');
const { auth, authorize } = require('../middleware/auth');

// Public routes (for viewing categories)
router.get('/', foodCategoryController.getAllCategories);
router.get('/:id', foodCategoryController.getCategory);

// Protected routes (admin/manager/ceo only)
router.use(auth);
router.use(authorize(['admin', 'manager', 'ceo']));

router.post('/', foodCategoryController.createCategory);
router.put('/:id', foodCategoryController.updateCategory);
router.delete('/:id', foodCategoryController.deleteCategory);

module.exports = router;

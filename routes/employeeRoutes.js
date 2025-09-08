const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { auth, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get all employees (admin/manager can see all, staff can see department colleagues)
router.get('/', employeeController.getAllEmployees);

// Get single employee (with role-based restrictions)
router.get('/:id', employeeController.getEmployee);

// Get salary information (restricted access)
router.get('/:id/salary', employeeController.getSalaryInfo);

// Admin/Manager/CEO only routes
router.post('/', authorize(['admin', 'manager', 'ceo']), employeeController.createEmployee);
router.put('/:id', authorize(['admin', 'manager', 'ceo']), employeeController.updateEmployee);
router.delete('/:id', authorize(['admin', 'ceo']), employeeController.deleteEmployee); // Only admin/CEO can delete

module.exports = router;

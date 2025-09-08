const express = require('express');
const {
    getAllServices,
    getServiceById,
    createService,
    updateService,
    deleteService,
    getServicesByCategory
} = require('../controllers/serviceController');

const {
    auth,
    authorize,
    authorizeOperationalAccess,
    authorizeStaffManagement
} = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getAllServices); // Get all services
router.get('/category/:category', getServicesByCategory); // Get services by category
router.get('/:id', getServiceById); // Get specific service

// Manager/Admin routes
router.post('/', auth, authorizeOperationalAccess, createService); // Create service
router.put('/:id', auth, authorizeOperationalAccess, updateService); // Update service
router.delete('/:id', auth, authorizeStaffManagement, deleteService); // Delete service

module.exports = router;

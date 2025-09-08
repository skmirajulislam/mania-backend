const express = require('express');
const {
    getAllPackages,
    getPackageById,
    createPackage,
    updatePackage,
    deletePackage,
    getPackagesByType,
    checkPackageAvailability
} = require('../controllers/packageController');

const {
    auth,
    authorize,
    authorizeOperationalAccess,
    authorizeStaffManagement
} = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getAllPackages); // Get all packages
router.get('/type/:type', getPackagesByType); // Get packages by type
router.get('/:id', getPackageById); // Get specific package
router.get('/:id/availability', checkPackageAvailability); // Check package availability

// Manager/Admin routes
router.post('/', auth, authorizeOperationalAccess, createPackage); // Create package
router.put('/:id', auth, authorizeOperationalAccess, updatePackage); // Update package
router.delete('/:id', auth, authorizeStaffManagement, deletePackage); // Delete package

module.exports = router;

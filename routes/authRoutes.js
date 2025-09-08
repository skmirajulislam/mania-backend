const express = require('express');
const {
    registerUser,
    registerStaff,
    login,
    getCurrentUser,
    updateProfile,
    changePassword,
    logout,
    getAllUsers
} = require('../controllers/authController');
const { auth, authorizeStaffManagement } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', registerUser); // Public user registration
router.post('/login', login); // Login with email or phone

// Protected routes
router.get('/me', auth, getCurrentUser); // Get current user profile
router.put('/profile', auth, updateProfile); // Update user profile
router.put('/change-password', auth, changePassword); // Change password
router.post('/logout', auth, logout); // Logout

// Admin routes
router.post('/register-staff', auth, authorizeStaffManagement, registerStaff); // Admin only staff registration
router.get('/users', auth, authorizeStaffManagement, getAllUsers); // Admin/Manager get all users

module.exports = router;

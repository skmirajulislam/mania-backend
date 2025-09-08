const User = require('../models/User');
const { generateToken } = require('../services/jwtService');

// Public user registration
const registerUser = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            password,
            dateOfBirth,
            address
        } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !phone || !password) {
            return res.status(400).json({
                error: 'First name, last name, email, phone, and password are required'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { phone }]
        });

        if (existingUser) {
            return res.status(400).json({
                error: 'User with this email or phone number already exists'
            });
        }

        // Create new user
        const user = new User({
            firstName,
            lastName,
            email: email.toLowerCase(),
            phone,
            password,
            dateOfBirth,
            address,
            role: 'user' // Default role for public registration
        });

        await user.save();

        // Generate token for immediate login
        const token = generateToken(user._id, user.email, user.role);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
};

// Staff registration (admin only)
const registerStaff = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            password,
            role,
            department,
            staffId
        } = req.body;

        // Validate required fields for staff
        if (!firstName || !lastName || !email || !phone || !password || !role || !department) {
            return res.status(400).json({
                error: 'All fields are required for staff registration'
            });
        }

        // Validate role
        if (!['staff', 'manager', 'admin'].includes(role)) {
            return res.status(400).json({
                error: 'Invalid role specified'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { phone }, { staffId }]
        });

        if (existingUser) {
            return res.status(400).json({
                error: 'User with this email, phone, or staff ID already exists'
            });
        }

        // Create new staff user
        const user = new User({
            firstName,
            lastName,
            email: email.toLowerCase(),
            phone,
            password,
            role,
            department,
            staffId
        });

        await user.save();

        res.status(201).json({
            success: true,
            message: 'Staff member registered successfully',
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                department: user.department,
                staffId: user.staffId
            }
        });
    } catch (error) {
        console.error('Staff registration error:', error);
        res.status(500).json({ error: 'Server error during staff registration' });
    }
};

// Login controller (supports email or phone)
const login = async (req, res) => {
    try {
        const { emailOrPhone, password } = req.body;

        if (!emailOrPhone || !password) {
            return res.status(400).json({ error: 'Email/phone and password are required' });
        }

        // Find user by email or phone
        const user = await User.findOne({
            $or: [
                { email: emailOrPhone.toLowerCase() },
                { phone: emailOrPhone }
            ]
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(401).json({ error: 'Account is deactivated' });
        }

        // Check if account is locked
        if (user.isLocked) {
            return res.status(401).json({
                error: 'Account is temporarily locked due to multiple failed login attempts'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            // Increment login attempts
            await user.incLoginAttempts();
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Reset login attempts on successful login
        await user.resetLoginAttempts();

        // Generate token
        const token = generateToken(user._id, user.email, user.role);

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                department: user.department,
                lastLogin: user.lastLogin
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
};

// Get current user with full profile
const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            user: user.toJSON()
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const allowedUpdates = [
            'firstName', 'lastName', 'dateOfBirth', 'address',
            'preferences'
        ];

        // Staff can update additional fields
        if (['staff', 'manager', 'admin', 'ceo'].includes(req.user.role)) {
            allowedUpdates.push('phone'); // Staff can update their phone
        }

        const updates = {};
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key];
            }
        });

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: user.toJSON()
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Server error during profile update' });
    }
};

// Change password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: 'Current password and new password are required'
            });
        }

        const user = await User.findById(req.user._id);

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Server error during password change' });
    }
};

// Logout (invalidate token - would need token blacklisting in production)
const logout = async (req, res) => {
    try {
        // In a stateless JWT system, logout is handled client-side
        // You could implement token blacklisting here if needed
        res.json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
};

// Get all users (admin only)
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}, '-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

module.exports = {
    registerUser,
    registerStaff,
    login,
    getCurrentUser,
    updateProfile,
    changePassword,
    logout,
    getAllUsers
};

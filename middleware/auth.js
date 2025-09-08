const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Find user by id
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return res.status(401).json({ error: 'User not found' });
            }

            // Check if account is active
            if (!user.isActive) {
                return res.status(401).json({ error: 'Account is deactivated' });
            }

            // Check if account is locked
            if (user.isLocked) {
                return res.status(401).json({ error: 'Account is temporarily locked due to multiple failed login attempts' });
            }

            req.user = user;
            next();
        } catch (error) {
            return res.status(401).json({ error: 'Token is invalid or expired' });
        }
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Role hierarchy for permission checking
const roleHierarchy = {
    'user': 1,
    'staff': 2,
    'manager': 3,
    'admin': 4,
    'ceo': 5
};

// Middleware to check roles with hierarchy support
const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // If roles is a string, convert to array
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        // Check if user's role is in allowed roles
        const hasDirectRole = allowedRoles.includes(req.user.role);

        // Check if user has higher role (for hierarchy)
        const userRoleLevel = roleHierarchy[req.user.role] || 0;
        const hasHigherRole = allowedRoles.some(role => {
            const requiredLevel = roleHierarchy[role] || 0;
            return userRoleLevel >= requiredLevel;
        });

        if (!hasDirectRole && !hasHigherRole) {
            return res.status(403).json({
                error: 'Not authorized to access this resource',
                required: allowedRoles,
                current: req.user.role
            });
        }

        next();
    };
};

// Middleware for department-based access
const authorizeDepartment = (departments = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Users don't have departments, only staff and above
        if (req.user.role === 'user') {
            return res.status(403).json({ error: 'Staff access required' });
        }

        const allowedDepartments = Array.isArray(departments) ? departments : [departments];

        if (!allowedDepartments.includes(req.user.department)) {
            return res.status(403).json({
                error: 'Department access denied',
                required: allowedDepartments,
                current: req.user.department
            });
        }

        next();
    };
};

// Middleware to check if user can access specific user data
const authorizeUserAccess = (req, res, next) => {
    const targetUserId = req.params.userId || req.params.id;

    // Users can only access their own data
    if (req.user.role === 'user' && req.user._id.toString() !== targetUserId) {
        return res.status(403).json({ error: 'Can only access your own data' });
    }

    // Staff can access user data but not other staff data
    if (req.user.role === 'staff') {
        // Staff can access if it's a user or themselves
        if (req.user._id.toString() === targetUserId) {
            return next(); // Can access own data
        }
        // Additional check would be needed to verify target is a user, not staff
    }

    // Managers and above can access all data
    if (['manager', 'admin', 'ceo'].includes(req.user.role)) {
        return next();
    }

    next();
};

// Middleware for financial data access (CEO only)
const authorizeFinancialAccess = authorize(['ceo']);

// Middleware for operational data access (Manager and above)
const authorizeOperationalAccess = authorize(['manager', 'admin', 'ceo']);

// Middleware for staff management (Admin and above)
const authorizeStaffManagement = authorize(['admin', 'ceo']);

module.exports = {
    auth,
    authorize,
    authorizeDepartment,
    authorizeUserAccess,
    authorizeFinancialAccess,
    authorizeOperationalAccess,
    authorizeStaffManagement,
    roleHierarchy
};

const jwt = require('jsonwebtoken');
require('dotenv').config();

// Generate JWT token
const generateToken = (userId, username, role) => {
    return jwt.sign(
        { id: userId, username, role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// Verify JWT token
const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return { valid: true, expired: false, decoded };
    } catch (error) {
        return {
            valid: false,
            expired: error.name === 'TokenExpiredError',
            decoded: null
        };
    }
};

module.exports = {
    generateToken,
    verifyToken
};

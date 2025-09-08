const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const User = require('../models/User');

async function updateUserRole() {
    try {
        // Update the admin user's role
        const result = await User.updateOne(
            { email: 'admin@hotel.com' },
            { role: 'admin' }
        );

        console.log('Update result:', result);

        // Verify the update
        const user = await User.findOne({ email: 'admin@hotel.com' });
        console.log('Updated user:', {
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName
        });

        console.log('User role updated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error updating user role:', error);
        process.exit(1);
    }
}

updateUserRole();

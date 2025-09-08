const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function setupAccounts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check if staff account exists
        const existingStaff = await User.findOne({ email: 'staff@grandhotel.com' });
        if (!existingStaff) {
            const staffUser = new User({
                firstName: 'Hotel',
                lastName: 'Staff',
                email: 'staff@grandhotel.com',
                phone: '+1234567891',
                password: 'staff123',
                role: 'staff',
                department: 'concierge',
                employeeId: 'STAFF001',
                dateOfBirth: new Date('1990-01-01'),
                address: {
                    street: '123 Hotel Street',
                    city: 'Hotel City',
                    state: 'HC',
                    country: 'USA',
                    zipCode: '12345'
                }
            });
            await staffUser.save();
            console.log('✅ Staff account created successfully');
        } else {
            console.log('ℹ️ Staff account already exists');
        }

        // Check if owner account exists
        const existingOwner = await User.findOne({ email: 'owner@grandhotel.com' });
        if (!existingOwner) {
            const ownerUser = new User({
                firstName: 'Hotel',
                lastName: 'Owner',
                email: 'owner@grandhotel.com',
                phone: '+9876543210',
                password: 'owner123',
                role: 'ceo',
                dateOfBirth: new Date('1970-01-01'),
                address: {
                    street: '456 Executive Avenue',
                    city: 'Business City',
                    state: 'BC',
                    country: 'USA',
                    zipCode: '54321'
                }
            });
            await ownerUser.save();
            console.log('✅ Owner account created successfully');
        } else {
            console.log('ℹ️ Owner account already exists');
        } console.log('\n🔐 STAFF & OWNER LOGIN CREDENTIALS:\n');
        console.log('📋 Staff Account:');
        console.log('   Email: staff@grandhotel.com');
        console.log('   Password: staff123');
        console.log('   Role: Staff');
        console.log('   Access: /staff-dashboard\n');

        console.log('👑 Owner Account:');
        console.log('   Email: owner@grandhotel.com');
        console.log('   Password: owner123');
        console.log('   Role: CEO');
        console.log('   Access: /admin-dashboard\n');

        console.log('🚀 Login at: http://localhost:5173/auth');

        process.exit(0);
    } catch (error) {
        console.error('Error setting up accounts:', error);
        process.exit(1);
    }
}

setupAccounts();

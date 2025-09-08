const mongoose = require('mongoose');
require('dotenv').config();

const Room = require('../models/Room');

async function cleanupRooms() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grand_hotel');
        console.log('Connected to MongoDB');

        // Delete all existing rooms
        await Room.deleteMany({});
        console.log('Deleted all existing rooms');

        mongoose.disconnect();
        console.log('Database cleanup completed');
    } catch (error) {
        console.error('Error cleaning up rooms:', error);
        mongoose.disconnect();
    }
}

cleanupRooms();

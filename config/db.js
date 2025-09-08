const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        console.log('Attempting to connect to MongoDB...');

        const opts = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 20000, // 20s to find primary
            socketTimeoutMS: 45000,
            connectTimeoutMS: 15000,
            retryWrites: true,
            retryReads: true,
            heartbeatFrequencyMS: 2000,
            // no ssl / authSource overrides needed for Atlas SRV
        };

        cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
            console.log('✅ MongoDB connected');
            return mongoose;
        });
    }

    cached.conn = await cached.promise;
    return cached.conn;
};

module.exports = connectDB;

#!/usr/bin/env node

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected for backup');
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
};

const backupCollection = async (collectionName) => {
    try {
        const collection = mongoose.connection.db.collection(collectionName);
        const data = await collection.find({}).toArray();

        const backupDir = path.join(__dirname, '../backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = path.join(backupDir, `${collectionName}-${timestamp}.json`);

        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        console.log(`✅ Backed up ${collectionName} to ${filename}`);

        return filename;
    } catch (error) {
        console.error(`❌ Failed to backup ${collectionName}:`, error);
        throw error;
    }
};

const createFullBackup = async () => {
    try {
        await connectDB();

        const collections = ['users', 'rooms', 'bookings', 'menuitems', 'galleryitems', 'packages', 'services', 'testimonials'];
        const backupFiles = [];

        console.log('🔄 Starting database backup...');

        for (const collection of collections) {
            try {
                const filename = await backupCollection(collection);
                backupFiles.push(filename);
            } catch (error) {
                console.warn(`⚠️  Skipping ${collection} (collection may not exist)`);
            }
        }

        // Create backup manifest
        const manifest = {
            timestamp: new Date().toISOString(),
            files: backupFiles,
            collections: collections.length,
            status: 'success'
        };

        const manifestPath = path.join(__dirname, '../backups', `manifest-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

        console.log('✅ Database backup completed successfully');
        console.log(`📄 Backup manifest: ${manifestPath}`);

    } catch (error) {
        console.error('❌ Backup failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
    }
};

if (require.main === module) {
    createFullBackup();
}

module.exports = { createFullBackup, backupCollection };

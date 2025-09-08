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
        console.log('MongoDB connected for restore');
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
};

const restoreCollection = async (collectionName, filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Backup file not found: ${filePath}`);
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const collection = mongoose.connection.db.collection(collectionName);

        // Clear existing data
        await collection.deleteMany({});
        console.log(`🗑️  Cleared existing data in ${collectionName}`);

        // Insert backup data
        if (data.length > 0) {
            await collection.insertMany(data);
            console.log(`✅ Restored ${data.length} documents to ${collectionName}`);
        } else {
            console.log(`ℹ️  No data to restore for ${collectionName}`);
        }

    } catch (error) {
        console.error(`❌ Failed to restore ${collectionName}:`, error);
        throw error;
    }
};

const restoreFromManifest = async (manifestPath) => {
    try {
        if (!fs.existsSync(manifestPath)) {
            throw new Error(`Manifest file not found: ${manifestPath}`);
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

        console.log('🔄 Starting database restore...');
        console.log(`📄 Using manifest: ${manifestPath}`);
        console.log(`🕐 Backup timestamp: ${manifest.timestamp}`);

        await connectDB();

        for (const filePath of manifest.files) {
            const filename = path.basename(filePath);
            const collectionName = filename.split('-')[0];

            try {
                await restoreCollection(collectionName, filePath);
            } catch (error) {
                console.warn(`⚠️  Failed to restore ${collectionName}, continuing...`);
            }
        }

        console.log('✅ Database restore completed');

    } catch (error) {
        console.error('❌ Restore failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
    }
};

const restoreSingleCollection = async (collectionName, filePath) => {
    try {
        console.log(`🔄 Restoring ${collectionName} from ${filePath}...`);

        await connectDB();
        await restoreCollection(collectionName, filePath);

        console.log('✅ Single collection restore completed');

    } catch (error) {
        console.error('❌ Restore failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
    }
};

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage:');
        console.log('  node restore-db.js <manifest-file>');
        console.log('  node restore-db.js <collection-name> <backup-file>');
        process.exit(1);
    }

    if (args.length === 1) {
        // Restore from manifest
        restoreFromManifest(args[0]);
    } else if (args.length === 2) {
        // Restore single collection
        restoreSingleCollection(args[0], args[1]);
    } else {
        console.error('Invalid arguments');
        process.exit(1);
    }
}

module.exports = { restoreFromManifest, restoreSingleCollection };

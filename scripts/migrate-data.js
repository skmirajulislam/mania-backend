const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import models
const Room = require('../models/Room');
const MenuItem = require('../models/MenuItem');
const GalleryItem = require('../models/GalleryItem');
const User = require('../models/User');

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

// Read JSON data
const readJsonFile = (filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return null;
    }
};

// Import rooms
const importRooms = async () => {
    try {
        const dataDir = path.join(__dirname, '../../src', 'data');
        const roomsData = readJsonFile(path.join(dataDir, 'rooms.json'));

        if (!roomsData || !roomsData.rooms) {
            console.error('Invalid rooms data format');
            return;
        }

        // Clear existing data
        await Room.deleteMany({});

        // Create new rooms
        const roomPromises = roomsData.rooms.map(room => {
            return Room.create({
                _id: new mongoose.Types.ObjectId(),
                category: room.category,
                name: room.name,
                description: room.description,
                price: room.price,
                available: room.available,
                total: room.total,
                images: room.images,
                videos: room.videos || [],
                amenities: room.amenities
            });
        });

        await Promise.all(roomPromises);
        console.log(`${roomsData.rooms.length} rooms imported successfully`);
    } catch (error) {
        console.error('Error importing rooms:', error);
    }
};

// Import menu
const importMenu = async () => {
    try {
        const dataDir = path.join(__dirname, '../../src', 'data');
        const menuData = readJsonFile(path.join(dataDir, 'menu.json'));

        if (!menuData || !menuData.menu) {
            console.error('Invalid menu data format');
            return;
        }

        // Clear existing data
        await MenuItem.deleteMany({});

        // Create menu items for each category
        const menuPromises = [];

        Object.entries(menuData.menu).forEach(([category, items]) => {
            items.forEach(item => {
                menuPromises.push(
                    MenuItem.create({
                        _id: new mongoose.Types.ObjectId(),
                        name: item.name,
                        description: item.description,
                        price: item.price,
                        image: item.image,
                        category
                    })
                );
            });
        });

        await Promise.all(menuPromises);
        console.log(`Menu items imported successfully`);
    } catch (error) {
        console.error('Error importing menu:', error);
    }
};

// Import gallery
const importGallery = async () => {
    try {
        const dataDir = path.join(__dirname, '../../src', 'data');
        const galleryData = readJsonFile(path.join(dataDir, 'gallery.json'));

        if (!galleryData || !galleryData.gallery) {
            console.error('Invalid gallery data format');
            return;
        }

        // Clear existing data
        await GalleryItem.deleteMany({});

        // Create gallery items
        const galleryPromises = galleryData.gallery.map(item => {
            return GalleryItem.create({
                _id: new mongoose.Types.ObjectId(),
                type: item.type,
                category: item.category,
                url: item.url,
                caption: item.caption
            });
        });

        await Promise.all(galleryPromises);
        console.log(`${galleryData.gallery.length} gallery items imported successfully`);
    } catch (error) {
        console.error('Error importing gallery:', error);
    }
};

// Create admin user
const createAdminUser = async () => {
    try {
        const dataDir = path.join(__dirname, '../../src', 'data');
        const adminData = readJsonFile(path.join(dataDir, 'admin.json'));

        if (!adminData || !adminData.admin) {
            console.error('Invalid admin data format');
            return;
        }

        // Check if admin already exists
        const existingAdmin = await User.findOne({ username: adminData.admin.username });

        if (existingAdmin) {
            console.log('Admin user already exists');
            return;
        }

        // Create admin user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminData.admin.password, salt);

        await User.create({
            username: adminData.admin.username,
            password: hashedPassword,
            email: 'admin@grandhotel.com', // Default email
            role: 'admin'
        });

        console.log('Admin user created successfully');
    } catch (error) {
        console.error('Error creating admin user:', error);
    }
};

// Run migration
const runMigration = async () => {
    try {
        await connectDB();
        console.log('Starting data migration...');

        await importRooms();
        await importMenu();
        await importGallery();
        await createAdminUser();

        console.log('Data migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

// Run migration
runMigration();

const mongoose = require('mongoose');
require('dotenv').config();

const Room = require('../models/Room');
const RoomCategory = require('../models/RoomCategory');

async function seedRooms() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grand_hotel');
        console.log('Connected to MongoDB');

        // Get the existing room category
        let category = await RoomCategory.findOne({ name: 'Standard Room' });
        if (!category) {
            console.log('Creating Standard Room category...');
            category = await RoomCategory.create({
                name: 'Standard Room',
                description: 'Comfortable room with basic amenities',
                basePrice: 100,
                maxOccupancy: 2
            });
        }

        const sampleRooms = [
            {
                category: category._id,
                roomNumber: '101',
                name: 'Comfort Standard Room',
                description: 'Well-appointed room with modern amenities, comfortable bedding, and city views. Perfect for business travelers and short stays.',
                price: 2400,
                floor: 1,
                images: [
                    {
                        url: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800',
                        cloudinaryId: 'sample_id_1',
                        caption: 'Standard Room View'
                    },
                    {
                        url: 'https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=800',
                        cloudinaryId: 'sample_id_2',
                        caption: 'Room Interior'
                    }
                ],
                amenities: ['Free Wi-Fi', 'Air Conditioning', '32-inch LED TV', 'Mini Fridge', '24/7 Room Service', 'Work Desk', 'Tea/Coffee Maker']
            },
            {
                category: category._id,
                roomNumber: '102',
                name: 'Executive Standard Room',
                description: 'Enhanced standard room with executive amenities and priority services for discerning business travelers.',
                price: 2800,
                floor: 1,
                images: [
                    {
                        url: 'https://images.pexels.com/photos/145842/pexels-photo-145842.jpeg?auto=compress&cs=tinysrgb&w=800',
                        cloudinaryId: 'sample_id_3',
                        caption: 'Executive Room'
                    },
                    {
                        url: 'https://images.pexels.com/photos/202967/pexels-photo-202967.jpeg?auto=compress&cs=tinysrgb&w=800',
                        cloudinaryId: 'sample_id_4',
                        caption: 'Room View'
                    }
                ],
                amenities: ['Free Wi-Fi', 'Air Conditioning', 'Smart TV', 'Premium Mini Bar', '24/7 Room Service', 'City View', 'Work Desk', 'Executive Lounge Access']
            },
            {
                category: category._id,
                roomNumber: '201',
                name: 'Deluxe Premium Suite',
                description: 'Spacious suite with separate living area, premium furnishings, and enhanced amenities for a superior experience.',
                price: 4200,
                floor: 2,
                images: [
                    {
                        url: 'https://images.pexels.com/photos/145806/pexels-photo-145806.jpeg?auto=compress&cs=tinysrgb&w=800',
                        cloudinaryId: 'sample_id_5',
                        caption: 'Deluxe Suite'
                    },
                    {
                        url: 'https://images.pexels.com/photos/202967/pexels-photo-202967.jpeg?auto=compress&cs=tinysrgb&w=800',
                        cloudinaryId: 'sample_id_6',
                        caption: 'Suite Living Area'
                    }
                ],
                amenities: ['Free Premium Wi-Fi', 'Climate Control', '55-inch Smart TV', 'Premium Mini Bar', 'Butler Service', 'Ocean View', 'Executive Work Station', 'Marble Bathroom', 'Jacuzzi Tub']
            }
        ];

        // Create the rooms
        for (const roomData of sampleRooms) {
            const room = await Room.create(roomData);
            console.log(`Created room: ${room.name} (${room.roomNumber})`);
        }

        console.log('Room seeding completed');
        mongoose.disconnect();
    } catch (error) {
        console.error('Error seeding rooms:', error);
        mongoose.disconnect();
    }
}

seedRooms();

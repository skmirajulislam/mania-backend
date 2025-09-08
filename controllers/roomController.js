const Room = require('../models/Room');
const RoomCategory = require('../models/RoomCategory');

// Get all rooms with category details
const getAllRooms = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, isAvailable, floor, search } = req.query;

        const filter = {};
        if (category) filter.category = category;
        if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';
        if (floor) filter.floor = parseInt(floor);
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { roomNumber: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const rooms = await Room.find(filter)
            .populate('category', 'name description basePrice')
            .sort({ floor: 1, roomNumber: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Room.countDocuments(filter);

        res.json({
            success: true,
            data: rooms,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        console.error('Error getting rooms:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get rooms',
            error: error.message
        });
    }
};

// Get room by ID
const getRoomById = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id)
            .populate('category', 'name description basePrice amenities services');

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        res.json({
            success: true,
            data: room
        });
    } catch (error) {
        console.error('Error getting room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get room',
            error: error.message
        });
    }
};

// Create new room (admin only)
const createRoom = async (req, res) => {
    try {
        const {
            category,
            roomNumber,
            name,
            description,
            price,
            floor,
            amenities,
            features,
            services,
            images,
            maxOccupancy,
            bedType,
            roomSize
        } = req.body;

        // Validate category exists
        const roomCategory = await RoomCategory.findById(category);
        if (!roomCategory) {
            return res.status(400).json({
                success: false,
                message: 'Invalid room category'
            });
        }

        // Check if room number already exists
        const existingRoom = await Room.findOne({ roomNumber });
        if (existingRoom) {
            return res.status(400).json({
                success: false,
                message: 'Room number already exists'
            });
        }

        // Create new room
        const room = new Room({
            category,
            roomNumber,
            name,
            description,
            price: Number(price),
            floor: Number(floor),
            amenities: Array.isArray(amenities) ? amenities : [],
            features: Array.isArray(features) ? features : [],
            services: Array.isArray(services) ? services : [],
            images: Array.isArray(images) ? images : [],
            maxOccupancy: Number(maxOccupancy) || 2,
            bedType: bedType || 'Queen',
            roomSize: Number(roomSize) || 25
        });

        await room.save();
        await room.populate('category', 'name description basePrice');

        res.status(201).json({
            success: true,
            message: 'Room created successfully',
            data: room
        });
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create room',
            error: error.message
        });
    }
};

// Update room (admin only)
const updateRoom = async (req, res) => {
    try {
        const room = await Room.findByIdAndUpdate(
            req.params.id,
            {
                $set: req.body,
                updatedAt: Date.now()
            },
            { new: true }
        );

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        res.json({ success: true, room });
    } catch (error) {
        console.error('Error updating room:', error);
        res.status(500).json({ error: 'Failed to update room' });
    }
};

// Delete room (admin only)
const deleteRoom = async (req, res) => {
    try {
        const room = await Room.findByIdAndDelete(req.params.id);

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ error: 'Failed to delete room' });
    }
};

module.exports = {
    getAllRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deleteRoom
};

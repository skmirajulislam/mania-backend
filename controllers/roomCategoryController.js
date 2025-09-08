const RoomCategory = require('../models/RoomCategory');
const Room = require('../models/Room');
const mongoose = require('mongoose');

// Get all room categories with room counts
const getAllCategories = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', isActive } = req.query;

        const filter = {};
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }
        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        const categories = await RoomCategory.aggregate([
            { $match: filter },
            {
                $lookup: {
                    from: 'rooms',
                    localField: '_id',
                    foreignField: 'category',
                    as: 'rooms'
                }
            },
            {
                $addFields: {
                    totalRooms: { $size: '$rooms' },
                    availableRooms: {
                        $size: {
                            $filter: {
                                input: '$rooms',
                                cond: { $eq: ['$$this.isAvailable', true] }
                            }
                        }
                    }
                }
            },
            { $sort: { priority: -1, createdAt: -1 } },
            { $skip: (page - 1) * parseInt(limit) },
            { $limit: parseInt(limit) }
        ]);

        const total = await RoomCategory.countDocuments(filter);

        res.json({
            success: true,
            data: categories,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        console.error('Error fetching room categories:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching room categories',
            error: error.message
        });
    }
};

// Get single room category
const getCategory = async (req, res) => {
    try {
        const category = await RoomCategory.findById(req.params.id).populate('totalRooms');

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Room category not found'
            });
        }

        // Get room details for this category
        const rooms = await Room.find({ category: category._id });
        const availableRooms = rooms.filter(room => room.isAvailable);

        res.json({
            success: true,
            data: {
                ...category.toObject(),
                totalRooms: rooms.length,
                availableRooms: availableRooms.length,
                rooms
            }
        });
    } catch (error) {
        console.error('Error fetching room category:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching room category',
            error: error.message
        });
    }
};

// Create new room category
const createCategory = async (req, res) => {
    try {
        const categoryData = req.body;

        // Validate required fields
        if (!categoryData.name || !categoryData.description || !categoryData.basePrice) {
            return res.status(400).json({
                success: false,
                message: 'Name, description, and base price are required'
            });
        }

        const category = new RoomCategory(categoryData);
        await category.save();

        res.status(201).json({
            success: true,
            message: 'Room category created successfully',
            data: category
        });
    } catch (error) {
        console.error('Error creating room category:', error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Room category with this name already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating room category',
            error: error.message
        });
    }
};

// Update room category
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const category = await RoomCategory.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Room category not found'
            });
        }

        res.json({
            success: true,
            message: 'Room category updated successfully',
            data: category
        });
    } catch (error) {
        console.error('Error updating room category:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating room category',
            error: error.message
        });
    }
};

// Delete room category (soft delete)
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if there are rooms in this category
        const roomsCount = await Room.countDocuments({ category: id });

        if (roomsCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category. There are ${roomsCount} rooms in this category. Please move or delete the rooms first.`
            });
        }

        const category = await RoomCategory.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Room category not found'
            });
        }

        res.json({
            success: true,
            message: 'Room category deactivated successfully'
        });
    } catch (error) {
        console.error('Error deleting room category:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting room category',
            error: error.message
        });
    }
};

// Hard delete room category (admin only)
const hardDeleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if there are rooms in this category
        const roomsCount = await Room.countDocuments({ category: id });

        if (roomsCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category. There are ${roomsCount} rooms in this category.`
            });
        }

        const category = await RoomCategory.findByIdAndDelete(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Room category not found'
            });
        }

        res.json({
            success: true,
            message: 'Room category permanently deleted'
        });
    } catch (error) {
        console.error('Error permanently deleting room category:', error);
        res.status(500).json({
            success: false,
            message: 'Error permanently deleting room category',
            error: error.message
        });
    }
};

module.exports = {
    getAllCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    hardDeleteCategory
};

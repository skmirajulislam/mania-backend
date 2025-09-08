const FoodCategory = require('../models/FoodCategory');
const MenuItem = require('../models/MenuItem');

// Get all food categories with item counts
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

        const categories = await FoodCategory.aggregate([
            { $match: filter },
            {
                $lookup: {
                    from: 'menuitems',
                    localField: '_id',
                    foreignField: 'category',
                    as: 'items'
                }
            },
            {
                $addFields: {
                    totalItems: { $size: '$items' },
                    availableItems: {
                        $size: {
                            $filter: {
                                input: '$items',
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

        const total = await FoodCategory.countDocuments(filter);

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
        console.error('Error fetching food categories:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching food categories',
            error: error.message
        });
    }
};

// Get single food category
const getCategory = async (req, res) => {
    try {
        const category = await FoodCategory.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Food category not found'
            });
        }

        // Get menu items for this category
        const items = await MenuItem.find({ category: category._id });
        const availableItems = items.filter(item => item.isAvailable);

        res.json({
            success: true,
            data: {
                ...category.toObject(),
                totalItems: items.length,
                availableItems: availableItems.length,
                items
            }
        });
    } catch (error) {
        console.error('Error fetching food category:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching food category',
            error: error.message
        });
    }
};

// Create new food category
const createCategory = async (req, res) => {
    try {
        const categoryData = req.body;

        if (!categoryData.name || !categoryData.description) {
            return res.status(400).json({
                success: false,
                message: 'Name and description are required'
            });
        }

        const category = new FoodCategory(categoryData);
        await category.save();

        res.status(201).json({
            success: true,
            message: 'Food category created successfully',
            data: category
        });
    } catch (error) {
        console.error('Error creating food category:', error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Food category with this name already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating food category',
            error: error.message
        });
    }
};

// Update food category
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const category = await FoodCategory.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Food category not found'
            });
        }

        res.json({
            success: true,
            message: 'Food category updated successfully',
            data: category
        });
    } catch (error) {
        console.error('Error updating food category:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating food category',
            error: error.message
        });
    }
};

// Delete food category
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if there are menu items in this category
        const itemsCount = await MenuItem.countDocuments({ category: id });

        if (itemsCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category. There are ${itemsCount} menu items in this category. Please move or delete the items first.`
            });
        }

        const category = await FoodCategory.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Food category not found'
            });
        }

        res.json({
            success: true,
            message: 'Food category deactivated successfully'
        });
    } catch (error) {
        console.error('Error deleting food category:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting food category',
            error: error.message
        });
    }
};

module.exports = {
    getAllCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory
};

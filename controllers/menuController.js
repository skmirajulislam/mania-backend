const MenuItem = require('../models/MenuItem');
const FoodCategory = require('../models/FoodCategory');

// Get all menu items with category details
const getAllMenuItems = async (req, res) => {
    try {
        const { page = 1, limit = 20, category, isAvailable, search, featured } = req.query;

        const filter = {};
        if (category) filter.category = category;
        if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';
        if (featured !== undefined) filter.featured = featured === 'true';
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { ingredients: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        const menuItems = await MenuItem.find(filter)
            .populate('category', 'name description availableTime')
            .sort({ featured: -1, popularity: -1, name: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await MenuItem.countDocuments(filter);

        res.json({
            success: true,
            data: menuItems,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        console.error('Error getting menu:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get menu items',
            error: error.message
        });
    }
};

// Get menu item by ID
const getMenuItemById = async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id)
            .populate('category', 'name description availableTime');

        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }

        res.json({
            success: true,
            data: menuItem
        });
    } catch (error) {
        console.error('Error getting menu item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get menu item',
            error: error.message
        });
    }
};

// Add menu item (admin only)
const createMenuItem = async (req, res) => {
    try {
        const {
            name, description, price, category, ingredients, allergens,
            nutritionInfo, isVegetarian, isVegan, isGlutenFree, isSpicy,
            spiceLevel, preparationTime, image
        } = req.body;

        // Validate category exists
        const foodCategory = await FoodCategory.findById(category);
        if (!foodCategory) {
            return res.status(400).json({
                success: false,
                message: 'Invalid food category'
            });
        }

        const menuItem = new MenuItem({
            name,
            description,
            price: Number(price),
            category,
            ingredients: Array.isArray(ingredients) ? ingredients : [],
            allergens: Array.isArray(allergens) ? allergens : [],
            nutritionInfo,
            isVegetarian: isVegetarian === true || isVegetarian === 'true',
            isVegan: isVegan === true || isVegan === 'true',
            isGlutenFree: isGlutenFree === true || isGlutenFree === 'true',
            isSpicy: isSpicy === true || isSpicy === 'true',
            spiceLevel: spiceLevel ? Number(spiceLevel) : 0,
            preparationTime: preparationTime ? Number(preparationTime) : undefined,
            image
        });

        await menuItem.save();
        await menuItem.populate('category', 'name description');

        res.status(201).json({
            success: true,
            message: 'Menu item created successfully',
            data: menuItem
        });
    } catch (error) {
        console.error('Error adding menu item:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add menu item',
            error: error.message
        });
    }
};

// Update menu item (admin only)
const updateMenuItem = async (req, res) => {
    try {
        const updateData = { ...req.body };

        // Handle boolean conversions
        if (updateData.isVegetarian !== undefined) {
            updateData.isVegetarian = updateData.isVegetarian === true || updateData.isVegetarian === 'true';
        }
        if (updateData.isVegan !== undefined) {
            updateData.isVegan = updateData.isVegan === true || updateData.isVegan === 'true';
        }
        if (updateData.isGlutenFree !== undefined) {
            updateData.isGlutenFree = updateData.isGlutenFree === true || updateData.isGlutenFree === 'true';
        }
        if (updateData.isSpicy !== undefined) {
            updateData.isSpicy = updateData.isSpicy === true || updateData.isSpicy === 'true';
        }

        const menuItem = await MenuItem.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('category', 'name description');

        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }

        res.json({
            success: true,
            message: 'Menu item updated successfully',
            data: menuItem
        });
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({ error: 'Failed to update menu item' });
    }
};

// Delete menu item (admin only)
const deleteMenuItem = async (req, res) => {
    try {
        const menuItem = await MenuItem.findByIdAndDelete(req.params.id);

        if (!menuItem) {
            return res.status(404).json({ error: 'Menu item not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({ error: 'Failed to delete menu item' });
    }
};

module.exports = {
    getAllMenuItems,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem
};

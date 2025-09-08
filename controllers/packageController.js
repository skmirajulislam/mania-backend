const Package = require('../models/Package');

// Get all packages
const getAllPackages = async (req, res) => {
    try {
        const { type, isActive = true, isPopular } = req.query;

        const query = {};
        if (type) query.type = type;
        if (isActive) query.isActive = isActive === 'true';
        if (isPopular) query.isPopular = isPopular === 'true';

        const packages = await Package.find(query)
            .populate('includes.services.serviceId')
            .sort({ isPopular: -1, name: 1 });

        res.json({
            success: true,
            packages
        });
    } catch (error) {
        console.error('Get packages error:', error);
        res.status(500).json({ error: 'Failed to retrieve packages' });
    }
};

// Get package by ID
const getPackageById = async (req, res) => {
    try {
        const package = await Package.findById(req.params.id)
            .populate('includes.services.serviceId');

        if (!package) {
            return res.status(404).json({ error: 'Package not found' });
        }

        res.json({
            success: true,
            package
        });
    } catch (error) {
        console.error('Get package error:', error);
        res.status(500).json({ error: 'Failed to retrieve package' });
    }
};

// Create new package (admin/manager only)
const createPackage = async (req, res) => {
    try {
        const package = new Package(req.body);
        await package.save();

        res.status(201).json({
            success: true,
            message: 'Package created successfully',
            package
        });
    } catch (error) {
        console.error('Create package error:', error);
        res.status(500).json({ error: 'Failed to create package' });
    }
};

// Update package (admin/manager only)
const updatePackage = async (req, res) => {
    try {
        const package = await Package.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('includes.services.serviceId');

        if (!package) {
            return res.status(404).json({ error: 'Package not found' });
        }

        res.json({
            success: true,
            message: 'Package updated successfully',
            package
        });
    } catch (error) {
        console.error('Update package error:', error);
        res.status(500).json({ error: 'Failed to update package' });
    }
};

// Delete package (admin only)
const deletePackage = async (req, res) => {
    try {
        const package = await Package.findByIdAndDelete(req.params.id);

        if (!package) {
            return res.status(404).json({ error: 'Package not found' });
        }

        res.json({
            success: true,
            message: 'Package deleted successfully'
        });
    } catch (error) {
        console.error('Delete package error:', error);
        res.status(500).json({ error: 'Failed to delete package' });
    }
};

// Get packages by type
const getPackagesByType = async (req, res) => {
    try {
        const { type } = req.params;

        const packages = await Package.find({
            type,
            isActive: true
        })
            .populate('includes.services.serviceId')
            .sort({ isPopular: -1, name: 1 });

        res.json({
            success: true,
            type,
            packages
        });
    } catch (error) {
        console.error('Get packages by type error:', error);
        res.status(500).json({ error: 'Failed to retrieve packages' });
    }
};

// Check package availability
const checkPackageAvailability = async (req, res) => {
    try {
        const { checkDate } = req.query;
        const package = await Package.findById(req.params.id);

        if (!package) {
            return res.status(404).json({ error: 'Package not found' });
        }

        const date = checkDate ? new Date(checkDate) : new Date();
        const isAvailable = package.isAvailable(date);
        const seasonalPrice = package.getSeasonalPrice(date);

        res.json({
            success: true,
            packageId: package._id,
            isAvailable,
            currentPrice: seasonalPrice,
            basePrice: package.effectivePrice,
            savings: package.savings
        });
    } catch (error) {
        console.error('Check package availability error:', error);
        res.status(500).json({ error: 'Failed to check package availability' });
    }
};

module.exports = {
    getAllPackages,
    getPackageById,
    createPackage,
    updatePackage,
    deletePackage,
    getPackagesByType,
    checkPackageAvailability
};

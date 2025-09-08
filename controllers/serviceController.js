const Service = require('../models/Service');

// Get all services
const getAllServices = async (req, res) => {
    try {
        const { category, isActive = true } = req.query;

        const query = {};
        if (category) query.category = category;
        if (isActive) query.isActive = isActive === 'true';

        const services = await Service.find(query).sort({ name: 1 });

        res.json({
            success: true,
            services
        });
    } catch (error) {
        console.error('Get services error:', error);
        res.status(500).json({ error: 'Failed to retrieve services' });
    }
};

// Get service by ID
const getServiceById = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }

        res.json({
            success: true,
            service
        });
    } catch (error) {
        console.error('Get service error:', error);
        res.status(500).json({ error: 'Failed to retrieve service' });
    }
};

// Create new service (admin/manager only)
const createService = async (req, res) => {
    try {
        const service = new Service(req.body);
        await service.save();

        res.status(201).json({
            success: true,
            message: 'Service created successfully',
            service
        });
    } catch (error) {
        console.error('Create service error:', error);
        res.status(500).json({ error: 'Failed to create service' });
    }
};

// Update service (admin/manager only)
const updateService = async (req, res) => {
    try {
        const service = await Service.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }

        res.json({
            success: true,
            message: 'Service updated successfully',
            service
        });
    } catch (error) {
        console.error('Update service error:', error);
        res.status(500).json({ error: 'Failed to update service' });
    }
};

// Delete service (admin only)
const deleteService = async (req, res) => {
    try {
        const service = await Service.findByIdAndDelete(req.params.id);

        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }

        res.json({
            success: true,
            message: 'Service deleted successfully'
        });
    } catch (error) {
        console.error('Delete service error:', error);
        res.status(500).json({ error: 'Failed to delete service' });
    }
};

// Get services by category
const getServicesByCategory = async (req, res) => {
    try {
        const { category } = req.params;

        const services = await Service.find({
            category,
            isActive: true
        }).sort({ name: 1 });

        res.json({
            success: true,
            category,
            services
        });
    } catch (error) {
        console.error('Get services by category error:', error);
        res.status(500).json({ error: 'Failed to retrieve services' });
    }
};

module.exports = {
    getAllServices,
    getServiceById,
    createService,
    updateService,
    deleteService,
    getServicesByCategory
};

const express = require('express');
const router = express.Router();
const Testimonial = require('../models/Testimonial');

// Get all approved testimonials (public)
router.get('/', async (req, res) => {
    try {
        const { featured, limit = 10 } = req.query;

        let query = { approved: true };
        if (featured === 'true') {
            query.featured = true;
        }

        const testimonials = await Testimonial.find(query)
            .sort({ featured: -1, createdAt: -1 })
            .limit(parseInt(limit));

        res.json(testimonials);
    } catch (error) {
        console.error('Error fetching testimonials:', error);
        res.status(500).json({ error: 'Failed to fetch testimonials' });
    }
});

// Get all testimonials (admin only)
router.get('/admin', async (req, res) => {
    try {
        const testimonials = await Testimonial.find()
            .sort({ createdAt: -1 });

        res.json(testimonials);
    } catch (error) {
        console.error('Error fetching all testimonials:', error);
        res.status(500).json({ error: 'Failed to fetch testimonials' });
    }
});

// Create new testimonial
router.post('/', async (req, res) => {
    try {
        const { name, rating, comment, email } = req.body;

        if (!name || !rating || !comment) {
            return res.status(400).json({ error: 'Name, rating, and comment are required' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        const testimonial = new Testimonial({
            name,
            rating,
            comment,
            email
        });

        const savedTestimonial = await testimonial.save();
        res.status(201).json(savedTestimonial);
    } catch (error) {
        console.error('Error creating testimonial:', error);
        res.status(500).json({ error: 'Failed to create testimonial' });
    }
});

// Update testimonial (admin only)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const testimonial = await Testimonial.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        );

        if (!testimonial) {
            return res.status(404).json({ error: 'Testimonial not found' });
        }

        res.json(testimonial);
    } catch (error) {
        console.error('Error updating testimonial:', error);
        res.status(500).json({ error: 'Failed to update testimonial' });
    }
});

// Delete testimonial (admin only)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const testimonial = await Testimonial.findByIdAndDelete(id);

        if (!testimonial) {
            return res.status(404).json({ error: 'Testimonial not found' });
        }

        res.json({ message: 'Testimonial deleted successfully' });
    } catch (error) {
        console.error('Error deleting testimonial:', error);
        res.status(500).json({ error: 'Failed to delete testimonial' });
    }
});

// Approve testimonial (admin only)
router.patch('/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;

        const testimonial = await Testimonial.findByIdAndUpdate(
            id,
            { approved: true },
            { new: true }
        );

        if (!testimonial) {
            return res.status(404).json({ error: 'Testimonial not found' });
        }

        res.json(testimonial);
    } catch (error) {
        console.error('Error approving testimonial:', error);
        res.status(500).json({ error: 'Failed to approve testimonial' });
    }
});

// Toggle featured status (admin only)
router.patch('/:id/featured', async (req, res) => {
    try {
        const { id } = req.params;
        const { featured } = req.body;

        const testimonial = await Testimonial.findByIdAndUpdate(
            id,
            { featured: !!featured },
            { new: true }
        );

        if (!testimonial) {
            return res.status(404).json({ error: 'Testimonial not found' });
        }

        res.json(testimonial);
    } catch (error) {
        console.error('Error updating featured status:', error);
        res.status(500).json({ error: 'Failed to update featured status' });
    }
});

module.exports = router;

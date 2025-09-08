const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    approved: {
        type: Boolean,
        default: false
    },
    featured: {
        type: Boolean,
        default: false
    },
    date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
testimonialSchema.index({ approved: 1, featured: 1, createdAt: -1 });

module.exports = mongoose.model('Testimonial', testimonialSchema);

const mongoose = require('mongoose');

const GalleryItemSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['image', 'video']
    },
    category: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    caption: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('GalleryItem', GalleryItemSchema);

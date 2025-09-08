const mongoose = require('mongoose');

const RoomCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    basePrice: {
        type: Number,
        required: true,
        min: 0
    },
    maxOccupancy: {
        type: Number,
        required: true,
        min: 1
    },
    amenities: [{
        type: String,
        trim: true
    }],
    services: [{
        name: { type: String, required: true },
        price: { type: Number, default: 0 },
        isIncluded: { type: Boolean, default: false }
    }],
    images: [{
        url: { type: String, required: true },
        cloudinaryId: { type: String, required: true },
        caption: { type: String, default: '' }
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    priority: {
        type: Number,
        default: 0 // For ordering categories
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual to get total rooms in this category
RoomCategorySchema.virtual('totalRooms', {
    ref: 'Room',
    localField: '_id',
    foreignField: 'category',
    count: true
});

// Virtual to get available rooms in this category
RoomCategorySchema.virtual('availableRooms').get(function () {
    // This will be populated by aggregation in the controller
    return this._availableRooms || 0;
});

// Index for better performance (name already has unique index)
RoomCategorySchema.index({ isActive: 1, priority: -1 });

module.exports = mongoose.model('RoomCategory', RoomCategorySchema);

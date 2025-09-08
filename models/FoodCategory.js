const mongoose = require('mongoose');

const FoodCategorySchema = new mongoose.Schema({
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
    icon: {
        type: String,
        default: '🍽️'
    },
    image: {
        url: { type: String },
        cloudinaryId: { type: String }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    priority: {
        type: Number,
        default: 0
    },
    availableTime: {
        start: { type: String }, // Format: "HH:mm"
        end: { type: String }     // Format: "HH:mm"
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual to get total items in this category
FoodCategorySchema.virtual('totalItems', {
    ref: 'MenuItem',
    localField: '_id',
    foreignField: 'category',
    count: true
});

// Index for better performance (name already has unique index)
FoodCategorySchema.index({ isActive: 1, priority: -1 });

module.exports = mongoose.model('FoodCategory', FoodCategorySchema);

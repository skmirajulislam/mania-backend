const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    image: {
        url: { type: String, required: true },
        cloudinaryId: { type: String, required: true }
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FoodCategory',
        required: true
    },
    ingredients: [{
        type: String,
        trim: true
    }],
    allergens: [{
        type: String,
        trim: true
    }],
    nutritionInfo: {
        calories: { type: Number, min: 0 },
        protein: { type: Number, min: 0 },
        carbohydrates: { type: Number, min: 0 },
        fat: { type: Number, min: 0 }
    },
    isVegetarian: {
        type: Boolean,
        default: false
    },
    isVegan: {
        type: Boolean,
        default: false
    },
    isGlutenFree: {
        type: Boolean,
        default: false
    },
    isSpicy: {
        type: Boolean,
        default: false
    },
    spiceLevel: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },
    preparationTime: {
        type: Number, // in minutes
        min: 0
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    featured: {
        type: Boolean,
        default: false
    },
    discount: {
        percentage: { type: Number, min: 0, max: 100, default: 0 },
        validUntil: { type: Date }
    },
    popularity: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for discounted price
MenuItemSchema.virtual('discountedPrice').get(function () {
    if (this.discount && this.discount.percentage > 0 &&
        (!this.discount.validUntil || this.discount.validUntil > new Date())) {
        return this.price * (1 - this.discount.percentage / 100);
    }
    return this.price;
});

// Indexes for better performance
MenuItemSchema.index({ category: 1, isAvailable: -1 });
MenuItemSchema.index({ price: 1 });
MenuItemSchema.index({ featured: -1, popularity: -1 });
MenuItemSchema.index({ isVegetarian: 1 });
MenuItemSchema.index({ isVegan: 1 });
MenuItemSchema.index({ isGlutenFree: 1 });

module.exports = mongoose.model('MenuItem', MenuItemSchema);

const mongoose = require('mongoose');

const PackageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['honeymoon', 'family', 'business', 'weekend', 'luxury', 'budget', 'adventure', 'wellness'],
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    discountPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    duration: {
        nights: { type: Number, required: true, min: 1 },
        days: { type: Number, required: true, min: 1 }
    },
    includes: {
        meals: {
            breakfast: { type: Boolean, default: false },
            lunch: { type: Boolean, default: false },
            dinner: { type: Boolean, default: false },
            snacks: { type: Boolean, default: false }
        },
        services: [{
            serviceId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Service'
            },
            serviceName: String,
            quantity: { type: Number, default: 1 },
            included: { type: Boolean, default: true }
        }],
        amenities: [String],
        specialFeatures: [String]
    },
    validFor: {
        roomTypes: [String], // Which room categories this package applies to
        seasons: [{
            name: String,
            startDate: Date,
            endDate: Date,
            priceModifier: { type: Number, default: 1 } // Multiplier for seasonal pricing
        }]
    },
    availability: {
        startDate: Date,
        endDate: Date,
        blackoutDates: [Date],
        maxBookings: { type: Number, default: 100 }
    },
    terms: {
        cancellationPolicy: String,
        refundPolicy: String,
        additionalTerms: [String]
    },
    images: [String],
    isActive: {
        type: Boolean,
        default: true
    },
    isPopular: {
        type: Boolean,
        default: false
    },
    bookingCount: {
        type: Number,
        default: 0
    },
    rating: {
        average: { type: Number, default: 0, min: 0, max: 5 },
        count: { type: Number, default: 0 }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

PackageSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Calculate effective price with discount
PackageSchema.virtual('effectivePrice').get(function () {
    return this.price * (1 - this.discountPercentage / 100);
});

// Calculate savings
PackageSchema.virtual('savings').get(function () {
    return this.price * (this.discountPercentage / 100);
});

// Check if package is currently available
PackageSchema.methods.isAvailable = function (checkDate = new Date()) {
    if (!this.isActive) return false;

    const { startDate, endDate, blackoutDates } = this.availability;

    if (startDate && checkDate < startDate) return false;
    if (endDate && checkDate > endDate) return false;

    // Check blackout dates
    if (blackoutDates && blackoutDates.some(date =>
        date.toDateString() === checkDate.toDateString()
    )) return false;

    return true;
};

// Get seasonal price
PackageSchema.methods.getSeasonalPrice = function (checkDate = new Date()) {
    const season = this.validFor.seasons.find(season =>
        checkDate >= season.startDate && checkDate <= season.endDate
    );

    const basePrice = this.effectivePrice;
    return season ? basePrice * season.priceModifier : basePrice;
};

PackageSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret) {
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('Package', PackageSchema);

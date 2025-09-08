const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RoomCategory',
        required: true,
        index: true
    },
    roomNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        index: true
    },
    isAvailable: {
        type: Boolean,
        default: true,
        index: true
    },
    floor: {
        type: Number,
        required: true
    },
    images: [{
        url: { type: String, required: true },
        cloudinaryId: { type: String, required: true },
        caption: { type: String, default: '' }
    }],
    videos: [{
        url: { type: String, required: true },
        cloudinaryId: { type: String, required: true },
        title: { type: String, default: '' }
    }],
    amenities: [{
        type: String
    }],
    features: [{
        type: String
    }],
    maxOccupancy: {
        type: Number,
        required: true,
        default: 2,
        min: 1,
        max: 10
    },
    bedType: {
        type: String,
        required: true,
        enum: ['Single', 'Double', 'Queen', 'King', 'Twin'],
        default: 'Queen'
    },
    roomSize: {
        type: Number,
        required: true,
        default: 25,
        min: 10,
        max: 200
    },
    services: [{
        name: { type: String, required: true },
        price: { type: Number, default: 0 },
        isIncluded: { type: Boolean, default: false }
    }],
    maintenanceStatus: {
        type: String,
        enum: ['good', 'needs_cleaning', 'maintenance_required', 'out_of_order'],
        default: 'good'
    },
    lastCleaned: {
        type: Date,
        default: Date.now
    },
    lastCleaned: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound indexes for better query performance
RoomSchema.index({ category: 1, isAvailable: -1 });
RoomSchema.index({ price: 1, category: 1 });
RoomSchema.index({ isAvailable: -1, price: 1 });
RoomSchema.index({ floor: 1, roomNumber: 1 });

// Pre-save middleware to update the updatedAt field
RoomSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Virtual for booking status
RoomSchema.virtual('bookingStatus').get(function () {
    if (!this.isAvailable) return 'unavailable';
    if (this.maintenanceStatus === 'out_of_order') return 'out_of_order';
    if (this.maintenanceStatus === 'maintenance_required') return 'maintenance';
    return 'available';
});

module.exports = mongoose.model('Room', RoomSchema);

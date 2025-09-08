const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['spa', 'gym', 'laundry', 'transport', 'tour', 'dining', 'other'],
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    duration: {
        value: Number,
        unit: {
            type: String,
            enum: ['minutes', 'hours', 'days']
        }
    },
    availability: {
        days: [{
            type: String,
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        }],
        timeSlots: [{
            startTime: String,
            endTime: String,
            maxBookings: { type: Number, default: 1 }
        }]
    },
    images: [String],
    isActive: {
        type: Boolean,
        default: true
    },
    staffRequired: {
        type: Boolean,
        default: false
    },
    maxCapacity: {
        type: Number,
        default: 1
    },
    advanceBookingRequired: {
        type: Number, // hours
        default: 2
    },
    cancellationPolicy: {
        type: String,
        default: 'Can be cancelled up to 2 hours before the scheduled time'
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

ServiceSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Service', ServiceSchema);

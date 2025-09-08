const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    // Guest Information
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Booking Reference
    bookingNumber: {
        type: String,
        unique: true,
        required: true
    },

    // Room Information
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },

    // Dates
    checkInDate: {
        type: Date,
        required: true
    },
    checkOutDate: {
        type: Date,
        required: true
    },
    numberOfNights: {
        type: Number,
        required: true
    },

    // Guest Details
    numberOfGuests: {
        adults: { type: Number, required: true, min: 1 },
        children: { type: Number, default: 0, min: 0 }
    },

    // Packages and Services
    selectedPackage: {
        type: {
            id: String,
            name: String,
            description: String,
            price: Number,
            includes: [String]
        },
        default: null
    },

    additionalServices: [{
        serviceId: String,
        serviceName: String,
        serviceType: {
            type: String,
            enum: ['spa', 'gym', 'laundry', 'transport', 'tour', 'dining', 'other']
        },
        price: Number,
        quantity: { type: Number, default: 1 },
        scheduledDate: Date,
        scheduledTime: String,
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'completed', 'cancelled'],
            default: 'pending'
        }
    }],

    // Food Orders (separate from packages)
    foodOrders: [{
        orderId: String,
        items: [{
            menuItemId: mongoose.Schema.Types.ObjectId,
            menuItemName: String,
            quantity: Number,
            price: Number,
            specialInstructions: String
        }],
        orderType: {
            type: String,
            enum: ['room-service', 'restaurant', 'takeaway']
        },
        orderDate: { type: Date, default: Date.now },
        deliveryDate: Date,
        deliveryTime: String,
        status: {
            type: String,
            enum: ['ordered', 'preparing', 'ready', 'delivered', 'cancelled'],
            default: 'ordered'
        },
        totalAmount: Number
    }],

    // Pricing
    pricing: {
        roomRate: { type: Number, required: true },
        packagePrice: { type: Number, default: 0 },
        servicesTotal: { type: Number, default: 0 },
        foodTotal: { type: Number, default: 0 },
        taxAmount: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true }
    },

    // Payment Information
    payment: {
        status: {
            type: String,
            enum: ['pending', 'paid', 'partially-paid', 'refunded', 'failed'],
            default: 'pending'
        },
        method: {
            type: String,
            enum: ['card', 'upi', 'net-banking', 'wallet', 'cash']
        },
        transactionId: String,
        paidAmount: { type: Number, default: 0 },
        paymentDate: Date,
        refundAmount: { type: Number, default: 0 },
        refundDate: Date
    },

    // Special Requests
    specialRequests: {
        dietaryRestrictions: [String],
        accessibility: [String],
        preferences: [String],
        additionalRequests: String
    },

    // Service Requests and Communications
    serviceRequests: [{
        requestId: String,
        type: {
            type: String,
            enum: ['housekeeping', 'maintenance', 'butler', 'concierge', 'complaint', 'emergency']
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium'
        },
        description: String,
        requestDate: { type: Date, default: Date.now },
        assignedStaff: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['open', 'assigned', 'in-progress', 'resolved', 'closed'],
            default: 'open'
        },
        resolution: String,
        resolvedDate: Date,
        rating: { type: Number, min: 1, max: 5 }
    }],

    // Booking Status
    status: {
        type: String,
        enum: ['confirmed', 'checked-in', 'checked-out', 'cancelled', 'no-show'],
        default: 'confirmed'
    },

    // Check-in/Check-out
    actualCheckIn: Date,
    actualCheckOut: Date,

    // Reviews and Feedback
    review: {
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
        reviewDate: Date
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamps on save
BookingSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Generate booking number
BookingSchema.pre('save', async function (next) {
    if (this.isNew && !this.bookingNumber) {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');

        // Find the last booking of the day
        const lastBooking = await this.constructor.findOne({
            bookingNumber: new RegExp(`^GH${year}${month}${day}`)
        }).sort({ bookingNumber: -1 });

        let sequence = 1;
        if (lastBooking) {
            const lastSequence = parseInt(lastBooking.bookingNumber.slice(-3));
            sequence = lastSequence + 1;
        }

        this.bookingNumber = `GH${year}${month}${day}${sequence.toString().padStart(3, '0')}`;
    }
    next();
});

// Calculate total nights
BookingSchema.pre('save', function (next) {
    if (this.checkInDate && this.checkOutDate) {
        const timeDiff = this.checkOutDate.getTime() - this.checkInDate.getTime();
        this.numberOfNights = Math.ceil(timeDiff / (1000 * 3600 * 24));
    }
    next();
});

// Methods
BookingSchema.methods.calculateTotal = function () {
    const roomTotal = this.pricing.roomRate * this.numberOfNights;
    const packageTotal = this.pricing.packagePrice || 0;
    const servicesTotal = this.additionalServices.reduce((sum, service) =>
        sum + (service.price * service.quantity), 0);
    const foodTotal = this.foodOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    this.pricing.servicesTotal = servicesTotal;
    this.pricing.foodTotal = foodTotal;

    const subtotal = roomTotal + packageTotal + servicesTotal + foodTotal;
    const taxAmount = subtotal * 0.18; // 18% GST
    const discountAmount = this.pricing.discountAmount || 0;

    this.pricing.taxAmount = taxAmount;
    this.pricing.totalAmount = subtotal + taxAmount - discountAmount;

    return this.pricing.totalAmount;
};

// Virtual for days until checkin
BookingSchema.virtual('daysUntilCheckIn').get(function () {
    const today = new Date();
    const checkIn = new Date(this.checkInDate);
    const timeDiff = checkIn.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
});

// Virtual for current stay status
BookingSchema.virtual('currentStatus').get(function () {
    const today = new Date();
    const checkIn = new Date(this.checkInDate);
    const checkOut = new Date(this.checkOutDate);

    if (this.status === 'cancelled') return 'cancelled';
    if (this.status === 'checked-out') return 'completed';
    if (today < checkIn) return 'upcoming';
    if (today >= checkIn && today <= checkOut) return 'current';
    if (today > checkOut && this.status === 'confirmed') return 'overdue';
    return this.status;
});

// Indexes for better performance (unique indexes already defined in schema)
BookingSchema.index({ user: 1, createdAt: -1 });
BookingSchema.index({ checkInDate: 1, checkOutDate: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ 'payment.status': 1 });

// Ensure virtual fields are serialized
BookingSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret) {
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('Booking', BookingSchema);

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    customerInfo: {
        email: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        phone: String,
        roomNumber: String
    },
    items: [{
        menuItemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MenuItem',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        category: String,
        subtotal: {
            type: Number,
            required: true,
            min: 0
        }
    }],
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    tax: {
        type: Number,
        default: 0,
        min: 0
    },
    deliveryFee: {
        type: Number,
        default: 0,
        min: 0
    },
    finalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['stripe', 'cash', 'card'],
        default: 'stripe'
    },
    paymentIntentId: {
        type: String,
        required: true,
        unique: true
    },
    stripePaymentId: String,
    transactionId: String,
    deliveryType: {
        type: String,
        enum: ['room_service', 'pickup', 'dine_in'],
        default: 'room_service'
    },
    deliveryAddress: {
        roomNumber: String,
        floor: String,
        building: String,
        specialInstructions: String
    },
    estimatedDeliveryTime: Date,
    actualDeliveryTime: Date,
    preparationTime: {
        type: Number, // in minutes
        default: 30
    },
    notes: String,
    staffNotes: String,
    assignedStaff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes for better performance
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
// paymentIntentId index is already created by unique: true in schema definition

// Virtual for order total with tax
orderSchema.virtual('orderTotal').get(function () {
    return this.totalAmount + this.tax + this.deliveryFee;
});

// Pre-save middleware to calculate subtotals and final amount
orderSchema.pre('save', function (next) {
    // Calculate subtotals for each item
    this.items.forEach(item => {
        item.subtotal = item.price * item.quantity;
    });

    // Calculate total from items
    this.totalAmount = this.items.reduce((total, item) => total + item.subtotal, 0);

    // Calculate final amount including tax and delivery
    this.finalAmount = this.totalAmount + this.tax + this.deliveryFee;

    next();
});

// Static method to generate order ID
orderSchema.statics.generateOrderId = function () {
    return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};

// Instance method to update status with timestamp
orderSchema.methods.updateStatus = function (newStatus) {
    this.status = newStatus;

    if (newStatus === 'delivered') {
        this.actualDeliveryTime = new Date();
    }

    return this.save();
};

// Instance method to complete payment
orderSchema.methods.completePayment = function (stripePaymentId, transactionId) {
    this.paymentStatus = 'completed';
    this.stripePaymentId = stripePaymentId;
    this.transactionId = transactionId;
    this.status = 'confirmed';

    return this.save();
};

module.exports = mongoose.model('Order', orderSchema);

const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const { createPaymentIntent, confirmPayment } = require('../services/paymentService');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Middleware to ensure database connection
const ensureDbConnection = (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ error: 'Database connection not available' });
    }
    next();
};

// Create payment intent for restaurant order
router.post('/create-payment-intent', ensureDbConnection, auth, async (req, res) => {
    try {
        const { items, totalAmount, customerInfo, deliveryType = 'room_service' } = req.body;
        const userId = req.user.id;

        // Validate input
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Invalid items data' });
        }

        if (!totalAmount || totalAmount <= 0) {
            return res.status(400).json({ error: 'Invalid total amount' });
        }

        // Get user details
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Validate menu items exist and calculate total
        let calculatedTotal = 0;
        const orderItems = [];

        for (const item of items) {
            const menuItem = await MenuItem.findById(item.id);
            if (!menuItem) {
                return res.status(400).json({ error: `Menu item ${item.name} not found` });
            }

            const subtotal = menuItem.price * item.quantity;
            calculatedTotal += subtotal;

            orderItems.push({
                menuItemId: menuItem._id,
                name: menuItem.name,
                price: menuItem.price,
                quantity: item.quantity,
                category: menuItem.category,
                subtotal
            });
        }

        // Verify calculated total matches frontend total
        if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
            return res.status(400).json({ error: 'Total amount mismatch' });
        }

        // Generate order ID
        const orderId = Order.generateOrderId();

        // Calculate tax and delivery fee
        const tax = Math.round(totalAmount * 0.1); // 10% tax
        const deliveryFee = deliveryType === 'room_service' ? 50 : 0; // 50 INR for room service
        const finalAmount = totalAmount + tax + deliveryFee;

        // Create order in database
        const order = new Order({
            orderId,
            customerId: userId,
            customerInfo: {
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                phone: user.phone,
                roomNumber: customerInfo.roomNumber
            },
            items: orderItems,
            totalAmount: calculatedTotal,
            tax,
            deliveryFee,
            finalAmount,
            deliveryType,
            paymentIntentId: '', // Will be updated after Stripe response
            estimatedDeliveryTime: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
        });

        // Create Stripe payment intent
        const paymentIntent = await createPaymentIntent(
            finalAmount,
            'inr',
            {
                orderId,
                customerEmail: user.email,
                customerId: userId,
                orderType: 'restaurant'
            }
        );

        // Update order with payment intent ID
        order.paymentIntentId = paymentIntent.id;
        await order.save();

        res.json({
            clientSecret: paymentIntent.clientSecret,
            orderId,
            paymentIntentId: paymentIntent.id,
            orderTotal: finalAmount,
            breakdown: {
                subtotal: totalAmount,
                tax,
                deliveryFee,
                total: finalAmount
            }
        });

    } catch (error) {
        console.error('Create payment intent error:', error);
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
});

// Confirm payment and update order status
router.post('/confirm-payment', ensureDbConnection, auth, async (req, res) => {
    try {
        const { paymentIntentId, orderId } = req.body;
        const userId = req.user.id;

        if (!paymentIntentId || !orderId) {
            return res.status(400).json({ error: 'Missing payment intent ID or order ID' });
        }

        // Find order and verify ownership
        const order = await Order.findOne({
            orderId,
            customerId: userId
        }).populate('customerId', 'firstName lastName email phone');

        if (!order) {
            return res.status(404).json({ error: 'Order not found or access denied' });
        }

        // Verify payment with Stripe
        const paymentSucceeded = await confirmPayment(paymentIntentId);

        if (!paymentSucceeded) {
            order.paymentStatus = 'failed';
            await order.save();
            return res.status(400).json({ error: 'Payment verification failed' });
        }

        // Update order status
        await order.completePayment(paymentIntentId, `txn_${Date.now()}`);

        // Populate order details for response
        const populatedOrder = await Order.findById(order._id)
            .populate('customerId', 'firstName lastName email phone')
            .populate('items.menuItemId', 'name description category');

        res.json({
            success: true,
            order: populatedOrder,
            message: 'Payment successful! Your order has been confirmed.'
        });

    } catch (error) {
        console.error('Confirm payment error:', error);
        res.status(500).json({ error: 'Failed to confirm payment' });
    }
});

// Get order by ID (user can only see their own orders)
router.get('/:orderId', ensureDbConnection, auth, async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        const order = await Order.findOne({
            orderId,
            customerId: userId
        })
            .populate('customerId', 'firstName lastName email phone')
            .populate('items.menuItemId', 'name description category image')
            .populate('assignedStaff', 'firstName lastName');

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Failed to retrieve order' });
    }
});

// Get user's orders with pagination
router.get('/', ensureDbConnection, auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;

        const query = { customerId: userId };
        if (status && status !== 'all') {
            query.status = status;
        }

        const orders = await Order.find(query)
            .populate('items.menuItemId', 'name description category image')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Order.countDocuments(query);

        res.json({
            orders,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalOrders: total
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Failed to retrieve orders' });
    }
});

// Admin routes - Get all orders
router.get('/admin/all', ensureDbConnection, auth, async (req, res) => {
    try {
        // Check if user is admin/staff
        if (!['admin', 'staff', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        const query = {};
        if (status && status !== 'all') {
            query.status = status;
        }
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const orders = await Order.find(query)
            .populate('customerId', 'firstName lastName email phone')
            .populate('items.menuItemId', 'name category')
            .populate('assignedStaff', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Order.countDocuments(query);

        // Calculate stats
        const stats = await Order.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalRevenue: { $sum: '$finalAmount' }
                }
            }
        ]);

        res.json({
            orders,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalOrders: total,
            stats
        });
    } catch (error) {
        console.error('Get admin orders error:', error);
        res.status(500).json({ error: 'Failed to retrieve orders' });
    }
});

// Update order status (admin/staff only)
router.put('/:orderId/status', ensureDbConnection, auth, async (req, res) => {
    try {
        // Check if user is admin/staff
        if (!['admin', 'staff', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { orderId } = req.params;
        const { status, staffNotes } = req.body;

        const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        await order.updateStatus(status);

        if (staffNotes) {
            order.staffNotes = staffNotes;
        }

        order.assignedStaff = req.user.id;
        await order.save();

        const updatedOrder = await Order.findById(order._id)
            .populate('customerId', 'firstName lastName email phone')
            .populate('assignedStaff', 'firstName lastName');

        res.json({
            success: true,
            order: updatedOrder,
            message: `Order status updated to ${status}`
        });

    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// Cancel order (user can cancel their own pending orders)
router.delete('/:orderId', ensureDbConnection, auth, async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        const order = await Order.findOne({
            orderId,
            customerId: userId
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Can only cancel pending or confirmed orders
        if (!['pending', 'confirmed'].includes(order.status)) {
            return res.status(400).json({ error: 'Cannot cancel order in current status' });
        }

        order.status = 'cancelled';
        order.paymentStatus = 'refunded'; // This would trigger refund process
        await order.save();

        res.json({
            success: true,
            message: 'Order cancelled successfully'
        });

    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({ error: 'Failed to cancel order' });
    }
});

module.exports = router;

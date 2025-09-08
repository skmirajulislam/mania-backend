const express = require('express');
const { uploadToCloudinary, upload } = require('../middleware/upload');
const { auth, authorize } = require('../middleware/auth');
const { sendContactFormNotification } = require('../services/emailService');
const { createPaymentIntent } = require('../services/paymentService');

const router = express.Router();

// Upload route - with authentication for admin users
router.post('/upload', auth, authorize(['admin']), upload.single('file'), uploadToCloudinary, (req, res) => {
    res.json({ success: true, fileUrl: req.fileUrl, url: req.fileUrl });
});

// Public upload route for testing purposes - disable in production
if (process.env.NODE_ENV !== 'production') {
    router.post('/upload-public', upload.single('file'), uploadToCloudinary, (req, res) => {
        res.json({ success: true, fileUrl: req.fileUrl, url: req.fileUrl });
    });
}

// Contact form route
router.post('/contact', async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        // Send email notification (placeholder function)
        const emailSent = await sendContactFormNotification({
            name, email, phone, subject, message
        });

        if (emailSent) {
            res.json({ success: true, message: 'Contact form submitted successfully' });
        } else {
            res.status(500).json({ error: 'Failed to send email notification' });
        }
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ error: 'Failed to submit contact form' });
    }
});

// Get Stripe publishable key
router.get('/stripe-config', (req, res) => {
    res.json({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
});

// Create payment intent
router.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount, currency = 'inr', metadata = {} } = req.body;

        if (!amount) {
            return res.status(400).json({ error: 'Amount is required' });
        }

        const paymentIntent = await createPaymentIntent(amount, currency, metadata);
        res.json(paymentIntent);
    } catch (error) {
        console.error('Payment intent creation error:', error);
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
});

module.exports = router;

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create a payment intent for booking
const createPaymentIntent = async (amount, currency = 'inr', metadata = {}) => {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Convert to cents/paisa
            currency,
            metadata,
            automatic_payment_methods: {
                enabled: true
            }
        });

        return {
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id
        };
    } catch (error) {
        console.error('Stripe error:', error);
        throw new Error('Payment processing failed');
    }
};

// Confirm payment success
const confirmPayment = async (paymentIntentId) => {
    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        return paymentIntent.status === 'succeeded';
    } catch (error) {
        console.error('Stripe confirmation error:', error);
        return false;
    }
};

module.exports = {
    createPaymentIntent,
    confirmPayment
};

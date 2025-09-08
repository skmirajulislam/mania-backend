// Empty email service as requested
// This is a placeholder for future email functionality

const sendBookingConfirmation = async (booking, room) => {
    // This function is intentionally empty
    console.log('Email would be sent for booking:', booking.id);
    return true;
};

const sendContactFormNotification = async (contactData) => {
    // This function is intentionally empty
    console.log('Email would be sent for contact form from:', contactData.email);
    return true;
};

module.exports = {
    sendBookingConfirmation,
    sendContactFormNotification
};

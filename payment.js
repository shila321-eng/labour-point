const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    booking_id: { type: String, required: true },
    farmer_phone: { type: String, required: true, index: true },
    owner_name: { type: String, required: true },
    listing_title: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['Success', 'Pending', 'Failed'], default: 'Success' },
    payment_method: { type: String, enum: ['Cash', 'UPI'], default: 'UPI' },
    transaction_id: { type: String, required: true, unique: true },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);

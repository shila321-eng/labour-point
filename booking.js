const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    listing_id: { type: String, required: true },
    listing_title: { type: String, required: true },
    listing_type: { type: String, required: true },
    farmer_phone: { type: String, required: true, index: true },
    owner_name: { type: String, required: true },
    price_amount: { type: Number, required: true },
    price_unit: { type: String, required: true },
    dates: { type: [String], required: true }, // e.g. ['2026-07-18']
    status: { type: String, default: 'confirmed' },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);

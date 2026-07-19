const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    author: { type: String, required: true },
    comment: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    skill: { type: String }
});

const listingSchema = new mongoose.Schema({
    owner_id: { type: String, required: true, index: true }, // Phone number of the owner
    owner_name: { type: String, required: true },
    type: { type: String, enum: ['labor', 'machinery'], required: true },
    title: { type: String, required: true },
    description: { type: String },
    price_amount: { type: Number, required: true },
    price_currency: { type: String, default: 'INR' },
    price_unit: { type: String, enum: ['day', 'hour'], default: 'day' },
    machinery_type: { type: String }, // e.g. 'tractor', 'rotavator', 'harvester', 'sprayer'
    availability_status: { type: String, default: 'available' },
    booked_dates: { type: [String], default: [] }, // Array of booked date strings, e.g., ['2026-07-18']
    skills: { type: [String], default: [] },
    rating: { type: Number, default: 5.0 },
    reviews_count: { type: Number, default: 0 },
    reviews: { type: [reviewSchema], default: [] },
    location: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], default: [74.0, 18.0] } // [Longitude, Latitude]
    },
    created_at: { type: Date, default: Date.now }
});

// Spatial index for 10km radius searches
listingSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Listing', listingSchema);

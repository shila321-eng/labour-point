const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['farmer', 'laborer', 'both'], default: 'farmer' },
    preferred_language: { type: String, default: 'en' },
    skills: { type: [String], default: [] },
    location: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], default: [74.0, 18.0] } // [Longitude, Latitude]
    },
    created_at: { type: Date, default: Date.now }
});

// Spatial index for 10km radius searches
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);

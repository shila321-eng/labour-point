const express = require('express');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const path = require('path');
const dotenv = require('dotenv');
const twilio = require('twilio');
const fetch = require('node-fetch');
const mongoose = require('mongoose');

dotenv.config();

const fs = require('fs');
const CONTACTS_CSV_PATH = path.join(__dirname, 'contacts.csv');

// Create contacts.csv with headers if it doesn't exist
if (!fs.existsSync(CONTACTS_CSV_PATH)) {
    try {
        fs.writeFileSync(CONTACTS_CSV_PATH, 'Name,Phone,Role,RegisteredAt,Skills\n', 'utf8');
        console.log('Created contacts.csv file.');
    } catch (err) {
        console.error('Failed to create contacts.csv:', err);
    }
}

// Helper to get contacts from CSV
function getContactsFromCSV() {
    try {
        if (!fs.existsSync(CONTACTS_CSV_PATH)) return [];
        const content = fs.readFileSync(CONTACTS_CSV_PATH, 'utf8');
        const lines = content.trim().split('\n');
        if (lines.length <= 1) return [];

        const contacts = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = [];
            let current = '';
            let inQuotes = false;
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    parts.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            parts.push(current);

            if (parts.length >= 3) {
                contacts.push({
                    name: parts[0],
                    phone: parts[1],
                    role: parts[2],
                    registeredAt: parts[3] || '',
                    skills: parts[4] ? parts[4].split(';') : []
                });
            }
        }
        return contacts;
    } catch (err) {
        console.error('Error reading contacts.csv:', err);
        return [];
    }
}

// Helper to save/update a contact in CSV
function saveContactToCSV(name, phone, role, skills = []) {
    try {
        const contacts = getContactsFromCSV();
        const existingIdx = contacts.findIndex(c => c.phone === phone);
        const skillsArray = Array.isArray(skills) ? skills : (typeof skills === 'string' ? [skills] : []);
        const skillsStr = skillsArray.join(';');

        if (existingIdx > -1) {
            contacts[existingIdx].name = name;
            contacts[existingIdx].role = role;
            contacts[existingIdx].skills = skillsArray;
            contacts[existingIdx].registeredAt = new Date().toISOString();
        } else {
            contacts.push({
                name,
                phone,
                role,
                registeredAt: new Date().toISOString(),
                skills: skillsArray
            });
        }

        let content = 'Name,Phone,Role,RegisteredAt,Skills\n';
        contacts.forEach(c => {
            const escapedName = c.name.replace(/"/g, '""');
            const cSkills = Array.isArray(c.skills) ? c.skills.join(';') : '';
            const escapedSkills = cSkills.replace(/"/g, '""');
            content += `"${escapedName}","${c.phone}","${c.role}","${c.registeredAt}","${escapedSkills}"\n`;
        });
        fs.writeFileSync(CONTACTS_CSV_PATH, content, 'utf8');
        console.log(`Saved contact ${name} (${phone}) to contacts.csv.`);
    } catch (err) {
        console.error('Error writing to contacts.csv:', err);
    }
}

// Helper to delete a contact from CSV
function deleteContactFromCSV(phone) {
    try {
        const contacts = getContactsFromCSV();
        const filtered = contacts.filter(c => c.phone !== phone);
        let content = 'Name,Phone,Role,RegisteredAt,Skills\n';
        filtered.forEach(c => {
            const escapedName = c.name.replace(/"/g, '""');
            const cSkills = Array.isArray(c.skills) ? c.skills.join(';') : '';
            const escapedSkills = cSkills.replace(/"/g, '""');
            content += `"${escapedName}","${c.phone}","${c.role}","${c.registeredAt}","${escapedSkills}"\n`;
        });
        fs.writeFileSync(CONTACTS_CSV_PATH, content, 'utf8');
        console.log(`Deleted contact with phone ${phone} from contacts.csv.`);
        return true;
    } catch (err) {
        console.error('Error deleting from contacts.csv:', err);
        return false;
    }
}

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
// Serve static client files
app.use(express.static(path.join(__dirname)));

// ----------------------------------------------------
// Dual Mode (MongoDB Database / In-Memory Fallback)
// ----------------------------------------------------
let isMongoConnected = false;
let mockUsers = [];
let mockListings = [];
let mockBookings = [];
let mockPayments = [];

const DEFAULT_SEED_LISTINGS = [
    {
        owner_id: "9988776655",
        owner_name: "Ramesh Kumar",
        type: "labor",
        title: "Ramesh Kumar (Expert Harvester)",
        description: "10+ years of crop cutting and harvesting experience. Hyperlocal availability with custom tools.",
        price_amount: 500,
        price_unit: "day",
        skills: ["harvesting", "spraying"],
        rating: 4.8,
        reviews_count: 12,
        reviews: [
            { author: "Karan Singh", comment: "Outstanding speed in wheat harvesting.", rating: 5, skill: "harvesting" },
            { author: "Vikram Patil", comment: "Pesticide spraying done carefully with safety gear.", rating: 4, skill: "spraying" }
        ],
        location: { type: "Point", coordinates: [74.015, 18.012] }
    },
    {
        owner_id: "9988776644",
        owner_name: "Anil Rao",
        type: "machinery",
        title: "John Deere 5050D Tractor (50 HP)",
        description: "High performance tractor for ploughing, tilling, and haulage. Equipped with experienced driver.",
        price_amount: 1200,
        price_unit: "day",
        machinery_type: "tractor",
        availability_status: "available",
        booked_dates: ["2026-07-18", "2026-07-19"],
        rating: 4.9,
        reviews_count: 8,
        reviews: [
            { author: "Karan Singh", comment: "Best condition tractor, fuel efficient.", rating: 5, skill: "tractor_driving" }
        ],
        location: { type: "Point", coordinates: [74.020, 18.018] }
    },
    {
        owner_id: "9988776633",
        owner_name: "Sachin Patil",
        type: "labor",
        title: "Sachin Patil (Tractor Operator)",
        description: "Specialized in rotavator attachment driving and precision laser land levelling.",
        price_amount: 150,
        price_unit: "hour",
        skills: ["tractor_driving"],
        rating: 4.9,
        reviews_count: 9,
        reviews: [
            { author: "Devendra Patil", comment: "Polite and drives extremely well in muddy soils.", rating: 5, skill: "tractor_driving" }
        ],
        location: { type: "Point", coordinates: [74.005, 18.008] }
    },
    {
        owner_id: "9988776622",
        owner_name: "Balasaheb Shinde",
        type: "machinery",
        title: "Rotavator (Soil Tiller Attachment)",
        description: "42-blade heavy duty rotavator for excellent soil seedbed preparation.",
        price_amount: 400,
        price_unit: "hour",
        machinery_type: "rotavator",
        availability_status: "available",
        booked_dates: ["2026-07-20"],
        rating: 4.6,
        reviews_count: 5,
        reviews: [
            { author: "Karan Singh", comment: "Blades are sharp, works well.", rating: 4, skill: "general" }
        ],
        location: { type: "Point", coordinates: [74.011, 18.022] }
    },
    {
        owner_id: "9988776611",
        owner_name: "Vinayak Mane",
        type: "labor",
        title: "Vinayak Mane (Sowing Expert)",
        description: "Accurate manual sowing and mechanical seed drill operation helper.",
        price_amount: 450,
        price_unit: "day",
        skills: ["sowing", "harvesting"],
        rating: 4.5,
        reviews_count: 7,
        reviews: [
            { author: "Rajesh Gaikwad", comment: "Good service, handles crop sowing perfectly.", rating: 5, skill: "sowing" }
        ],
        location: { type: "Point", coordinates: [74.030, 18.005] }
    }
];

// Seed fallback listings into memory array initially
mockListings = DEFAULT_SEED_LISTINGS.map((item, idx) => ({
    _id: `mock_listing_${idx + 1}`,
    ...item
}));

// Load Schemas & Models
const User = require('./models/user');
const Listing = require('./models/listing');
const Booking = require('./models/booking');
const Payment = require('./models/payment');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agrilabour';

console.log('Connecting to MongoDB...');
mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2000 })
    .then(async () => {
        console.log('Connected successfully to MongoDB Database!');
        isMongoConnected = true;
        await seedDatabase();
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        console.warn('\n================================================================');
        console.warn('WARNING: MongoDB is not running on this computer!');
        console.warn('The application is running in IN-MEMORY MOCK FALLBACK MODE.');
        console.warn('All profiles, listings, bookings, and payments will be temporary.');
        console.warn('================================================================\n');
        isMongoConnected = false;
    });

// Seeding function for real MongoDB
async function seedDatabase() {
    try {
        const count = await Listing.countDocuments();
        if (count === 0) {
            console.log('No listings found in MongoDB. Seeding default records...');
            await Listing.insertMany(DEFAULT_SEED_LISTINGS);
            console.log('Seed listings successfully imported into MongoDB.');
        }
    } catch (err) {
        console.error('Database seeding error:', err);
    }
}

// Haversine Distance Calculator Helper
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Synonym keyword map to translate client inputs to database matches
const keywordSynonymMap = {
    "tractor": { category: "machinery", item: "tractor" },
    "tractor driving": { category: "labor", skill: "tractor_driving" },
    "rotavator": { category: "machinery", item: "rotavator" },
    "tiller": { category: "machinery", item: "rotavator" },
    "harvesting": { category: "labor", skill: "harvesting" },
    "harvest": { category: "labor", skill: "harvesting" },
    "harvester": { category: "machinery", item: "harvester" },
    "spraying": { category: "labor", skill: "spraying" },
    "pesticide": { category: "labor", skill: "spraying" },
    "sowing": { category: "labor", skill: "sowing" },
    "seed sowing": { category: "labor", skill: "sowing" }
};

// In-memory OTP storage
const otpStore = new Map();

// Helper function to send SMS via configured gateways
async function sendSMS(phoneNumber, otpCode) {
    const provider = process.env.SMS_PROVIDER || 'console';
    const messageText = `AgriLabour Point Verification: Your OTP is ${otpCode}. Valid for 5 minutes.`;

    if (provider === 'twilio') {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({
            body: messageText,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `+91${phoneNumber}`
        });
        console.log(`[Twilio SMS Sent] to +91${phoneNumber}`);
        return 'twilio';
    }

    if (provider === 'fast2sms') {
        const apiKey = process.env.FAST2SMS_API_KEY;
        const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&variables_values=${otpCode}&route=otp&numbers=${phoneNumber}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.return) {
            throw new Error(data.message || 'Fast2SMS error');
        }
        console.log(`[Fast2SMS SMS Sent] to +91${phoneNumber}`);
        return 'fast2sms';
    }

    // Default console fallback mock mode
    console.log(`\n==============================================`);
    console.log(`[CONSOLE MOCK SMS LOG]`);
    console.log(`To: +91${phoneNumber}`);
    console.log(`Message: ${messageText}`);
    console.log(`==============================================\n`);
    return 'console';
}

// ----------------------------------------------------
app.get('/api/db-status', (req, res) => {
    res.json({ success: true, isMongoConnected });
});

app.post('/api/send-otp', async (req, res) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber || phoneNumber.length !== 10) {
        return res.status(400).json({ success: false, message: 'Invalid 10-digit phone number.' });
    }

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore.set(phoneNumber, {
        code: otpCode,
        expires: Date.now() + 5 * 60 * 1000 // 5 mins
    });

    try {
        const method = await sendSMS(phoneNumber, otpCode);
        res.json({
            success: true,
            message: `OTP sent successfully.`,
            mode: method,
            otpCode: method === 'console' ? otpCode : null
        });
    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send SMS to this number. Please check configuration credentials.'
        });
    }
});

app.post('/api/verify-otp', (req, res) => {
    const { phoneNumber, otpCode } = req.body;

    if (!phoneNumber || !otpCode) {
        return res.status(400).json({ success: false, message: 'Missing parameters.' });
    }

    const record = otpStore.get(phoneNumber);

    if (!record) {
        return res.status(400).json({ success: false, message: 'No OTP record found. Resend OTP.' });
    }

    if (Date.now() > record.expires) {
        otpStore.delete(phoneNumber);
        return res.status(400).json({ success: false, message: 'OTP expired. Please request a new code.' });
    }

    if (record.code !== otpCode) {
        return res.status(400).json({ success: false, message: 'Incorrect OTP code.' });
    }

    otpStore.delete(phoneNumber);
    res.json({ success: true, message: 'OTP verified successfully.' });
});

app.post('/api/login-direct', async (req, res) => {
    const { phone, role, name } = req.body;

    if (!phone || phone.length !== 10) {
        return res.status(400).json({ success: false, message: 'Invalid 10-digit phone number.' });
    }

    try {
        let user;
        let isNewUser = false;

        if (isMongoConnected) {
            user = await User.findOne({ phone });

            if (!user) {
                isNewUser = true;
                user = new User({
                    phone,
                    name: name || (role === 'farmer' ? `Farmer_${phone.substring(6)}` : ''),
                    role: role || 'farmer',
                    preferred_language: 'en'
                });
                await user.save();
            } else {
                if (name && (!user.name || user.name.startsWith('Farmer_'))) {
                    user.name = name;
                }
                if (role && user.role !== role) {
                    user.role = role;
                }
                await user.save();

                if (role === 'laborer' && (!user.name || user.name === '')) {
                    isNewUser = true;
                }
            }
        } else {
            // Memory Fallback
            user = mockUsers.find(u => u.phone === phone);
            if (!user) {
                isNewUser = true;
                user = {
                    phone,
                    name: name || (role === 'farmer' ? `Farmer_${phone.substring(6)}` : ''),
                    role: role || 'farmer',
                    preferred_language: 'en',
                    skills: [],
                    location: { type: 'Point', coordinates: [74.0124, 18.0124] }
                };
                mockUsers.push(user);
            } else {
                if (name && (!user.name || user.name.startsWith('Farmer_'))) {
                    user.name = name;
                }
                if (role && user.role !== role) {
                    user.role = role;
                }
                if (role === 'laborer' && (!user.name || user.name === '')) {
                    isNewUser = true;
                }
            }
        }

        if (user && user.name && user.name !== '') {
            saveContactToCSV(user.name, user.phone, user.role, user.skills);
        }

        res.json({ success: true, user, isNewUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Direct Login server error.' });
    }
});

// ----------------------------------------------------
// Database API Routes
// ----------------------------------------------------

// User profiles
app.get('/api/user-profile', async (req, res) => {
    const { phone } = req.query;
    if (!phone) {
        return res.status(400).json({ success: false, message: 'Missing phone query parameter.' });
    }

    try {
        let user;
        if (isMongoConnected) {
            user = await User.findOne({ phone });
        } else {
            user = mockUsers.find(u => u.phone === phone);
        }

        if (!user) {
            return res.json({ success: false, message: 'User not registered.' });
        }
        res.json({ success: true, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server database error.' });
    }
});

app.post('/api/register', async (req, res) => {
    const { phone, name, role, preferred_language, longitude, latitude, skills } = req.body;

    if (!phone || !name) {
        return res.status(400).json({ success: false, message: 'Missing required profile parameters.' });
    }

    try {
        const lng = longitude ? parseFloat(longitude) : 74.0124;
        const lat = latitude ? parseFloat(latitude) : 18.0124;
        let user;

        if (isMongoConnected) {
            user = await User.findOne({ phone });
            if (user) {
                user.name = name;
                user.role = role || user.role;
                user.preferred_language = preferred_language || user.preferred_language;
                user.skills = skills || user.skills;
                user.location = { type: 'Point', coordinates: [lng, lat] };
                await user.save();
            } else {
                user = new User({
                    phone,
                    name,
                    role: role || 'farmer',
                    preferred_language: preferred_language || 'en',
                    skills: skills || [],
                    location: { type: 'Point', coordinates: [lng, lat] }
                });
                await user.save();
            }
        } else {
            user = mockUsers.find(u => u.phone === phone);
            if (user) {
                user.name = name;
                user.role = role || user.role;
                user.preferred_language = preferred_language || user.preferred_language;
                user.skills = skills || user.skills;
                user.location = { type: 'Point', coordinates: [lng, lat] };
            } else {
                user = {
                    phone,
                    name,
                    role: role || 'farmer',
                    preferred_language: preferred_language || 'en',
                    skills: skills || [],
                    location: { type: 'Point', coordinates: [lng, lat] }
                };
                mockUsers.push(user);
            }
        }
        saveContactToCSV(user.name, user.phone, user.role, user.skills);

        res.json({ success: true, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to save profile details.' });
    }
});

// Contacts Directory Endpoints
app.get('/api/contacts', (req, res) => {
    try {
        const contacts = getContactsFromCSV();
        res.json({ success: true, contacts });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to read contacts list.' });
    }
});

app.delete('/api/contacts/:phone', (req, res) => {
    const { phone } = req.params;
    if (!phone) {
        return res.status(400).json({ success: false, message: 'Missing phone parameter.' });
    }

    try {
        const success = deleteContactFromCSV(phone);
        if (success) {
            res.json({ success: true, message: 'Contact deleted successfully.' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to delete contact.' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error during delete.' });
    }
});

// Listings query & creation
app.get('/api/listings', async (req, res) => {
    const { search, type, lng, lat } = req.query;
    const userLng = lng ? parseFloat(lng) : 74.0124;
    const userLat = lat ? parseFloat(lat) : 18.0124;

    try {
        const query = {};
        if (type) {
            query.type = type;
        }

        // Apply search keyword Synonym translations
        if (search) {
            const queryNorm = search.toLowerCase().trim();
            let resolved = null;
            for (const key in keywordSynonymMap) {
                if (queryNorm.includes(key)) {
                    resolved = keywordSynonymMap[key];
                    break;
                }
            }

            if (resolved) {
                if (resolved.category) query.type = resolved.category;
                if (resolved.skill) query.skills = resolved.skill;
                if (resolved.item) query.machinery_type = resolved.item;
            } else {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }
        }

        let filteredListings = [];

        if (isMongoConnected) {
            let rawListings = [];
            try {
                rawListings = await Listing.find({
                    ...query,
                    location: {
                        $near: {
                            $geometry: { type: "Point", coordinates: [userLng, userLat] },
                            $maxDistance: 10000
                        }
                    }
                });
            } catch (geoError) {
                rawListings = await Listing.find(query);
            }

            const results = rawListings.map(item => {
                const doc = item.toObject();
                const itemLng = doc.location?.coordinates[0] || 74.0;
                const itemLat = doc.location?.coordinates[1] || 18.0;
                doc.distance_km = calculateDistanceKm(userLat, userLng, itemLat, itemLng);
                return doc;
            });

            filteredListings = results
                .filter(item => item.distance_km <= 10.0)
                .sort((a, b) => a.distance_km - b.distance_km);
        } else {
            // Memory query fallback
            filteredListings = mockListings.filter(item => {
                if (type && item.type !== type) return false;

                if (search) {
                    const queryNorm = search.toLowerCase().trim();
                    let resolved = null;
                    for (const key in keywordSynonymMap) {
                        if (queryNorm.includes(key)) {
                            resolved = keywordSynonymMap[key];
                            break;
                        }
                    }

                    if (resolved) {
                        if (resolved.category && item.type !== resolved.category) return false;
                        if (resolved.skill && !item.skills.includes(resolved.skill)) return false;
                        if (resolved.item && item.machinery_type !== resolved.item) return false;
                    } else {
                        const titleMatch = item.title.toLowerCase().includes(queryNorm);
                        const descMatch = item.description.toLowerCase().includes(queryNorm);
                        if (!titleMatch && !descMatch) return false;
                    }
                }
                return true;
            }).map(item => {
                const doc = { ...item };
                const itemLng = doc.location?.coordinates[0] || 74.0;
                const itemLat = doc.location?.coordinates[1] || 18.0;
                doc.distance_km = calculateDistanceKm(userLat, userLng, itemLat, itemLng);
                return doc;
            }).filter(item => item.distance_km <= 10.0)
                .sort((a, b) => a.distance_km - b.distance_km);
        }

        res.json({ success: true, listings: filteredListings });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database lookup error.' });
    }
});

app.post('/api/listings', async (req, res) => {
    const { owner_id, owner_name, type, title, description, price_amount, price_unit, machinery_type, skills, longitude, latitude } = req.body;
    const lng = longitude ? parseFloat(longitude) : 74.0124;
    const lat = latitude ? parseFloat(latitude) : 18.0124;

    try {
        let newListing;
        if (isMongoConnected) {
            newListing = new Listing({
                owner_id,
                owner_name,
                type,
                title,
                description,
                price_amount,
                price_unit,
                machinery_type,
                skills: skills || [],
                location: { type: 'Point', coordinates: [lng, lat] }
            });
            await newListing.save();
        } else {
            newListing = {
                _id: 'mock_listing_' + Date.now(),
                owner_id,
                owner_name,
                type,
                title,
                description,
                price_amount,
                price_unit,
                machinery_type,
                skills: skills || [],
                rating: 5.0,
                reviews_count: 0,
                reviews: [],
                location: { type: 'Point', coordinates: [lng, lat] }
            };
            mockListings.unshift(newListing);
        }

        res.json({ success: true, listing: newListing });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to create listing record.' });
    }
});

// Bookings
app.get('/api/bookings', async (req, res) => {
    const { phone } = req.query;
    if (!phone) {
        return res.status(400).json({ success: false, message: 'Missing phone number parameter.' });
    }

    try {
        let bookings;
        if (isMongoConnected) {
            bookings = await Booking.find({ farmer_phone: phone }).sort({ created_at: -1 });
        } else {
            bookings = mockBookings.filter(b => b.farmer_phone === phone);
        }
        res.json({ success: true, bookings });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database fetch bookings error.' });
    }
});

app.post('/api/bookings', async (req, res) => {
    const { listing_id, listing_title, listing_type, farmer_phone, owner_name, price_amount, price_unit, dates } = req.body;

    if (!listing_id || !farmer_phone || !dates || dates.length === 0) {
        return res.status(400).json({ success: false, message: 'Missing parameters for booking.' });
    }

    try {
        let booking;
        let payment;
        const duration = listing_type === 'labor' ? 1 : dates.length;
        const totalAmount = price_amount * duration;
        const txnId = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

        if (isMongoConnected) {
            booking = new Booking({
                listing_id,
                listing_title,
                listing_type,
                farmer_phone,
                owner_name,
                price_amount,
                price_unit,
                dates
            });
            await booking.save();

            if (listing_type === 'machinery') {
                await Listing.findByIdAndUpdate(listing_id, {
                    $addToSet: { booked_dates: { $each: dates } },
                    availability_status: 'booked'
                });
            }

            payment = new Payment({
                booking_id: booking._id.toString(),
                farmer_phone,
                owner_name,
                listing_title,
                amount: totalAmount,
                status: 'Success',
                payment_method: 'UPI',
                transaction_id: txnId
            });
            await payment.save();
        } else {
            booking = {
                _id: 'mock_booking_' + Date.now(),
                listing_id,
                listing_title,
                listing_type,
                farmer_phone,
                owner_name,
                price_amount,
                price_unit,
                dates,
                created_at: new Date()
            };
            mockBookings.unshift(booking);

            const listing = mockListings.find(l => l._id === listing_id || l.id === listing_id);
            if (listing && listing_type === 'machinery') {
                if (!listing.booked_dates) listing.booked_dates = [];
                dates.forEach(d => listing.booked_dates.push(d));
                listing.availability_status = 'booked';
            }

            payment = {
                _id: 'mock_payment_' + Date.now(),
                booking_id: booking._id,
                farmer_phone,
                owner_name,
                listing_title,
                amount: totalAmount,
                status: 'Success',
                payment_method: 'UPI',
                transaction_id: txnId,
                created_at: new Date()
            };
            mockPayments.unshift(payment);
        }

        res.json({ success: true, booking, payment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database execution error for booking.' });
    }
});

// Payments history lookup
app.get('/api/payments', async (req, res) => {
    const { phone } = req.query;
    if (!phone) {
        return res.status(400).json({ success: false, message: 'Missing phone query parameter.' });
    }

    try {
        let payments;
        if (isMongoConnected) {
            payments = await Payment.find({ farmer_phone: phone }).sort({ created_at: -1 });
        } else {
            payments = mockPayments.filter(p => p.farmer_phone === phone);
        }
        res.json({ success: true, payments });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Database fetch payments error.' });
    }
});

// Start the Express server
app.listen(PORT, () => {
    console.log("AgriLabour server running at http://localhost:8000");
});

-- ============================================================================
-- AGRILABOUR POINT - DATABASE SCHEMA
-- ============================================================================
-- Optimized for lightweight rural connectivity, hyper-local GIS indexing, 
-- and relational skill-based rating systems.
-- Supports PostgreSQL with PostGIS extensions.
-- ============================================================================

-- Enable postgis extension for spatial distance calculations (10km hyper-local matching)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Drop tables in reverse dependency order if resetting
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS listings CASCADE;
DROP TABLE IF EXISTS laborer_skills CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS listing_type CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;

-- 1. Custom Types / Enums
CREATE TYPE user_role AS ENUM ('farmer', 'laborer', 'machinery_owner', 'both');
CREATE TYPE listing_type AS ENUM ('labor', 'machinery');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- 2. Users Table
-- Holds basic profile information, persists language selection and geolocation.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(15) UNIQUE NOT NULL,      -- Mobile number only (Dual-entry identifier)
    name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'farmer',
    preferred_language VARCHAR(5) DEFAULT 'en',   -- Toggling global settings ('en', 'hi', 'mr')
    geom GEOMETRY(Point, 4326) NOT NULL,          -- Coordinates for 10km radius searches
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index user geometry coordinates for geographic queries
CREATE INDEX idx_users_geom ON users USING GIST(geom);

-- 3. Skills Table (Skill match logic requirement)
-- Standard taxonomy of agricultural skills, localized in separate columns for lookup.
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag VARCHAR(50) UNIQUE NOT NULL,             -- Machine-readable tag (e.g. 'tractor_driving')
    name_en VARCHAR(100) NOT NULL,                -- "Tractor Driving"
    name_hi VARCHAR(100) NOT NULL,                -- "ट्रैक्टर ड्राइविंग"
    name_mr VARCHAR(100) NOT NULL                 -- "ट्रॅक्टर ड्रायव्हिंग"
);

-- 4. Laborer Skills (ManyToMany Relationship with experience)
CREATE TABLE laborer_skills (
    laborer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    experience_months INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (laborer_id, skill_id)
);

-- 5. Listings Table
-- Relational table matching labor services and machinery rental listings with location.
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type listing_type NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    price_amount DECIMAL(10, 2) NOT NULL,         -- Rate / wage field (Pricing transparency)
    price_currency VARCHAR(3) DEFAULT 'INR',      -- Currency transparency 
    price_unit VARCHAR(10) DEFAULT 'day',         -- Units: 'day', 'hour', 'acre'
    machinery_type VARCHAR(50),                   -- e.g. 'tractor', 'rotavator', 'harvester'
    availability_status VARCHAR(20) DEFAULT 'available', -- 'available' / 'booked'
    geom GEOMETRY(Point, 4326) NOT NULL,          -- Listing point for hyperlocal matching
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_listings_geom ON listings USING GIST(geom);
CREATE INDEX idx_listings_type ON listings(type);

-- 6. Booking Calendar Table (Availability and status tracking)
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status booking_status DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Reviews Table (Skill-based ratings requirement)
-- Allows rating laborers/owners on specific skills for precise profile evaluations.
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,     -- The farmer rating the laborer
    subject_id UUID REFERENCES users(id) ON DELETE CASCADE,    -- The laborer/owner being rated
    skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,    -- Evaluated skill (nullable for general)
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_subject ON reviews(subject_id);
CREATE INDEX idx_reviews_skill ON reviews(skill_id);

-- ============================================================================
-- MOCK SEED DATA SETUP
-- ============================================================================

-- Insert baseline skills
INSERT INTO skills (tag, name_en, name_hi, name_mr) VALUES
('tractor_driving', 'Tractor Driving', 'ट्रैक्टर ड्राइविंग', 'ट्रॅक्टर ड्रायव्हिंग'),
('harvesting', 'Harvesting', 'फसल की कटाई', 'कापणी'),
('spraying', 'Pesticide Spraying', 'कीटनाशक छिड़काव', 'फवारणी'),
('sowing', 'Seed Sowing', 'बीज बोना', 'पेरणी');

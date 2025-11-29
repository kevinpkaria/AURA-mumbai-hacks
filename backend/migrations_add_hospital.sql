-- Migration: Add Hospital model and hospital_id to User
-- Run this migration to update your database schema

-- Create hospitals table
CREATE TABLE IF NOT EXISTS hospitals (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    address VARCHAR,
    city VARCHAR NOT NULL,
    state VARCHAR,
    country VARCHAR NOT NULL DEFAULT 'India',
    phone VARCHAR,
    email VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on hospital name and city for faster lookups
CREATE INDEX IF NOT EXISTS ix_hospitals_name ON hospitals(name);
CREATE INDEX IF NOT EXISTS ix_hospitals_city ON hospitals(city);

-- Add hospital_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS hospital_id INTEGER;

-- Add foreign key constraint
ALTER TABLE users 
    ADD CONSTRAINT fk_users_hospital 
    FOREIGN KEY (hospital_id) 
    REFERENCES hospitals(id) 
    ON DELETE SET NULL;

-- Create index on hospital_id for faster queries
CREATE INDEX IF NOT EXISTS ix_users_hospital_id ON users(hospital_id);

-- Optional: Insert some sample hospitals for testing
-- INSERT INTO hospitals (name, city, state, country) VALUES
-- ('City General Hospital', 'Mumbai', 'Maharashtra', 'India'),
-- ('Metro Medical Center', 'Delhi', 'Delhi', 'India'),
-- ('Regional Health Institute', 'Bangalore', 'Karnataka', 'India');


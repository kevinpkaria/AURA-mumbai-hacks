-- AURA Database Setup Script
-- Run this with: psql -U postgres -f create_db.sql

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE aura_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'aura_db')\gexec

-- Connect to the database
\c aura_db

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: Tables will be created by Alembic migrations
-- Run: alembic upgrade head



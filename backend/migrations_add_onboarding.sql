-- Migration: Add onboarding_completed column to hospitals table
-- Run this with: psql -U postgres -d aura_db -f migrations_add_onboarding.sql

-- Add onboarding_completed column if it doesn't exist
ALTER TABLE hospitals 
ADD COLUMN IF NOT EXISTS onboarding_completed VARCHAR DEFAULT 'false';

-- Update existing hospitals to have 'false' if they're NULL
UPDATE hospitals 
SET onboarding_completed = 'false' 
WHERE onboarding_completed IS NULL;

-- Run this with: psql -U postgres -d aura_db -f migrations_add_onboarding.sql

-- Add onboarding_completed column if it doesn't exist
ALTER TABLE hospitals 
ADD COLUMN IF NOT EXISTS onboarding_completed VARCHAR DEFAULT 'false';

-- Update existing hospitals to have 'false' if they're NULL
UPDATE hospitals 
SET onboarding_completed = 'false' 
WHERE onboarding_completed IS NULL;

-- Run this with: psql -U postgres -d aura_db -f migrations_add_onboarding.sql

-- Add onboarding_completed column if it doesn't exist
ALTER TABLE hospitals 
ADD COLUMN IF NOT EXISTS onboarding_completed VARCHAR DEFAULT 'false';

-- Update existing hospitals to have 'false' if they're NULL
UPDATE hospitals 
SET onboarding_completed = 'false' 
WHERE onboarding_completed IS NULL;


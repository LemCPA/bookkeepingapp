-- Add business use percentage columns to users table
-- These store the default business use percentages for home and vehicle expenses

ALTER TABLE users
ADD COLUMN IF NOT EXISTS home_business_use_percentage INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS vehicle_business_use_percentage INTEGER DEFAULT 100;

-- Add constraints to ensure percentages are between 0-100
ALTER TABLE users
ADD CONSTRAINT home_business_use_percentage_range
  CHECK (home_business_use_percentage >= 0 AND home_business_use_percentage <= 100),
ADD CONSTRAINT vehicle_business_use_percentage_range
  CHECK (vehicle_business_use_percentage >= 0 AND vehicle_business_use_percentage <= 100);

-- Create index for faster lookups (optional, but good practice)
CREATE INDEX IF NOT EXISTS idx_users_business_percentages
ON users(id, home_business_use_percentage, vehicle_business_use_percentage);

-- Comment columns for documentation
COMMENT ON COLUMN users.home_business_use_percentage IS 'Home office business use percentage (0-100). Default 100% means entire home is business-related.';
COMMENT ON COLUMN users.vehicle_business_use_percentage IS 'Vehicle business use percentage (0-100). Default 100% means entire vehicle use is business-related.';

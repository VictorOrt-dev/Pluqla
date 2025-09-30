-- Migration: Add role field to User model
-- Date: 2024-12-01
-- Purpose: Fix missing role field for admin authentication

-- Add role column to users table
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_role ON users(role);

-- Update any existing users to have user role (if needed)
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Optional: Create first admin user (replace with real email)
-- UPDATE users SET role = 'admin' WHERE email = 'admin@pluqla.com';

-- Verify the migration
SELECT COUNT(*) as total_users, role, COUNT(*) as count_by_role
FROM users
GROUP BY role;
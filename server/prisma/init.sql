-- PostgreSQL Initialization Script for Pluqla
-- This script runs automatically when the Docker container is first created

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- Set timezone
SET timezone = 'UTC';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE pluqla_dev TO pluqla;

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS public;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO pluqla;
GRANT ALL ON SCHEMA public TO public;

-- Note: Tables will be created by Prisma migrations

-- Initial database setup for Sedori Platform
-- This script runs when PostgreSQL container starts for the first time

-- Ensure UTF-8 encoding
SET client_encoding = 'UTF8';

-- Create extensions that might be useful
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Log initialization
\echo 'Sedori Platform database initialized successfully!'
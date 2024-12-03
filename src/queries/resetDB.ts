import { get } from "http";
import { getDbPool } from "../service/databaseConnection.js";
import "dotenv/config";
import bcrypt from "bcrypt";

export async function executeSqlFile(): Promise<void> {
  try {
    // Connect to the PostgreSQL database
    console.log("Resetting database");
    await getDbPool().query(RemoveAll);
    console.log("Database successfully fully removed");
    console.log("Trying to run new database");
    await getDbPool().query(resetsql);
    console.log("SQL file executed successfully");
  } catch (err) {
    console.error("Error executing SQL file:", err);
  }
}

const hashedPassword = await bcrypt.hash("admin", 10);

const RemoveAll = `
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;
`;

const testreset = `
CREATE TABLE public."packages" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    score NUMERIC(3, 2) DEFAULT 0.25
);
`;

const resetsql = `
-- Begin transaction
BEGIN;

-- Drop tables if they exist to reset the database
DROP TABLE IF EXISTS package_dependencies CASCADE;
DROP TABLE IF EXISTS package_costs CASCADE;
DROP TABLE IF EXISTS package_history CASCADE;
DROP TABLE IF EXISTS package_ratings CASCADE;
DROP TABLE IF EXISTS package_data CASCADE;
DROP TABLE IF EXISTS package_metadata CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS authentication_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Recreate the schema
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY NOT NULL,
    name VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    isAdmin BOOLEAN NOT NULL DEFAULT FALSE,
    isBackend BOOLEAN NOT NULL DEFAULT FALSE
);
INSERT INTO users (name, password_hash, isAdmin, isBackend) VALUES ('James D', '${hashedPassword}', TRUE, TRUE);
-- ROLE VARCHAR(10) NOT NULL CHECK (ROLE IN ('BACKEND', 'ADMIN', 'DEVELOPER'))


-- Authentication tokens table
CREATE TABLE authentication_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    num_interactions INTEGER NOT NULL DEFAULT 0
);

-- Packages table
CREATE TABLE packages (
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    package_id VARCHAR(255) PRIMARY KEY NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    content_type BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE packages ADD CONSTRAINT unique_name_version UNIQUE (name, version);

-- Package metadata table
CREATE TABLE package_metadata (
    package_id VARCHAR(255) PRIMARY KEY NOT NULL,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    readme TEXT,
    UNIQUE(package_id)
);

-- Package data table
CREATE TABLE package_data (
    package_id VARCHAR(255) NOT NULL PRIMARY KEY REFERENCES packages(package_id) ON DELETE CASCADE,
    content_type BOOLEAN NOT NULL DEFAULT FALSE,
    url TEXT,
    debloat BOOLEAN NOT NULL DEFAULT FALSE,
    js_program TEXT,
    CHECK(URL IS NULL OR content_type = FALSE)
);

-- Package ratings table
CREATE TABLE package_ratings (
    package_id VARCHAR(255) PRIMARY KEY NOT NULL REFERENCES packages(package_id) ON DELETE CASCADE,
    bus_factor DOUBLE PRECISION DEFAULT -1,
    bus_factor_latency DOUBLE PRECISION,
    correctness DOUBLE PRECISION DEFAULT -1,
    correctness_latency DOUBLE PRECISION,
    ramp_up DOUBLE PRECISION DEFAULT -1,
    ramp_up_latency DOUBLE PRECISION,
    responsive_maintainer DOUBLE PRECISION DEFAULT -1,
    responsive_maintainer_latency DOUBLE PRECISION,
    license_score DOUBLE PRECISION DEFAULT -1,
    license_score_latency DOUBLE PRECISION,
    good_pinning_practice DOUBLE PRECISION DEFAULT -1,
    good_pinning_practice_latency DOUBLE PRECISION,
    pull_request DOUBLE PRECISION DEFAULT -1,
    pull_request_latency DOUBLE PRECISION,
    net_score DOUBLE PRECISION DEFAULT -1,
    net_score_latency DOUBLE PRECISION
);

-- Package history table
CREATE TABLE package_history (
    package_id VARCHAR(255) PRIMARY KEY NOT NULL,
    user_id INTEGER,
    action VARCHAR(10) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DOWNLOAD', 'RATE')),
    action_date TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Package costs table
CREATE TABLE package_costs (
    package_id VARCHAR(255) PRIMARY KEY NOT NULL,
    standalone_cost DOUBLE PRECISION,
    total_cost DOUBLE PRECISION,
    computed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Package dependencies table
CREATE TABLE package_dependencies (
    package_id VARCHAR(255) NOT NULL REFERENCES packages(package_id) ON DELETE CASCADE,
    dependency_package_id VARCHAR(255) NOT NULL REFERENCES packages(package_id) ON DELETE CASCADE,
    PRIMARY KEY (package_id, dependency_package_id)
);

-- Indexes
CREATE INDEX idx_packages_name ON packages(name);
CREATE INDEX idx_packages_package_id ON packages(package_id);
CREATE INDEX idx_package_history_package_id ON package_history(package_id);
CREATE INDEX idx_package_history_user_id ON package_history(user_id);
CREATE INDEX idx_package_metadata_package_id ON package_metadata(package_id);
CREATE INDEX idx_package_data_package_id ON package_data(package_id);
CREATE INDEX idx_package_ratings_package_id ON package_ratings(package_id);
CREATE INDEX idx_package_costs_package_id ON package_costs(package_id);

-- Add a full-text search index on the 'readme' column
CREATE INDEX idx_package_metadata_readme_ft ON package_metadata USING GIN (to_tsvector('english', readme));


-- Commit transaction
COMMIT;
`;

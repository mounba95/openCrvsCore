-- Up Migration
ALTER TABLE app.locations ADD COLUMN full_name text;

-- Down Migration
ALTER TABLE app.locations DROP COLUMN full_name;

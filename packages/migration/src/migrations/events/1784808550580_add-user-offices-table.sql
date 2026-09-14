-- Up Migration
CREATE TABLE IF NOT EXISTS user_offices(
  user_id uuid NOT NULL REFERENCES users(id),
  office_id uuid NOT NULL REFERENCES locations(id),
  PRIMARY KEY (user_id, office_id)
);

CREATE INDEX IF NOT EXISTS user_offices_office_id_idx ON user_offices(office_id);

-- Niger : chaque utilisateur existant garde son bureau actuel comme seule commune affectée (rétrocompatibilité).
INSERT INTO user_offices (user_id, office_id)
  SELECT id, office_id FROM users
  ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON user_offices TO ${EVENTS_DB_USER};

-- Down Migration
DROP TABLE user_offices;
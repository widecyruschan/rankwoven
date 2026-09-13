CREATE TABLE IF NOT EXISTS gateway_model_profiles (
  gateway varchar(40) NOT NULL CHECK (gateway = 'wenwen'),
  profile_key varchar(80) NOT NULL CHECK (profile_key IN (
    'text.default', 'text.high_quality', 'text.batch', 'embedding.default', 'image.default'
  )),
  model_id varchar(160) NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (gateway, profile_key)
);

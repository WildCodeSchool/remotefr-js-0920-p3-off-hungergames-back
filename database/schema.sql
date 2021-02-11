-- psql postgres -U me  -f schema.sql

-- CREATE DATABASE hunger_games_dev ;
-- \c hunger_games_dev;

-- Create function to update date
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create table insight
CREATE TABLE insight (
    ID SERIAL PRIMARY KEY,
    insight_id VARCHAR(37) NOT NULL,
    nb_true INTEGER DEFAULT 0,
    nb_false INTEGER DEFAULT 0,
    is_annotated BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- create trigger to insight
CREATE TRIGGER set_timestamp_insight
BEFORE UPDATE ON insight
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();


CREATE TABLE insight_keep (
    ID SERIAL PRIMARY KEY,
    insight_id VARCHAR(37) NOT NULL,
    annotate INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- create trigger to insight_keep
CREATE TRIGGER set_timestamp_insight_keep
BEFORE UPDATE ON insight_keep
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();


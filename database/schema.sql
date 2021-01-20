-- psql postgres -U me  -f schema.sql

CREATE DATABASE hunger_games_dev ;
\c hunger_games_dev;

-- Create function to update date
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

\df;

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

\dt;

-- create trigger 
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON insight
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
-- psql postgres -U me  -f schema.sql

CREATE DATABASE hunger_games_dev ;
\c hunger_games_dev;

CREATE TABLE insight (
    ID SERIAL PRIMARY KEY,
    insight_id VARCHAR(37) NOT NULL,
    nb_true INTEGER,
    nb_false INTEGER
);

\dt;


CREATE TABLE IF NOT EXISTS studies(
	id serial PRIMARY KEY,
	name text NOT NULL,
	start_date timestamp,
	end_date timestamp,
	created_at timestamp default current_timestamp NOT NULL
);
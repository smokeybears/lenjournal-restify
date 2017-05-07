CREATE TABLE IF NOT EXISTS sessions(
	id serial PRIMARY KEY,
	user_id int references users(id),
	session_id text NOT NULL UNIQUE,
	code varchar(5),
	valid boolean default false NOT NULL,
	expires timestamp NOT NULL,
	created_at timestamp default current_timestamp NOT NULL
);
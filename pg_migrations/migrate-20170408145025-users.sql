CREATE TABLE IF NOT EXISTS users(
	id serial PRIMARY KEY,
	-- size 20 just case we start accepting different types of phone numbers
	phonenumber VARCHAR(20) UNIQUE NOT NULL,
	firstname VARCHAR(50),
	lastname  VARCHAR(50),
	created_at timestamp default current_timestamp NOT NULL,
	delete_at timestamp
	);



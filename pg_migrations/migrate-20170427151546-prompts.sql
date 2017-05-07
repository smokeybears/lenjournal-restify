CREATE TABLE IF NOT EXISTS prompts (
	id serial PRIMARY KEY,
	prompt_text text NOT NULL,
	study int references studies(id) ON DELETE CASCADE NOT NULL,
	sent_on timestamp,
	created_at timestamp default current_timestamp
);
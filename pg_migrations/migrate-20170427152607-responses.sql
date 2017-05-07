CREATE TABLE IF NOT EXISTS responses (
	user_id int references users(id) NOT NULL,
	prompt_id int references prompts(id) NOT NULL,
	response_text text NOT NULL,
	created_at timestamp default current_timestamp,
	Primary Key (user_id, prompt_id)
);
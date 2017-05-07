let pg = require('pg')

const db = new pg.Pool({
	host: process.env.DB_HOST,
	port: 5432,
	password: process.env.DB_PASSWORD,
	user: process.env.DB_USER,
	database: process.env.DB_NAME,
	max: 10,
	idleTimeoutMillis: 30000
})
hppd:
db.on('error', err => {
	throw err 
})

let createUser = ({phone, firstName='', lastName=''}) => {
	return db.query('\
		insert into users (phonenumber, firstname, lastname)\
		values ($1, $2, $3)\
		RETURNING *', 
		[phone, firstName, lastName])
}

let findNumber = (phone) => {
	return db.query("SELECT * FROM users WHERE phonenumber = $1", [phone])
}

let getUsersByPhone = (phone) => {
	return db.query("SELECT * FROM users WHERE phonenumber = $1 LIMIT 1", [phone])
}

let getSession = (sessionID) => {
	return db.query("SELECT * FROM sessions \
		WHERE session_id = $1\
		ORDER BY expires DESC", [sessionID])
}

let setSessionValidation = (sessionID, valid) => {
	return db.query("UPDATE sessions \
		SET valid = $1 \
		WHERE session_id = $2",
		[valid, sessionID])
}


let upsertSession = ({sessionID: sessionID, code = null, valid = false, user_id = null}) => {	
	let expires = new Date()
	expires.setDate(expires.getDate() + 30)
	return db.query('INSERT INTO sessions\
		(code, session_id, expires, valid, user_id)\
		values ($1, $2, $3, $4, $5)\
		ON CONFLICT (session_id) DO UPDATE\
		SET\
			code = COALESCE(sessions.code, $1),\
			session_id = COALESCE(sessions.session_id, $2),\
			expires = COALESCE(sessions.expires, $3),\
			valid = COALESCE(sessions.valid, $4),\
			user_id = COALESCE(sessions.user_id, $5)\
		RETURNING *',
		[code, sessionID, expires, valid, user_id])
}


let removeSession = (sessionID) => {
	return db.query('\
		DELETE FROM sessions\
		WHERE session_id = $1',
		[sessionID])
}


let getStudyPrompts = (studyID) => {
	return db.query('\
		SELECT \
			prompt_text, \
			id\
		FROM prompts\
		where prompts.study = $1',
		[studyID]) 
}

let getUserStudies = ({userID}) => {
	return db.query('SELECT * FROM studies;')
}

let getResponse = ({userID, promptID}) => {
	return db.query('\
		SELECT\
			response_text\
		FROM\
		 responses\
		WHERE\
			user_id = $1 AND\
			prompt_id = $2',
			[userID, promptID])
}

let upsertResponse = ({responseText, userID, promptID}) => {
	return db.query('\
		INSERT INTO responses\
		(response_text, user_id, prompt_id)\
		values ($1, $2, $3)\
		ON CONFLICT (user_id, prompt_id) DO UPDATE\
		SET\
			response_text = $1,\
			user_id = $2,\
			prompt_id = $3\
		RETURNING *',
		[responseText, userID, promptID])
}

// -------- ADMIN ------- //
let createStudy = (name, startDate, endDates) => {
		return db.query('\
			INSERT INTO studies (name)\
			values ($1) RETURNING *',
			[name])
}

let createPrompt = (prompt, studyId, sentDate) => {
		return db.query('\
			INSERT INTO prompts (prompt_text, study, sent_on)\
			values ($1, $2, $3) RETURNING *',
			[prompt, studyId, sentDate])
}

let createResponse = (response_text, userId, promptId) => {
		return db.query('\
			INSERT INTO responses (response_text, user_id, prompt_id)\
			values ($1, $2, $3) RETURNING *',
			[response_text, userId, promptId])
}

module.exports = {
	upsertSession: upsertSession,
	createUser: createUser,
	getUsersByPhone: getUsersByPhone,
	getSession: getSession,
	setSessionValidation: setSessionValidation,
	createStudy: createStudy,
	createPrompt: createPrompt,
	createResponse: createResponse,
	getStudyPrompts: getStudyPrompts,
	getResponse: getResponse,
	upsertResponse: upsertResponse,
	getUserStudies: getUserStudies,
	removeSession: removeSession
}

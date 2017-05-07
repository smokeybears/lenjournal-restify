require('dotenv').config()
let restify = require('restify')
let server = require('./serverInit')
let dbInterface = require('./dbinterface')
let twilio = require('twilio')
var twilioClient = new twilio.RestClient(process.env.TWILIO_SID, process.env.TWILIO_KEY);

let getSession = (sessionID) => {
	return sessions[sessionID] = sessions[sessionID] || {}
}

let validatePhone = (req, res, next) => {
	if (!req.params.phone || req.params.phone.length < 10 || isNaN(req.params.phone)){
		res.json(new restify.InvalidArgumentError({
			body: {
				field: "Phone Number",
				message: "Phone number must be 10 digits", 
				error: true}
			}))
		return next(false)
	}
	return next()
}

let userExist = (req, res, next) => {
	return dbInterface.getUsersByPhone(req.params.phone)
	.then(query => {
		if (query.rows[0]) {
			dbInterface.upsertSession({sessionID: req.cookies['sessionID'], user_id: query.rows[0].id})
			res.json({userExist: true, userID: query.rows[0].id})
		} else {
			res.json({userExist: false})
		}	
		return next()
	})
}



let textUser = (to, body) => {
	return twilioClient.messages.create({
		body: body,
		to: `+1${to}`,
		from: '+16169652972'
	})
	.then((textConfirmation) => {
		let statusCode = textConfirmation.nodeClientResponse.statusCode
		if (100 <= statusCode && statusCode < 400) {
			return {success: true}
		} else if (400 <= statusCode && statusCode < 500) {
			return {
				success: false, 
				message: "I\'m sorry but we can\'t contact that phone number please email.."
			}
		} else if (500 < statusCode) {
			return {
				success: false,
				message: "Our phone provider is having issues"
			}
		}
	})
}

let generatePhoneValidation = (req, res, next) => {
	let code = Math.random().toString().slice(2, 6)
	dbInterface.upsertSession({sessionID: req.cookies['sessionID'], code: code})
	.then(query => {
		let status = textUser(
			req.params.phone, 
			`Len Journal Confirmation Code: ${query.rows[0].code}`)
		status["codeCreated"] = status.success
		res.json(status)
		return next()
	})
	.catch((err) => {
		console.log(err)
		res.json({codeCreated: false})
	})
	return next()
}

let verifyPhoneCode = (req, res, next) => {
	if (!req.cookies['sessionID']) {
		res.json({error: 'No sessinoID included in request'})
		return next()
	}
	return dbInterface.getSession(req.cookies['sessionID'])
	.then(query => {
		let session = query.rows[0]
		if (session.code == req.params.code && session.expires > new Date()){
			res.json({valid: true})
			// This could make a race condition
			dbInterface.setSessionValidation(req.cookies['sessionID'], true)
		} else {
			res.json({valid: false})
		}
	})
	.catch(err => {
		console.log(err)
		throw err
	})
	return next()
}

let createUser = (req, res, next) => {
	dbInterface.getSession(req.cookies['sessionID'])
	.then(query => {
		session = query.rows[0] 
		if (!session.valid) {
			res.json({error: 'Cannot create user with out verified phone'})
			return next()
		}
		return dbInterface.createUser(req.params)
	})
	.then(query => {
		if (query.constraint == 'users_phonenumber_key') {
			res.json({error: "User with that number already exist"})
		}
		dbInterface.upsertSession({sessionID: req.cookies['sessionID'], user_id: query.rows[0].id})
		res.json({user: query.rows[0]})
	})
	.catch(err => {
		console.log(err)
	})
	return next()
}

let validateSession = (req, res, next) => {
	dbInterface.getSession(req.cookies['sessionID'])
	.then(query => {
		let session = query.rows[0]
		if (!session || !session.valid || session.expires < new Date()){
			res.status(403)
			res.json({message: "Invalid or Expired Session", validSession: false})
		} else {
			req.userID = session.user_id
			next()
		}
	})
	.catch(err => {
		console.log(err)
	})
}

const endSession = (req, res, next) => {
	dbInterface.removeSession(req.cookies['sessionID'])
	.then(query => {
		res.json({loggedOut: true})
	})
	.catch(err => {
		console.log(err)
		res.json({loggedOut: false})
	})
	return next()
}


const getStudyPrompts = (req, res, next) => {
	dbInterface.getStudyPrompts(req.params.studyID)
	.then(query => {
		res.json(query.rows)
	})
	.catch(err => {
		console.log(err)
	})
	return next()
}

let validateUserSession = (req, res, next) => {
	console.log(`User Session: ${req.cookies['sessionID']}`)
	dbInterface.getSession(req.cookies['sessionID'])
	.then(query => {
		let session = query.rows[0]
		if (!session || !session.valid || session.expires < new Date() || !session.user_id || session.user_id != req.params.userID){
			res.status(403)
			res.json({message: "Invalid or Expired Session", validSession: false})
		} else {
			req.userID = session.user_id
			next()
		}
	})
	.catch(err => {
		console.log(err)
	})
}

// In the future users will be able to opt in and out of multiple studies
// currently all users are apart of all studies
const getStudies = (req, res, next) => {
	dbInterface.getUserStudies(req.params)
	.then(query => {
		res.json({studies: query.rows})
	})
	.catch(err => {
		console.log(err)
	})
	return next()
}

const getUserResponse = (req, res, next) => {
	dbInterface.getResponse(req.params)
	.then(query => {
		res.json({responseText: query.rows[0] ? query.rows[0].response_text : ''})
	})
	return next()
}

const updateUserResponse = (req, res, next) => {
	dbInterface.upsertResponse(req.params)
	.then(query => {
		res.json({responseText: query.rows[0] ? query.rows[0].response_text : ''})
	})
	return next()
}

server.get('/', (req, res, next) => {
	res.send('Hey There')		
	return next()
})

server.get('/users/exist/:phone', validatePhone, userExist)
server.put('/phone/verify', verifyPhoneCode)
server.del('/sessions', validateSession, endSession)
server.get('/sessions/authenticate', validateSession, (req, res, next) => {
	res.json({validSession: true, userID: req.userID})
	return next()
})
server.get('/studies/:studyID', validateSession, getStudyPrompts)
server.post('/users', validatePhone, createUser)
server.post('/phone/validation', validatePhone, generatePhoneValidation)
server.use(validateUserSession)
server.get('/users/:userID/studies', getStudies)
server.get('/users/:userID/prompts/:promptID/response', getUserResponse)
server.put('/users/:userID/prompts/:promptID/response', updateUserResponse)



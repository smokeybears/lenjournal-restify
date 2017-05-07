let restify = require('restify')
let CookieParser = require('restify-cookies')
let bunyan = require('bunyan')

let server = restify.createServer({
	certificate: false,
	name: 'Len Journal',
	version: '1.0.0'
	}, (sr) => {
		console.log("server created")
		console.log(sr)	
	})

server.use(restify.CORS({credentials: true}))
server.use(restify.bodyParser({mapParams: true}))
server.use(restify.queryParser())
server.use(CookieParser.parse)
server.on('after', restify.auditLogger({
	log: bunyan.createLogger({
		name: 'lenJournal Log',
		stream: process.stdout
	})
}))


server.on('InternalServer', (req, res, route, err) => {
	console.log(req, res, err)
	return res.send(err)
})


server.on('uncaughtException', (req, res, route, err) => {
	console.log(err)
	return res.send(err.code || 500, {
		code: 500,
		error_description: err.status || err.message || err.description || "Internal Server Error",
		req: req.body
	})
})

server.listen('8090', () => {
	console.log(`server ${server.name} running on ${server.url}`)
})

process.on('uncaughtException', (err) => {
	console.log(err)
})

module.exports = server

restify-token-auth
==================

Pending readme. (unfinished version)


# Baic use

	var restify = require('restify'),
		restifyToken = require('./libs/restify-token.js'),
		redis = require('./libs/redis.js'),

		server = restify.createServer({
			name    : 'API name',
			version : '0.0.1'
		});

	server.use(restify.queryParser());
	server.use(redis.load); //load redis to res.locals.redis #this gonna be changed soon

	//Token system authentication
	restifyToken.auth({s:server,r:restify});
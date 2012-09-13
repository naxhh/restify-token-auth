
var redis;

//Default OPTIONS
var	opt = {
	s: null, //Server OBJ
	r: null, //Restify obj
	db: null, //GET/SET valid DB object

	//Database keys and info
	dbData: {
		idApi: 'api:',
		token: 'token:',
		tokenExpire: 3600,
		secret: 'littleCats', //md5 secret Data
	},

	//Login routes
	routes: {
		getToken: {
			url: '/getToken/',
			id: 'appID',
			secret: 'secret',
		},
	},

	//Throttle data
	throttle: {
		burst: 1,
		rate: 1,
		overrides: {
			1 : {burst:10,rate:10},
		}
	},

	loginErr: {err:"login"},
};

auth = {
	/**
	 * Check api data
	 * @param  {Int}   	  apiID    The API ID
	 * @param  {String}   secret   Password
	 * @param  {Function} callback
	 */
	checkAPI : function(apiID, secret, callback) {
		redis.get(opt.dbData.idApi+apiID, function(err,pass) {
			if (pass != secret)
				callback('invalid');
			else
				callback();	
		});
	},

	/**
	 * Generate a token and saves it for 1 hour
	 * @param  {Int}   	  appID    The API ID
	 * @param  {String}   secret   Password of the APP
	 * @param  {Object}   Redis    A redis Object
	 * @param  {Function} callback
	 */
	getToken	: function(appID, secret, Redis, callback) {
		redis = (typeof redis == 'undefined') ? Redis : redis;

		this.checkAPI(appID, secret, function(err) {
			if (typeof err != 'undefined') {
				callback('invalid login');
				return;
			}

			var crypto = require('crypto'),
				md5 = crypto.createHash('md5'),
				time = (new Date()).getMilliseconds();
			
			md5.update(opt.dbData.secret+appID+time);
			token = md5.digest('hex');
			redis.set(opt.dbData.token+token, appID, function(err) {
				redis.expire(opt.dbData.token+token, opt.dbData.tokenExpire);
			});
			callback(undefined, token);
		});
	},


	/**
	 * Comprueba si un token es válido
	 * @param  {String}   token    Token a comprobar
	 * @param  {Object}   Redis    Objeto de BD
	 * @param  {Function} callback
	 */
	checkToken	: function(token, Redis, callback) {
		redis = (typeof redis == 'undefined') ? Redis : redis;

		redis.get(opt.dbData.token+token, function(err, appID) {
			if (err != null || appID == null) {
				callback('invalid token');return;
			}
			//ToDO: save statics for this id
			//console.log(appID);

			callback(undefined, appID);
		});
	}
};


var AppAuth = function(options) {
	
	opt = extend(opt,options);
	var s = opt.s,
		r = opt.r;

	s.get({path:opt.routes.getToken.url}, function(req,res,next) {
		auth.getToken(req.params[opt.routes.getToken.id], req.params.[opt.routes.getToken.secret], res.locals.redis, function(err, token) {
			if (typeof err != 'undefined')
				res.send(opt.loginErr); //invalid login
			else
				res.send({token:token}); //send token to the user
		});
	});

	//Check API authorization!
	s.use(function(req, res, next) {
		if (typeof req.params.token == 'undefined' ) {
			res.send(opt.loginErr); return; //no token? go to hell
		}
		auth.checkToken(req.params.token, res.locals.redis, function(err, appID) {
			if (typeof err != 'undefined')
				res.send(opt.loginErr);
			else  {
				req.username = appID; //Set req.username as APP id to throttle count
				next();
			}
		});
	});

	//Check Throttle
	s.use(r.throttle({
		burst: opt.throttle.burst,
		rate: opt.throttle.rate,
		username: true,
		overrides: opt.throttle.overrides,
	}));
}

exports.auth = AppAuth;

/**
 * Adds to ob1 the result from ob2
 * @param  {Object} ob1 Default options
 * @param  {Object} ob2 Custom options
 * @return {Object}      Result of options
 */
function extend(ob1, ob2){
  for (var key in ob2){
    if (ob2.hasOwnProperty(key))
      ob1[key] = ob2[key]
  }
  return ob1
}
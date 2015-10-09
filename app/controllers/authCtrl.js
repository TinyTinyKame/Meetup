var User   = require('../models/user.js');
var bcrypt = require('bcrypt');
var jwt    = require('jsonwebtoken');
var config = require('../config');

module.exports.unless = function (path, middleware) {
    return function(req, res, next) {
        if (path === req.path && 'POST' === req.method) {
	    return next();
        } else {
	    return middleware(req, res, next);
        }
    };
};

module.exports.login = function (req, res) {
    var promise = User.findOne({email: req.body.email}).exec();
    promise.addErrback(function (err) {
	if (err) {
	    return res.status(400).json('Something went wrong with login!');
	}
    });
    promise.then(function (user) {
	if (!user) {
	    return res.status(404).json('User not found');
	} else {
	    if (bcrypt.compareSync('!L#md54&' + req.body.password + '.C5d2:f7' + req.body.password + req.body.password, user.password)) {
		var data = {
		    _id: user._id,
		    name: user.name,
		    email: user.email,
		    gcmToken: user.gcmToken,
		    permission: user.permission
		}
		var token = jwt.sign(data, config.secret);
		return res.status(200).json({
                    loggedAs: user,
                    auth: token
		});
            } else {
		return res.status(403).json('Wrong password');
            }
	}
    });
};

module.exports.checkAuth = function (req, res, next) {
    var token = req.body.auth || req.headers['authorization'];
    if (token) {
	jwt.verify(token, config.secret, function (err, decoded) {
	    if (err) {
		return res.status(403).json('Wrong token');
	    } else {
		req.token = token;
		next();
	    }
	});
    } else {
	return res.status(401).json('Unauthorized');
    }
};

var User   = require('../models/user.js');
var bcrypt = require('bcrypt');
var jwt    = require('jsonwebtoken');
var config = require('../config');
var crypto = require('crypto');
var buffer = require('buffer');
var tools  = require('../tools');

module.exports.unless = function (paths, middleware) {
    return function(req, res, next) {
        if (tools.inArray(req.path, paths) && 'POST' === req.method) {
	    return next();
        } else {
	    return middleware(req, res, next);
        }
    };
};

module.exports.login = function (req, res) {
    var promise = User.findOne({email: req.body.email}).exec();
    var social  = '';
    if (req.body.social && req.body.social != '') {
        var decipher = crypto.createDecipher('aes-128-ecb', config.secret);
        chunks = []
        chunks.push( decipher.update( new Buffer(req.body.social, 'base64').toString('binary')) );
        chunks.push( decipher.final('binary') );
        var txt = chunks.join('');
        social = new Buffer(txt, 'binary').toString('utf-8');
	regex  = new RegExp(config.secret, 'g');
	social = social.replace(regex, '');
	social = social.split(':');
    }
    promise.then(function (user) {
	if (!user) {
	    return res.status(404).json('User not found');
	} else {
	    var data = {
                _id: user._id,
                name: user.name,
                email: user.email,
                gcmToken: user.gcmToken,
                permission: user.permission
            }
	    
	    if (social != '' || bcrypt.compareSync('!L#md54&' + req.body.password + '.C5d2:f7' + req.body.password + req.body.password, user.password)) {
		var token = jwt.sign(data, config.secret);
		return res.status(200).json({
                    loggedAs: user,
                    auth: token
		});
            } else {
		return res.status(403).json('Error login');
            }
	}
    }).catch(function (err) {
	if (err) {
	    console.error(err);
	    return res.status(400).json('Oops, something went wrong with login!');
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

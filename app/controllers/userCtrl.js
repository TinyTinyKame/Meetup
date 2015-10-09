var User     = require('../models/user');
var Location = require('../models/location');
var bcrypt   = require('bcrypt');
var jwt      = require('jsonwebtoken');
var config   = require('../config');

var UserRepository     = require('../repositories/user');
var LocationRepository = require('../repositories/location');

module.exports.getUsers = function (req, res) {
    var page  = 0;
    var limit = 50000;
    var query = new RegExp('.*', 'i');
    if (req.query.p) {
	page  = req.query.p * 10;
	limit = 10;
    }
    if (req.query.q) {
	query = new RegExp(req.query.q, 'i');
    }
    UserRepository.search(page, {name: query}, limit, function (err, users) {
	if (err) {
	    return res.status(400).json(err);
	}
	if (users) {
	    return res.status(200).json(users);
	} else {
	    return res.status(404).json('No users found');
	}
    });
};

module.exports.getUser = function (req, res) {
    return res.status(200).json(req.user);
};

module.exports.removeUser = function (req, res) {
    var user = req.user;
    var auth = jwt.decode(req.token);
    if (auth.permission === 'terminator') {
	UserRepository.remove(params, function (err, user) {
	    if (err) {
                return res.status(404).json(err);
	    }
	    if (user) {
                return res.status(200).json(user);
	    } else {
                return res.status(404).json('User ' + req.params.user_id + ' not found');
	    }
	});
    } else {
	return res.status(403).json('Forbidden');
    }
};

var setParamsForUser = function (req) {
    var pass   = '';
    if (req.body.password) {
        var salt = bcrypt.genSaltSync(12);
        pass     = '!L#md54&' + req.body.password + '.C5d2:f7' + req.body.password + req.body.password;
        pass     = bcrypt.hashSync(pass, salt);
    } else {
	return 'No password sent';
    }
    var user = {
        name : req.body.name,
        password : pass,
        email : req.body.email,
        gcmToken: req.body.gcmToken,
        photoUrl: req.body.photoUrl,
	description: req.body.description
    };
    return user;
};

module.exports.createUser = function (req, res) {
    var new_user = setParamsForUser(req);
    var promise  = User.findOne({email: req.body.email}).exec();

    promise.addErrback(function (err) {
	if (err) {
	    return res.status(400).json(err);
	}
    });
    promise.then(function (user) {
	if (user) {
	    return res.status(409).json('Email already exists');
	} else {
	    UserRepository.create(new_user, function (err, user) {
		if (err) {
		    return res.status(400).json(err);
		}
		if (user) {
		    var data = {
			_id: user._id,
			name: user.name,
			email: user.email,
			gcmToken: user.gcmToken,
			permission: user.permission
                    }
		    var token = jwt.sign(data, config.secret, { expiresInMinutes: 1440 });
		    return res.status(201).json({
			loggedAs: user,
			auth: token
		    });
		}
	    });
	}
    });
};

module.exports.updateUser = function (req, res) {
    var auth = jwt.decode(req.token);
    var updated_user = {
	name: req.body.name,
	email: req.body.email,
	gcmToken: req.body.gcmToken,
	photoUrl: req.body.photoUrl,
	description: req.body.description
    };
    User.findOneAndUpdate({_id: auth._id}, updated_user, {new: true}, function (err, user) {
	if (err) {
	    return res.status(400).json('Something went wrong with updateUser');
	}
	if (!user) {
	    return res.status(404).json('User not found');
	} else {
	    return res.status(201).json(user);
	}
    });
};

module.exports.setLocation = function (req, res) {
    if (!req.body.latitude) {
	return res.status(400).json('No latitude');
    }
    if (!req.body.longitude) {
	return res.status(400).json('No longitude');
    }
    var auth    = jwt.decode(req.token);
    var promise = User.findOne({_id: auth._id}).exec();
    promise.addErrback(function (err) {
	if (err) {
	    return res.status(404).json('User not found');
	}
    });
    promise.then(function (user) {
	user.latitude  = req.body.latitude;
	user.longitude = req.body.longitude;
	user.save(function (err, saved) {
	    if (err) {
		return res.status(400).json('Error saving user');
	    }
	    if (saved) {
		return res.status(201).json(saved);
	    }
	});
    });
};

module.exports.addItinerary = function (req, res) {
    var user     = req.user;
    var location = req.location;
    var params   = {
	location: location._id,
	detail: req.body.detail,
	travelMode: req.body.travelMode
    };
    var promise  = User.findOne({_id: user._id}).exec();
    promise.addErrback(function (err) {
	if (err) {
	    return res.status(404).json('User not found');
	}
    });
    promise.then(function (user) {
	user.itineraries.push(params);
	user.save(function (err, user) {
	    if (err) {
		return res.status(400).json(err);
	    }
	    if (user) {
		User.populate(
		    user,
		    {path: 'friends itineraries'},
		    function (err, user) {
			if (err) {
			    return res.status(400).json(err);
			}
			if (user) {
			    return res.status(201).json(user);
			}
		    }
		);
	    }
	});
    });
};

module.exports.getUserHistoryLocations = function (req, res) {
    var user = req.user;
    Location.find({
	creator: user._id
    }, function (err, locations) {
	if (err) {
	    return res.status(400).json('Error finding user locations');
	}
	if (!locations) {
	    return res.status(404).json('User has not created any location');
	} else {
	    return res.status(200).json(locations);
	}
    });
};

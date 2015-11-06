var User     = require('../models/user');
var Location = require('../models/location');
var Event    = require('../models/event');
var bcrypt   = require('bcrypt');
var jwt      = require('jsonwebtoken');
var config   = require('../config');
var crypto   = require('crypto');
var buffer   = require('buffer');
var gcm      = require('node-gcm');

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
	    console.error(err);
	    return res.status(400).json('Error while searching');
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
	UserRepository.remove({ _id: user._id }, function (err, user) {
	    if (err) {
		console.error(err);
                return res.status(400).json('Error while deleting user');
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
    var user = {
        name : req.body.name,
        email : req.body.email,
        gcmToken: req.body.gcmToken,
        photoUrl: req.body.photoUrl,
        description: req.body.description
    };
    if (req.body.social) {
	var decipher = crypto.createDecipher('aes-128-ecb', config.secret);	
	chunks = []
	chunks.push( decipher.update( new Buffer(req.body.social, "base64").toString("binary")) );
	chunks.push( decipher.final('binary') );
	var txt = chunks.join("");
	social  = new Buffer(txt, "binary").toString("utf-8");
	social  = new Buffer(txt, 'binary').toString('utf-8');
	regex   = new RegExp(config.secret, 'g');
        social  = social.replace(regex, '');
        social  = social.split(':');
	if (social[0] !== 'SUCCESS') {
	    return 'Error with social login';
        }
    } else if (req.body.password) {
        var salt = bcrypt.genSaltSync(12);
        pass     = '!L#md54&' + req.body.password + '.C5d2:f7' + req.body.password + req.body.password;
        pass     = bcrypt.hashSync(pass, salt);
	user.password = pass;
    } else {
	return 'No password';
    }
    return user;
};

module.exports.createUser = function (req, res) {
    var new_user = setParamsForUser(req);
    var promise  = User.findOne({email: req.body.email}).exec();
    
    if (typeof new_user == 'string') {
	return res.status(400).json(new_user);
    } else {
	promise.then(function (user) {
	    if (user) {
		return res.status(409).json('Email already exists');
	    } else {
		return user;
	    }
	}).then(function (user) {
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
		    var token = jwt.sign(data, config.secret);
		    return res.status(201).json({
			loggedAs: user,
			auth: token
		    });
		}
	    });
	}).catch(function (err) {
	    console.error(err);
	    return res.status(err.status).json('Oops, something went wrong with createUser');
	});
    }
};

module.exports.updateUser = function (req, res) {
    var auth = jwt.decode(req.token);
    var updated_user = { };
    if (req.body.name) {
	updated_user.name = req.body.name;
    }
    if (req.body.email) {
	updated_user.email = req.body.email;
    }
    if (req.body.photoUrl) {
	updated_user.photoUrl = req.body.photoUrl;
    }
    if (req.body.description) {
	updated_user.description = req.body.description;
    }
    var promise = User.findOneAndUpdate({_id: auth._id}, updated_user, {new: true}).exec();
    promise.then(function (user) {
	if (!user) {
	    return res.status(404).json('User not found');
	} else {
	    return res.status(201).json(user);
	}
    }).catch(function (err) {
	if (err) {
	    console.error(err);
	    return res.status(400).json('Oops, something went wrong with updateUser');
	}
    });
};

module.exports.setUserLocation = function (req, res) {
    if (!req.body.latitude) {
	return res.status(400).json('No latitude');
    }
    if (!req.body.longitude) {
	return res.status(400).json('No longitude');
    }
    var auth    = jwt.decode(req.token);
    var promise = User.findOne({_id: auth._id}).exec();
    promise.then(function (user) {
	if (!user) {
	    return res.status(404).json('No such user');
	} else {
	    user.latitude  = req.body.latitude;
	    user.longitude = req.body.longitude;
	    return user.save();
	}
    }).then(function (save) {
	if (save) {
	    return {
		event: Event.find({'users.user': save._id}).populate('users.user').exec(),
		user : save
	    };
	}
    }).then(function (result) {
	result.event.then(function (events) {
	    var gcmTokens = [];
	    if (events.length > 0) {
		events.forEach(function (event) {
		    event.users.forEach(function (user) {
			if (!user.user.equals(result.user._id)) {
			    gcmTokens = gcmTokens.concat(user.user.gcmToken);
			}
		    });
		});
	    }
	    if (gcmTokens.length > 0) {
		var message   = new gcm.Message();
		var sender    = new gcm.Sender('AIzaSyBzbVdR8YZ2I0xvGnRfjbq_s3kLzOswEnk');
		message.addData({newLocation: result.user});
		sender.send(message, { registrationIds: gcmTokens }, function (err, result) {
                    if (err) {
			console.error(err);
                    } else {
			console.log(result);
                    }
		});
	    }
	    return res.status(201).json(result.user);
	}).catch(function (err) {
	    if (err) {
		console.error(err);
		return res.status(400).json('Error searching for events');
	    }
	});
    }).catch(function (err) {
	if (err) {
	    console.error(err);
	    return res.status(400).json('Oops, something went wrong with setLocation');
	}
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
    promise.then(function (user) {
	user.itineraries.push(params);
	return user.save();
    }).then(function (save) {
	return User.populate(save, {path: 'friends itineraries'});
    }).then(function (populated) {
	if (populated) {
	    return res.status(201).json(populated);
	}
    }).catch(function (err) {
	if (err) {
	    console.error(err);
	    return res.status(400).json('Error while populating');
	}
    });
};

module.exports.updateItinerary = function (req, res) {
    return;
};

module.exports.getUserHistoryLocations = function (req, res) {
    var user        = req.user;
    var userHistory = Location.find({creator: user._id}).exec();

    userHistory.then(function (locations) {
	if (!locations) {
	    return res.status(404).json('User has not created any location');
	} else {
	    return res.status(200).json(locations);
	}
    }).catch(function (err) {
	if (err) {
	    console.error(err);
	    return res.status(400).json('Error finding user locations');
	}
    });
};

module.exports.removeGCMToken = function (req, res) {
    var auth    = jwt.decode(req.token);
    var promise = User.findOne({ _id: auth._id }).exec();

    promise.then(function (user) {
	if (!user) {
	    return res.status(404).json('User not found');
	} else {
	    user.gcmToken.pull(req.body.gcmToken);
	    return user.save();
	}
    }).then(function (saved) {
	return res.status(201).json(saved);
    }).catch(function (err) {
	if (err) {
	    console.error(err);
	    return res.status(400).json('Oops, something went wrong with removeGCMToken');
	}
    });
};

module.exports.addGCMToken = function (req, res) {
    var auth    = jwt.decode(req.token);
    var promise = User.findOneAndUpdate(
	{ _id: auth._id },
	{ $push: {gcmToken: req.body.gcmToken}},
	{ new: true}
    ).exec();

    promise.then(function (user) {
        if (!user) {
            return res.status(404).json('User not found');
        } else {
	    return res.status(201).json(user);
	}
    }).catch(function (err) {
	if (err) {
	    console.error(err);
	    return res.status(400).json('Oops, something went wrong with addGCMToken');
	}
    });
};
var Event    = require('../models/event');
var User     = require('../models/user');
var Location = require('../models/location');
var jwt      = require('jsonwebtoken');
var gcm      = require('node-gcm');
var tools    = require('../tools');

var EventRepository    = require('../repositories/event');
var LocationRepository = require('../repositories/location');
var UserRepository     = require('../repositories/user');

module.exports.getEvents = function (req, res) {
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
    EventRepository.search({name: query}, page, limit, function (err, events) {
	if (err) {
	    return res.status(400).json(err);
	}
	if (events) {
	    return res.status(200).json(events);
	} else {
	    return res.status(404).json('No events found');
	}
    });
};

module.exports.getUserEvents = function (req, res) {
    var page  = 0;
    var limit = 50000;
    if (req.query.p) {
        page  = req.query.p * 10;
        limit = 10;
    }
    var pevents = Event
	.find({ 'users.user': req.user._id})
	.sort('-created_at')
	.skip(page)
	.limit(limit)
	.populate('admin users.user messages locations messages.author')
	.exec();
    pevents.then(function (events) {
        if (events) {
	    return Event.populate(events, { path: 'messages.author', model: 'User' });
	} else {
	    return res.status(404).json('No events found');
	}
    }).then(function (events_pop) {
	return res.status(200).json(events_pop);
    }).catch(function (err) {
	if (err) {
	    console.error(err);
	    return res.status(400).json('Oops, something went wrong with getUserEvents');
	}
    });
};

module.exports.getEventUsers = function(req, res) {
    var event = req.event;
    var page  = 0;
    var limit = 50000;
    if (req.query.p) {
        page  = req.query.p * 10;
        limit = 10;
    }
    var users = [];
    event.users.forEach(function (user) {
	users.push(user.user);
    });
    UserRepository.search(page, {_id: {$in: users}}, limit, function (err, users) {
	if (err) {
	    return res.status(400).json(err);
	}
	if (users) {
	    return res.status(200).json(users);
	} else {
	    return res.status(404).json('No users for this event');
	}
    });
};

module.exports.createOrUpdateEvent = function (req, res) {
    var auth = jwt.decode(req.token);
    var params = {
	place: req.body.place,
        address: req.body.address,
        longitude: req.body.longitude,
        latitude: req.body.latitude,
	creator: auth._id
    };
    var promise = Location.findOneAndUpdate(
	params,
	params,
	{new: true, upsert: true}
    ).exec();
    promise.then(function (location) {
	var query = {
	    name: req.body.name,
            type: req.body.type,
            admin: auth._id
	};
	params = {
	    name: req.body.name,
            type: req.body.type,
	    category: req.body.category,
            locations: location._id,
            date: new Date(req.body.date).getTime(),
	    description: req.body.description,
            admin: auth._id,
	    users: [
		{
		    user: auth._id,
		    status: 'Accepted'
		}
	    ]
	};
	return Event
	    .findOneAndUpdate(query, params,{new: true, upsert: true})
	    .populate('admin users.user locations messages')
	    .exec();
    }).then(function (event) {
	return res.status(201).json(event);
    }).catch(function (err) {
	if (err) {
	    console.error(err);
	    return res.status(400).json('Oops, something went wront with createOrUpdateEvent');
	}
    });
};

module.exports.deleteEvent = function (req, res) {
    var event = req.event;
    var auth  = jwt.decode(req.token);
    if (auth._id == event.admin) {
	event.remove(function (err) {
	    if (err) {
		return res.status(400).json(err);
	    }
	    return res.status(200).json('Event deleted');
	});
    } else {
	return res.status(403).json('Forbidden');
    }
};

module.exports.inviteUsers = function (req, res) {
    var event           = req.event;
    var users_to_invite = req.body.users;
    var users           = [];
    var gcmTokens       = [];
    
    if (users_to_invite.length > 0) {
	event.users.forEach(function (user) {
	    if (!tools.inArray(user.user._id, users_to_invite)) {
		users.push(
		    {
			user: user.user._id,
			status: 'Pending'
		    }
		);
		gcmTokens = gcmTokens.concat(user.user.gcmToken);
	    }
	});
	
	if (users.length > 0) {
	    event.users = event.users.concat(users);
	    var promise = event.save();
	    promise.then(function (event) {
		return Event.populate(event, {path: 'users.user', model: 'User'});
	    }).then(function (event_pop) {
		var message   = new gcm.Message();
		var sender    = new gcm.Sender('AIzaSyBzbVdR8YZ2I0xvGnRfjbq_s3kLzOswEnk');
		var data      = event_pop;
		delete data.messages;
		delete data.users;
		message.addData({eventInvites: data});
		sender.send(message, { registrationIds: gcmTokens }, function (err, result) {
                    if (err) {
			console.error(err);
                    } else {
			console.log(result);
                    }
		});
		return res.status(201).json(event_pop);
            }).catch(function (err) {
		if (err) {
		    console.error(err);
		    return res.status(400).json('Oops, something went wrong with inviteUsers');
		}
            });
	}
    } else {
	return res.status(200).json('No invites');
    }
};

module.exports.addUser = function (req, res) {
    var event        = req.event;
    var user_to_add  = req.user;
    var found        = false;

    event.users.forEach(function (user, index) {
	if (user.user._id.equals(user_to_add._id)) {
	    found = true;
	    console.log(event);
	    event.users[index].status = "Accepted";
	    event.save().then(function (event) {
		console.log("test");
		return res.status(201).json(event);
	    }).catch(function (err) {
		if (err) {
		    console.error(err);
		    return res.status(400).json('Oops, something went wrong with addUser');
		}
	    });
	}
    });

    if (!found) {
	event.users.push({
	    user: user_to_add._id	    
	});
	event.save().exec().then(function (event) {
	    return Event.populate(event, {path: 'users.user'}).exec();
	}).then(function (event_pop) {
	    return res.status(201).json(event_pop);
	}).catch(function (err) {
	    if (err) {
		console.error(err);
		return res.status(400).json('Oops, something went wrong with addUser');
	    }
	});
    }
};

module.exports.denyInvite = function (req, res) {
    var event     = req.event;
    var deny_user = req.user;
    var promise   = Event.findOneAndUpdate(
	{_id: event._id},
	{$pull: {users: {user: deny_user._id}}},
	{new: true}
    ).exec();

    promise.then(function (event) {
	return res.status(200).json(event);
    }).catch(function (err) {
	if (err) {
	    console.error(err);
	    return res.status(400).json('Oops, something went wrong with denyInvite');
	}
    });
};
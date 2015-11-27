var Event    = require('../models/event');
var User     = require('../models/user');
var Location = require('../models/location');
var jwt      = require('jsonwebtoken');
var gcm      = require('node-gcm');
var tools    = require('../tools');

var EventRepository    = require('../repositories/event');
var LocationRepository = require('../repositories/location');
var UserRepository     = require('../repositories/user');

//Get all events with some parameters
//p: page
//limit: number of events by page
//can search by category, name or _id
module.exports.getEvents = function (req, res) {
    var page  = 0;
    var limit = 50000;
    var query = {
	name: new RegExp('.*', 'i')
    };
    if (req.query.p) {
        page  = req.query.p * 10;
        limit = 10;
    }
    if (req.query.name) {
	query.name = new RegExp(req.query.name, 'i');
    }
    if (req.query.category) {
	query.category = new RegExp(req.query.category, 'i');
    }
    if (req.query._id) {
	query._id = req.query._id;
    }
    EventRepository.search(query, page, limit, function (err, events) {
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

//Get all events of a user
module.exports.getUserEvents = function (req, res) {
    var page  = 0;
    var limit = 50000;
    if (req.query.p) {
        page  = req.query.p * 10;
        limit = 10;
    }
    var pevents = Event
	.find({ 'users.user': req.user._id})
	.sort({date: -1})
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

//Get all users of an event
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
    var pusers = User
	.find({ _id: {$in: users}})
	.sort({name: 1})
        .skip(page)
        .limit(limit)
        .populate('admin users.user messages locations messages.author')
	.exec();
    pusers.then(function (users) {	
	if (users) {
	    return res.status(200).json(users);
	} else {
	    return res.status(404).json('No users for this event');
	}
    }).catch(function (err) {
	if (err) {
	    return res.status(400).json('Oops, something went wrong with getEventUsers');
	}
    });
};

//Create or update an event
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
    //parameters for location, if it exists, we get it or create it if it doesn't
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
	//if event exists, we update it or just create it if not
	return Event
	    .findOneAndUpdate(query, params,{new: true, upsert: true, runValidators: true})
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

//Delete an event, only the admin of the event can do it
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

//Invite users to an event
module.exports.inviteUsers = function (req, res) {
    var event           = req.event;
    var users_to_invite = req.body.users;
    var users           = [];
    var gcmTokens       = [];
    var event_users     = [];
    
    //check if invitees is already in event
    if (users_to_invite.length > 0) {
	event.users.forEach(function (user) {
	    event_users.push(user.user._id);
	});
	users_to_invite.forEach(function (invitees) {
	    if (!tools.inArray(invitees._id, event_users)) {
		users.push(
		    {
			user: invitees._id,
			status: 'Pending'
		    }
		);
		gcmTokens = gcmTokens.concat(invitees.gcmToken);
	    }
	});
	// if some people are not in the event, we add them to the event with
	// status pending and send them a notification
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

//Add a user to an event
module.exports.addUser = function (req, res) {
    var event        = req.event;
    var user_to_add  = req.user;
    var found        = false;

    //check if user is inside event or not, if it is, just change the status
    event.users.forEach(function (user, index) {
	if (user.user._id.equals(user_to_add._id)) {
	    found = true;
	    event.users[index].status = "Accepted";
	    event.save().then(function (event) {
		return res.status(201).json(event);
	    }).catch(function (err) {
		if (err) {
		    console.error(err);
		    return res.status(400).json('Oops, something went wrong with addUser');
		}
	    });
	}
    });

    //if user is not found as a user, then we push a new one
    //that's mostly used when people want to get in an event
    if (!found) {
	event.users.push({
	    user: user_to_add._id,
	});
	event.save().then(function (event) {
	    console.log(event);
	    return event.populate('users.user').execPopulate();
	}).then(function (event_pop) {
	    console.log(event_pop);
	    return res.status(201).json(event_pop);
	}).catch(function (err) {
	    if (err) {
		console.error(err);
		return res.status(400).json('Oops, something went wrong with addUser');
	    }
	});
    }
};

//Deny invitations
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

//Get events from around my location
//It uses 2 points that are used to define the zone
module.exports.searchAroundMe = function (req, res) {
    var found_loc = [ ];
    var promise   = Location
	.find(
	    {
		latitude: {
		    $gt: req.query.p2lat,
		    $lt: req.query.p1lat
		},
		longitude: {
		    $gt: req.query.p2lng,
		    $lt: req.query.p1lng
		}
	    }
	).exec();
    //get location around me, with 2 points
    promise.then(function (locations) {
	if (locations) {
	    locations.forEach(function (location) {
		found_loc.push(location._id);
	    });
	    return Event
		.find({locations: { $in: found_loc }})
		.populate('locations admin users.user')
		.exec();
	} else {
	    throw new Error('No location found');
	}
    }).then(function (events) {
	//get all events with these locations
	var ret           = { };
	var formatted_ret = [];
	if (events) {
	    events.forEach(function (event) {
		if (ret[event.locations[0]._id] === undefined) {
		    ret[event.locations[0]._id] = [ ];
		}
		ret[event.locations[0]._id].push(
		    {
			_id: event._id,
			name: event.name,
			category: event.category,
			locations: event.locations[0],
			admin: event.admin,
			date: event.date,
			users: event.users
		    }
		);
	    });
	    
	    found_loc.forEach(function (location) {
		formatted_ret.push(ret[location]);
	    });

	    return res.status(200).json(formatted_ret);
	} else {
	    return res.status(404).json('No event found');
	}
    }).catch(function (err) {
	if (err) {
	    console.error(err);
	    if (err.message.match(/No location found/)) {
		return res.status(404).json(err.message);
	    } else {
		return res.status(400).json('Oops, something went wrong with searchAroundMe');
	    }
	}
    });
};
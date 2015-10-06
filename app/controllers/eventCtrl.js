var Event    = require('../models/event');
var User     = require('../models/user');
var Location = require('../models/location');
var jwt      = require('jsonwebtoken');

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
    Event.find({'users.user': req.user._id}, function (err, events) {
        if (err) {
	    return res.status(400).json(err);
	}
        if (events) {
	    return res.status(200).json(events);
	} else {
	    return res.status(404).json('User ' + req.user._id + ' is in no events');
	}
    }).skip(page).limit(limit).populate('admin users.user messages locations messages.author').exec();
};

module.exports.getEventUsers = function(req, res) {
    var event = req.event;
    var page  = 0;
    var limit = 50000;
    if (req.query.p) {
        page  = req.query.p * 10;
        limit = 10;
    }
    UserRepository.search(page, {_id: {$in: event.users.user}}, limit, function (err, users) {
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
        latitude: req.body.latitude
    };
    LocationRepository.findOrCreateLocation(params, function (err, location) {
	if (err) {
	    return res.status(400).json(err);
	}
	if (!location) {
	    return res.status(404).json('Location not found');
	} else {
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
                date: req.body.date,
		description: req.body.description,
                admin: auth._id
	    };
	    EventRepository.findOrCreateEvent(query, params, function(err, event) {
		if (err) {
		    return res.status(400).json(err);
		}
		if (event) {
		    event.users.push({
			user: auth._id,
			writing: true
		    });
		    event.save(function (err, event) {
			if (err) {
			    return res.status(400).json(err);
			}
		    }).then(function (event) {
			Event.populate(
			    event,
			    {path: 'admin users.user locations messages messages.author'},
			    function (err, event) {
				if (err) {
				    return res.status(400).json(err);
				}
				if (event) {
				    return res.status(201).json(event);
				}
			    }
			);
		    });
		} else {
		    return res.status(404).json('Event not found');
		}
	    });
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

module.exports.addUser = function (req, res) {
    var event        = req.event;
    var user_to_add  = req.user;
    var found        = false;

    event.users.forEach(function (user) {
	if (user.user._id.equals(user_to_add._id)) {
	    found = true;
	    return res.status(409).json('User already in event');
	}
    });

    if (!found) {
	event.users.push({
	    user: user_to_add._id
	});
	event.save(function (err, event) {
	    if (err) {
		return res.status(400).json(err);
	    }
	    Event.populate(
		event,
		{path: 'users.user'},
		function (err, event) {
		    if (err) {
			return res.status(400).json(err);
		    }
		    if (event) {
			return res.status(201).json(event);
		    }
		}
	    );
	});
    }
};

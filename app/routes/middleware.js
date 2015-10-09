var User     = require('../models/user');
var Location = require('../models/location');
var Event    = require('../models/event');
var Message  = require('../models/message');

module.exports = function (app) {
    app.param('user_id', function (req, res, next, user_id) {
	User.findById(user_id, function (err, user) {
	    if (err) {
                return next(err);
	    }
	    if (!user) {
                return next(new Error('No user found'));
	    }
	    User.populate(user, {path: 'friends.user itineraries.location'}, function (err, user) {
		if (err) {
		    return next(err);
		}
		if (user) {
		    req.user = user;
		    next();
		}
	    });
	});
    });
    app.param('location_id', function (req, res, next, location_id) {
	Location.findById(location_id, function (err, location) {
            if (err) {
                return next(err);
            }
            if (!location) {
                return next(new Error('No location found'));
            }
            req.location = location;
            next();
        });
    });
    app.param('event_id', function (req, res, next, event_id) {
	Event.findById(event_id, function (err, event) {
	    if (err) {
		return next(err);
	    }
	    if (!event) {
		return next(new Error('No event found'));
	    }
	    var promise = Event.populate(event, {path: 'admin locations messages users.user'});
	    promise.addErrback(function (err) {
		if (err) {
		    return next(err);
		}
	    });
	    promise.then(function (event) {
		if (event) {
		    req.event = event;
		    next();
		}
	    });
	});
    });
    app.param('friend_id', function (req, res, next, friend_id) {
	User.findById(friend_id, function(err, friend) {
            if (err) {
                return next(err);
            }
            if (!friend) {
                return next(new Error('No user found'));
            }
	    User.populate(friend, {path: 'friends itineraries.location'}, function (err, friend) {
                if (err) {
                    return next(err);
                }
                if (friend) {
                    req.friend = friend;
                    next();
                }
            });
        });
    });
};

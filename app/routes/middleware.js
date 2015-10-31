var User     = require('../models/user');
var Location = require('../models/location');
var Event    = require('../models/event');
var Message  = require('../models/message');

module.exports = function (app) {
    app.param('user_id', function (req, res, next, user_id) {
	User.findById(user_id).exec().then(function (user) {
	    if (!user) {
                return next(new Error('No user found'));
	    } else {
		return User.populate(user, {path: 'friends.user itineraries.location'});
	    }
	}).then(function (user_pop) {
	    req.user = user_pop;
	    next();
	}).catch(function (err) {
	    if (err) {
		console.error(err);
		return next(err);
	    }
	});
    });
    app.param('location_id', function (req, res, next, location_id) {
	Location.findById(location_id).exec().then(function (location) {
            if (!location) {
                return next(new Error('No location found'));
            } else {
		req.location = location;
		next();
	    }
        }).catch(function (err) {
	    if (err) {
		console.error(err);
		return next(err);
	    }
	});
    });
    app.param('event_id', function (req, res, next, event_id) {
	Event.findById(event_id).exec().then(function (event) {
	    if (!event) {
		return next(new Error('No event found'));
	    } else {
		return Event.populate(event, {path: 'admin locations messages users.user'});
	    }
	}).then(function (event_pop) {
	    req.event = event_pop;
	    next();
	}).catch(function (err) {
	    if (err) {
		console.error(err);
		return next(err);
	    }
	});
    });
    app.param('friend_id', function (req, res, next, friend_id) {
	User.findById(friend_id).exec().then(function(friend) {
            if (!friend) {
                return next(new Error('No user found'));
            } else {
		return User.populate(friend, {path: 'friends itineraries.location'});
	    }
	}).then(function (friend_pop) {
            req.friend = friend_pop;
            next();
        }).catch(function (err) {
	    if (err) {
		console.error(err);
		return next(err);
	    }
	});
    });
};

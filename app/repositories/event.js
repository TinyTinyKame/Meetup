var mongoose = require('mongoose');
var Event    = require('../models/event');
var Location = require('../models/location');

var EventRepository = {
    search: function (query, page, limit, cb) {
	Event.find(query, function (err, events) {
	    cb(err, events);
	}).skip(page).limit(limit).populate('admin locations messages users.user messages.author').exec();
    },
    findOrCreateEvent: function (query, params, cb) {
	Event.findOneAndUpdate(
	    query,
	    params,
	    {new: true, upsert: true},
	    function (err, event) {
		cb(err, event);
	    }
	);
    },
    remove: function(query, cb) {
	Event.remove(query, function (err, event) {
	    cb(err, event);
	});
    },
    findOne: function(query, cb) {
	Event.findOne(query, function (err, event) {
	    cb(err, event);
	});
    }
};

module.exports = EventRepository;
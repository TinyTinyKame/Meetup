var mongoose = require('mongoose');
var Location = require('../models/location');

var LocationRepository = {
    search: function (query, page, limit, cb) {
        Location.find(query, function (err, locations) {
            cb(err, locations);
        }).skip(page).limit(limit).exec();
    },
    findOrCreateLocation: function (params, cb) {
        Location.findOneAndUpdate(
            params,
            params,
            {new: true, upsert: true},
            function (err, location) {
                cb(err, location);
            }
        );
    },
    findOne: function (query, cb) {
	Location.findOne(query, function (err, location) {
	    cb(err, location);
	});
    }
};

module.exports = LocationRepository;
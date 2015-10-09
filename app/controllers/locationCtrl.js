var Location = require('../models/location');
var jwt      = require('jsonwebtoken');

var LocationRepository = require('../repositories/location');

module.exports.getLocations = function (req, res) {
    var page  = 0;
    var limit = 50000;
    var query = new RegExp('.*', 'i');
    var field = "name";
    if (req.query.p) {
        page  = req.query.p * 10;
        limit = 10;
    }
    if (req.query.q) {
        query = new RegExp(req.query.q, 'i');
    }
    LocationRepository.search({place: query}, page, limit, function (err, locations) {
        if (err) {
            return res.status(400).json(err);
        }
        if (locations) {
            return res.status(200).json(locations);
        } else {
            return res.status(404).json('No events found');
        }
    });
};

module.exports.addOrUpdateLocation = function(req, res) {
    var auth = jwt.verify(req.token);
    var params = {
	place: req.body.place,
	address: req.body.address,
	longitude: req.body.longitude,
	latitude: req.body.latitude,
	creator: auth._id
    };
    LocationRepository.findOrCreateLocation(params, function (err, location) {
	if (err) {
	    return res.status(400).json(err);
	}
	if (location) {
	    return res.status(200).json(location);
	} else {
	    return res.status(404).json('Location not found');
	}
    });
};
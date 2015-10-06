var mongoose = require('mongoose');
var User     = require('../models/user.js');

var UserRepository = {
    search: function (page, query, limit, cb) {
        User.find(query, function (err, users) {
	    cb(err, users);
        }).skip(page).limit(limit).populate('friends').exec();
    },
    findOne: function (params, cb) {
	User.findOne(params, function (err, user) {
	    cb(err, user);
	}).populate('friends').exec();
    },
    remove: function (params, cb) {
	User.remove(params, function (err, user) {
	    cb(err, user);
	});
    },
    create: function (user, cb) {
	User.create(user, function (err, user) {
	    cb(err, user);
	});
    },
    update: function (query, user, cb) {
	User.findOneAndUpdate(query, user,{new: true}, function (err, user) {
	    cb(err, user);
	});
    }
}

module.exports = UserRepository;
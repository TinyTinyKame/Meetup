var mongoose = require('mongoose');
var User     = require('../models/user.js');

var FriendRepository = {
    find: function (ids, page, cb) {
	User.find({
	    _id: {$in: ids}
	}, function (err, users) {
	    console.log(users);
	    cb(err, users);
	}).skip(page).limit(10).populate('friends').exec();
    },
    remove: function(user, friend, cb) {
	User.findOneAndUpdate({
	    _id: user._id
	}, {
	    $pull: {friends: {user: friend._id}}
	}, function (err, user) {
	    cb(err, user);
	});
    }
};

module.exports = FriendRepository;
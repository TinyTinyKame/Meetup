var User = require('../models/user.js');
var gcm  = require('node-gcm');
var jwt  = require('jsonwebtoken');

var UserRepository   = require('../repositories/user');
var FriendRepository = require('../repositories/friend');

module.exports.getFriends = function (req, res) {
    var user = req.user;
    var page = 0;
    if (req.query.p) {
	page = req.query.p * 10;
    }
    if (user.friends.length <= 0) {
	return res.status(200).json('User has no friends');
    }
    var friends = [];
    user.friends.forEach(function (friend) {
	friends.push(friend.user);
    });
    FriendRepository.find(friends, page, function (err, friends) {
	if (err) {
	    return res.status(400).json(err);
	}
	console.log(friends);
	if (friends) {
	    return res.status(200).json(friends);
	} else {
	    return res.status(404).json('No friends found');
	}
    });
};

module.exports.friendRequest = function (req, res) {
    var auth    = jwt.decode(req.token);
    var friend  = req.friend;
    var promise = User.findOne({_id: auth._id}).exec();
    
    promise.addErrback(function (err) {
	if (err) {
	    return res.status(400).json(err);
	}
    });

    promise.then(function (user) {
	var found = false;
	user.friends.forEach(function (friend_comp) {
	    if (friend_comp.equals(friend._id)) {
		found = true;
		return res.status(409).json('Already in friend list');
	    }
	});
	if (!found) {
	    friend.friends.push({user: user._id, status: 'Pending'});
	    friend.save(function (err) {
		if (err) {
		    return res.status(400).json(err);
		}
	    }).then(function () {
		user.friends.push({user: friend._id, status: 'Pending'});
		user.save(function (err, user) {
		    if (err) {
			return res.status(400).json(err);
		    }
		}).then(function (user) {
		    var message = new gcm.Message();
		    var regIds  = [friend.gcmToken];
		    var sender  = new gcm.Sender('AIzaSyBzbVdR8YZ2I0xvGnRfjbq_s3kLzOswEnk');
		    message.addData('friendRequest', user.name + 'added you!');
		    message.addNotification({
			title: 'Friend request',
			icon: 'ic_launcher',
			body: 'Hey there!, ' + user.name + ' added you!'
		    });
		    sender.send(message, { registrationIds: regIds }, function (err, result) {
			if (err) {
			    console.error(err);
			} else {
			    console.log(result);
			}
		    });
		    return res.status(201).json(user);
		});
	    });
	}
    });
};
    
module.exports.deleteFriend = function (req, res) {
    var friend  = req.friend;
    var auth    = jwt.decode(req.token);
    var promise = User.findOne({_id: auth._id}).exec();
    promise.addErrback(function (err) {
	if (err) {
	    return res.status(400).json(err);
	}
    });
    promise.then(function (user) {
	friend.friends.remove(user.user);
	friend.save(function (err, friend) {
	    if (err) {
		return res.status(400).json(err);
	    }
	}).then(function (friend) {
	    user.friends.remove(friend.user);
	    user.save(function (err, user) {
		if (err) {
		    return res.status(400).json(err);
		}
		return res.status(200).json(user);
	    });
	});
    });
};
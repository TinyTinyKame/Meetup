var User = require('../models/user.js');
var gcm  = require('node-gcm');
var jwt  = require('jsonwebtoken');

var UserRepository   = require('../repositories/user');
var FriendRepository = require('../repositories/friend');

module.exports.getFriends = function (req, res) {
    var user = req.user;
    if (user.friends.length <= 0) {
	return res.status(200).json('User has no friends');
    }
    return res.status(200).json(user.friends);
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
	    if (friend_comp.user.equals(friend._id)) {
		found = true;
		return res.status(409).json('Already in friend list');
	    }
	});
	if (!found) {
	    friend.friends.push({user: user._id, status: 'Asking'});
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
		    var regIds  = friend.gcmToken;
		    var sender  = new gcm.Sender('AIzaSyBzbVdR8YZ2I0xvGnRfjbq_s3kLzOswEnk');
		    message.addData({user: user});
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

module.exports.confirmFriend = function (req, res) {
    var friend_to_add = req.friend;
    var auth          = jwt.decode(req.token);
    var promise       = User.findOne({_id: auth._id}).exec();
    promise.addErrback(function (err) {
        if (err) {
            return res.status(400).json(err);
        }
    });
    promise.then(function (user) {
	friend_to_add.friends.forEach(function (user, index) {
	    if (user.user.equals(auth._id)) {
		friend_to_add.friends[index].status = 'Accepted';
		friend_to_add.save(function(err) {
		    if (err) {
			return res.status(400).json('Error while saving friend');
		    }
		});
	    }
	});
	user.friends.forEach(function (friend, index) {
	    if (friend.user.equals(friend_to_add._id)) {
		user.friends[index].status = 'Accepted';
		user.save(function (err, user) {
		    if (err) {
			return res.status(400).json('Error while accepting friend');
		    }
		    if (user) {
			User.populate(user, {path: 'friends.user', model: 'User'}, function (err, user) {
			    if (err) {
				return res.status(400).json('Error populating user');
			    }
			    if (user) {
				return res.status(201).json(user);
			    }
			});
		    }
		});
	    }
	});
    });
}
    
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

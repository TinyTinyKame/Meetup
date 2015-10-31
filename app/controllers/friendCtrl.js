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
	    return friend.save(function (err, saved) {
		if (err) {
		    return res.status(400).json(err);
		} else {
		    return user;
		}
	    });
	}
    }).then(function (user) {
	user.friends.push({user: friend._id, status: 'Pending'});
	return user.save();
    }).then(function (saved) {
	var message = new gcm.Message();
	var regIds  = friend.gcmToken;
	var sender  = new gcm.Sender('AIzaSyBzbVdR8YZ2I0xvGnRfjbq_s3kLzOswEnk');
	message.addData({user: saved});
	sender.send(message, { registrationIds: regIds }, function (err, result) {
	    if (err) {
		console.error(err);
	    } else {
		console.log(result);
	    }
	});
	return res.status(201).json(saved);
    }).catch(function (err) {
	if (err) {
	    console.error(err);
	    return res.status(400).json('Oops, something went wrong with friendRequest');
	}
    });
};

module.exports.confirmFriend = function (req, res) {
    var friend_to_add = req.friend;
    var auth          = jwt.decode(req.token);
    var promise       = User.findOne({_id: auth._id}).exec();

    promise.then(function (user) {
	console.log(user);
	console.log(friend_to_add);
	friend_to_add.friends.forEach(function (friend, index) {
	    if (friend.user.equals(user._id)) {
		friend_to_add.friends[index].status = 'Accepted';
		return {
		    friend: friend_to_add.save(), 
		    user: user
		};
	    }
	});
    }).then(function (result) {
	result.user.friends.forEach(function (friend, index) {
	    if (friend.user.equals(friend_to_add._id)) {
		result.user.friends[index].status = 'Accepted';
		return result.user.save();
	    }
	});
    }).then(function (user) {
	if (user) {
	    return User.populate(user, {path: 'friends.user', model: 'User'});
	}
    }).then(function (populated) {
	if (populated) {
	    return res.status(201).json(populated);
	}
    }).catch(function (err) {
	if (err) {
	    console.error(err);
	    return res.status(400).json('Oops, something went wrong with confirmFriend');
	}
    });
};
    
module.exports.deleteFriend = function (req, res) {
    var friend  = req.friend;
    var auth    = jwt.decode(req.token);
    var promise = User.findOne({_id: auth._id}).exec();
    promise.then(function (user) {
	friend.friends.remove({user: user._id});
	friend.save(function (err) {
	    if (err) {
		console.error(err);
		return res.status(400).json('Oops, something went wrong');
	    } else {
		return user;
	    }
	});
    }).then(function (user) {
	user.friends.remove({user: friend._id});
	return user.save();
    }).then(function (saved) {
	return res.status(200).json(saved);
    }).catch(function (err) {
	if (err) {
	    return res.status(400).json(err);
	}
    });
};

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

    if (friend._id.equals(auth._id)) {
	return res.status(409).json('Logged user and friend are the same');
    }
    
    promise.then(function (user) {
	var found = false;
	user.friends.forEach(function (friend_comp) {
	    if (friend_comp.user.equals(friend._id)) {
		found = true;
		throw new Error('Already in friend list');
	    }
	});
	if (!found) {
	    friend.friends.push({user: user._id, status: 'Asking'});
	    friend.save();
	    return user;
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
	    if (err.message.match(/Already in friend list/)) {
		return res.status(409).json(err.message);
	    } else {
		return res.status(400).json('Oops, something went wrong with friendRequest');
	    }
	}
    });
};

module.exports.confirmFriend = function (req, res) {
    var friend_to_add = req.friend;
    var auth          = jwt.decode(req.token);
    var promise       = User.findOne({_id: auth._id}).exec();
    var found         = false;

    promise.then(function (user) {
	friend_to_add.friends.forEach(function (friend, index) {
	    if (friend.user.equals(user._id) && friend.status === 'Pending') {
		friend_to_add.friends[index].status = 'Accepted';
		found = true;
		return;
	    }
	});
	if (found === true) {
	    return user;
	} else {
	    throw new Error('No friend found');
	}
    }).then(function (user) {
	user.friends.forEach(function (friend, index) {
	    if (friend.user.equals(friend_to_add._id) && friend.status === 'Asking') {
		user.friends[index].status = 'Accepted';
		found =  true;
		return;
	    }
	});
	if (found === true) {
	    return user;
	} else {
	    throw new Error('No friend found');
	}
    }).then(function (user) {
	friend_to_add.save();
	user.save();
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
	    if (err.message.match(/No friend found/)) {
                return res.status(409).json(err.message);
            } else {
		return res.status(400).json('Oops, something went wrong with confirmFriend');
	    }
	}
    });
};
    
module.exports.deleteFriend = function (req, res) {
    var friend  = req.friend;
    var auth    = jwt.decode(req.token);
    var promise = User.findOneAndUpdate(
	{ _id: friend._id },
	{ $pull: {friends: {user :auth._id}}},
	{ new: true }
    ).exec();
    promise.then(function (friend) {
	return User.findOneAndUpdate(
	    { _id: auth._id },
	    { $pull: {friends: {user: friend._id}}},
	    { new: true }
	);
    }).then(function (user) {
	return res.status(200).json(user);
    }).catch(function (err) {
	if (err) {
	    console.log(err);
	    return res.status(400).json('Oops, something went wrong with deleteFriend');
	}
    });
};

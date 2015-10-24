var Message = require('../models/message');
var Event   = require('../models/event');
var User    = require('../models/user');
var jwt     = require('jsonwebtoken');
var gcm     = require('node-gcm');

module.exports.getMessagesForEvent = function (req, res) {
    var event    = req.event;
    var messages = event.messages;
    Message.populate(messages, {path: 'author', model: 'User'}, function (err, messages) {
	if (err) {
	    return res.status(400).json('Error populating message');
	}
	if (messages) {
	    return res.status(200).json(messages);
	}
    });
};

module.exports.createMessageForEvent = function (req, res) {
    var event = req.event;
    var auth  = jwt.decode(req.token);
    var create = false;
    var muted  = false;

    event.users.forEach(function (user) {
	if (user.user._id.equals(auth._id) && user.mute) {
	    muted = true;
	    return res.status(403).json('Forbidden: muted');
	}
    });

    if (!muted) {
	var last_msg = [];
	var messages = event.messages;
	messages.reverse().forEach(function (message) {
	    if (auth._id == message.author) {
		last_msg.push(message);
	    }
	});
	if (last_msg.length >= 3) {
	    var now  = new Date().getTime();
	    var last = new Date(last_msg[2].created_at).getTime();
	    var diff = now - last;
	    if (diff > (1000 * 60)) {
		create = true;
	    }
	} else {
	    create = true;
	}
	
	if (create) {
	    Message.create({
		content: req.body.content,
		author: auth._id
	    },function (err, message) {
		if (err) {
		    return res.status(400).json('Error creating message');
		}
		if (message) {
		    event.messages.push(message);
		    event.save(function (err, event) {
			if (err) {
			    return res.status(400).json('Error pushing message');
			}
			if (event) {
			    Event.populate(
				event,
				{path: 'locations admin users.user messages messages.author'},
				function (err, event) {
				    if (err) {
					return res.status(400).json('Error populating event');
				    }
				    if (event) {
					Event.populate(event, { path: 'messages.author', model: 'User' }, function (err, data) {
					    if (err) {
						return res.status(400).json('Error populating author');
					    }
					    if (data) {
						var notif   = new gcm.Message();
						var gcmTokens = [];
						data.users.forEach(function (user) {
						    if (!user.user._id.equals(auth._id)) {
							gcmTokens = gcmTokens.concat(user.user.gcmToken);
						    }
						});
						var sender    = new gcm.Sender('AIzaSyBzbVdR8YZ2I0xvGnRfjbq_s3kLzOswEnk');
						notif.addData({event: data._id, last_message: data.messages.pop()});
						console.log(gcmTokens);
						sender.send(notif, { registrationIds: gcmTokens }, function (err, result) {
						    if (err) {
							console.error(err);
						    } else {
							console.log(result);
						    }
						});
						return res.status(201).json(data);
					    }
					});
				    }
				}
			    );
			}
		    });
		}
	    });
	} else {
	    return res.status(403).json('Slow Down!');
	}
    }
};

module.exports.muteUser = function (req, res) {
    var auth         = jwt.decode(req.token);
    var event        = req.event;
    var user_to_mute = req.user;
    var found        = false;
    
    if (event.admin._id == auth._id) {
	event.users.forEach(function (user, index) {
	    found = true;
	    if (user_to_mute._id.equals(user.user._id)) {
		event.users[index].mute = true;
		event.save(function (err, event) {
		    if (err) {
			return res.status(400).json('Error muting user');
		    }
		    if (event) {
			return res.status(201).json(event);
		    }
		});
	    }
	});
	if (!found) {
            return res.status(404).json('User not in event');
        }
    } else {
	return res.status(403).json('Forbidden');
    }
};

module.exports.unmuteUser = function (req, res) {
    var auth         = jwt.decode(req.token);
    var event        = req.event;
    var user_to_mute = req.user;
    var found        = false;

    if (event.admin._id == auth._id) {
        event.users.forEach(function (user, index) {
            if (user_to_mute._id.equals(user.user._id)) {
		found = true;
                event.users[index].mute = false;
                event.save(function (err, event) {
                    if (err) {
                        return res.status(400).json('Error unmuting user');
		    }
                    if (event) {
			return res.status(201).json(event);
		    }
                });
	    }
        });
	if (!found) {
	    return res.status(404).json('User not in event');
	}
    } else {
	return res.status(403).json('Forbidden');
    }
};
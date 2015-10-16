// Define user

var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    name: {type: String, required: true},
    email: {type: String, required: true},
    password: {type: String, required: true},
    gcmToken: [{type: String, required: true}],
    permission: {type: String, enum:['terminator', 'user'], required: true, default: 'user'},
    description: String,
    photoUrl: String,
    latitude: Number,
    longitude: Number,
    friends: [
	{
	    user: {type: mongoose.Schema.ObjectId, ref: 'User'},
	    status: {type: String, enum:['Pending', 'Denied', 'Accepted'], require: true}
	}
    ],
    itineraries: [
	{
	    location: {type: mongoose.Schema.ObjectId, ref: 'Location'},
	    detail: String,
	    travelMode: String
	}
    ]
});

module.exports = mongoose.model('User', userSchema);
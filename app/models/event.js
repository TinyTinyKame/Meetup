// Define models for event

var mongoose = require('mongoose');

var eventSchema = mongoose.Schema({
    name: {type: String, required: true},
    type: {type: String, enum: ['private','public'], required: true},
    category: {
	type: String,
	enum: [
	    'Sport',
	    'Bar',
	    'Pub crawl',
	    'Night club',
	    'Meal',
	    'Movie'
	],
	required: true
    },
    locations: [{type: mongoose.Schema.ObjectId, ref: 'Location'}],
    date: {type: Number, default: Date.now, required: true},
    admin: {type: mongoose.Schema.ObjectId, ref: 'User', required: true},
    photoId: Number,
    description: String,
    users: [
	{
	    user: {type: mongoose.Schema.ObjectId, ref: 'User'},
	    mute: {type: Boolean, default: false}
	}
    ],
    messages: [{type: mongoose.Schema.ObjectId, ref: 'Message'}]
});

module.exports = mongoose.model('Event', eventSchema);
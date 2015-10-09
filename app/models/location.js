// Define location

var mongoose = require('mongoose');

var locationSchema = mongoose.Schema({
    place: String,
    address: {type: String, required: true},
    latitude: {type: Number, required: true},
    longitude: {type: Number, required: true},
    creator: {type: mongoose.Schema.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('Location', locationSchema);

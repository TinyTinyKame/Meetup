// Define location

var mongoose = require('mongoose');

var locationSchema = mongoose.Schema({
    place: String,
    address: {type: String, required: true},
    latitude: {type: Number, required: true},
    longitude: {type: Number, required: true}
});

module.exports = mongoose.model('Location', locationSchema);

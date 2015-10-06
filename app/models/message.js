var mongoose = require('mongoose');

var messageSchema = mongoose.Schema({
    content: {type: String, required: true},
    author: {type: String, required: true},
    created_at: {type: Number, default: Date.now, required: true}
});

module.exports = mongoose.model('Message', messageSchema);
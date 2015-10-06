var message = require('../controllers/messageCtrl');

module.exports = function (app) {
    app.get('/event/:event_id/messages', message.getMessagesForEvent);
    app.post('/event/:event_id/message', message.createMessageForEvent);
    app.put('/event/:event_id/user/:user_id/mute', message.muteUser);
    app.put('/event/:event_id/user/:user_id/unmute', message.unmuteUser);
};
var event = require('../controllers/eventCtrl');

module.exports = function (app) {
    app.get('/events/search', event.getEvents);
    app.get('/user/:user_id/events', event.getUserEvents);
    app.get('/event/:event_id/users', event.getEventUsers);
    app.post('/event', event.createOrUpdateEvent);
    app.delete('/event/:event_id', event.deleteEvent);
    app.put('/event/:event_id/users/invite', event.inviteUsers);
    app.put('/event/:event_id/user/:user_id/add', event.addUser);
    app.delete('/event/:event_id/user/:user_id/deny', event.denyInvite);
};
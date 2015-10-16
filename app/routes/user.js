var user = require('../controllers/userCtrl');

var UserRepository     = require('../repositories/user');
var LocationRepository = require('../repositories/location');

module.exports = function (app) {
    app.get('/users/search', user.getUsers);
    app.post('/user', user.createUser);
    app.put('/user', user.updateUser);
    app.put('/user/location', user.setUserLocation);
    app.get('/user/:user_id', user.getUser);
    app.delete('/user/:user_id', user.removeUser);
    app.get('/user/:user_id/history', user.getUserHistoryLocations);
    app.post('/user/:user_id/location/:location_id/itinerary', user.addItinerary);
    app.put('/user/gcm', user.addGCMToken);
    app.delete('/user/gcm', user.removeGCMToken);
};
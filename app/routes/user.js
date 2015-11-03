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
    app.post('/user/location/:location_id/itinerary', user.addItinerary);
    app.put('/user/location/:location_id/itinerary', user.updateItinerary);
    app.post('/user/gcm/add', user.addGCMToken);
    app.delete('/user/gcm/remove', user.removeGCMToken);
};
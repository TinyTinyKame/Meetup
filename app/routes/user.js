var user = require('../controllers/userCtrl');

var UserRepository     = require('../repositories/user');
var LocationRepository = require('../repositories/location');

module.exports = function (app) {
    app.get('/users/search', user.getUsers);
    app.post('/user', user.createUser);
    app.put('/user', user.updateUser);
    app.put('/setLocation', user.setLocation);
    app.get('/user/:user_id', user.getUser);
    app.delete('/user/:user_id', user.removeUser);
    app.get('/user/:user_id/getHistory', user.getUserHistoryLocations);
    app.post('/user/:user_id/location/:location_id/itinerary', user.addItinerary);
};
var location = require('../controllers/locationCtrl');

module.exports = function (app) {
    app.get('/locations/search', location.getLocations);
    app.post('/location', location.addOrUpdateLocation);
};
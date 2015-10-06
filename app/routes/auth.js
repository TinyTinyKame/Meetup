var auth = require('../controllers/authCtrl');

module.exports = function (app) {
    app.post('/login', auth.login);
    app.use(auth.unless('/user', auth.checkAuth));
};
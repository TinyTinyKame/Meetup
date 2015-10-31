var auth = require('../controllers/authCtrl');

module.exports = function (app) {
    app.use(auth.unless(['/user', '/login'], auth.checkAuth));
    app.post('/login', auth.login);
};
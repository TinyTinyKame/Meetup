// modules =================================================
var express        = require('express');
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');
var mongoose       = require('mongoose');
mongoose.Promise   = global.Promise;
var morgan         = require('morgan');
var app            = express();

// configuration ===========================================
    
// config files
var config = require('./app/config.js');
// set our port
var port = process.env.PORT || 8080; 
// expose app
exports = module.exports = app;
// connect to our mongoDB database 
mongoose.connect(config.url); 

// set secret for token
app.set('secret', config.secret);

// CORS
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
    if ('OPTIONS' === req.method) {
        res.status(204).send();
    }
    else {
        next();
    }
});
// get all data/stuff of the body (POST) parameters
app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); 
app.use(bodyParser.urlencoded({ extended: true })); 

// override with the X-HTTP-Method-Override header in the request. simulate DELETE/PUT
app.use(methodOverride('X-HTTP-Method-Override'));

// Log in dev
app.use(morgan('dev'));

// default folder for img and stuffs
//app.use(express.static(__dirname + '/public')); 
//app.engine('html', require('ejs').renderFile);

// routes ==================================================
require('./app/routes/middleware')(app);
require('./app/routes/auth')(app);
require('./app/routes/user')(app);
require('./app/routes/event')(app);
require('./app/routes/friend')(app);
require('./app/routes/location')(app);
require('./app/routes/message')(app);
// start app ===============================================
// startup our app at http://localhost:8080
app.listen(port);               

// shoutout to the user                     
console.log('Magic happens on port ' + port);
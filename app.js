var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var doglists = require('./routes/doglists');
var profiles = require('./routes/profiles');
var favorites = require('./routes/favorites');
var signout = require('./routes/signout');
var morgan = require('morgan');
var login = require('./routes/login');
var secretKey = require('./config/secretKey');
var app = express();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('secret-key', secretKey.secretKey);
// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('apidoc'));
app.use( (req, res, next) => {req.user= {}, next();});
app.use('/doglists', doglists);
app.use('/profiles', profiles);
app.use('/favorites', favorites);
app.use('/login', login);
app.use('/signout', signout);
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
const logger = require('./logger');
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  logger.error(err.status||500 + " " + err.message);
  res.status(err.status || 500);
  res.json({message: err.message});
});

module.exports = app;

var express = require('express');
var path = require('path');
var logger = require('morgan');
var indexRouter = require('./routes/index');

process.title = 'yz.social';
var app = express();
app.use(logger('dev'));

// No need:
//var cookieParser = require('cookie-parser');
//app.use(express.json());
//app.use(express.urlencoded({ extended: false }));
//app.use(cookieParser());

app.use('/', indexRouter);
app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;



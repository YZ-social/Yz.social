var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

process.title = 'yz.social';
var app = express();

//var expressWs = require('express-ws')(app); // Must be before defining routers.
app.set('port', 3000);
var http = require('http');
var server = http.createServer(app);
//var server = require('http').Server(app);
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server }); // Create a WebSocket server attached to the HTTP server
const subscriptions = {};
const sticky = {};
const SUBSCRIPTION_TIMEOUT = 60 * 60e3; // Delete after an hour. Must be renewed by app.
const PUBLISH_TIMEOUT = 10 * 60e3;
wss.on('connection', (ws, req) => {
  console.log('Client connected');
  function deleteFromKeySubs(key, keySubs = subscriptions[key]) {
    if (!keySubs) return;
    keySubs.delete(ws);
    if (!keySubs.size) delete subscriptions[key];
  }
  function deleteWS() {
    for (const key in subscriptions)  {
      deleteFromKeySubs(key);
    }
  }
  ws.on('message', message => {
    const {method, key, timeToLive, data} = JSON.parse(message);
    let keySubs = subscriptions[key] ||= new Set();
    switch (method) {
    case 'ping':
      ws.send('{"method":"pong"}');
      break;
    case 'publish':
      const string = JSON.stringify({key, timeToLive, data});
      for (const ws of keySubs) {
	ws.send(string);
      }
      const existing = sticky[key] ||= new Set();
      existing.add(string);
      setTimeout(() => { existing.delete(string); if (!existing.size) delete sticky[key]; } , PUBLISH_TIMEOUT);
      break;
    case 'subscribe':
      subscriptions[key].add(ws);
      for (const string of (sticky[key] || [])) {
	console.log('sending sticky', string);
	ws.send(string);
      }
      setTimeout(() => deleteFromKeySubs(key), SUBSCRIPTION_TIMEOUT);
      break;
    case 'unsubscribe':
      deleteFromKeySubs(key, keySubs);
      break;
    default:
      console.error(`Unrecognized method ${method}`, message);
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected ${ws.xIP}`);
    deleteWS();
  });

  ws.on('error', error => {
    console.error('WebSocket error:', error);
    deleteWS();
  });
});


var indexRouter = require('./routes/index');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/', indexRouter);
app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;

server.listen(3000);

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');


var app = express();

//var expressWs = require('express-ws')(app); // Must be before defining routers.
app.set('port', 3000);
var http = require('http');
var server = http.createServer(app);
//var server = require('http').Server(app);
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server }); // Create a WebSocket server attached to the HTTP server
const subscriptions = {};
wss.on('connection', (ws, req) => {
  console.log('Client connected');
  ws.xIP = req.socket.remoteAddress; // Attach IP address to socket for debugging.
  ws.on('message', message => {
    const {method, key, timeToLive, data} = JSON.parse(message);
    let keySubs = subscriptions[key] ||= new Set();
    console.log({method, key, data, timeToLive, ip: ws.xIP});
    switch (method) {
    case 'publish':
      const string = JSON.stringify({key, timeToLive, data});
      console.log(Array.from(keySubs.values().map(x => x.xIP)));
      for (const ws of keySubs) {
	console.log(string, ws.xIPs);
	ws.send(string);
      }
      break;
    case 'subscribe':
      subscriptions[key].add(ws);
      // TODO: time out, with renewal by app?
      break;
    case 'unsubscribe':
      keySubs.delete(ws);
      if (!keySubs.size) delete subscriptions[key];
      break;
    default:
      console.error(`Unrecognized method ${method}`, message);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', error => {
    console.error('WebSocket error:', error);
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

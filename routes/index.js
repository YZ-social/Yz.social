const express = require('express');
const WebSocket = require('ws');
const router = express.Router();

// The DHT runs a hook here to connect nodes to each other, which uses WebSockets during
// the connection and then gets out of the way.
// It also runs some headless peers here to provide stable continuity to the network.

// But that isn't ready just yet. So temprarilly, the DHT pub/sub is handled in-memory
// here, communicating through WebSocket for the whole client session.

const SUBSCRIPTION_TIMEOUT = 60 * 60e3; // Delete after an hour. Must be renewed by app.
const PUBLISH_TIMEOUT = 10 * 60e3;      // Delete after 10 minutes.

// The easy way to initialize the WebSocket.Server is by passing an http.Server, but that's
// typically not available at this point in an ExpressJS application.
const wss = new WebSocket.Server({noServer: true});

router.get('/ws', (req, res, next) => { // Since we specified noServer, we must handleUpgrade here.
  const {upgrade, connection} = req.headers;
  if (upgrade !== 'websocket') return next();
  if (!connection.includes(/* U */ 'pgrade')) return next();
  // The usual path for explicitly handling upgrade is through
  //     server.on('upgrade', function upgrade(req, socket, head) { .... });
  // But we don't have server here. (It is defined in www and app has no knowledge of it.)
  // Fortunately the head argument to handleUpgrade will be an empty buffer, so we can make that here.
  const head = new Buffer([]); 
  wss.handleUpgrade(req, req.socket, head, ws => wss.emit('connection', ws, req));
});

const subscriptions = {}; // key => ws. Entries purged after SUBSCRIPTION_TIMEOUT.
const sticky = {};        // key => data. Entries purshed after PUBLISH_TIMEOUT.
wss.on('connection', (ws, req) => {
  console.log('Client connected', req.url);
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
  let heartbeat = setInterval(() => ws.ping(), 10e3);
  ws.on('message', message => {
    const {method, key, timeToLive, data} = JSON.parse(message);
    let keySubs = subscriptions[key] ||= new Set();
    switch (method) {
    case 'ping': // Browser might not respond to server ping frames.
      // So if we have the client send application-level pings to keep things open.
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
    console.log(`Client disconnected`);
    clearInterval(heartbeat);
    deleteWS();
  });

  ws.on('error', error => {
    console.error('WebSocket error:', error);
    deleteWS();
  });
});

module.exports = router;

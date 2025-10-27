import { showMessage } from './map.js';
const WEBSOCKET_URI = location.origin.replace('^http', 'ws') + '/ws'; // Falsey to debug locally

const handlers = {}; // Mapping key => function(messageData) for all active subcriptions

let connection, clientHeartbeat, promise;
export async function setupNetwork() { // Establish or re-establish a connection
  const existing = await connection;
  if (existing?.readyState === WebSocket.OPEN) {
    console.log('already connected');
    return;
  }
  connection = WEBSOCKET_URI ? 
    new WebSocket(WEBSOCKET_URI) :
    { // If no WEBSOCKET_URI, operate locally with an object that has a send() method
      send(string) {
	const {method, ...data} = JSON.parse(string);
	if (method !== 'publish') return;
	this.onmessage( {data: JSON.stringify(data)} ); // Fake an Event object.
      }
    };

  promise = new Promise(resolve => // Resolves when open, b/c sending over a still-opening socket gives error.
    connection.onopen = () => { // Start ping/pong to keep the socket from closing.
      if (connection.readyState !== WebSocket.OPEN) return; // You would think that can't happen, but...
      console.log('connection open');
      resolve(connection);
      clientHeartbeat = setInterval(() => connection.send('{"method":"ping"}'), 10e3);
    });

  // onerror is of no help, as the event is generic.
  connection.onclose = event => {
    console.warn('websocket close', event.code, event.wasClean, event.reason);
    clearInterval(clientHeartbeat);
    if (document.visibilityState === 'visible') {
      setupNetwork();
      return;
    }
    const more = event.reason ? ' ' + event.reason : '';
    showMessage('The server connection has closed. Please reload.' + more, 'error');
  };

  connection.onmessage = event => { // Call the handler previously set using subscribe, if any.
    const {key, data} = JSON.parse(event.data);
    const handler = handlers[key];
    handler?.(data);
  };

  for (const key in handlers) { // If this is reconnecting, re-establish the subscriptions on the new socket.
    await subscribe(key, handlers[key]);
  }
}

export async function publish(key, data, timeToLive = 10 * 60e3) { // Publish data to subscribers of key.
  await promise;
  key = key.toString();
  connection.send(JSON.stringify({method: 'publish', key, data, timeToLive}));
}
const renewals = {};
export async function subscribe(key, handler) { // Assign handler for key, or remove any handler if falsy.
  await promise;
  key = key.toString();
  if (handler) {
    handlers[key] = handler;
    connection.send(JSON.stringify({method: 'subscribe', key}));
    renewals[key] = setTimeout(() => renewals[key] && subscribe(key, handler), 55 * 60e3);
  } else {
    delete handlers[key];
    clearTimeout(renewals[key]);
    delete renewals[key];
    connection.send(JSON.stringify({method: 'unsubscribe', key}));
  }
}


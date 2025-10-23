const WEBSOCKET_URI = location.origin.replace('^http', 'ws') + '/ws'; // Falsey to debug locally

const handlers = {};
const connection = WEBSOCKET_URI ? 
      new WebSocket(WEBSOCKET_URI) :  // fixme wss, localhost
      { // An object with send() method, impersonating a WebSocket but just local.
	send(string) {
	  const {method, ...data} = JSON.parse(string);
	  if (method !== 'publish') return;
	  this.onmessage( {data: JSON.stringify(data)} ); // Fake an Event object.
	}
      };
window.connection = connection; // for debugging

const promise = new Promise(resolve => 
  connection.onopen = () => { // Start ping/pong to keep the socket from closing.
    resolve();
    setInterval(() => connection.send('{"method":"ping"}'), 40e3);
  });

connection.onclose = event => {
  const more = event.reason ? ' ' + event.reason : '';
  window.showMessage('The server connection has closed. Please reload.' + more, 'error');
}

connection.onmessage = event => { // Call the handler previously set using subscribe, if any.
  const {key, data} = JSON.parse(event.data);
  const handler = handlers[key];
  handler?.(data);
};

export async function publish(key, data, timeToLive = 10 * 60e3) { // Publish data to subscribers of key.
  await promise;
  connection.send(JSON.stringify({method: 'publish', key, data, timeToLive}));
}
const renewals = {};
export async function subscribe(key, handler) { // Assign handler for key, or remove any handler if falsy.
  await promise;
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

const USE_WEBSOCKETS = false;  // False to debug locally

const handlers = {};
const connection = USE_WEBSOCKETS ? 
      new WebSocket('wss://localhost/') :
      { // An object with send() method, impersonating a WebSocket but just local.
	send({method, ...data}) {
	  if (method !== 'publish') return;
	  this.onmessage( {data} ); // Fake an Event object.
	}
      };

connection.onmessage = event => { // Call the handler previously set using subscribe, if any.
  const {key, data} = event.data;
  const handler = handlers[key];
  handler?.(data);
};

export function publish(key, data, timeToLive = 10 * 60e3) { // Publish data to subscribers of key.
  connection.send({method: 'publish', key, data, timeToLive});
}
export function subscribe(key, handler) { // Assign handler for key, or remove any handler if falsy.
  if (handler) {
    handlers[key] = handler;
    connection.send({method: 'subscribe', key});
  } else {
    delete handlers[key];
    connection.send({method: 'unsubscribe', key});
  }
}

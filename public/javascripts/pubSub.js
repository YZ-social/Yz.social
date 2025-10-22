const WEBSOCKET_URI = location.origin.replace('^http', 'ws'); // Falsey to debug locally

console.log(location);
const rr = await fetch('http://localhost:3000/dummy');
console.log('dummy got:', await rr.text());

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

connection.onmessage = event => { // Call the handler previously set using subscribe, if any.
  const {key, data} = JSON.parse(event.data);
  const handler = handlers[key];
  handler?.(data);
};

export function publish(key, data, timeToLive = 10 * 60e3) { // Publish data to subscribers of key.
  connection.send(JSON.stringify({method: 'publish', key, data, timeToLive}));
}
export function subscribe(key, handler) { // Assign handler for key, or remove any handler if falsy.
  if (handler) {
    handlers[key] = handler;
    connection.send(JSON.stringify({method: 'subscribe', key}));
  } else {
    delete handlers[key];
    connection.send(JSON.stringify({method: 'unsubscribe', key}));
  }
}

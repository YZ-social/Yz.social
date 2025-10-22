const express = require('express');
const router = express.Router();

router.use('/dummy', function(req, res, next) {
  console.log('dummy');
  res.send('hello');
});

/*
router.ws('/', function(ws, req) {
  console.log({ws, req});
  ws.on('message', function(msg) {
    console.log({msg});
    const {method, key, data, timeToLive} = msg;
    switch (method) {
    case 'publish':
      ws.send({key, data});
      break;
    case 'subscribe':
    case 'unsubscribe':
      break;
    default:
      console.error(`Unrecognized method ${method}`, msg);
    }
  });
});
*/
module.exports = router;

#!/usr/bin/env node

const crypto = require('crypto');
const bunyan = require('bunyan');
const levelup = require('levelup');
const leveldown = require('leveldown');
const db = levelup(leveldown('./.dat'));
const os = require('os');
const port = 8080;
const kad = require('kad');
const logger = bunyan.createLogger({ name: 'kad example' });
const transport = new kad.HTTPTransport();
const identity = kad.utils.getRandomKeyBuffer();
const contact = { hostname: os.hostname(), port};

const node = kad({ transport, db, logger, identity, contact });


// Use "global" rules for preprocessing *all* incoming messages
// This is useful for things like blacklisting certain nodes
// node.use((request, response, next) => {
//   let [identityString] = request.contact

//   if ([/* identity blacklist */].includes(identityString)) {
//     return next(new Error('You have been blacklisted'));
//   }

//   next();
// });

// Use existing "base" rules to add additional logic to the base kad routes
// This is useful for things like validating key/value pairs
node.use('STORE', (request, response, next) => {
  let [key, val] = request.params;
  let hash = crypto.createHash('rmd160').update(val).digest('hex');

  // Ensure values are content-addressable
  if (key !== hash) {
    return next(new Error('Key must be the RMD-160 hash of value'));
  }

  next();
});

// Use "userland" (that's you!) rules to create your own protocols
node.use('ECHO', (request, response, next) => {
  if (['fuck'].includes(request.params.message)) {
    return next(new Error(
      `Oh goodness, I dare not say "${request.params.message}"`
    ));
  }

  response.send(request.params);
});

// Define a global custom error handler rule, simply by including the `err`
// argument in the handler
node.use((err, request, response, next) => {
  response.send({ error: err.message });
});

// Define error handlers for specific rules the same way, but including the
// rule name as the first argument
node.use('ECHO', (err, request, response, next) => {
  response.send({
    error: err.message.replace(request.params.message, '[redacted]')
  });
});

// Extend the Node interface with your own plugins
// In many cases, you probably want parity with any userland message routes
// you have defined - in this case for the ECHO method
node.plugin(function() {
  this.sendNeighborEcho = (text, callback) => {
    this.send('ECHO', {
      message: text
    }, this.router.getNearestContacts(this.identity, 1).pop(), callback);
  };
});

// When you are ready, start listening for messages and join the network
// The Node#listen method takes different arguments based on the transport
// adapter being used
node.listen(1337);

node.join(['ea48d3f07a5241291ed0b4cab6483fa8b8fcc127', {
  hostname: 'seed.host.name',
  port: port
}], () => {
  logger.info(`Connected to ${node.router.length} peers!`)
});
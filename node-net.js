#!/usr/bin/env node

const kad = require('kad');
const levelup = require('levelup');
const leveldown = require('leveldown');
const db = levelup(leveldown('./.dat'));
const os = require('os');

const node = new kad({
  transport: new kad.HTTPTransport(),
  storage: db,
  contact: { hostname: os.hostname(), port: 8080}
});

const seed = [
  'ea48d3f07a5241291ed0b4cab6483fa8b8fcc127',
  { hostname: 'seed.host.name', port: 8080}
]

node.listen(1337);
node.join(seed, function() {
  console.log(`Connected to ${node.router.size} peers!`);
});
asefwaef
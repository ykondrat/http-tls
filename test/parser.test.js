'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { parseRequest } = require('../src/server');

const head = (...lines) => lines.join('\r\n');

test('parses method, path and version from the request-line', () => {
  const req = parseRequest(head('GET /headers HTTP/1.1', 'Host: x'));

  assert.equal(req.method, 'GET');
  assert.equal(req.path, '/headers');
  assert.equal(req.httpVersion, 'HTTP/1.1');
});

test('normalises header keys to lower-case', () => {
  const req = parseRequest(head('GET / HTTP/1.1', 'X-Demo: abc', 'HOST: example'));

  assert.equal(req.headers['x-demo'], 'abc');
  assert.equal(req.headers['host'], 'example');
  assert.ok(!('X-Demo' in req.headers));
});

test('edge case: no space after the colon', () => {
  const req = parseRequest(head('GET / HTTP/1.1', 'X-Demo:abc'));

  assert.equal(req.headers['x-demo'], 'abc');
});

test('edge case: empty header value', () => {
  const req = parseRequest(head('GET / HTTP/1.1', 'X-Empty:'));

  assert.ok('x-empty' in req.headers);
  assert.equal(req.headers['x-empty'], '');
});

test('edge case: duplicated key — last value wins', () => {
  const req = parseRequest(head('GET / HTTP/1.1', 'X-Dup: a', 'X-Dup: b'));

  assert.equal(req.headers['x-dup'], 'b');
});

test('surrounding whitespace in the value is trimmed', () => {
  const req = parseRequest(head('GET / HTTP/1.1', 'X-Space:   hi   '));

  assert.equal(req.headers['x-space'], 'hi');
});

test('a value containing a colon keeps everything after the first colon', () => {
  const req = parseRequest(head('GET / HTTP/1.1', 'Host: localhost:3000'));

  assert.equal(req.headers['host'], 'localhost:3000');
});

test('a header line with no colon is skipped, not crashed on', () => {
  const req = parseRequest(head('GET / HTTP/1.1', 'garbage-no-colon', 'X-Ok: 1'));

  assert.ok(!('garbage-no-colon' in req.headers));
  assert.equal(req.headers['x-ok'], '1');
});
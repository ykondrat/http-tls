'use strict';

const tls = require('tls');
const fs = require('fs');
const path = require('path');

const { handleConnection } = require('./server');

const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 3443;
const CERT_DIR = path.join(__dirname, '..', 'certs');
const KEY_PATH = process.env.TLS_KEY || path.join(CERT_DIR, 'key.pem');
const CERT_PATH = process.env.TLS_CERT || path.join(CERT_DIR, 'cert.pem');
const CERT_HINT =
  `Missing TLS cert/key (looked for ${CERT_PATH} and ${KEY_PATH}).\n` +
  'Generate a self-signed pair first (see README.md):\n' +
  '  openssl req -x509 -newkey rsa:2048 -nodes \\\n' +
  '    -keyout certs/key.pem -out certs/cert.pem \\\n' +
  '    -days 365 -subj "/CN=localhost"';

let tlsOptions;

try {
  tlsOptions = {
    key: fs.readFileSync(KEY_PATH, 'utf8'),
    cert: fs.readFileSync(CERT_PATH, 'utf8'),
  };
} catch (err) {
  console.error(err.code === 'ENOENT' ? CERT_HINT : `Failed to read TLS cert/key: ${err.message}`);
  process.exit(1);
}

const server = tls.createServer(tlsOptions, handleConnection);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${HTTPS_PORT} is already in use`);
  } else {
    console.error(`HTTPS server error: ${err.message}`);
  }
  process.exit(1);
});

server.listen(HTTPS_PORT, () => {
  console.log(`HTTPS server listening on https://localhost:${HTTPS_PORT}`);
});
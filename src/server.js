'use strict';

const net = require('net');

const HTTP_PORT = Number(process.env.HTTP_PORT) || 3000;
const CRLF = '\r\n';
const HEADER_END = Buffer.from(CRLF + CRLF, 'ascii');

const REASON_PHRASES = {
  200: 'OK',
  400: 'Bad Request',
  404: 'Not Found',
  500: 'Internal Server Error',
};

function parseRequest(head) {
  const lines = head.split(CRLF);
  const requestLine = lines[0] || '';
  const [method = '', path = '', httpVersion = ''] = requestLine.split(' ');
  const headers = {};

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];

    if (line === '') continue;

    const colon = line.indexOf(':');

    if (colon === -1) continue;

    const key = line.slice(0, colon).trim().toLowerCase();

    headers[key] = line.slice(colon + 1).trim();
  }

  return { method, path, httpVersion, headers };
}

function handleRequest(request) {
  if (!request.method || !request.path || !/^HTTP\/1\.[01]$/.test(request.httpVersion)) {
    return {
      status: 400,
      contentType: 'text/plain; charset=utf-8',
      body: 'Bad Request\n',
    };
  }

  if (request.method === 'GET' && request.path === '/') {
    return {
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      body: 'Hello from a hand-rolled HTTP server!\n',
    };
  }

  if (request.method === 'GET' && request.path === '/headers') {
    const headerLines = Object.entries(request.headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    const body =
      `method: ${request.method}\n` +
      `path: ${request.path}\n` +
      `\n${headerLines}\n`;

    return {
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      body
    };
  }

  return {
    status: 404,
    contentType: 'text/plain; charset=utf-8',
    body: 'Not Found\n',
  };
}

function buildResponse(response) {
  const reason = REASON_PHRASES[response.status] || 'OK';
  const bodyBuffer = Buffer.from(response.body, 'utf-8');
  const head =
    `HTTP/1.1 ${response.status} ${reason}${CRLF}` +
    `Content-Type: ${response.contentType}${CRLF}` +
    `Content-Length: ${bodyBuffer.length}${CRLF}` +
    `Connection: close${CRLF}` +
    CRLF;

  return Buffer.concat([Buffer.from(head, 'utf-8'), bodyBuffer]);
}

function handleConnection(socket) {
  let buffer = Buffer.alloc(0);

  const onData = (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    const separator = buffer.indexOf(HEADER_END);

    if (separator === -1) return;

    socket.removeListener('data', onData);

    let response;

    try {
      const head = buffer.subarray(0, separator).toString('utf-8');
      const request = parseRequest(head);

      response = handleRequest(request);
    } catch (err) {
      console.error('request handling error:', err.message);
      response = {
        status: 500,
        contentType: 'text/plain; charset=utf-8',
        body: 'Internal Server Error\n',
      };
    }

    socket.end(buildResponse(response));
  };

  socket.on('data', onData);

  socket.on('error', (err) => {
    console.error('socket error:', err.message);
  });
}

if (require.main === module) {
  const server = net.createServer(handleConnection);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${HTTP_PORT} is already in use`);
    } else {
      console.error(`HTTP server error: ${err.message}`);
    }
    process.exit(1);
  });

  server.listen(HTTP_PORT, () => {
    console.log(`HTTP server listening on http://localhost:${HTTP_PORT}`);
  });
}

module.exports = {
  handleConnection,
};
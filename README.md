# HTTP/1.1 from scratch — over TCP and TLS

A minimal HTTP/1.1 server built without the `http` / `https` modules. It reads raw bytes off a socket (`net` / `tls`) parses the request-line and headers by hand and writes a valid HTTP/1.1 response byte-by-byte.

## Layout

| File                   | Purpose                            |
|------------------------|------------------------------------|
| `src/server.js`        | Raw HTTP over `net.createServer()` |
| `src/https-server.js`  | HTTPS over `tls.createServer()`    |
| `certs/`               | Generated self-signed cert/key     |

The parser (`parseRequest`), the router (`handleRequest`), the serialiser (`buildResponse`), and the per-socket driver (`handleConnection`) all live in `server.js`. `https-server.js` imports `handleConnection` unchanged — once TLS decrypts the stream, the bytes above it are identical HTTP text.

## Run

Both servers start with a single command, on fixed ports (no flags to guess):

```bash
node src/server.js

node src/https-server.js
```

Ports can be overridden with `HTTP_PORT` / `HTTPS_PORT` env vars.

## Routes

| Request         | Response                                                                    |
|-----------------|-----------------------------------------------------------------------------|
| `GET /`         | `200 OK`, `Content-Type: text/plain`                                        |
| `GET /headers`  | `200 OK`, the parsed method, path, and headers are returned in the response |
| anything else   | `404 Not Found`                                                             |

### Try it

```bash
curl -sv http://localhost:3000/

curl -s  http://localhost:3000/headers -H "X-Demo: abc"

curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/nope

curl -sk -o /dev/null -w "%{http_code}\n" https://localhost:3443/
```

## Generate the self-signed certificate

`certs/*.pem` are not committed (see `.gitignore`). Create them once:

```bash
mkdir -p certs

openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout certs/key.pem -out certs/cert.pem \
  -days 365 -subj "/CN=localhost"
```

## Debug session — `openssl s_client`

Inspecting the TLS handshake using the self-signed certificate.

```
$ openssl s_client -connect localhost:3443 -servername localhost

CONNECTED(00000005)
depth=0 CN = localhost
verify error:num=18:self signed certificate
verify return:1
depth=0 CN = localhost
verify return:1
---
Certificate chain
 0 s:/CN=localhost
   i:/CN=localhost
---
Server certificate
-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----
subject=/CN=localhost
issuer=/CN=localhost
---
No client certificate CA names sent
Server Temp Key: ECDH, X25519, 253 bits
---
SSL handshake has read 1258 bytes and written 385 bytes
---
New, TLSv1/SSLv3, Cipher is AEAD-AES256-GCM-SHA384
Server public key is 2048 bit
Secure Renegotiation IS NOT supported
Compression: NONE
Expansion: NONE
No ALPN negotiated
SSL-Session:
    Protocol  : TLSv1.3
    Cipher    : AEAD-AES256-GCM-SHA384
    Session-ID: 
    Session-ID-ctx: 
    Master-Key: 
    Start Time: 1785931160
    Timeout   : 7200 (sec)
    Verify return code: 18 (self signed certificate)
---
DONE
```

What verify error:num=18 means: Error code 18 means self-signed certificate. OpenSSL validates the certificate chain until it reaches a certificate whose subject and issuer are the same (for example, CN=localhost signed by CN=localhost) and cannot find a trusted Certificate Authority (CA) above it.

For a self-signed development certificate, this is expected and does not indicate a TLS failure. The TLS handshake still completes successfully, and the connection remains encrypted. OpenSSL is simply reporting that it cannot verify the certificate's trust chain. As a result, curl requires the -k option to ignore the verification error, and web browsers display a security warning.

For reference, other common `verify error` codes:

| Code  | Meaning             |
|-------|---------------------|
| 18    | self-signed cert    |
| 19    | chain incomplete    |
| 10    | certificate expired |
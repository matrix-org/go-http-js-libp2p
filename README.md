### go-http-js-libp2p

Tunnel HTTP requests/responses in-browser from go-wasm over js-libp2p.
In theory should be compatible with https://github.com/libp2p/go-libp2p-http.

To test:

```bash
$ yarn install
$ ./test.sh
```
Alternatively:
```bash
$ docker build -t ghjl .
$ docker run --rm ghjl
```

The tests will spin up a rendezvous server. For reference, you can spin one up like this:

```
npm install --global libp2p-websocket-star-rendezvous
rendezvous --port=9090 --host=127.0.0.1
```

### libp2p-http-rpc

A rewrite of the experiment from 2019 Web3 Summit (original lost by hardware failure)
for tunnelling HTTP requests/responses in-browser from go-wasm over js-libp2p.

To run:

```bash
# for go:
(cd go; GOOS=js GOARCH=wasm go build -o ../main.wasm)
cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" .

# for js:
yarn install
yarn run start
```

You'll need a rendezvous server from somewhere - it's easier to demo/debug against
a local one rather than the ones run by the libp2p team:

```
npm install --global libp2p-websocket-star-rendezvous
rendezvous --port=9090 --host=127.0.0.1
```

Then, fire up a bunch of browsers pointing at http://localhost:8080 and watch them ping each other.

### libp2p-http-rpc

A rewrite of the experiment from 2019 Web3 Summit (original lost by hardware failure)
for tunnelling HTTP requests/responses in-browser from go-wasm over js-libp2p.

To run:

```bash
GOOS=js GOARCH=wasm go build -o main.wasm
cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" .
go get -u github.com/shurcooL/goexec
~/go/bin/goexec 'http.ListenAndServe(`:8080`, http.FileServer(http.Dir(`.`)))'
```

...and then http://localhost:8080

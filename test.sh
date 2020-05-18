#!/bin/bash -eu

./node_modules/.bin/babel js --out-dir lib --presets=@babel/env
GOOS=js GOARCH=wasm go test -timeout=15s -exec="./go_http_js_libp2p_wasm_exec" .

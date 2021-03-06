// -*- coding: utf-8 -*-
// Copyright 2019, 2020 The Matrix.org Foundation C.I.C.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package go_http_js_libp2p_test

import (
	"bufio"
	"crypto/ed25519"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"syscall/js"
	"testing"
	"time"

	go_http_js_libp2p "github.com/matrix-org/go-http-js-libp2p"
)

func TestPingPong(t *testing.T) {
	// we assume that the rendezvous server is up already - see wasm_exec.js which spins it up
	var wg sync.WaitGroup
	wg.Add(2)
	RunNode(t, &wg, "foo")
	time.Sleep(100 * time.Millisecond)
	RunNode(t, &wg, "bar")
	wg.Wait()
}

func RunNode(t *testing.T, wg *sync.WaitGroup, namespace string) {
	mux := http.NewServeMux()
	_, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("Failed to make ed25519 key: %s", err)
	}

	node := go_http_js_libp2p.NewP2pLocalNode(
		"org.matrix.p2p.experiment", priv.Seed(), []string{"/ip4/127.0.0.1/tcp/9999/ws/p2p-websocket-star/"}, namespace,
	)

	client := &http.Client{
		Transport: go_http_js_libp2p.NewP2pTransport(node),
	}

	// try to ping every peer that we discover which supports this service
	node.RegisterFoundProviders(func(peerInfos []go_http_js_libp2p.PeerInfo) {
		go func() {
			for _, pi := range peerInfos {
				if pi.Id == node.Id {
					continue // don't ping ourselves!
				}
				log.Printf("Trying to GET matrix://%s/ping", pi.Id)

				req, err := http.NewRequest("GET", fmt.Sprintf("matrix://%s/ping", pi.Id), nil)
				req.Header.Add("Testing-Headers", "testing")
				resp, err := client.Do(req)
				if err != nil {
					t.Fatalf("Can't make request: %s", err)
				}
				defer resp.Body.Close()

				if resp.StatusCode != 200 {
					t.Fatalf("Request returned %s", resp.Status)
					return
				}

				bodyBytes, err := ioutil.ReadAll(resp.Body)
				if err != nil {
					log.Fatal(err)
				}
				bodyString := string(bodyBytes)
				log.Printf("Received body: %s", bodyString)
				log.Printf("Received headers: %v", resp.Header)
				if bodyString != "pong" {
					t.Fatalf("HTTP response body got %s want 'pong'", bodyString)
				}
				wg.Done()
			}
		}()
	})

	mux.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "pong")
	})

	log.Println("starting server")

	s := JSServer{
		Mux: mux,
	}
	go s.ListenAndServe(namespace)
}

// JSServer exposes an HTTP-like server interface which allows JS to 'send' requests to it.
type JSServer struct {
	// The router which will service requests
	Mux *http.ServeMux
}

// OnRequestFromJS is the function that JS will invoke when there is a new request.
// The JS function signature is:
//   function(reqString: string): Promise<{result: string, error: string}>
// Usage is like:
//   const res = await global._go_js_server.fetch(reqString);
//   if (res.error) {
//     // handle error: this is a 'network' error, not a non-2xx error.
//   }
//   const rawHttpResponse = res.result;
func (h *JSServer) OnRequestFromJS(this js.Value, args []js.Value) interface{} {
	// we HAVE to spawn a new goroutine and return immediately or else Go will deadlock
	// if this request blocks at all e.g for /sync calls
	httpStr := args[0].String()
	promise := js.Global().Get("Promise").New(js.FuncOf(func(pthis js.Value, pargs []js.Value) interface{} {
		// The initial callback code for new Promise() is also called on the critical path, which is why
		// we need to put this in an immediately invoked goroutine.
		go func() {
			resolve := pargs[0]
			fmt.Println("Received request:")
			fmt.Printf("%s\n", httpStr)
			resStr, err := h.handle(httpStr)
			errStr := ""
			if err != nil {
				errStr = err.Error()
			}
			fmt.Println("Sending response:")
			fmt.Printf("%s\n", resStr)
			resolve.Invoke(map[string]interface{}{
				"result": resStr,
				"error":  errStr,
			})
		}()
		return nil
	}))
	return promise
}

// handle invokes the http.ServeMux for this request and returns the raw HTTP response.
func (h *JSServer) handle(httpStr string) (resStr string, err error) {
	req, err := http.ReadRequest(bufio.NewReader(strings.NewReader(httpStr)))
	if err != nil {
		return
	}
	w := httptest.NewRecorder()

	h.Mux.ServeHTTP(w, req)

	res := w.Result()
	var resBuffer strings.Builder
	err = res.Write(&resBuffer)
	return resBuffer.String(), err
}

// ListenAndServe registers a variable in JS-land with the given namespace. This variable is
// a function which JS-land can call to 'send' HTTP requests. The function is attached to
// a global object called "_go_js_server". See OnRequestFromJS for more info.
func (h *JSServer) ListenAndServe(namespace string) {
	globalName := "_go_js_server"
	// register a hook in JS-land for it to invoke stuff
	server := js.Global().Get(globalName)
	if !server.Truthy() {
		server = js.Global().Get("Object").New()
		js.Global().Set(globalName, server)
	}

	server.Set(namespace, js.FuncOf(h.OnRequestFromJS))

	fmt.Printf("Listening for requests from JS on function %s.%s\n", globalName, namespace)
	// Block forever to mimic http.ListenAndServe
	select {}
}

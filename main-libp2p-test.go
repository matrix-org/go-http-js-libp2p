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

package main

import (
	"crypto/ed25519"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"

	"github.com/matrix-org/go-http-js-libp2p/go_http_js_libp2p"
)

var c chan struct{}

func init() {
	c = make(chan struct{})
}

func main() {
	_, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		panic(err)
	}

	node := go_http_js_libp2p.NewP2pLocalNode("org.matrix.p2p.experiment", priv.Seed(), []string{"/ip4/127.0.0.1/tcp/9090/ws/p2p-websocket-star/"})
	server(node)

	// due to https://github.com/golang/go/issues/27495 we can't override the DialContext
	// instead we have to provide a whole custom transport.
	client := &http.Client{
		Transport: go_http_js_libp2p.NewP2pTransport(node),
	}

	// try to ping every peer that we discover which supports this service
	node.RegisterFoundProvider(func(pi *go_http_js_libp2p.PeerInfo) {
		go func() {
			log.Printf("Trying to GET libp2p-http://%s/ping", pi.Id)

			req, err := http.NewRequest("GET", fmt.Sprintf("libp2p-http://%s/ping", pi.Id), nil)
			req.Header.Add("Testing-Headers", "testing")
			resp, err := client.Do(req)
			if err != nil {
				log.Fatal("Can't make request")
			}
			defer resp.Body.Close()

			if resp.StatusCode == http.StatusOK {
				bodyBytes, err := ioutil.ReadAll(resp.Body)
				if err != nil {
					log.Fatal(err)
				}
				bodyString := string(bodyBytes)
				log.Printf("Received body: %s", bodyString)
				log.Printf("Received headers: %r", resp.Header)
			}
		}()
	})

	<-c
}

func server(node *go_http_js_libp2p.P2pLocalNode) {
	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "pong")
	})

	log.Println("starting server")

	listener := go_http_js_libp2p.NewP2pListener(node)
	s := &http.Server{}
	go s.Serve(listener)
}

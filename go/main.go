// -*- coding: utf-8 -*-
// Copyright 2019 New Vector Ltd
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

import "fmt"
import "log"
import "io/ioutil"
import "net/http"

var c chan struct{}

func init() {
	c = make(chan struct{})
}

func main() {
	node := NewPeerLocalNode("matrix")
	server(node)

	// due to https://github.com/golang/go/issues/27495 we can't override the DialContext
	// instead we have to provide a whole custom transport.
	client := &http.Client{
		Transport: NewPeerTransport(node),
	}

	// try to ping every peer that we discover
	node.registerPeerDiscover(func(pi *peerInfo) {
		resp, err := client.Get(fmt.Sprintf("libp2p-http-rpc://%s/ping", pi.Id))
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
			log.Print(bodyString)
		}

	})

	<-c
}

func server(node *peerLocalNode) {
	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "pong")
	})

	log.Println("starting server")

	listener := NewPeerListener(node)
	s := &http.Server{}
	go s.Serve(listener)
}

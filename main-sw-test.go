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

import "fmt"
import "log"
import "io/ioutil"
import "net/http"
import "github.com/matrix-org/go-http-js-libp2p/go_http_js_libp2p"

var c chan struct{}

func init() {
	c = make(chan struct{})
}

func main() {
	server()

	<-c
}

func server() {
	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "pong")
	})

	log.Println("starting server")

	listener := go_http_js_libp2p.NewFetchListener()
	s := &http.Server{}
	go s.Serve(listener)
}

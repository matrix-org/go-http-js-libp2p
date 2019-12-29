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

import "io"
import "io/ioutil"
import "log"
import "strings"
import "net/http"
import "syscall/js"

type peerTransport struct {
	peerLocalNode *peerLocalNode
	jsPeerTransport js.Value
}

func NewPeerTransport(peerLocalNode *peerLocalNode) *peerTransport {
	bridge := js.Global().Get("bridge")
	pt := &peerTransport{
		peerLocalNode: peerLocalNode,
		jsPeerTransport: bridge.Call("newPeerTransport", peerLocalNode.Js()),
	}
	return pt
}

func (pt *peerTransport) RoundTrip(req *http.Request) (*http.Response, error) {

	// FIXME: support with streaming req bodies
	var body string
	if req.Body != nil {
		b, err := ioutil.ReadAll(req.Body)
		if err != nil {
			log.Fatal("failed to read req body")
		}
		body = string(b)
	}

	// FIXME: handle headers

	jsReq := js.ValueOf(map[string]interface{}{
		"method": req.Method,
		"url":    req.URL.String(), // FIXME: we could avoid compiling/reparsing the URI
		//"header": req.Header, // map[string][]string{}
		"body": body,
	})

	jsResponse, ok := Await(pt.jsPeerTransport.Call("roundTrip", jsReq))

	log.Printf("jsResponse is %+v, ok is %+v\n", jsResponse.Get("status"), ok)

	response := &http.Response{
		Status:     jsResponse.Get("status").String(),
		StatusCode: jsResponse.Get("statusCode").Int(),
		Proto:      "HTTP/1.0",
		ProtoMajor: 1,
		ProtoMinor: 0,
		// Header: map[string][]string{
		//     "Content-Type": {"text/plain"},
		// },
		Body:    NewPeerReadCloser(jsResponse.Get("body").String()), // FIXME: support streaming resp bodies
		Request: req,
	}

	return response, nil
}

/////////////

// taken from https://go-review.googlesource.com/c/go/+/150917

// Await waits until the promise v has been resolved or rejected and returns the promise's result value.
// The boolean value ok is true if the promise has been resolved, false if it has been rejected.
// If v is not a promise, v itself is returned as the value and ok is true.
func Await(v js.Value) (result js.Value, ok bool) {

	if v.Type() != js.TypeObject || v.Get("then").Type() != js.TypeFunction {
		return v, true
	}
	done := make(chan struct{})
	onResolve := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		result = args[0]
		ok = true
		close(done)
		return nil
	})
	defer onResolve.Release()
	onReject := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		result = args[0]
		ok = false
		close(done)
		return nil
	})
	defer onReject.Release()
	v.Call("then", onResolve, onReject)
	<-done
	return
}

/////////////

type peerReadCloser struct {
	reader io.Reader
}

func NewPeerReadCloser(body string) *peerReadCloser {
	return &peerReadCloser{
		reader: strings.NewReader(body),
	}
}

func (prc *peerReadCloser) Read(p []byte) (n int, err error) {
	return prc.reader.Read(p)
}

func (prc *peerReadCloser) Close() (err error) {
	return nil
}

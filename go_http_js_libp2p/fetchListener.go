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

package go_http_js_libp2p

import "net"
import "syscall/js"

// this uses the JS->Go HTTP interface to inject
// requests from a fetch listener, suitable for a service listener.

// TODO: Ideally we should factor the JS->Go HTTP interface into its own
// thing, for now we include this alongside the libp2p stuff with some
// duplication.

type fetchListener struct {
	jsFetchListener js.Value
	newConn        chan goJsConn
}

func NewFetchListener() *fetchListener {
	bridge := js.Global().Get("_go_http_bridge")

	fl := &fetchListener{
		jsFetchListener: bridge.Call("newFetchListener"),
		newConn:        make(chan goJsConn),
	}

	fl.jsFetchListener.Set("onGoJsConn", js.FuncOf(fl.onGoJsConn))

	return fl
}

func (fl *fetchListener) onGoJsConn(this js.Value, inputs []js.Value) interface{} {
	jsConn := inputs[0]
	conn := NewGoJsConn(jsConn)
	fl.newConn <- *conn
	return nil
}

// Accept waits for and returns the next connection to the listener.
func (fl *fetchListener) Accept() (net.Conn, error) {
	// block until we get told by JS about a new connection
	conn := <-fl.newConn
	return conn, nil
}

// Close closes the listener.
// Any blocked Accept operations will be unblocked and return errors.
func (pl *fetchListener) Close() error {
	return nil
}

// Addr returns the listener's network address.
func (pl *fetchListener) Addr() net.Addr {
	return nil
}

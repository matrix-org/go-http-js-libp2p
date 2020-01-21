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

type p2pListener struct {
	jsP2pListener js.Value
	newConn        chan goJsConn
	p2pLocalNode  *P2pLocalNode
}

func NewP2pListener(p2pLocalNode *P2pLocalNode) *p2pListener {
	bridge := js.Global().Get("bridge")

	pl := &p2pListener{
		jsP2pListener: bridge.Call("newP2pListener", p2pLocalNode.Js()),
		newConn:        make(chan goJsConn),
		p2pLocalNode:	p2pLocalNode,
	}

	pl.jsP2pListener.Set("onGoJsConn", js.FuncOf(pl.onGoJsConn))

	return pl
}

func (pl *p2pListener) onGoJsConn(this js.Value, inputs []js.Value) interface{} {
	jsConn := inputs[0]
	conn := NewGoJsConn(jsConn)
	pl.newConn <- *conn
	return nil
}

// Accept waits for and returns the next connection to the listener.
func (pl *p2pListener) Accept() (net.Conn, error) {
	// block until we get told by JS about a new connection
	conn := <-pl.newConn
	return conn, nil
}

// Close closes the listener.
// Any blocked Accept operations will be unblocked and return errors.
func (pl *p2pListener) Close() error {
	return nil
}

// Addr returns the listener's network address.
func (pl *p2pListener) Addr() net.Addr {
	return nil
}

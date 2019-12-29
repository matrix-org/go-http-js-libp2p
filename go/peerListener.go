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

import "net"
import "syscall/js"

type peerListener struct {
	jsPeerListener js.Value
	newConn        chan peerConn
	peerLocalNode  *peerLocalNode
}

func NewPeerListener(peerLocalNode *peerLocalNode) *peerListener {
	bridge := js.Global().Get("bridge")

	pl := &peerListener{
		jsPeerListener: bridge.Call("newPeerListener", peerLocalNode.Js()),
		newConn:        make(chan peerConn),
		peerLocalNode:	peerLocalNode,
	}

	pl.jsPeerListener.Set("onPeerConn", js.FuncOf(pl.onPeerConn))

	return pl
}

func (pl *peerListener) onPeerConn(this js.Value, inputs []js.Value) interface{} {
	jsConn := inputs[0]
	conn := NewPeerConn(jsConn)
	pl.newConn <- *conn
	return nil
}

// Accept waits for and returns the next connection to the listener.
func (pl *peerListener) Accept() (net.Conn, error) {
	// block until we get told by JS about a new connection
	conn := <-pl.newConn
	return conn, nil
}

// Close closes the listener.
// Any blocked Accept operations will be unblocked and return errors.
func (pl *peerListener) Close() error {
	return nil
}

// Addr returns the listener's network address.
func (pl *peerListener) Addr() net.Addr {
	return nil
}

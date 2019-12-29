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

import "syscall/js"
import "log"

type peerLocalNode struct {
	jsPeerLocalNode js.Value
	Service string

	// peers []peerInfo
	handlePeerDiscover func(*peerInfo)
	handlePeerConnect func(*peerInfo)
	handlePeerDisconnect func(*peerInfo)
}

func NewPeerLocalNode(service string) *peerLocalNode {
	bridge := js.Global().Get("bridge")

	jsPeerLocalNode, ok := Await(bridge.Call("newPeerLocalNode"))
	if !ok {
		log.Fatal("couldn't create newPeerLocalNode")
	}

	pn := &peerLocalNode{
		jsPeerLocalNode: jsPeerLocalNode,
		Service: service,
	}

	// set up js->go callbacks
	pn.jsPeerLocalNode.Set("onPeerDiscover", js.FuncOf(pn.onPeerDiscover))
	pn.jsPeerLocalNode.Set("onPeerConnect", js.FuncOf(pn.onPeerConnect))
	pn.jsPeerLocalNode.Set("onPeerDisconnect", js.FuncOf(pn.onPeerDisconnect))

	return pn
}

func (pn *peerLocalNode) Js() js.Value {
	return pn.jsPeerLocalNode
}

// func (pn *peerLocalNode) GetPeers() []peerInfo {
// 	return pn.peers
// }

func (pn *peerLocalNode) onPeerDiscover(this js.Value, inputs []js.Value) interface{} {
	pi := NewPeerInfo(inputs[0])
	// pn.peers = append(pn.peers, pi)
	if pn.handlePeerDiscover != nil {
		pn.handlePeerDiscover(pi)
	}
	return nil
}

func (pn *peerLocalNode) onPeerConnect(this js.Value, inputs []js.Value) interface{} {
	pi := NewPeerInfo(inputs[0])
	if pn.handlePeerConnect != nil {
		pn.handlePeerConnect(pi)
	}
	return nil
}

func (pn *peerLocalNode) onPeerDisconnect(this js.Value, inputs []js.Value) interface{} {
	pi := NewPeerInfo(inputs[0])
	if pn.handlePeerDiscover != nil {
		pn.handlePeerConnect(pi)
	}
	return nil
}

func (pn *peerLocalNode) registerPeerDiscover(handler func(*peerInfo)) {
	pn.handlePeerDiscover = handler
}

func (pn *peerLocalNode) registerPeerConnect(handler func(*peerInfo)) {
	pn.handlePeerConnect = handler
}

func (pn *peerLocalNode) registerPeerDisconnect(handler func(*peerInfo)) {
	pn.handlePeerDisconnect = handler
}
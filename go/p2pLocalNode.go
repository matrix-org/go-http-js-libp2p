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

import "syscall/js"
import "log"

type p2pLocalNode struct {
	jsP2pLocalNode js.Value
	Service string

	// peers []peerInfo
	handlePeerDiscover func(*peerInfo)
	handlePeerConnect func(*peerInfo)
	handlePeerDisconnect func(*peerInfo)
	handleFoundProvider func(*peerInfo)
}

func NewP2pLocalNode(service string) *p2pLocalNode {
	bridge := js.Global().Get("bridge")

	jsP2pLocalNode, ok := Await(bridge.Call("newP2pLocalNode", service))
	if !ok {
		log.Fatal("couldn't create newP2pLocalNode")
	}

	pn := &p2pLocalNode{
		jsP2pLocalNode: jsP2pLocalNode,
		Service: service,
	}

	// set up js->go callbacks
	pn.jsP2pLocalNode.Set("onPeerDiscover", js.FuncOf(pn.onPeerDiscover))
	pn.jsP2pLocalNode.Set("onPeerConnect", js.FuncOf(pn.onPeerConnect))
	pn.jsP2pLocalNode.Set("onPeerDisconnect", js.FuncOf(pn.onPeerDisconnect))
	pn.jsP2pLocalNode.Set("onFoundProvider", js.FuncOf(pn.onFoundProvider))

	return pn
}

func (pn *p2pLocalNode) Js() js.Value {
	return pn.jsP2pLocalNode
}

// func (pn *p2pLocalNode) GetPeers() []peerInfo {
// 	return pn.peers
// }

func (pn *p2pLocalNode) onPeerDiscover(this js.Value, inputs []js.Value) interface{} {
	pi := NewPeerInfo(inputs[0])
	// pn.peers = append(pn.peers, pi)
	if pn.handlePeerDiscover != nil {
		pn.handlePeerDiscover(pi)
	}
	return nil
}

func (pn *p2pLocalNode) onPeerConnect(this js.Value, inputs []js.Value) interface{} {
	pi := NewPeerInfo(inputs[0])
	if pn.handlePeerConnect != nil {
		pn.handlePeerConnect(pi)
	}
	return nil
}

func (pn *p2pLocalNode) onPeerDisconnect(this js.Value, inputs []js.Value) interface{} {
	pi := NewPeerInfo(inputs[0])
	if pn.handlePeerDisconnect != nil {
		pn.handlePeerDisconnect(pi)
	}
	return nil
}

func (pn *p2pLocalNode) onFoundProvider(this js.Value, inputs []js.Value) interface{} {
	pi := NewPeerInfo(inputs[0])
	if pn.handleFoundProvider != nil {
		pn.handleFoundProvider(pi)
	}
	return nil
}

func (pn *p2pLocalNode) registerPeerDiscover(handler func(*peerInfo)) {
	pn.handlePeerDiscover = handler
}

func (pn *p2pLocalNode) registerPeerConnect(handler func(*peerInfo)) {
	pn.handlePeerConnect = handler
}

func (pn *p2pLocalNode) registerPeerDisconnect(handler func(*peerInfo)) {
	pn.handlePeerDisconnect = handler
}

func (pn *p2pLocalNode) registerFoundProvider(handler func(*peerInfo)) {
	pn.handleFoundProvider = handler
}
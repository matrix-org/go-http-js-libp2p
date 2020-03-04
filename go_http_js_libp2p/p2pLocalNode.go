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

import "syscall/js"
import "log"
import "strconv"

type P2pLocalNode struct {
	jsP2pLocalNode js.Value
	Service        string
	Id             string

	// peers []PeerInfo
	handlePeerDiscover   func(*PeerInfo)
	handlePeerConnect    func(*PeerInfo)
	handlePeerDisconnect func(*PeerInfo)
	handleFoundProvider  func(*PeerInfo)
}

func NewP2pLocalNode(service string, addrs []string) *P2pLocalNode {
	bridge := js.Global().Get("_go_http_bridge")

	var jsAddrs js.Value
	jsAddrs = js.Global().Get("Array").New()
	for i, addr := range addrs {
		jsAddrs.Set(strconv.Itoa(i), addr)
	}

	jsP2pLocalNode, ok := Await(bridge.Call("newP2pLocalNode", service, jsAddrs))
	if !ok {
		log.Fatal("couldn't create newP2pLocalNode")
	}

	pn := &P2pLocalNode{
		jsP2pLocalNode: jsP2pLocalNode,
		Service:        service,
		Id:             jsP2pLocalNode.Get("idStr").String(),
	}

	// set up js->go callbacks
	pn.jsP2pLocalNode.Set("onPeerDiscover", js.FuncOf(pn.onPeerDiscover))
	pn.jsP2pLocalNode.Set("onPeerConnect", js.FuncOf(pn.onPeerConnect))
	pn.jsP2pLocalNode.Set("onPeerDisconnect", js.FuncOf(pn.onPeerDisconnect))
	pn.jsP2pLocalNode.Set("onFoundProvider", js.FuncOf(pn.onFoundProvider))

	return pn
}

func (pn *P2pLocalNode) Js() js.Value {
	return pn.jsP2pLocalNode
}

// func (pn *p2pLocalNode) GetPeers() []PeerInfo {
// 	return pn.peers
// }

func (pn *P2pLocalNode) onPeerDiscover(this js.Value, inputs []js.Value) interface{} {
	pi := NewPeerInfo(inputs[0])
	// pn.peers = append(pn.peers, pi)
	if pn.handlePeerDiscover != nil {
		pn.handlePeerDiscover(pi)
	}
	return nil
}

func (pn *P2pLocalNode) onPeerConnect(this js.Value, inputs []js.Value) interface{} {
	pi := NewPeerInfo(inputs[0])
	if pn.handlePeerConnect != nil {
		pn.handlePeerConnect(pi)
	}
	return nil
}

func (pn *P2pLocalNode) onPeerDisconnect(this js.Value, inputs []js.Value) interface{} {
	pi := NewPeerInfo(inputs[0])
	if pn.handlePeerDisconnect != nil {
		pn.handlePeerDisconnect(pi)
	}
	return nil
}

func (pn *P2pLocalNode) onFoundProvider(this js.Value, inputs []js.Value) interface{} {
	pi := NewPeerInfo(inputs[0])
	if pn.handleFoundProvider != nil {
		pn.handleFoundProvider(pi)
	}
	return nil
}

func (pn *P2pLocalNode) RegisterPeerDiscover(handler func(*PeerInfo)) {
	pn.handlePeerDiscover = handler
}

func (pn *P2pLocalNode) RegisterPeerConnect(handler func(*PeerInfo)) {
	pn.handlePeerConnect = handler
}

func (pn *P2pLocalNode) RegisterPeerDisconnect(handler func(*PeerInfo)) {
	pn.handlePeerDisconnect = handler
}

func (pn *P2pLocalNode) RegisterFoundProvider(handler func(*PeerInfo)) {
	pn.handleFoundProvider = handler
}

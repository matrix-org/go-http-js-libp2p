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

import PeerListener from './peerListener.js'
import PeerLocalNode from './peerLocalNode.js'
import PeerTransport from './peerTransport.js'

global.bridge = {
    newPeerLocalNode: async (service) => {
        const peerLocalNode = new PeerLocalNode(service)
        await peerLocalNode.init()
        return peerLocalNode
    },
    newPeerTransport: (peerLocalNode) => {
        return new PeerTransport(peerLocalNode)
    },
    newPeerListener: (peerLocalNode) => {
        return new PeerListener(peerLocalNode)
    },
}

async function test() {
    const pln = await bridge.newPeerLocalNode("matrix")
    const pt = bridge.newPeerTransport(pln)
    const pl = bridge.newPeerListener(pln)
    pln.onFoundProvider = async function(pi) {
        if (location.hash != '#server') {
            const req = {
                url: "libp2p-http-rpc://" + pi.id.toB58String() + "/ping",
                method: "GET",
                body: ""
            }
            await pt.roundTrip(req)
        }
    }
    pl.onPeerConn = async function(peerConn) {
        console.log("reading from peerConn:", await peerConn.read())
        peerConn.write("HTTP/1.0 200 OK")
    }
}
test();
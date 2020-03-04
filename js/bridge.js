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

import P2pListener from './p2pListener.js'
import P2pLocalNode from './p2pLocalNode.js'
import P2pTransport from './p2pTransport.js'
import FetchListener from './fetchListener.js'

global._go_http_bridge = {
    newP2pLocalNode: async (service, addrs) => {
        try {
            const p2pLocalNode = new P2pLocalNode(service, addrs);
            await p2pLocalNode.init();
            return p2pLocalNode;
        }
        catch (err) {
            console.error("Failed to create newP2pLocalNode: ", err);
        }
    },
    newP2pTransport: (p2pLocalNode) => {
        return new P2pTransport(p2pLocalNode)
    },
    newP2pListener: (p2pLocalNode) => {
        return new P2pListener(p2pLocalNode)
    },
    newFetchListener: () => {
        // FIXME: global hack
        global.fetchListener = new FetchListener()
        console.log("Assigned global fetcher listener")
        return global.fetchListener
    },
}

/*
async function test() {
    const pln = await _go_http_bridge.newP2pLocalNode("matrix")
    const pt = _go_http_bridge.newP2pTransport(pln)
    const pl = _go_http_bridge.newP2pListener(pln)
    pln.onFoundProvider = async function(pi) {
        if (location.hash != '#server') {
            const req = {
                url: "libp2p-http://" + pi.id.toB58String() + "/ping",
                method: "GET",
                body: ""
            }
            const resp = await pt.roundTrip(req)
            console.log(resp)
        }
    }
    pl.onGoJsConn = async function(goJsConn) {
        console.log("reading from goJsConn:", await goJsConn.read())
        goJsConn.write("HTTP/1.0 200 OK")
    }
}
test();
*/

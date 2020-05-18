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

import P2pLocalNode from './p2pLocalNode.js'
import P2pTransport from './p2pTransport.js'

global._go_libp2p_nodes = [];

global._go_http_bridge = {
    newP2pLocalNode: async (service, seed, addrs, namespace) => {
        try {
            const p2pLocalNode = new P2pLocalNode(service, seed, addrs, namespace);
            await p2pLocalNode.init();
            global._go_libp2p_nodes.push(p2pLocalNode);
            return p2pLocalNode;
        }
        catch (err) {
            console.error("Failed to create newP2pLocalNode: ", err);
        }
    },
    newP2pTransport: (p2pLocalNode) => {
        return new P2pTransport(p2pLocalNode)
    },
}


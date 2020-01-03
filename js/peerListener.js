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

import { pull } from "pull-stream"
import Pushable from "pull-pushable"
const p = Pushable()

class PeerListener {

    peerLocalNode

    constructor(peerLocalNode) {
        this.peerLocalNode = peerLocalNode

        const node = peerLocalNode.node
        node.handle('/libp2p-http-rpc/1.0.0', (protocol, conn) => {
            // create the go-server-facing side of the connection
            const peerConn = new PeerConn(conn.source, conn.dest)
            this.onPeerConn(peerConn)

            // wire the libp2p conn <-> the go-server
            pull(
                p,
                conn
            )
  
            pull(
                conn,
                pull.drain(peerConn.fillReadSink)
            )

            pull(
                peerConn.consumeWriteSource,
                pull.drain(conn)
            )
        })        
    }

    // implemented in Go
    // onPeerConn() {}
}

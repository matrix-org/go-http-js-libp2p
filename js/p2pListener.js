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

import { pull } from "pull-stream"

import GoJsConn from './p2pConn.js'

import { promisify } from "es6-promisify"

export default class P2pListener {

    constructor(p2pLocalNode) {
        this.p2pLocalNode = p2pLocalNode

        const node = p2pLocalNode.node
        node.handle('/libp2p-http/1.0.0', async (protocol, conn) => {
            const getPeerInfo = promisify(conn.getPeerInfo.bind(conn))
            const pi = await getPeerInfo()

            // create the go-server-facing side of the connection
            const p2pConn = new GoJsConn(p2pLocalNode.node.idStr, pi.id.toB58String())
            this.onGoJsConn(p2pConn)
  
            pull(
                conn,
                p2pConn.fillReadSink.bind(p2pConn),
            )

            pull(
                p2pConn.consumeWriteSource.bind(p2pConn),
                conn,
            )
        })        
    }

    // implemented in Go
    // onGoJsConn(p2pConn) {}
}

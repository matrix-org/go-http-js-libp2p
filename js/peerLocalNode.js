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

'use strict'

import PeerInfo from "peer-info"
import Node from "./browser-bundle"

import { promisify } from "es6-promisify"
const createPeerInfo = promisify(PeerInfo.create);

export default class PeerLocalNode {

    async init() {
        this.peerInfo = await createPeerInfo()

        const peerIdStr = peerInfo.id.toB58String() 
        const webrtcAddr = `/dns4/star-signal.cloud.ipfs.team/tcp/443/wss/p2p-webrtc-star/p2p/${peerIdStr}`
        const wsAddr = `/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star`

        peerInfo.multiaddrs.add(webrtcAddr)
        peerInfo.multiaddrs.add(wsAddr)

        const node = new Node({
            peerInfo
        })

        this.node = node

        node.idStr = peerIdStr

        node.on('peer:discovery', (peerInfo) => {
            console.log('Discovered a peer:', peerInfo.id.toB58String())
            // tell go
            if (this.onPeerDiscover) this.onPeerDiscover(peerInfo)
        })

        node.on('peer:connect', (peerInfo) => {
            const idStr = peerInfo.id.toB58String()
            console.log('Got connection to: ' + idStr)
            // tell go
            if (this.onPeerConnect) this.onPeerConnect(peerInfo)
        })

        node.on('peer:disconnect', (peerInfo) => {
            const idStr = peerInfo.id.toB58String()
            // tell go
            if (this.onPeerDisonnect) this.onPeerDisconnect(peerInfo)
        })

        node.start((err) => {
            if (err) {
                return console.log(err)
            }

            console.log(`Node ${peerIdStr} is listening o/`)
            node.peerInfo.multiaddrs.toArray().forEach(ma => {
                console.log("Listening on: ", ma.toString())
            })

            // NOTE: to stop the node
            // node.stop((err) => {})
        })
    }

    // implemented in Go:
    // onPeerDiscover(peerInfo) {}
    // onPeerConnect(peerInfo) {}
    // onPeerDisconnect(peerInfo) {}
}

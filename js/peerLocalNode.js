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

'use strict'

import PeerInfo from "peer-info"
import Node from "./browser-bundle"
import CID from "cids"
import multihashing from "multihashing-async"

import { promisify } from "es6-promisify"
const createPeerInfo = promisify(PeerInfo.create);

export default class PeerLocalNode {

    constructor(service) {
        this.service = service
    }

    async init() {
        const peerInfo = await createPeerInfo()

        const peerIdStr = peerInfo.id.toB58String() 
//      const webrtcAddr = `/dns4/star-signal.cloud.ipfs.team/tcp/443/wss/p2p-webrtc-star/p2p/${peerIdStr}`
//      const wsAddr = `/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star`
//      peerInfo.multiaddrs.add(webrtcAddr)
//      peerInfo.multiaddrs.add(wsAddr)

        const wsAddr = `/ip4/127.0.0.1/tcp/9090/ws/p2p-websocket-star/`
        peerInfo.multiaddrs.add(wsAddr)

        const node = new Node({
            peerInfo
        })

        this.node = node

        node.idStr = peerIdStr

        node.on('peer:discovery', (pi) => {
            console.debug('Discovered a peer:', pi.id.toB58String())
            // tell go
            if (this.onPeerDiscover) this.onPeerDiscover(pi)
        })

        node.on('peer:connect', (pi) => {
            const idStr = pi.id.toB58String()
            console.debug('Got connection to: ' + idStr)
            // tell go
            if (this.onPeerConnect) this.onPeerConnect(pi)
        })

        node.on('peer:disconnect', (pi) => {
            const idStr = pi.id.toB58String()
            // tell go
            if (this.onPeerDisonnect) this.onPeerDisconnect(pi)
        })

        const hash = await multihashing(Buffer.from(this.service), 'sha2-256')
        const cid = new CID(1, 'dag-pb', hash)

        const findProviders = () => {
            node.contentRouting.findProviders(cid, { maxTimeout: 5000 }, (err, providers) => {
                if (err) { throw err }
                console.log('Found providers:', providers.map(p => p.id.toB58String()))
                providers = providers.filter(p => p.id.toB58String() != peerIdStr)
                if (this.onFoundProvider) {
                    for (const p of providers) {
                        this.onFoundProvider(p)
                    }
                }
                setTimeout(findProviders, 5000)
            })
        }

        node.start((err) => {
            if (err) {
                return console.log(err)
            }

            // advertise our magic CID to announce our participation in this specific network
            node.contentRouting.provide(cid, (err) => {
                if (err) { throw err }
                console.log('Node %s is providing %s', peerIdStr, cid.toBaseEncodedString())
            })

            console.log(`Node ${peerIdStr} is listening o/`)
            node.peerInfo.multiaddrs.toArray().forEach(ma => {
                console.log("Listening on: ", ma.toString())
            })

            findProviders()

            // NOTE: to stop the node
            // node.stop((err) => {})
        })
    }

    // implemented in Go:
    // onPeerDiscover(peerInfo) {}
    // onPeerConnect(peerInfo) {}
    // onPeerDisconnect(peerInfo) {}
    // onFoundProvider(peerInfo) {}
}

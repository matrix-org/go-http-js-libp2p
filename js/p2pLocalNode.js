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
import PeerId from "peer-id"
import Node from "./browser-bundle"
import CID from "cids"
import multihashing from "multihashing-async"
import cryptoKeys  from 'libp2p-crypto/src/keys'

import { promisify } from "es6-promisify"
const generateKeyPairFromSeed = promisify(cryptoKeys.generateKeyPairFromSeed)

export default class P2pLocalNode {

    /**
     * Construct a new P2P local node
     * @param { } service  service name
     * @param {*} seed Uint8Array: the 32 byte ed25519 private key seed (RFC 8032)
     * @param {*} addrs addresses to listen for traffic on.
     */
    constructor(service, seed, addrs) {
        console.log(`p2plocalnode called with ${service} and ${addrs} with seed`)
        this.service = service
        this.addrs = addrs
        this.seed = seed;
    }

    async init() {
        console.log(`init existing ed25519 key from seed`)
        const key = await generateKeyPairFromSeed("ed25519", this.seed)
        console.log("JS: public key bytes:", key._publicKey)
        const peerId = await PeerId.createFromPrivKey(key.bytes)
        const peerInfo = new PeerInfo(peerId)

        const peerIdStr = peerInfo.id.toB58String() 
//      const webrtcAddr = `/dns4/star-signal.cloud.ipfs.team/tcp/443/wss/p2p-webrtc-star/p2p/${peerIdStr}`
//      const wsAddr = `/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star`
//      peerInfo.multiaddrs.add(webrtcAddr)
//      peerInfo.multiaddrs.add(wsAddr)

        for (const addr of this.addrs) {
            peerInfo.multiaddrs.add(addr)
        }

        console.log(`added`, peerInfo);
	    console.log("id: " + JSON.stringify(peerInfo.id));

        const node = new Node({
            peerInfo
        })

        this.node = node

        this.idStr = peerIdStr


        let discoveredPeers = 0;
        node.on('peer:discovery', (pi) => {
            discoveredPeers += 1;
            if (discoveredPeers < 20) {
                console.debug('Discovered a peer:', pi.id.toB58String());
            } else if (discoveredPeers === 20) {
                console.debug("Discovered many peers: silencing output.");
            }

            // tell go
            if (this.onPeerDiscover) this.onPeerDiscover(pi)
        })

        let connectedPeers = 0;
        node.on('peer:connect', (pi) => {
            connectedPeers += 1;
            const idStr = pi.id.toB58String()
            if (connectedPeers < 20) {
                console.debug('Got connection to: ' + idStr)
            } else if (connectedPeers === 20) {
                console.debug("Connected to many peers: silencing output.");
            }
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
                console.log('Connected peers: ', connectedPeers, " Discovered peers: ", discoveredPeers, ' Found providers:', providers.map(p => p.id.toB58String()))
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
                console.error(err);
                return;
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

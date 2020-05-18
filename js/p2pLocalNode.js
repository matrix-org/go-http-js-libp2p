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
import { pull } from "pull-stream"
import concat from "pull-stream/sinks/concat"

import { promisify } from "es6-promisify"
const generateKeyPairFromSeed = promisify(cryptoKeys.generateKeyPairFromSeed)
const createPeerInfo = promisify(PeerInfo.create);
const createPeerId = promisify(PeerId.create);
const createFromPrivKey = promisify(PeerId.createFromPrivKey)

export default class P2pLocalNode {

    /**
     * Construct a new P2P local node
     * @param { } service  service name
     * @param {*} seed Uint8Array: the 32 byte ed25519 private key seed (RFC 8032)
     * @param {*} addrs addresses to listen for traffic on.
     * @param {string} cbNamespace The namespace that will be called on _go_js_server, defaults to 'p2p'.
     */
    constructor(service, seed, addrs, cbNamespace) {
        console.log(`P2pLocalNode called with ${service} and ${addrs} with seed`)
        this.service = service
        this.addrs = addrs
        this.seed = seed;
        this.cbNamespace = cbNamespace || 'p2p';
    }

    stop() {
        this.node.stop();
    }

    async init() {
        const key = await generateKeyPairFromSeed("ed25519", this.seed)
        const peerId = await createFromPrivKey(key.bytes)
        const peerInfo = new PeerInfo(peerId)

        const peerIdStr = peerInfo.id.toB58String() 

        for (const addr of this.addrs) {
            peerInfo.multiaddrs.add(addr)
        }

	    console.log(peerIdStr,": Starting up");

        const node = new Node({
            peerInfo
        })

        this.node = node

        this.idStr = peerIdStr


        let discoveredPeersSet = new Set();
        node.on('peer:discovery', (pi) => {
            discoveredPeersSet.add(pi.id.toB58String())
            if (discoveredPeersSet.size < 20) {
                console.debug('Discovered a peer:', pi.id.toB58String());
            } else if (discoveredPeersSet.size === 20) {
                console.debug("Discovered many peers: silencing output.");
            }

            // tell go
            if (this.onPeerDiscover) this.onPeerDiscover(pi)
        })

        let connPeersSet = new Set();
        node.on('peer:connect', (pi) => {
            const idStr = pi.id.toB58String()
            connPeersSet.add(idStr);
            if (connPeersSet.size < 20) {
                console.debug('Got connection to: ' + idStr)
            } else if (connPeersSet.size === 20) {
                console.debug("Connected to many peers: silencing output.");
            }
            // tell go
            if (this.onPeerConnect) this.onPeerConnect(pi)
        })

        node.on('peer:disconnect', (pi) => {
            const idStr = pi.id.toB58String()
            connPeersSet.delete(idStr)
            console.debug(idStr + " went away")
            // tell go
            if (this.onPeerDisonnect) this.onPeerDisconnect(pi)
        })

        const hash = await multihashing(Buffer.from(this.service), 'sha2-256')
        const cid = new CID(1, 'dag-pb', hash)

        const findProviders = () => {
            node.contentRouting.findProviders(cid, { maxTimeout: 5000 }, (err, providers) => {
                if (err) {
                    setTimeout(findProviders, 30 * 1000)
                    console.error("Failed to find providers:", err)
                    return
                }
                console.log('Connected peers: ', connPeersSet.size, " Discovered peers: ", discoveredPeersSet.size, ' Found providers:', providers.map(p => p.id.toB58String()))
                providers = providers.filter(p => p.id.toB58String() != peerIdStr)
                if (this.onFoundProviders) {
                    this.onFoundProviders(providers)
                }
                setTimeout(findProviders, 5000)
            })
        }

        const provideContent = () => {
            console.log(peerIdStr, ": Attempting to provide ", cid.toBaseEncodedString())
            // advertise our magic CID to announce our participation in this specific network
            node.contentRouting.provide(cid, (err) => {
                if (err) {
                    console.error("failed to provide CID:", cid, err)
                    throw err;
                }
                console.log('Node %s is providing %s', peerIdStr, cid.toBaseEncodedString())
            })

            setTimeout(provideContent, 1000 * 60 * 5); // every 5min
        }

        node.start((err) => {
            if (err) {
                console.error(peerIdStr, ": p2p start node error:",err);
                return;
            }

            provideContent();

            console.log(`${peerIdStr} is listening o/`)
            node.peerInfo.multiaddrs.toArray().forEach(ma => {
                console.log("Listening on: ", ma.toString())
            })

            findProviders()
            // NOTE: to stop the node
            // node.stop((err) => {})
        })

        const protocol = '/libp2p-http/1.0.0';
        node.handle(protocol, async (protocol, conn) => {
            const getPeerInfo = promisify(conn.getPeerInfo.bind(conn))
            const pi = await getPeerInfo()
            console.log(peerIdStr, ": incoming conn from ", pi.id.toB58String())

            let reqBuffer = ''
            let reqResolve
            const reqPromise = new Promise((resolve, reject) => { reqResolve = resolve })
            pull(
                conn,
                concat((err, data) => {
                    if (err) throw err
                    reqBuffer = data
                    reqResolve(reqBuffer)
                }),
            )
            const reqString = await reqPromise;
            const result = await global._go_js_server[this.cbNamespace](reqString)
            let respString = ''
            if (result.error) {
                console.error(`p2pLocalNode: Error for request: ${result.error}`)
                console.error(reqString)
                // TODO: Send some error response?
            } else {
                respString = result.result;
                console.log(respString);
            }
            pull(
                pull.values([respString]),
                conn,
            )
        })
        console.log(peerIdStr, ": awaiting p2p connections for protocol: ", protocol);  
    }

    // implemented in Go:
    // onPeerDiscover(peerInfo) {}
    // onPeerConnect(peerInfo) {}
    // onPeerDisconnect(peerInfo) {}
    // onFoundProviders([]peerInfo) {}
}

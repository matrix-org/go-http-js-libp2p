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
     */
    constructor(service, seed, addrs) {
        console.log(`p2plocalnode called with ${service} and ${addrs} with seed`)
        this.service = service
        this.addrs = addrs
        this.seed = seed;
    }

    async init() {
        console.log(`init existing ed25519 key from seed...`)
        const key = await generateKeyPairFromSeed("ed25519", this.seed)
        const peerId = await createFromPrivKey(key.bytes)
        console.log("Public key bytes: ", key.public)
        const peerInfo = new PeerInfo(peerId)

        const peerIdStr = peerInfo.id.toB58String() 

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
                if (err) {
                    setTimeout(findProviders, 30 * 1000)
                    console.error("Failed to find providers:", err)
                    return
                }
                console.log('Connected peers: ', connectedPeers, " Discovered peers: ", discoveredPeers, ' Found providers:', providers.map(p => p.id.toB58String()))
                providers = providers.filter(p => p.id.toB58String() != peerIdStr)
                if (this.onFoundProviders) {
                    this.onFoundProviders(providers)
                }
                setTimeout(findProviders, 5000)
            })
        }

        console.log("p2p starting now")
        node.start((err) => {
            if (err) {
                console.error("p2p start node error:",err);
                return;
            }

            // advertise our magic CID to announce our participation in this specific network
            node.contentRouting.provide(cid, (err) => {
                if (err) { throw err }
                console.log('Node %s is providing %s', peerIdStr, cid.toBaseEncodedString())
            })

            console.log(`p2p Node ${peerIdStr} is listening o/`)
            node.peerInfo.multiaddrs.toArray().forEach(ma => {
                console.log("Listening on: ", ma.toString())
            })

            findProviders()

            // NOTE: to stop the node
            // node.stop((err) => {})
        })

        const protocol = '/libp2p-http/1.0.0';
        console.log("Preparing handler for protocol: ", protocol)
        node.handle(protocol, async (protocol, conn) => {
            const getPeerInfo = promisify(conn.getPeerInfo.bind(conn))
            const pi = await getPeerInfo()
            console.log("Incoming: ", pi.id.toB58String(), " -> ", peerIdStr)

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
            const result = await global._go_js_server.p2p(reqString)
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

            
/*

            let readBuf = '';
            let writeBuf = '';
            let writeCb;
            pull(conn, function(read) {
                read(null, function next(end, data) {
                    if (end === true) return
                    if (end) throw end
                    const reqString = new TextDecoder("utf-8").decode(data);
                    global._go_js_server.p2p(reqString).then((res) => {
                        if (res.error) {
                            console.error(`p2pLocalNode: Error for request: ${res.error}`)
                            console.error(reqString)
                        } else {
                            const respString = res.result;
                            writeBuf = respString;
                            console.log("p2pLocalNode Assigned write buffer:")
                            console.log(respString);
                            if (writeCb) {
                                console.log("p2pLocalNode invoking writeCb")
                                writeCb(null, writeBuf)
                            }
                        }
                        read(null, next)
                    })
                })
            });

            pull(
                pull.values([reqString]),
                conn,
            )

            pull(function (end, cb) {
                console.log("p2pLocalNode pull fn called, end:",end)
                if (end) return cb(end)
                if (writeBuf.length > 0) {
                    // FIXME: only return true if the connection is closed and this is the end of the stream
                    console.log("p2pLocalNode invoking callback with data:")
                    console.log(writeBuf);
                    cb(true, writeBuf)
                    writeBuf = ''
                }
                else {
                    console.log("Deferring callback")
                    // defer the callback
                    writeCb = cb
                }
            }, conn)
            return;
            pull(
                conn,
                goJsConn.fillReadSink.bind(goJsConn),
            )

            pull(
                goJsConn.consumeWriteSource.bind(goJsConn),
                conn,
            ) */
        })
        console.log("Awaiting p2p connections for protocol: ", protocol);  
    }

    // implemented in Go:
    // onPeerDiscover(peerInfo) {}
    // onPeerConnect(peerInfo) {}
    // onPeerDisconnect(peerInfo) {}
    // onFoundProviders([]peerInfo) {}
}

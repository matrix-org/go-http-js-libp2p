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
import concat from "pull-stream/sinks/concat"

import PeerInfo from "peer-info"
import PeerId from "peer-id"

import { promisify } from "es6-promisify"


export default class PeerTransport {

    constructor(peerLocalNode) {
        this.peerLocalNode = peerLocalNode
    }

    async roundTrip(req) {
        console.log("<<< ", req)

        // figure out what address we're connecting to
        // we can't use the url npm module, as it lowercases the host
        // we can't use the browser's Url module, as it doesn't parse hosts for unknown URI schemes
        const host = (req.url.match(/^libp2p-http-rpc:\/\/(.*?)\//))[1]
        const destPeerId = PeerId.createFromB58String(host)
        const destPeerInfo = new PeerInfo(destPeerId)

        // dial out over libp2p
        const node = this.peerLocalNode.node
        const dial = promisify(node.dialProtocol)
        const conn = await dial(destPeerInfo, '/libp2p-http-rpc/1.0.0')

        // the world's dumbest HTTP client.
        // it would be much better to hook up go's HTTP client (and then we'd get HTTP/2 etc)
        // but we can't because https://github.com/golang/go/issues/27495
        const reqString = `${req.method} ${req.url} HTTP/1.0\r\n\r\n${req.body}`
        pull(
            pull.values([reqString]),
            conn,
        )

        let respResolve
        const respPromise = new Promise((resolve, reject) => { respResolve = resolve })

        let respString
        pull(
            conn,
            concat((err, data) => {
                if (err) throw err
                respString = data
                respResolve()
            }),
        )

        await respPromise
        const m = respString.match(/^(HTTP\/1.0) ((.*?) (.*?))(\r\n(.*?)?(\r\n\r\n(.*?)))?$/)
        if (!m) {
            console.warn("couldn't parse resp", respString)
        }
        const headers = m[6]
        const resp = {
            "proto": m[1],
            "status": m[2],
            "statusCode": parseInt(m[3]),
            "body": m[8],
        }

        /*
        // loopback straight to the peerListener
        const listener = global.peerListener
        if (!listener) {
            console.warn("no peerListener!")
        }
        if (!listener.onPeerConn) {
            console.warn("no onPeerConn!")
        }

        const conn = new PeerConn("0.0.0.0", "0.0.0.0")
        listener.onPeerConn(conn)

        const reqString = `${req.method} ${req.url} HTTP/1.0\r\n\r\n${req.body}`
        console.log("trying to send request", reqString)
        conn.fillRead(reqString)
        console.log("sent request", reqString)

        console.log("trying to read response")
        const respString = await conn.consumeWrite()
        console.log("read response", respString)
        const m = respString.match(/^(HTTP\/1.0) ((.*?) (.*?))\r\n(.*)?(\r\n\r\n(.*?))$/s)
        if (!m) {
            console.warn("couldn't parse resp", respString)
        }
        const headers = m[5]
        const resp = {
            "proto": m[1],
            "status": m[2],
            "statusCode": parseInt(m[3]),
            "body": m[7],
        }
        */

        /*
        // respond with a dumb 200 OK

        const resp = {
            "status": "HTTP/1.0 200 OK",
            "statusCode": 200,
            "headers": {
                "Content-Type": [ "text/plain" ],
            },
            "body": "I am a fish",
        }
        console.log(">>> ", resp)
        */

        return resp
    }
}

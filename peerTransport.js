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

class PeerTransport {

    async roundTrip(req) {
        console.log("<<< ", req)

        // loopback straight to the peerListener
        const listener = global.peerListener
        if (!listener) {
            console.fatal("no peerListener!")
        }
        if (!listener.onPeerConn) {
            console.fatal("no onPeerConn!")
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
            console.fatal("couldn't parse resp", respString)
        }
        const headers = m[5]
        const resp = {
            "proto": m[1],
            "status": m[2],
            "statusCode": parseInt(m[3]),
            "body": m[7],
        }

        /*
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

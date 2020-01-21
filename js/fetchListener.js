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

import GoJsConn from './goJsConn.js'

import { promisify } from "es6-promisify"

export default class FetchListener {

    constructor() {
    }

    onFetch(event) {
        // create the go-server-facing side of the connection
        const goJsConn = new GoJsConn("localhost", "localhost")
        this.onGoJsConn(goJsConn)

        /*
        const reqStream = event.request.body
        const reqReader = reqStream.getReader()

        // wire the reqStream to the goJsConn's readSink
        reqStream.pipeTo(new WriteableStream({
            write(chunk) {
                return new Promise((resolve, reject) => {
                    goJsConn.fillRead(chunk)
                    resolve()
                })
            },
            close() {
                console.log("trying to close request reader")
                // FIXME: hook up close
            },
            abort() {
                console.log("request reader aborted")
            }
        })).then(()=>{
            console.log("finished piping request to go")
        })
        */

        const req = event.request
        const reqString = `${req.method} ${req.url} HTTP/1.0\r\n\r\n${req.body}`
        // todo headers
        // todo streaming body
        goJsConn.fillRead(reqString)

        // wire the respStream to the goJsConn's writeSource
        const respStream = new ReadableStream({
            pull(controller) {
                goJsConn.consumeWriteSource(null, (chunk)=>{
                    controller.enqueue(chunk)
                })
            },
            cancel(controller) {
                goJsConn.consumeWriteSource(true)
            }
        })

        const resp = new Response(respStream, {
            status: 200,
        })

        return resp
    }


    // implemented in Go
    // onGoJsConn(goJsConn) {}
}

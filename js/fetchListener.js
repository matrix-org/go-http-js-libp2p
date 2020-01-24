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

import { pull } from "pull-stream"
import concat from "pull-stream/sinks/concat"

import { promisify } from "es6-promisify"

export default class FetchListener {

    constructor() {
    }

    async onFetch(event) {
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
        let reqHeaders = ''
        if (req.headers) {
            for (const header of req.headers) {
                // FIXME: is this a safe header encoding?
                reqHeaders += `${header[0]}: ${header[1]}\n`
            }
        }
        if (reqHeaders.length > 0) {
            reqHeaders = `\r\n${reqHeaders}`
        }

        const reqString = `${req.method} ${req.url} HTTP/1.0${reqHeaders}\r\n\r\n${req.bodyUsed ? req.body : ''}`
        // todo headers
        // todo streaming body
        goJsConn.fillRead(reqString)

        // we pull the http response out of go and parse it
        // FIXME: stream the response body
        // XXX: duplicated from p2pTransport
        let respResolve
        const respPromise = new Promise((resolve, reject) => { respResolve = resolve })

        let respString
        pull(
            goJsConn.consumeWriteSource.bind(goJsConn),
            concat((err, data) => {
                if (err) throw err
                respString = data
                respResolve()
            }),
        )

        await respPromise
        const m = respString.match(/^(HTTP\/1.0) ((.*?) (.*?))(\r\n([^]*?)?(\r\n\r\n([^]*?)))?$/)
        if (!m) {
            console.warn("couldn't parse resp", respString)
        }
        const response = {
            "proto": m[1],
            "status": m[2],
            "statusCode": parseInt(m[3]),
            "headers": m[6],
            "body": m[8],
        }

        const respHeaders = new Headers()
        const headerLines = response.headers.split('\r\n')
        for (const headerLine of headerLines) {
            // FIXME: is this safe header parsing? Do we need to worry about line-wrapping?
            const match = headerLine.match(/^(.+?): *(.*?)$/)
            if (match) {
                respHeaders.append(match[1], match[2])
            }
            else {
                console.log("couldn't parse headerLine ", headerLine)
            }
        }
        console.log("headers", respHeaders)

        // wire the respStream to the goJsConn's writeSource
/*
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
        */

        // FIXME: stream the response body
        const resp = new Response(response.body, {
            status: response.statusCode,
            headers: respHeaders,
        })

        return resp
    }


    // implemented in Go
    // onGoJsConn(goJsConn) {}
}

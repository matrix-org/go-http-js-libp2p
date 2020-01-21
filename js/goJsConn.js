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

// An pipe which has a go net.Conn implementation on one end
// and a JS pull-stream implementation on the other.
export default class GoJsConn {

    constructor(localAddr, remoteAddr) {
        console.debug("created GoJsConn", localAddr, remoteAddr)
        this.localAddr = localAddr
        this.remoteAddr = remoteAddr

        this.readBuf = ''
        this.writeBuf = ''

        this.readPromise = undefined
        this.readResolve = undefined

        this.writeCb = undefined

        this.resetReadPromise()
    }

    resetReadPromise() {
        this.readPromise = new Promise((resolve, reject) => { this.readResolve = resolve })
    }

    fillRead(data) {
        //console.debug("filling readBuf with ", data)
        this.readBuf = this.readBuf.concat(data)
        this.readResolve()
        this.resetReadPromise()
    }

    fillWrite(data) {
        //console.debug("filling writeBuf with ", data)
        this.writeBuf = this.writeBuf.concat(data)
        if (this.writeCb) {
            this.writeCb(null, this.writeBuf)
            this.writeBuf = ''
            this.writeCb = undefined
        }
    }

    // pullstream-compatible way to consume the data written into the connection by Go
    consumeWriteSource(end, cb) {
        if (end) return cb(end)
        if (this.writeBuf.length > 0) {
            // FIXME: only return true if the connection is closed and this is the end of the stream
            cb(true, this.writeBuf)
            this.writeBuf = ''
        }
        else {
            // defer the callback
            this.writeCb = cb
        }
    }

    // pullstream-compatible way to add data into the connection to be read by Go
    fillReadSink(read) {
        const self = this;
        read(null, function next(end, data) {
            if (end === true) return
            if (end) throw end
            self.fillRead(data)
            read(null, next)
        })
    }

    // used by Go to read from this connection
    async read() {
        console.debug("awaiting readPromise")
        await this.readPromise
        console.debug("awaited readPromise")
        console.debug("reading readBuf = ", this.readBuf)
        const data = this.readBuf
        this.readBuf = ''
        return data
    }

    // used by Go to write to this connection
    write(buf) {
        console.debug("queuing buf for write: ", buf)
        this.fillWrite(buf)
        return
    }
}

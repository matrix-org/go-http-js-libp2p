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

class PeerConn {
    localAddr
    remoteAddr

    readBuf = ''
    writeBuf = ''

    readPromise
    writePromise

    readResolve
    writeResolve

    constructor(localAddr, remoteAddr) {
        console.log("created PeerConn", localAddr, remoteAddr)
        this.localAddr = localAddr
        this.remoteAddr = remoteAddr

        this.resetReadPromise()
        this.resetWritePromise()
    }

    resetReadPromise() {
        this.readPromise = new Promise((resolve, reject) => { this.readResolve = resolve })
    }

    resetWritePromise() {
        this.writePromise = new Promise((resolve, reject) => { this.writeResolve = resolve })
    }

    fillRead(data) {
        console.log("filling readBuf with ", data)
        this.readBuf = this.readBuf.concat(data)
        this.readResolve()
        this.resetReadPromise()
    }

    fillWrite(data) {
        console.log("filling writeBuf with ", data)
        this.writeBuf = this.writeBuf.concat(data)
        this.writeResolve()
        this.resetWritePromise()
    }

    async consumeWrite() {
        console.log("awaiting writePromise")
        await this.writePromise
        console.log("awaited writePromise")
        console.log("consuming writeBuf = ", this.writeBuf)
        const data = this.writeBuf
        this.writeBuf = ''
        return data
    }

    async read() {
        console.log("awaiting readPromise")
        await this.readPromise
        console.log("awaited readPromise")
        console.log("reading readBuf = ", this.readBuf)
        const data = this.readBuf
        this.readBuf = ''
        return data
    }

    write(buf) {
        console.log("queuing buf for write: ", buf)
        this.fillWrite(buf)
        return
    }
}

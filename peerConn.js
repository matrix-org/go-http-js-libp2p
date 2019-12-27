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

    constructor(localAddr, remoteAddr) {
        console.log("created PeerConn", localAddr, remoteAddr)
        this.localAddr = localAddr
        this.remoteAddr = remoteAddr
    }

    readBuf = ''
    writeBuf = ''

    writePromise = new Promise((resolve,reject)=>{ console.log("done"); resolve(); })

    fillRead(data) {
        this.readBuf = this.readBuf.concat(data)
    }

    fillWrite(data) {
        this.writeBuf = this.writeBuf.concat(data)
        this.writePromise.resolve()
        this.writePromise = new Promise((resolve,reject)=>{ console.log("done"); resolve(); })
    }

    async consumeWrite() {
        console.log("awaiting writePromise")
        await this.writePromise
        console.log("awaited writePromise")
        const data = this.writeBuf
        this.writeBuf = ''
        return data
    }

    read() {
        console.log("<<< ", this.readBuf)
        const data = this.readBuf
        this.readBuf = ''
        return data
    }

    write(buf) {
        console.log(">>> ", buf)
        this.fillWrite(buf)
        return
    }
}

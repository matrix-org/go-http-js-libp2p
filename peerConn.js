class PeerConn {

    localAddr;
    remoteAddr;

    constructor(localAddr, remoteAddr) {
        this.localAddr = localAddr;
        this.remoteAddr = remoteAddr;
    }

    read() {
        const buf = "HTTP/1.0 200 OK\r\n";
        console.log("<<< ", buf);
    }

    write(buf) {
        console.log(">>> ", buf);
        return;
    }
}

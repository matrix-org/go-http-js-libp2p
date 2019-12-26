global.bridge = {
    newPeerConn: (localAddr, remoteAddr) => {
        return new PeerConn(localAddr, remoteAddr);
    },
}
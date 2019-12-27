global.bridge = {
    newPeerTransport: () => {
        return new PeerTransport();
    },
}
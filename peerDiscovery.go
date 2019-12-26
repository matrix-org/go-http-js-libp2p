package main

type peerDiscovery struct {
	service string
}

func NewPeerDiscovery(service string) (*peerDiscovery) {
	return &peerDiscovery{service: service}
}

type peer struct {
	host string
}

func (pd *peerDiscovery) GetPeers() ([]peer, error) {
	peers := make([]peer, 1)
	peers[0] = peer{host: "deadbeef"}
	return peers, nil
}


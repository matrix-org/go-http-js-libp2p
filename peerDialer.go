package main

import "context"
import "net"
import "log"

type peerDialer struct {
}

func NewPeerDialer() (*peerDialer) {
	log.Println("new peerDialer")
    return &peerDialer{}
}

func (pt *peerDialer) DialContext(ctx context.Context, network string, addr string) (net.Conn, error) {
	log.Println("peerDialer DialContext for %s, %s", network, addr)
	return NewPeerConn(nil, NewPeerAddr(addr)), nil
}

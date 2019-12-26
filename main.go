package main

import "fmt"
import "time"
import "log"
import "io/ioutil"
import "net/http"

var c chan bool

func init() {
    c = make(chan bool)
}

func main() {

    // discover some hosts to talk to
    pd := NewPeerDiscovery("matrix")
    peers, err := pd.GetPeers()
    if err != nil {
        log.Fatal("Can't get peers")
    }

    // due to https://github.com/golang/go/issues/27495 we can't override the DialContext
    // instead we have to provide a whole custom transport.
    transport := &http.Transport{}
    peerTransport:= &http.Transport{
        DialContext:  NewPeerDialer().DialContext,
        ForceAttemptHTTP2:     true,
        MaxIdleConns:          100,
        IdleConnTimeout:       90 * time.Second,
        TLSHandshakeTimeout:   10 * time.Second,
        ExpectContinueTimeout: 1 * time.Second,
    }
    transport.RegisterProtocol("libp2phttp", peerTransport)
    client := &http.Client{
        Transport: transport,
    }

    // try to ping all the peers
    for _, peer := range peers {
        resp, err := client.Get(fmt.Sprintf("libp2phttp://%s/ping", peer.host))
        if err != nil {
            log.Fatal("Can't make request")
        }
        defer resp.Body.Close()

        if resp.StatusCode == http.StatusOK {
            bodyBytes, err := ioutil.ReadAll(resp.Body)
            if err != nil {
                log.Fatal(err)
            }
            bodyString := string(bodyBytes)
            log.Print(bodyString)
        }
    }

    <-c
}

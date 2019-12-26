package main

import "fmt"
import "log"
import "io/ioutil"
import "net/http"

func main() {

	// discover some hosts to talk to
	pd := NewPeerDiscovery("matrix")
	peers, err := pd.GetPeers()
	if err != nil {
		log.Fatal("Can't get peers")
	}

	client := &http.Client{
		Transport: NewPeerTransport(),
	}

	// hit the first peer
	resp, err := client.Get(fmt.Sprintf("libp2phttp://%s", peers[0].host))
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

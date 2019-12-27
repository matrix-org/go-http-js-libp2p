package main

import "io"
import "io/ioutil"
import "log"
import "strings"
import "net/http"
import "syscall/js"

type peerTransport struct {
	jsPeerTransport js.Value
}

func NewPeerTransport() (*peerTransport) {
    bridge := js.Global().Get("bridge")
    pt := &peerTransport{
        jsPeerTransport: bridge.Call("newPeerTransport"),
    }
    return pt
}

func (pt *peerTransport) RoundTrip(req *http.Request) (*http.Response, error) {

	// FIXME: support with streaming req bodies
	var body string
	if req.Body != nil {
		b, err := ioutil.ReadAll(req.Body);
		if err != nil {
			log.Fatal("failed to read req body");
		}
		body = string(b)
	}

	// FIXME: handle headers

	jsReq := js.ValueOf(map[string]interface{}{
		"method": req.Method,
		"url": req.URL.String(), // FIXME: we could avoid compiling/reparsing the URI
		//"header": req.Header, // map[string][]string{}
		"body": body,
	})

	jsResponse := pt.jsPeerTransport.Call("roundTrip", jsReq)

	response := &http.Response{
        Status: jsResponse.Get("status").String(),
        StatusCode: jsResponse.Get("statusCode").Int(),
        Proto: "HTTP/1.0",
        ProtoMajor: 1,
        ProtoMinor: 0,
        // Header: map[string][]string{
        //     "Content-Type": {"text/plain"},
        // },
        Body: NewPeerReadCloser(jsResponse.Get("body").String()), // FIXME: support streaming resp bodies
        Request: req,
	}

    return response, nil
}

/////////////

type peerReadCloser struct {
    reader io.Reader
}

func NewPeerReadCloser(body string) (*peerReadCloser) {
    return &peerReadCloser{
        reader: strings.NewReader(body),
    }
}

func (prc *peerReadCloser) Read(p []byte) (n int, err error) {
    return prc.reader.Read(p)
}

func (prc *peerReadCloser) Close() (err error) {
    return nil
}

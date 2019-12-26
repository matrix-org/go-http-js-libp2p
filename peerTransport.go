package main

import "io"
import "strings"
import "net/http"

type peerTransport struct {
}

func NewPeerTransport() (*peerTransport) {
    return &peerTransport{}
}

func (t *peerTransport) RoundTrip(req *http.Request) (*http.Response, error) {

    // for now we fake a response
    response := &http.Response{
        Status: "200 OK",
        StatusCode: 200,
        Proto: "HTTP/1.0",
        ProtoMajor: 1,
        ProtoMinor: 0,
        Header: map[string][]string{
            "Content-Type": {"text/plain"},
        },
        Body: NewPeerReadCloser("i am a fish"),
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
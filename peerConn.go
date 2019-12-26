package main

import "time"
import "net"
import "syscall/js"

type peerAddr struct {
    string string
}

func NewPeerAddr(string string) (*peerAddr) {
    return &peerAddr{
        string: string,
    }
}

func (pa *peerAddr) String() (string) {
    return pa.string
}

func (pa *peerAddr) Network() (string) {
    return "libp2p"
}

/////////

type peerConn struct {
    localAddr net.Addr
    remoteAddr net.Addr
    jsPeerConn js.Value
}

func NewPeerConn(localAddr net.Addr, remoteAddr net.Addr) (*peerConn) {
    bridge := js.Global().Get("bridge")
    pc := &peerConn{
        localAddr: localAddr,
        remoteAddr: remoteAddr,
        jsPeerConn: bridge.Call("newPeerConn", localAddr.String(), remoteAddr.String()),
    }
    return pc
}

// Read reads data from the connection.
// Read can be made to time out and return an Error with Timeout() == true
// after a fixed time limit; see SetDeadline and SetReadDeadline.
func (pc *peerConn) Read(b []byte) (n int, err error) {
    b = []byte(pc.jsPeerConn.Call("read").String())
    return len(b), nil
}

// Write writes data to the connection.
// Write can be made to time out and return an Error with Timeout() == true
// after a fixed time limit; see SetDeadline and SetWriteDeadline.
func (pc *peerConn) Write(b []byte) (n int, err error) {
    pc.jsPeerConn.Call("write", string(b))
    return len(b), nil
}

// Close closes the connection.
// Any blocked Read or Write operations will be unblocked and return errors.
func (pc *peerConn) Close() error {
    return nil
}

// LocalAddr returns the local network address.
func (pc *peerConn) LocalAddr() net.Addr {
    return pc.localAddr
}

// RemoteAddr returns the remote network address.
func (pc *peerConn) RemoteAddr() net.Addr {
    return pc.remoteAddr    
}

// SetDeadline sets the read and write deadlines associated
// with the connection. It is equivalent to calling both
// SetReadDeadline and SetWriteDeadline.
//
// A deadline is an absolute time after which I/O operations
// fail with a timeout (see type Error) instead of
// blocking. The deadline applies to all future and pending
// I/O, not just the immediately following call to Read or
// Write. After a deadline has been exceeded, the connection
// can be refreshed by setting a deadline in the future.
//
// An idle timeout can be implemented by repeatedly extending
// the deadline after successful Read or Write calls.
//
// A zero value for t means I/O operations will not time out.
//
// Note that if a TCP connection has keep-alive turned on,
// which is the default unless overridden by Dialer.KeepAlive
// or ListenConfig.KeepAlive, then a keep-alive failure may
// also return a timeout error. On Unix systems a keep-alive
// failure on I/O can be detected using
// errors.Is(err, syscall.ETIMEDOUT).
func (pc *peerConn) SetDeadline(t time.Time) error {
    return nil
}

// SetReadDeadline sets the deadline for future Read calls
// and any currently-blocked Read call.
// A zero value for t means Read will not time out.
func (pc *peerConn) SetReadDeadline(t time.Time) error {
    return nil
}

// SetWriteDeadline sets the deadline for future Write calls
// and any currently-blocked Write call.
// Even if write times out, it may return n > 0, indicating that
// some of the data was successfully written.
// A zero value for t means Write will not time out.
func (pc *peerConn) SetWriteDeadline(t time.Time) error {
    return nil
}

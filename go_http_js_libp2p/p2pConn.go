// -*- coding: utf-8 -*-
// Copyright 2019, 2020 The Matrix.org Foundation C.I.C.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package go_http_js_libp2p

import "net"
import "log"
import "time"
import "syscall/js"

type p2pAddr struct {
	string string
}

func NewP2pAddr(string string) *p2pAddr {
	return &p2pAddr{
		string: string,
	}
}

func (pa *p2pAddr) String() string {
	return pa.string
}

func (pa *p2pAddr) Network() string {
	return "libp2p"
}

/////////

type p2pConn struct {
	localAddr  net.Addr
	remoteAddr net.Addr
	jsP2pConn js.Value
}

func NewP2pConn(jsP2pConn js.Value) *p2pConn {
	// bridge := js.Global().Get("bridge")
	//
	// if jsP2pConn == nil {
	// 	jsP2pConn = bridge.Call("newP2pConn", localAddr.String(), remoteAddr.String())
	// }

	pc := &p2pConn{
		localAddr:  NewP2pAddr(jsP2pConn.Get("localAddr").String()),
		remoteAddr: NewP2pAddr(jsP2pConn.Get("remoteAddr").String()),
		jsP2pConn: jsP2pConn,
	}
	return pc
}

// Read reads data from the connection.
// Read can be made to time out and return an Error with Timeout() == true
// after a fixed time limit; see SetDeadline and SetReadDeadline.
func (pc p2pConn) Read(b []byte) (n int, err error) {
	//log.Println("Awaiting read from JS")
	val, ok := Await(pc.jsP2pConn.Call("read"))
	if ok == false {
		log.Fatal("Failed to read")
	}
	//log.Printf("Read from p2pConn: %s\n", val.String())
	buf := []byte(val.String())
	c := copy(b, buf)
	if c < len(buf) {
		log.Fatal("Insufficient read buffer; dropping data")
	}
	return c, nil
}

// Write writes data to the connection.
// Write can be made to time out and return an Error with Timeout() == true
// after a fixed time limit; see SetDeadline and SetWriteDeadline.
func (pc p2pConn) Write(b []byte) (n int, err error) {
	//log.Printf("Writing to p2pConn: %s\n", string(b))
	pc.jsP2pConn.Call("write", string(b))
	return len(b), nil
}

// Close closes the connection.
// Any blocked Read or Write operations will be unblocked and return errors.
func (pc p2pConn) Close() error {
	return nil
}

// LocalAddr returns the local network address.
func (pc p2pConn) LocalAddr() net.Addr {
	return pc.localAddr
}

// RemoteAddr returns the remote network address.
func (pc p2pConn) RemoteAddr() net.Addr {
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
func (pc p2pConn) SetDeadline(t time.Time) error {
	return nil
}

// SetReadDeadline sets the deadline for future Read calls
// and any currently-blocked Read call.
// A zero value for t means Read will not time out.
func (pc p2pConn) SetReadDeadline(t time.Time) error {
	return nil
}

// SetWriteDeadline sets the deadline for future Write calls
// and any currently-blocked Write call.
// Even if write times out, it may return n > 0, indicating that
// some of the data was successfully written.
// A zero value for t means Write will not time out.
func (pc p2pConn) SetWriteDeadline(t time.Time) error {
	return nil
}

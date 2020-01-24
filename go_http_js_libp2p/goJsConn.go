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

type goJsAddr struct {
	string string
}

func NewGoJsAddr(string string) *goJsAddr {
	return &goJsAddr{
		string: string,
	}
}

func (pa *goJsAddr) String() string {
	return pa.string
}

func (pa *goJsAddr) Network() string {
	return "gojs"
}

/////////

type goJsConn struct {
	localAddr  net.Addr
	remoteAddr net.Addr
	jsGoJsConn js.Value
}

func NewGoJsConn(jsGoJsConn js.Value) *goJsConn {
	// bridge := js.Global().Get("_go_http_bridge")
	//
	// if jsGoJsConn == nil {
	// 	jsGoJsConn = bridge.Call("newGoJsConn", localAddr.String(), remoteAddr.String())
	// }

	pc := &goJsConn{
		localAddr:  NewGoJsAddr(jsGoJsConn.Get("localAddr").String()),
		remoteAddr: NewGoJsAddr(jsGoJsConn.Get("remoteAddr").String()),
		jsGoJsConn: jsGoJsConn,
	}
	return pc
}

// Read reads data from the connection.
// Read can be made to time out and return an Error with Timeout() == true
// after a fixed time limit; see SetDeadline and SetReadDeadline.
func (pc goJsConn) Read(b []byte) (n int, err error) {
	//log.Println("Awaiting read from JS")
	val, ok := Await(pc.jsGoJsConn.Call("read"))
	if ok == false {
		log.Fatal("Failed to read")
	}
	//log.Printf("Read from goJsConn: %s\n", val.String())
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
func (pc goJsConn) Write(b []byte) (n int, err error) {
	//log.Printf("Writing to goJsConn: %s\n", string(b))
	pc.jsGoJsConn.Call("write", string(b))
	return len(b), nil
}

// Close closes the connection.
// Any blocked Read or Write operations will be unblocked and return errors.
func (pc goJsConn) Close() error {
	return nil
}

// LocalAddr returns the local network address.
func (pc goJsConn) LocalAddr() net.Addr {
	return pc.localAddr
}

// RemoteAddr returns the remote network address.
func (pc goJsConn) RemoteAddr() net.Addr {
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
func (pc goJsConn) SetDeadline(t time.Time) error {
	return nil
}

// SetReadDeadline sets the deadline for future Read calls
// and any currently-blocked Read call.
// A zero value for t means Read will not time out.
func (pc goJsConn) SetReadDeadline(t time.Time) error {
	return nil
}

// SetWriteDeadline sets the deadline for future Write calls
// and any currently-blocked Write call.
// Even if write times out, it may return n > 0, indicating that
// some of the data was successfully written.
// A zero value for t means Write will not time out.
func (pc goJsConn) SetWriteDeadline(t time.Time) error {
	return nil
}

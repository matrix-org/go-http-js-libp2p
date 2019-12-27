class PeerTransport {

    roundTrip(req) {
        console.log("<<< ", req)
        const resp = {
            "status": "HTTP/1.0 200 OK",
            "statusCode": 200,
            "headers": {
                "Content-Type": [ "text/plain" ],
            },
            "body": "I am a fish",
        }
        console.log(">>> ", resp)
        return resp
    }
}

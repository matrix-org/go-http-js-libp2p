'use strict'

const WebRTCStar = require('libp2p-webrtc-star')
const WebSockets = require('libp2p-websockets')
const WebSocketStar = require('libp2p-websocket-star')
const Mplex = require('libp2p-mplex')
const SPDY = require('libp2p-spdy')
const SECIO = require('libp2p-secio')
const Bootstrap = require('libp2p-bootstrap')
const DHT = require('libp2p-kad-dht')
const Gossipsub = require('libp2p-gossipsub')
const libp2p = require('libp2p')

// Find this list at: https://github.com/ipfs/js-ipfs/blob/master/src/core/runtime/config-browser.json
const bootstrapList = [
  // '/dns4/ams-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
  // '/dns4/lon-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
  // '/dns4/sfo-3.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
  // '/dns4/sgp-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
  // '/dns4/nyc-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
  // '/dns4/nyc-2.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64',
  // '/dns4/node0.preload.ipfs.io/tcp/443/wss/ipfs/QmZMxNdpMkewiVZLMRxaNxUeZpDUb34pWjZ1kZvsd16Zic',
  // '/dns4/node1.preload.ipfs.io/tcp/443/wss/ipfs/Qmbut9Ywz9YEDrz8ySBSgWyJk41Uvm2QJPhwDJzJyGFsD6'
]

class Node extends libp2p {
  constructor ({ peerInfo }) {
    const wrtcStar = new WebRTCStar({ id: peerInfo.id })
    const wsstar = new WebSocketStar({ id: peerInfo.id })

    const defaults = {
      modules: {
        transport: [
          wrtcStar,
          WebSockets,
          wsstar
        ],
        streamMuxer: [
          Mplex,
          SPDY
        ],
        connEncryption: [
          SECIO
        ],
        peerDiscovery: [
          wrtcStar.discovery,
          wsstar.discovery,
          Bootstrap
        ],
        dht: DHT,
        pubsub: Gossipsub
      },
      config: {
        peerDiscovery: {
          autoDial: true,
          webRTCStar: {
            enabled: true
          },
          websocketStar: {
            enabled: true
          },
          bootstrap: {
            interval: 20e3,
            enabled: true,
            list: bootstrapList
          }
        },
        relay: {
          enabled: true,
          hop: {
            enabled: false,
            active: false
          }
        },
        dht: {
          enabled: true,
          kBucketSize: 20
        },
        pubsub: {
          enabled: false
        }
      },
      switch: {
        dialTimeout: 30 * 1000, // 30s
        denyAttempts: 20,
        denyTTL: 10 * 1000,
        maxParallelDials: 20,
      },
      connectionManager: {
        minPeers: 10,
        maxPeers: 50
      }
    }

    super({ ...defaults, peerInfo })
  }
}

module.exports = Node
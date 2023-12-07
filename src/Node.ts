import { Server, ServerWebSocket } from "bun-types";
import Blockchain from "./Blockchain.ts";

interface PeerConnectionDetails {
  address: string;
  port: string;
}

interface PeerMessage {
  type: "request" | "response" | "broadcast";
  object: "peer_addresses" | "blockchain";
  content: any;
}

export default class Node {
  private server: null | Server = null;
  peers: Set<WebSocket | ServerWebSocket> = new Set();
  blockchain: Blockchain;

  reactionMethods: {
    [key: string]: (ws: WebSocket | ServerWebSocket, content: any) => void;
  } = {
    request_peer_addresses: this.responsePeersConectionDetails.bind(this),
    response_peer_addresses: this.connectToPeers.bind(this),
  };

  constructor() {
    this.blockchain = new Blockchain();
  }

  start(port: number) {
    console.log(`starting node on port ${port}`);
    this.server = Bun.serve({
      port: port,
      fetch(req, server) {
        if (server.upgrade(req)) {
          return;
        }
        return new Response("Upgrade: failed!!!: (", { status: 500 });
      },
      websocket: {
        open: (ws) => {
          this.peers.add(ws);
          this.request(ws, "peer_addresses", null);
          console.log(`connected to ${ws.remoteAddress}`);
        },
        message: async (ws, message) => {
          if (typeof message != "string") {
            console.error("Received non-string message from peer");
            return;
          }
          const parsedMessage = JSON.parse(message);
          this.handlePeerMessage(ws, parsedMessage);
        },
        close: (ws, code, message) => {
          this.peers.delete(ws);
        },
      },
    });
  }
  stop() {
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
  }

  broadcast(message: PeerMessage) {
    this.peers.forEach((ws) => {
      console.log(`sending message to ${ws.remoteAddress}`);
      ws.send(JSON.stringify(message));
    });
  }

  broadcastPeersConectionDetails() {
    this.broadcast({
      type: "broadcast",
      object: "peer_addresses",
      content: this.peers,
    });
  }

  responsePeersConectionDetails(ws: WebSocket | ServerWebSocket) {
    console.log(`sending peers to ${ws.remoteAddress}`);
    ws.send(
      JSON.stringify({
        type: "response",
        object: "peer_addresses",
        content: this.peers,
      })
    );
  }

  connectToPeers(
    ws: WebSocket | ServerWebSocket,
    peers: Set<WebSocket | ServerWebSocket>
  ) {
    console.log(typeof peers);
    if (peers.size || peers.size == 0 || !peers) {
      return;
    }
    peers.forEach((peer) => {});
    return;
    peers.forEach((peer) => {
      if (peer.remoteAddress) {
        this.connectToPeer(peer.remoteAddress);
      }
      if (peer.url) {
        this.connectToPeer(peer.url);
      }
    });
  }

  connectToPeer(peerEndpoint: string) {
    const ws = new WebSocket(`ws://${peerEndpoint}`);
    ws.onopen = () => {
      console.log(`connected to ${ws.url}`);
      this.peers.add(ws);
      this.request(ws, "peer_addresses", null);
    };
    ws.onmessage = (event) => {
      if (typeof event.data != "string") {
        console.error("Received non-string message from peer");
        return;
      }
      const message = JSON.parse(event.data);
      this.handlePeerMessage(ws, message);
    };
    ws.close = () => {
      this.peers.delete(ws);
      console.log(`disconnected from ${peerEndpoint}`);
    };
  }

  request(ws: WebSocket | ServerWebSocket, object: string, content: any) {
    ws.send(
      JSON.stringify({
        type: "request",
        object,
        content,
      })
    );
  }

  handlePeerMessage(ws: WebSocket | ServerWebSocket, message: PeerMessage) {
    console.log(
      `handling message, type: ${message.type}, object: ${message.object}`,
      `the content is ${
        message.content
      }, the content type is ${typeof message.content}`
    );
    const reactionMethodKey = message.type + "_" + message.object;
    if (typeof this.reactionMethods[reactionMethodKey] == "function") {
      this.reactionMethods[reactionMethodKey](ws, message.content);
    }
  }
}

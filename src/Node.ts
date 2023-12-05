import { Server, ServerWebSocket } from "bun-types";
import Blockchain from "./Blockchain.ts";

interface PeerConnectionDetails {
  address: string;
  port: string;
}

interface PeerMessage {
  type: "request" | "broadcast";
  object: "peer_addresses" | "blockchain";
  content: any;
}

export default class Node {
  private server: null | Server = null;
  peers: Set<WebSocket | ServerWebSocket> = new Set();
  blockchain: Blockchain;

  reactionMethods: { [key: string]: (content: any) => void } = {
    request_peer_addresses: this.broadcastPeersConectionDetails.bind(this),
    broadcast_peer_addresses: (content: any) => {
      content.forEach((peer: PeerConnectionDetails) => {
        this.connectToPeer(peer.address, peer.port);
      });
    },
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
          this.handlePeerMessage(parsedMessage);
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

  connectToPeer(address: string, port: string) {
    const ws = new WebSocket(`ws://${address}:${port}`);
    ws.onopen = () => {
      console.log(`connected to ${ws.url}`);
      this.peers.add(ws);
      this.request(ws, "peer_addresses", null);
    };
    ws.onmessage = (event) => {};
    ws.close = () => {
      this.peers.delete(ws);
      console.log(`disconnected from ${address}:${port}`);
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

  handlePeerMessage(message: PeerMessage) {
    console.log(
      `handling message, type: ${message.type}, object: ${message.object}`
    );
    const reactionMethodKey = message.type + "_" + message.object;
    if (typeof this.reactionMethods[reactionMethodKey] == "function") {
      this.reactionMethods[reactionMethodKey](message.content);
    }
  }
}

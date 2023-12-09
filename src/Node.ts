import { Server, ServerWebSocket, Timeout } from "bun-types";
import Blockchain from "./Blockchain";
import Block from "./Block";
import Transaction from "./Transaction";

const util = require("util");

type BroadcastMessageType =
  | "new_peer"
  | "new_transaction"
  | "new_block"
  | "blockchain";

interface BroadcastMessage {
  type: BroadcastMessageType;
  content: any;
}

export default class Node {
  private server: null | Server = null;
  peers: Set<string> = new Set();
  blockchain: Blockchain;
  selfEndpoint: string;
  pendingTransactions: Set<Transaction> = new Set();
  blockValidation: Map<string, Set<string>> = new Map();
  miningTimer: Timeout | null;

  reactionMethods: {
    [key: string]: (content: any) => void;
  } = {
    new_peer: this.connectToPeer.bind(this),
    new_transaction: this.addTransaction.bind(this),
    new_block: this.receiveBlock.bind(this),
    blockchain: this.alterBlockchain.bind(this),
  };

  constructor(selfEndpoint: string, genesisTransaction?: Transaction) {
    this.blockchain = new Blockchain(genesisTransaction);
    this.selfEndpoint = selfEndpoint;
  }

  isValidJson(json: string) {
    try {
      JSON.parse(json);
      return true;
    } catch {
      return false;
    }
  }

  start(port: number) {
    console.log(`========== started node on port ${port} ==========`);
    this.server = Bun.serve({
      host: "0.0.0.0",
      port: port,
      fetch: async (req, server) => {
        if (server.upgrade(req)) {
          return;
        }

        console.log(
          `received request: ${req.method} ${req.url}, ${
            new URL(req.url).pathname
          }}`
        );

        if (
          req.method == "POST" &&
          new URL(req.url).pathname == "/transaction"
        ) {
          console.log("received transaction");

          const bodyText = await req.text();
          if (!this.isValidJson(bodyText)) {
            console.log("invalid json");
            return;
          }

          const transactionData = JSON.parse(bodyText);
          if (!transactionData) {
            console.log("no transaction data");
            return;
          }
          console.log(`received json: ${JSON.stringify(transactionData)}`);
          const transaction = new Transaction(
            transactionData.fromAddress,
            transactionData.toAddress,
            transactionData.amount
          );
          console.log(
            `transaction created: ${transaction.fromAddress}, ${transaction.toAddress}, ${transaction.amount}`
          );
          if (!transaction.isValid()) {
            console.log("invalid transaction");
            return;
          }
          this.pendingTransactions.add(transaction);
          this.broadcast("channel", "new_transaction", transaction);
          return;
        }

        if (req.method == "GET" && new URL(req.url).pathname == "/result") {
          const result: any = {};
          const chain = this.blockchain.chain;
          chain.forEach((block: Block) => {
            block.transactions.forEach((transaction: Transaction) => {
              if (transaction.toAddress !== "genesis") {
                console.log(
                  `calculate result of address to ${transaction.toAddress}`
                );
                if (result[transaction.toAddress]) {
                  result[transaction.toAddress] =
                    parseInt(result[transaction.toAddress]) +
                    parseInt(transaction.amount);
                  console.log(
                    `address ${transaction.toAddress} exists, result: ${
                      result[transaction.toAddress]
                    }`
                  );
                } else {
                  result[transaction.toAddress] = parseInt(transaction.amount);
                  console.log(
                    `address ${transaction.toAddress} does not exist, result: ${
                      result[transaction.toAddress]
                    }`
                  );
                }
              }

              if (transaction.fromAddress !== "genesis") {
                console.log(
                  `calculate result of address from ${transaction.fromAddress}`
                );
                if (result[transaction.fromAddress]) {
                  result[transaction.fromAddress] -= parseInt(
                    transaction.amount
                  );
                  console.log(
                    `address ${transaction.fromAddress} exists, result: ${
                      result[transaction.fromAddress]
                    }`
                  );
                } else {
                  result[transaction.fromAddress] = -parseInt(
                    transaction.amount
                  );
                  console.log(
                    `address ${
                      transaction.fromAddress
                    } does not exist, result: ${
                      result[transaction.fromAddress]
                    }`
                  );
                }
              }
            });
          });
          return new Response(JSON.stringify(result));
        }

        return new Response("Not found", { status: 404 });
      },
      websocket: {
        open: (ws) => {
          console.log(`new connection from ${ws.remoteAddress}`);
          const message: BroadcastMessage = {
            type: "blockchain",
            content: this.blockchain,
          };
          ws.send(JSON.stringify(message));
          ws.subscribe("channel");
        },
        message: async (ws, message) => {
          if (typeof message != "string") {
            console.log("Received non-string message from peer");
            return;
          }
          console.log(`received message from ${ws.remoteAddress}: ${message}`);
          this.broadcast("channel", "new_peer", message);
          this.connectToPeer(message);
        },
        close: (ws, code, message) => {
          this.peers.delete(ws.remoteAddress);
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

  startMining() {
    this.miningTimer = setTimeout(() => {
      this.createNewBlock();
      const delay = Math.floor(Math.random() * 5000) + 5000;
      this.miningTimer = setTimeout(this.startMining.bind(this), delay);
    });
  }

  stopMining() {
    if (this.miningTimer) {
      clearTimeout(this.miningTimer);
      this.miningTimer = null;
    }
  }

  createNewBlock() {
    if (this.pendingTransactions.size == 0) {
      console.log("no pending transactions");
      return;
    }

    this.blockchain.minePendingTransactions(this.pendingTransactions);
    this.pendingTransactions = new Set();

    this.broadcast(
      "channel",
      "new_block",
      JSON.stringify(this.blockchain.getLatestBlock())
    );
  }

  broadcast(channel: string, type: BroadcastMessageType, content: any) {
    const message: BroadcastMessage = {
      type: type,
      content: content,
    };
    this.server.publish(channel, JSON.stringify(message));
  }

  handleBroadcastMessage(ws: ServerWebSocket, message: BroadcastMessage) {
    const PeerUrl = ws.url || ws.remoteAddress;
    console.log(
      `handling message from ${PeerUrl}, message: ${JSON.stringify(message)}`
    );
    const reactionMethodKey = message.type;

    if (typeof this.reactionMethods[reactionMethodKey] == "function") {
      console.log(
        `calling ${reactionMethodKey}, content: ${
          message.content
        }, type: ${typeof message.content}`
      );
      this.reactionMethods[reactionMethodKey](message.content);
    } else {
      console.log(`no reaction method for ${reactionMethodKey}`);
    }
  }

  connectToPeer(peerEndpoint: string) {
    if (typeof peerEndpoint != "string") {
      console.error(
        "peerEndpoint must be a string, got: ",
        util.inspect(peerEndpoint),
        typeof peerEndpoint
      );
      return;
    }
    console.log(`start to connect to ${peerEndpoint} as a client`);
    if (this.peers.has(peerEndpoint)) {
      console.log(`already connected to ${peerEndpoint}`);
      return;
    }
    if (this.selfEndpoint == peerEndpoint) {
      console.log("cannot connect to self");
      return;
    }

    console.log(`connecting to ${peerEndpoint} as a client`);
    const ws = new WebSocket(`ws://${peerEndpoint}`);
    ws.onopen = () => {
      this.peers.add(peerEndpoint);
      console.log(
        `successfully connected to ${ws.url} as a client, this node now has ${this.peers.size} peers`
      );
      ws.send(this.selfEndpoint);
    };
    ws.onmessage = (event) => {
      if (typeof event.data != "string") {
        console.error("Received non-string message from peer");
        return;
      }
      const message = JSON.parse(event.data);
      this.handleBroadcastMessage(ws, message);
    };
    ws.close = () => {
      this.peers.delete(ws.url);
      console.log(`disconnected from ${peerEndpoint}`);
    };
  }

  addTransaction(transactionData: Transaction) {
    const transaction = new Transaction(
      transactionData.fromAddress,
      transactionData.toAddress,
      transactionData.amount
    );
    if (!transaction.isValid()) {
      console.log("invalid transaction");
      return;
    }
    this.pendingTransactions.add(transaction);
  }

  receiveBlock(blockData: Block) {
    const block = new Block(
      blockData.index,
      blockData.timestamp,
      blockData.transactions,
      blockData.previousHash
    );
    if (this.blockchain.chain.length >= block.index) {
      console.log("blockchain is up to date");
      return;
    }
    block.transactions.forEach((transaction) => {
      this.pendingTransactions.delete(transaction);
    });
    this.blockchain.chain.push(block);
  }

  alterBlockchain(blockchainData: Blockchain) {
    if (blockchainData.chain.length > this.blockchain.chain.length) {
      this.blockchain.chain = blockchainData.chain;
      console.log(
        "blockchain updated, new length: ",
        blockchainData.chain.length
      );
    }
  }
}

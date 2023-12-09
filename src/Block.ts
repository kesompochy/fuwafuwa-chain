import Transaction from "./Transaction";
const SHA256 = require("crypto-js/sha256");

export default class Block {
  timestamp: number;
  transactions: Transaction[];
  previousHash: string;
  hash: string;
  nonce: number = 0;
  index: number;
  constructor(
    index: number,
    timestamp: number,
    transactions: Transaction[],
    previousHash: string
  ) {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.hash = "";
  }

  calculateHash(): string {
    return SHA256(
      this.previousHash +
        this.timestamp +
        JSON.stringify(this.transactions) +
        this.nonce
    ).toString();
  }

  mineBlock(difficulty: number): boolean {
    this.transactions.forEach((transaction) => {
      if (!transaction.isValid()) {
        return false;
      }
    });
    while (
      this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")
    ) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    return true;
  }

  isValid(): boolean {
    if (!this.previousHash) {
      return false;
    }
    if (!this.timestamp) {
      return false;
    }
    if (!this.transactions) {
      return false;
    }
    this.transactions.forEach((transaction) => {
      if (!transaction.isValid()) {
        return false;
      }
    });
    if (this.hash !== this.calculateHash()) {
      return false;
    }
    return true;
  }
}

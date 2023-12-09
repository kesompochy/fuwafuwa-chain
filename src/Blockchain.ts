import Block from "./Block";
import Transaction from "./Transaction";

export default class Blockchain {
  chain: Block[] = [];
  difficulty: number;
  constructor(genesisTransaction?: Transaction) {
    this.difficulty = 2;
    if (genesisTransaction) {
      this.chain.push(this.createGenesisBlock(genesisTransaction));
    }
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  minePendingTransactions(transactionsToMine: Set<Transaction>) {
    let block = new Block(
      this.chain.length,
      Math.floor(new Date().getTime() / 1000),
      Array.from(transactionsToMine),
      this.getLatestBlock().hash
    );
    if (block.mineBlock(this.difficulty)) {
      console.log("Block successfully mined!");
      this.chain.push(block);
    }
  }

  createGenesisBlock(genesisTransaction: Transaction) {
    return new Block(
      0,
      Math.floor(new Date().getTime() / 1000),
      [genesisTransaction],
      "0"
    );
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (!currentBlock.isValid()) {
        return false;
      }

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }
}

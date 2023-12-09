import Node from "./Node";
import Transaction from "./Transaction";

const endpoint = process.env.SELF_ENDPOINT;
const port = parseInt(process.env.PORT || "3000");

if (!endpoint) {
  throw new Error("SELF_ENDPOINT environment variable is required");
}

let node: Node;
if (process.env.GENESIS_ADDRESS) {
  console.log(
    "i am genesis node, creating genesis transaction",
    process.env.GENESIS_ADDRESS
  );
  const genesisTransaction = new Transaction(
    "genesis",
    process.env.GENESIS_ADDRESS,
    100
  );
  node = new Node(endpoint, genesisTransaction);
} else {
  console.log("i am not genesis node");
  node = new Node(endpoint);
}

node.start(port);

const initialNodeEndpoint = process.env.INITIAL_NODE_ENDPOINT;
if (initialNodeEndpoint) {
  node.connectToPeer(initialNodeEndpoint);
}

node.startMining();

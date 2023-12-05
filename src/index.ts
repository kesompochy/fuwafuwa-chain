import Node from "./Node";

const port = Number(process.env.PORT) || 3000;

const node = new Node();

node.start(port);

const initialPeerAddress = process.env.INITIAL_PEER_ADDRESS;
const initialPeerPort = process.env.INITIAL_PEER_PORT;
if (initialPeerAddress && initialPeerPort) {
  node.connectToPeer(initialPeerAddress, initialPeerPort);
}

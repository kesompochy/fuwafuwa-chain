import Node from "./Node";

const port = Number(process.env.PORT) || 3000;

const node = new Node();

node.start(port);

const initialNodeEndpoint = process.env.INITIAL_NODE_ENDPOINT;
if (initialNodeEndpoint) {
  node.connectToPeer(initialNodeEndpoint);
}

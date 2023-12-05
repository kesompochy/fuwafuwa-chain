import { test, describe, expect, beforeAll, afterAll } from "bun:test";

import Node from "../src/Node";

describe("Node", () => {
  test("should be defined", () => {
    const node = new Node();
    expect(node).toBeDefined();
  });
  test("should have a blockchain", () => {
    const node = new Node();
    expect(node.blockchain).toBeDefined();
  });
  test("should have a set of peers", () => {
    const node = new Node();
    expect(node.peers).toBeDefined();
  });
});

describe("Node started with port 3000", () => {
  let node;

  // テストの前にNodeインスタンスを作成し、サーバーを起動する
  beforeAll(() => {
    node = new Node();
    node.start(3000);
  });

  // テストの後でサーバーを停止する
  afterAll(() => {
    node.stop();
  });

  test("should start web socket server on port 3000", () => {
    const node = new Node();
    node.start(3000);
  });
});

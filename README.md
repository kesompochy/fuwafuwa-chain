# fuwafuwa-chain

- すべてのノードは、メッセージを送る際はサーバーとしてふるまう（ストリーマー）
- すべてのノードは、メッセージを受け取る際はクライアントとしてふるまう（リスナー）
- すべてのノードは、自身の接続エンドポイントを知っている
- リスナーとして接続したらストリーマーに自身のエンドポイントを渡す
- ストリーマーはエンドポイントを渡されたらリスナーとしてフォローする
  - リスナーはすでにフォローしたエンドポイントのリストを持っている

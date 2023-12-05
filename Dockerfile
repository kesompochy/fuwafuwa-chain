FROM oven/bun:latest

WORKDIR /app

CMD ["bun", "run", "--watch", "index.ts"]

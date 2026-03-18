FROM node:25-alpine

WORKDIR /app

COPY package.json ./
COPY src ./src
COPY packs ./packs

EXPOSE 8080

CMD ["node", "src/cli.mjs", "serve-http", "8080"]

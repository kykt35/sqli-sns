FROM node:22.23.3-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-fund && npm cache clean --force

FROM node:22.23.3-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node views ./views
COPY --chown=node:node public ./public
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]

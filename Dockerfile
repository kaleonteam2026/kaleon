# ── Build stage ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# ── Production stage ────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/server       ./server
COPY --from=builder /app/src/lib      ./src/lib
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "--experimental-strip-types", "server/index.ts"]

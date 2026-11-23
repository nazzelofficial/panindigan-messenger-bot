# syntax=docker/dockerfile:1

# ---- Build stage ---------------------------------------------------------
FROM node:26-alpine AS builder

# libc6-compat is a safety net for native modules with glibc assumptions.
# If you switch the base image to node:26-bookworm-slim, drop this package.
RUN apk add --no-cache libc6-compat ca-certificates
WORKDIR /app

# Node 26 official images no longer bundle corepack, so install pnpm with npm.
RUN npm install -g pnpm@12.21.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# Development-only packages (typescript, tsx, eslint, vitest, ...) are removed.
# The runtime image needs only compiled JS and production dependencies.
RUN pnpm prune --prod

# ---- Runtime stage -------------------------------------------------------
FROM node:26-alpine AS runtime

RUN apk add --no-cache libc6-compat ca-certificates
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist

# config.json contains setting names only, never secrets. The SQL migration
# files are copied because DatabaseManager applies them on startup.
COPY --chown=node:node config.json ./config.json
COPY --chown=node:node database ./database

# data/session holds the persisted Messenger session; backups/ holds JSON
# snapshots. Both are supplied as volumes by docker-compose.yml.
RUN mkdir -p data/session backups && chown -R node:node data backups

USER node

# With uptimeEndpoint.enabled=true this probes the uptime endpoint using the
# Node built-in fetch. The shipped config disables it, so the fallback is a
# simple check that PID 1 (the node process) is still alive.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["node", "--input-type=commonjs", "-e", "const c=require('/app/config.json');const u=c.uptimeEndpoint;if(u&&u.enabled){fetch('http://127.0.0.1:'+u.port+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))}else{try{process.kill(1,0);process.exit(0)}catch{process.exit(1)}}"]

EXPOSE 3001 3002

CMD ["node", "dist/index.js"]

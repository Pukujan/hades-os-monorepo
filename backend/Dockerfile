FROM node:22-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip python3-venv && \
  rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/hermes-venv && \
  /opt/hermes-venv/bin/pip install --no-cache-dir hermes-agent
ENV HERMES_BIN_PATH=/opt/hermes-venv/bin/hermes
ENV HERMES_PUBLIC_BASE_URL=https://hades-os-monorepo-production.up.railway.app/api/hades/hermes

FROM base AS runner
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev
COPY backend/ ./

# Build the browser extension zip for the authenticated download route
COPY extension/ ./extension/
RUN npm install --prefix extension --omit=dev 2>/dev/null; exit 0
COPY scripts/ ./scripts/
RUN node scripts/package-hades-extension.mjs

EXPOSE ${PORT:-3001}
CMD ["node", "src/core/server.js"]
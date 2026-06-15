FROM node:22-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip python3-venv && \
  rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/hermes-venv && \
  /opt/hermes-venv/bin/pip install --no-cache-dir hermes-agent
ENV HERMES_BIN_PATH=/opt/hermes-venv/bin/hermes

FROM base AS runner
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY . .
EXPOSE ${PORT:-3001}
CMD ["node", "src/core/server.js"]
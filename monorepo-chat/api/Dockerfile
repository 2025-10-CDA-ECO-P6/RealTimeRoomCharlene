# ---------- BUILDER ----------
FROM node:20 AS builder

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy the entire monorepo
COPY monorepo-chat ./monorepo-chat

# Enable pnpm
RUN corepack enable

# Install only API dependencies
RUN pnpm install --filter ./monorepo-chat/api...

# Build API (if needed)
WORKDIR /app/monorepo-chat/api
RUN pnpm run build || echo "No build step"

# ---------- RUNNER ----------
FROM node:20 AS runner

WORKDIR /app

# Copy only the built API + node_modules
COPY --from=builder /app/monorepo-chat/api ./monorepo-chat/api

WORKDIR /app/monorepo-chat/api

EXPOSE 3001

CMD ["pnpm", "start"]
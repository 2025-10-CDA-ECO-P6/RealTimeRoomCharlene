# ---------- BUILDER ----------
FROM node:20 AS builder

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy the entire monorepo
COPY monorepo-chat ./monorepo-chat

# Enable pnpm
RUN corepack enable

# Install only web dependencies
RUN pnpm install --filter ./monorepo-chat/web...

# Build Vite app
WORKDIR /app/monorepo-chat/web
RUN pnpm run build

# ---------- NGINX ----------
FROM nginx:1.25-alpine

# Copy custom nginx config
COPY monorepo-chat/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/monorepo-chat/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
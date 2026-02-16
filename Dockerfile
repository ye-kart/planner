# Stage 1: Dependencies
FROM node:22-slim AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/ai/package.json packages/ai/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/

RUN pnpm install --frozen-lockfile

# Stage 2: Build (extends deps so pnpm workspace symlinks are preserved)
FROM deps AS build
COPY . .

# Build in dependency order: core → ai → api, then web
RUN pnpm --filter @planner/core build && \
    pnpm --filter @planner/ai build && \
    pnpm --filter @planner/api build && \
    pnpm --filter @planner/web build

# Stage 3: Production
FROM node:22-slim AS production
WORKDIR /app

# Copy third-party dependencies (Docker COPY dereferences pnpm symlinks — that's OK for external deps)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/packages/ai/node_modules ./packages/ai/node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules

# Copy built packages
COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/packages/core/package.json ./packages/core/
COPY --from=build /app/packages/ai/dist ./packages/ai/dist
COPY --from=build /app/packages/ai/package.json ./packages/ai/
COPY --from=build /app/packages/api/dist ./packages/api/dist
COPY --from=build /app/packages/api/package.json ./packages/api/
COPY --from=build /app/packages/web/dist ./packages/web/dist

# Restore workspace symlinks (Docker COPY dereferences them, breaking resolution)
RUN rm -rf node_modules/@planner && mkdir -p node_modules/@planner && \
    ln -s ../../packages/core node_modules/@planner/core && \
    ln -s ../../packages/ai node_modules/@planner/ai && \
    ln -s ../../packages/api node_modules/@planner/api

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Set cwd to packages/api so serveStatic('../web/dist') resolves correctly
WORKDIR /app/packages/api

CMD ["node", "dist/server.js"]

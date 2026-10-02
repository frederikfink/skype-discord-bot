FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN corepack enable pnpm

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/bot/package.json ./apps/bot/
COPY packages/db/package.json ./packages/db/
RUN pnpm install --frozen-lockfile=false \
  && pnpm rebuild better-sqlite3 esbuild

FROM deps AS build
COPY packages/db ./packages/db
COPY apps/bot ./apps/bot
RUN pnpm --filter @repo/db build \
  && pnpm --filter @repo/bot build

FROM base AS runtime
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/bot.db
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/bot/package.json ./apps/bot/
COPY packages/db/package.json ./packages/db/
RUN pnpm install --prod --frozen-lockfile=false \
  && pnpm rebuild better-sqlite3
COPY --from=build /app/packages/db/dist ./packages/db/dist
COPY --from=build /app/apps/bot/dist ./apps/bot/dist
RUN mkdir -p /app/data
WORKDIR /app/apps/bot
EXPOSE 8080
CMD ["sh", "-c", "node dist/deploy-commands.js && node dist/index.js"]

FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN corepack enable pnpm

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile=false \
  && pnpm approve-builds --all --yes \
  && pnpm rebuild better-sqlite3 esbuild

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/bot.db
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --prod --frozen-lockfile=false \
  && pnpm approve-builds --all --yes \
  && pnpm rebuild better-sqlite3
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/data
CMD ["sh", "-c", "node dist/deploy-commands.js && node dist/index.js"]

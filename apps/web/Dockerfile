FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN corepack enable pnpm

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
RUN pnpm install --frozen-lockfile=false \
  && pnpm rebuild better-sqlite3 esbuild

FROM deps AS build
COPY packages/db ./packages/db
COPY apps/web ./apps/web
RUN pnpm --filter @repo/db build \
  && pnpm --filter @repo/web build

FROM base AS runtime
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/bot.db
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
RUN pnpm install --prod --frozen-lockfile=false \
  && pnpm rebuild better-sqlite3
COPY --from=build /app/packages/db/dist ./packages/db/dist
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/public ./apps/web/public
RUN mkdir -p /app/data
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["pnpm", "start"]

FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY tsconfig.base.json ./

RUN pnpm --filter @ticketchain/shared build
RUN pnpm --filter @ticketchain/api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@9 --activate

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/migrations ./apps/api/migrations

WORKDIR /app/apps/api
EXPOSE 5000
CMD ["node", "dist/app.js"]

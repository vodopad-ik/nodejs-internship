FROM node:20-alpine AS base
RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/main-api ./apps/main-api

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @innogram/main-api build

EXPOSE 3000
CMD ["node", "apps/main-api/dist/main.js"]
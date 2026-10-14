FROM node:20-alpine AS base
RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/auth-service ./apps/auth-service

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @innogram/auth-service build

EXPOSE 3001
CMD ["node", "apps/auth-service/dist/index.js"]
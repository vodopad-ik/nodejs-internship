# Innogram

Social Media Web Application built with a microservices architecture.

## 🏗 Project Architecture

* **`apps/main-api`**: Core Microservice (API Gateway & Business Logic) built with **NestJS**, **PostgreSQL**, and **MinIO**.
* **`apps/auth-service`**: Authentication Microservice built with **Express.js**, **Redis**, **MongoDB**, and **OAuth 2.0**.
* **`packages/tsconfig`**: Shared TypeScript configuration presets.
* **`packages/eslint-config`**: Shared ESLint & Prettier configuration rules.

---

## 🚀 Quick Start

### 1. Prerequisites
* **Node.js** >= 20
* **pnpm** >= 9
* **Docker & Docker Compose**

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Start Infrastructure (Databases & Storage)
```bash
docker compose up -d
```
This starts:
* **PostgreSQL** on port `5432`
* **MongoDB** on port `27017`
* **Redis** on port `6379`
* **MinIO** S3 on ports `9000` (API) and `9001` (Console)

### 4. Development
Run all services concurrently:
```bash
pnpm dev
```

Or run individual services:
```bash
pnpm --filter @innogram/main-api dev
pnpm --filter @innogram/auth-service dev
```

### 5. Build & Lint
```bash
pnpm lint     # Check code style across all packages
pnpm format   # Auto-format with Prettier
pnpm build    # Build all packages with Turborepo
```
FROM node:20-alpine AS base
WORKDIR /app

# Install OpenSSL and libc compatibility (required by Prisma on Alpine)
RUN apk add --no-cache openssl openssl-dev libc6-compat

# Copy workspace config files
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages/database/package.json ./packages/database/
COPY packages/calculator/package.json ./packages/calculator/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install all dependencies (including workspace packages)
RUN npm install

# Copy source code
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Generate Prisma client (after OpenSSL is installed)
RUN cd packages/database && npx prisma generate

# Build internal packages and API
RUN npx tsc --project packages/shared/tsconfig.json || true
RUN npx tsc --project packages/calculator/tsconfig.json || true
RUN npx tsc --project apps/api/tsconfig.json

# Create uploads directory
RUN mkdir -p apps/api/uploads

# --- Production stage ---
FROM node:20-alpine AS runner
WORKDIR /app

# Install OpenSSL (required by Prisma at runtime)
RUN apk add --no-cache openssl libc6-compat

# node_modules completo da raiz (inclui @prisma/client gerado)
COPY --from=base /app/node_modules ./node_modules

# Pacotes internos compilados
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/packages/shared/package.json ./packages/shared/package.json

COPY --from=base /app/packages/calculator/dist ./packages/calculator/dist
COPY --from=base /app/packages/calculator/package.json ./packages/calculator/package.json

# Database — apenas prisma schema e package.json
COPY --from=base /app/packages/database/package.json ./packages/database/package.json
COPY --from=base /app/packages/database/prisma ./packages/database/prisma

# API compilada
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/apps/api/package.json ./apps/api/package.json

# package.json da raiz (necessário para workspace resolution)
COPY --from=base /app/package.json ./package.json

RUN mkdir -p apps/api/uploads

EXPOSE 3001

CMD sh -c "cd packages/database && npx prisma migrate deploy && cd /app && node apps/api/dist/server.js"

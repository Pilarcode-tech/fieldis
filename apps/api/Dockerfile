FROM node:20-alpine
WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache openssl openssl-dev libc6-compat

# Copiar tudo
COPY . .

# Instalar todas as dependências do monorepo
RUN npm install

# Gerar Prisma client
RUN cd packages/database && npx prisma generate

# Build dos pacotes internos (na ordem de dependência)
RUN npx tsc --project packages/shared/tsconfig.json || true
RUN npx tsc --project packages/calculator/tsconfig.json || true
RUN npx tsc --project packages/database/tsconfig.json || true

# Build da API
RUN npx tsc --project apps/api/tsconfig.json

# Criar pasta de uploads
RUN mkdir -p apps/api/uploads

EXPOSE 3001

CMD sh -c "cd packages/database && npx prisma migrate deploy && cd /app && node apps/api/dist/server.js"

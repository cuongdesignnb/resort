# Stage 1: Build
FROM node:20-slim AS builder
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Runner
FROM node:20-slim AS runner
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/mock_google_drive ./mock_google_drive

EXPOSE 3000

# Automatically run prisma db push to sync schema on startup, then start the server
CMD ["sh", "-c", "npx prisma db push && npm run start"]

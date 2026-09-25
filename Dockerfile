FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json next.config.mjs drizzle.config.ts postcss.config.mjs tailwind.config.ts ./
COPY src/shared ./src/shared
COPY src/entities ./src/entities
COPY src/features ./src/features
COPY src/widgets ./src/widgets
COPY src/views ./src/views
COPY drizzle ./drizzle
COPY src/app ./src/app
COPY public ./public
COPY package.json package-lock.json ./
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://alas_user:placeholder@localhost:5432/alas"
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]

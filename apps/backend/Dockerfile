# --- Build Stage ---
FROM node:20-alpine AS builder

# Install OpenSSL 3 and build dependencies
RUN apk add --no-cache openssl openssl-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Force Prisma to use OpenSSL 3.0.x engine for Alpine ARM64
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-arm64-openssl-3.0.x

# Generate Prisma Client with explicit target
RUN npx prisma generate

# Build the application
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine

WORKDIR /app

# Install OpenSSL 3 for Prisma runtime
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production

# Set runtime Prisma binary target
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-arm64-openssl-3.0.x

# Regenerate Prisma Client in production stage with correct binary
RUN npx prisma generate

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "run", "start:prod"]

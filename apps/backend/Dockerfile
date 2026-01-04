# --- Build Stage ---
FROM node:20-alpine AS builder

# Install OpenSSL 1.1 compatibility library
RUN apk add --no-cache openssl libressl3.8-libssl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine

WORKDIR /app

# Install OpenSSL 1.1 compatibility library for runtime
# This provides libssl.so.1.1 that Prisma needs
RUN apk add --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/v3.16/main openssl1.1-compat

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production

# Regenerate Prisma Client with the correct OpenSSL available
RUN npx prisma generate

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "run", "start:prod"]

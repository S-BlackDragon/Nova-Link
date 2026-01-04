# --- Build Stage ---
FROM node:20-alpine AS builder

# Install OpenSSL 3 for Prisma
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

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

# Regenerate Prisma Client in production stage
RUN npx prisma generate

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "run", "start:prod"]

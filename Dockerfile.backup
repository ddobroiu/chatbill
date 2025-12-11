# Dockerfile pentru ChatBill
FROM node:20-alpine

# Install OpenSSL pentru Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/

# Install dependencies
WORKDIR /app/backend
RUN npm ci --only=production && \
    npx prisma generate

# Copy application code
COPY backend ./

# Create necessary directories
RUN mkdir -p logs invoices proformas

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/auth/me', (r) => {process.exit(r.statusCode === 401 ? 0 : 1)})"

# Start command
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]

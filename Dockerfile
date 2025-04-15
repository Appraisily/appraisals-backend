# Dockerfile for Appraisals Backend
# Optimized for Cloud Run deployment with proper secret access

# Use Node.js LTS version
FROM node:18-slim

# Set working directory
WORKDIR /usr/src/app

# Copy package files first (for better layer caching)
COPY package*.json ./

# Install dependencies with production-only flag
RUN npm ci --only=production

# Copy the rest of the application
COPY . .

# Create a non-root user for security
RUN groupadd -r appuser && \
    useradd -r -g appuser -d /usr/src/app appuser && \
    chown -R appuser:appuser /usr/src/app

# Switch to non-root user
USER appuser

# Expose the port
EXPOSE 8080

# Command to run the app
CMD [ "npm", "start" ]

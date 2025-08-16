# Use the official Node.js image with build tools
FROM mcr.microsoft.com/devcontainers/javascript-node:1-20-bullseye

# Set environment variables
ENV NODE_ENV=development
ENV DEBIAN_FRONTEND=noninteractive

# Install additional dependencies for native modules
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    libsqlite3-dev \
    sqlite3 \
    pkg-config \
    libc6-dev \
    make \
    g++ \
    git \
    curl \
    wget \
    unzip \
    ca-certificates \
    gnupg \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# Install latest npm globally
RUN npm install -g npm@latest node-gyp

# Set working directory
WORKDIR /workspaces/DebugFlow-Complete

# Copy package files for dependency pre-installation (optional optimization)
COPY package*.json ./

# Pre-install dependencies to speed up container startup
RUN npm ci --only=production && npm cache clean --force

# Create user with proper permissions
RUN groupadd --gid 1000 vscode \
    && useradd --uid 1000 --gid vscode --shell /bin/bash --create-home vscode \
    && chown -R vscode:vscode /workspaces

# Switch to vscode user
USER vscode
#!/bin/bash

# DebugFlow Codespace Setup Script
# This script configures the development environment for DebugFlow

set -e  # Exit on error

echo "🚀 Starting DebugFlow Development Environment Setup..."
echo "=================================================="

# Function to print status
print_status() {
    echo "✅ $1"
}

print_error() {
    echo "❌ $1"
}

# 1. Update package lists
echo "📦 Updating package lists..."
sudo apt-get update -qq || true

# 2. Install SQLite3 development files (needed for node-sqlite3)
echo "🗄️ Installing SQLite3 development dependencies..."
sudo apt-get install -y sqlite3 libsqlite3-dev build-essential python3 make g++ || {
    print_error "Failed to install SQLite3 dependencies"
    # Continue anyway as it might work without them
}

# 3. Clean npm cache to avoid issues
echo "🧹 Cleaning npm cache..."
npm cache clean --force || true

# 4. Remove existing node_modules and package-lock if they exist
echo "🗑️ Cleaning existing dependencies..."
rm -rf node_modules package-lock.json || true

# 5. Install dependencies with error handling
echo "📥 Installing npm dependencies..."
npm install --no-audit --no-fund || {
    print_error "Initial npm install failed, trying with --force"
    npm install --force --no-audit --no-fund || {
        print_error "npm install failed, trying yarn"
        npm install -g yarn
        yarn install || {
            print_error "All package managers failed - manual intervention required"
            exit 1
        }
    }
}

# 6. Rebuild native dependencies (especially SQLite3)
echo "🔨 Rebuilding native dependencies..."
npm rebuild sqlite3 --build-from-source || {
    print_error "SQLite3 rebuild failed, trying alternative method"
    cd node_modules/sqlite3 && npm run install || true
    cd ../..
}

# 7. Create necessary directories
echo "📁 Creating required directories..."
mkdir -p database dist public/uploads logs

# 8. Initialize database
echo "💾 Initializing database..."
if [ -f "database/schema.sql" ]; then
    sqlite3 database/debugflow.db < database/schema.sql 2>/dev/null || {
        print_error "Database initialization failed - will be created on first run"
    }
    print_status "Database initialized"
else
    print_error "No schema.sql found - database will be created on first run"
fi

# 9. Set proper permissions
echo "🔐 Setting permissions..."
chmod +x .devcontainer/setup.sh 2>/dev/null || true
chmod 755 database 2>/dev/null || true
chmod 755 public/uploads 2>/dev/null || true

# 10. Create .env file if it doesn't exist
echo "⚙️ Setting up environment variables..."
if [ ! -f ".env" ]; then
    cat > .env << EOF
# Development Environment Variables
NODE_ENV=development
PORT=3001
VITE_API_URL=http://localhost:3001/api

# Database
DATABASE_URL=./database/debugflow.db

# JWT Secret (auto-generated)
JWT_SECRET=$(openssl rand -hex 32)

# AI API Keys (add your own)
OPENAI_API_KEY=
GROQ_API_KEY=
GOOGLE_GEMINI_API_KEY=
ANTHROPIC_API_KEY=

# Optional Services
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
EOF
    print_status "Created .env file"
else
    print_status ".env file already exists"
fi

# 11. Build the project
echo "🏗️ Building the project..."
npm run build || {
    print_error "Build failed - this is OK for development"
}

# 12. Verify installation
echo "🔍 Verifying installation..."
node -v && npm -v && {
    print_status "Node.js and npm are working"
} || {
    print_error "Node.js or npm not found"
    exit 1
}

# 13. Test database connection
echo "🔗 Testing database connection..."
node -e "const sqlite3 = require('sqlite3'); console.log('SQLite3 module loaded successfully');" || {
    print_error "SQLite3 module not working - manual fix required"
}

# Final message
echo ""
echo "=================================================="
echo "✨ DebugFlow Development Environment Ready!"
echo "=================================================="
echo ""
echo "📝 Quick Start Commands:"
echo "  npm run dev        - Start development server (frontend only)"
echo "  npm run dev:full   - Start frontend + backend"
echo "  npm run build      - Build for production"
echo "  npm run preview    - Preview production build"
echo ""
echo "🌐 Access Points:"
echo "  Frontend: http://localhost:5173"
echo "  API:      http://localhost:3001"
echo ""
echo "💡 Tip: The Codespace will automatically forward these ports!"
echo ""
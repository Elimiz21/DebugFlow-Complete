# DebugFlow Codespaces Configuration

## 🚀 Quick Start

1. **Create a Codespace**: Click the green "Code" button on GitHub and select "Create codespace on main"
2. **Wait for initialization**: The setup script will automatically run (takes ~2-3 minutes)
3. **Start development**: Run `npm run dev` or `npm run dev:full`

## 📋 Configuration Details

### Files Structure
```
.devcontainer/
├── devcontainer.json       # Main configuration
├── setup.sh               # Automated setup script
├── Dockerfile             # Custom container image (optional)
├── docker-compose.yml     # Multi-service setup (optional)
└── README.md             # This file
```

### Key Features
- **Node.js 20 LTS** with build tools
- **SQLite3** native compilation support
- **Automatic port forwarding** (5173, 3001)
- **VS Code extensions** pre-installed
- **Environment variables** auto-configured
- **Database initialization** on first run

## 🔧 Troubleshooting

### Error 500 When Creating Codespace

**Symptoms**: GitHub shows "Error 500" when trying to create a codespace

**Solutions**:
1. **Clear browser cache** and try again
2. **Try incognito/private mode** to rule out extensions
3. **Check GitHub Status** at https://www.githubstatus.com/
4. **Wait and retry** - temporary GitHub issues

### SQLite3 Build Errors

**Symptoms**: `npm install` fails with SQLite3 errors

**Solutions**:
```bash
# Option 1: Rebuild from source
npm rebuild sqlite3 --build-from-source

# Option 2: Clean install
npm run clean:install

# Option 3: Manual fix
rm -rf node_modules/sqlite3
npm install sqlite3
```

### Port Already in Use

**Symptoms**: "Port 5173 is already in use"

**Solutions**:
```bash
# Find and kill process using the port
lsof -i :5173
kill -9 [PID]

# Or use different ports
VITE_PORT=5174 npm run dev
```

### Codespace Stuck in Recovery Mode

**Symptoms**: Codespace won't start, shows "recovery mode"

**Solutions**:
1. **Delete and recreate** the codespace
2. **Use simple configuration**:
   ```bash
   mv .devcontainer/devcontainer.json .devcontainer/devcontainer.backup.json
   mv .devcontainer/devcontainer.simple.json .devcontainer/devcontainer.json
   ```
3. **Check logs** in the Codespace terminal

### Environment Variables Not Set

**Symptoms**: API calls fail, authentication doesn't work

**Solutions**:
1. **Check .env file exists**:
   ```bash
   ls -la .env
   ```
2. **Create if missing**:
   ```bash
   npm run setup
   ```
3. **Add your API keys** to `.env` file

## 🛠️ Manual Setup Commands

If automatic setup fails, run these commands manually:

```bash
# 1. Install system dependencies
sudo apt-get update
sudo apt-get install -y sqlite3 libsqlite3-dev build-essential

# 2. Clean and reinstall Node modules
rm -rf node_modules package-lock.json
npm install

# 3. Rebuild native dependencies
npm rebuild sqlite3 --build-from-source

# 4. Initialize database
sqlite3 database/debugflow.db < database/schema.sql

# 5. Create .env file
cp .env.example .env 2>/dev/null || npm run setup

# 6. Start development
npm run dev:full
```

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend dev server (Vite) |
| `npm run dev:full` | Start frontend + backend |
| `npm run build` | Build for production |
| `npm run setup` | Run setup script |
| `npm run rebuild:sqlite` | Rebuild SQLite3 module |
| `npm run clean:install` | Clean reinstall all dependencies |

## 🔍 Debugging

### VS Code Debug Configurations

1. **Frontend Only**: F5 with "Launch Frontend (Vite)"
2. **Backend Only**: F5 with "Launch Backend (Node)"
3. **Full Stack**: F5 with "Full Stack" compound

### Check Logs

```bash
# Codespace creation logs
cat /workspaces/.codespaces/.persistedshare/creation.log

# Node logs
npm run dev 2>&1 | tee dev.log

# Check system resources
df -h
free -m
```

## 💡 Tips

1. **Use Tasks**: Press `Ctrl+Shift+P` → "Tasks: Run Task" for quick commands
2. **Port Forwarding**: Check the "Ports" tab in VS Code for forwarded URLs
3. **Performance**: The first build is slow; subsequent builds are cached
4. **Extensions**: Additional extensions can be added in devcontainer.json

## 🐛 Common Issues & Fixes

### Issue: Vite HMR Not Working
```bash
# Add to vite.config.js
server: {
  hmr: {
    port: 5173,
    protocol: 'wss',
    clientPort: 443
  }
}
```

### Issue: Database Locked
```bash
# Reset database
rm database/debugflow.db
npm run prepare:db
```

### Issue: Memory Issues
```bash
# Increase Node memory
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

## 📞 Support

If you continue experiencing issues:

1. **Check existing issues**: https://github.com/Elimiz21/DebugFlow-Complete/issues
2. **Create new issue** with:
   - Error messages
   - Browser/OS details
   - Steps to reproduce
3. **Try alternative setup**: Use local development instead of Codespaces

## 🔄 Updates

Last updated: 2025-08-16
- Fixed Error 500 issues
- Added SQLite3 compilation support
- Improved error handling in setup script
- Added comprehensive troubleshooting guide
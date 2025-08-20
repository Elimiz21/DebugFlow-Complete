# DebugFlow - AI-Powered Code Analysis Platform

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Elimiz21/DebugFlow-Complete)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://debug-flow-complete-7lnj.vercel.app)
[![Status](https://img.shields.io/badge/status-production%20ready-success)](https://github.com/Elimiz21/DebugFlow-Complete)

## 🚀 Overview

DebugFlow is a comprehensive AI-powered code debugging and analysis platform that helps developers identify bugs, optimize code, and improve code quality through advanced machine learning algorithms.

**Live Demo**: [https://debug-flow-complete-7lnj.vercel.app](https://debug-flow-complete-7lnj.vercel.app)

## ✨ Features

### Core Functionality
- 🔐 **User Authentication** - Secure registration and login with JWT
- 📁 **Multi-Source Upload** - Support for files, GitHub repos, and URLs
- 🤖 **AI Analysis** - Multiple AI providers (OpenAI, Claude, Gemini, Groq)
- 🐛 **Bug Detection** - Automatic bug identification and reporting
- 👥 **Real-time Collaboration** - Live debugging sessions with Socket.io
- 🧪 **Test Runner** - Execute and monitor test suites
- 🎛️ **Admin Panel** - Complete control over system configuration
- 📊 **Analytics Dashboard** - Track usage and performance metrics

### Recent Updates (2025-08-20)
- ✅ Fixed all critical production issues
- ✅ Added project selector to AI Analysis page
- ✅ Implemented Vercel Postgres support
- ✅ Enhanced GitHub repository import
- ✅ Improved authentication persistence

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Node.js, Express, Socket.io
- **Database**: Vercel Postgres (production), SQLite (development)
- **AI**: OpenAI, Google Gemini, Anthropic Claude, Groq
- **Deployment**: Vercel
- **Authentication**: JWT

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Elimiz21/DebugFlow-Complete.git
cd DebugFlow-Complete
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables:
```env
VITE_SOCKET_URL=http://localhost:3001
VITE_API_URL=http://localhost:3001/api
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:5173
JWT_SECRET=your-secret-key
DATABASE_URL=./debugflow.db
ADMIN_PASSWORD=admin123456
```

5. Start development server:
```bash
npm run dev:full
```

Visit `http://localhost:5173` to see the application.

## 📚 Documentation

- **Full Documentation**: See [CLAUDE.md](./CLAUDE.md)
- **Development Plan**: See [plan.md](./plan.md)
- **API Documentation**: Available at `/api-docs` when running locally

## 🧪 Testing

### Test Accounts
- **Admin Panel**: `/admin` - Password: `admin123456`
- **Demo User**: `demo@debugflow.com` / `demo1234`
- **Test User**: `test@debugflow.com` / `test1234`

### Running Tests
```bash
npm test                # Run all tests
npm run test:auth       # Test authentication
npm run test:upload     # Test file upload
npm run test:analysis   # Test AI analysis
```

## 🚀 Deployment

### Deploy to Vercel

1. Fork this repository
2. Connect to Vercel
3. Configure environment variables:
   - `POSTGRES_URL` - Vercel Postgres connection
   - `JWT_SECRET` - Production secret
   - `ADMIN_PASSWORD` - Secure admin password
   - API keys for AI services (optional)

4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Elimiz21/DebugFlow-Complete)

## 🔧 Configuration

### API Keys (Optional)
Configure in admin panel or environment variables:
- `OPENAI_API_KEY` - OpenAI GPT access
- `GROQ_API_KEY` - Groq AI access
- `GEMINI_API_KEY` - Google Gemini access
- `ANTHROPIC_API_KEY` - Claude AI access
- `GITHUB_TOKEN` - Higher GitHub API limits

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with React and Vite
- Styled with Tailwind CSS
- Deployed on Vercel
- AI powered by OpenAI, Anthropic, Google, and Groq

## 📧 Contact

Eli Mizroch - elimizroch@gmail.com

Project Link: [https://github.com/Elimiz21/DebugFlow-Complete](https://github.com/Elimiz21/DebugFlow-Complete)

## 🎯 Status

**Current Status**: ✅ **Production Ready** - All systems operational

For detailed status and roadmap, see [plan.md](./plan.md)
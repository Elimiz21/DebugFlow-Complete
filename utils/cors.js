import cors from 'cors';

// Configure CORS based on environment
const configureCORS = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Define allowed origins based on environment
  const allowedOrigins = isDevelopment
    ? [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174'
      ]
    : [
        process.env.FRONTEND_URL,
        'https://debugflow.vercel.app',
        'https://debugflow-complete.vercel.app',
        // Add your production domains here
      ].filter(Boolean); // Remove undefined values

  const corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin && isDevelopment) {
        return callback(null, true);
      }
      
      if (!origin) {
        return callback(new Error('No origin provided'), false);
      }

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`CORS: Blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Allow cookies and authentication headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
      'X-CSRF-Token'
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Total-Count',
      'Link'
    ],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
  };

  return cors(corsOptions);
};

// Simple CORS for specific endpoints (less restrictive)
export const simpleCORS = cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: false
});

// Strict CORS for sensitive endpoints
export const strictCORS = cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://debugflow.vercel.app',
      'https://debugflow-complete.vercel.app'
    ].filter(Boolean);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600 // 1 hour
});

// Export default CORS configuration
export default configureCORS();

// Export the configuration function for custom use
export { configureCORS };
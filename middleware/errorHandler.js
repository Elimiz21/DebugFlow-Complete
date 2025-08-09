// Centralized error handling middleware

// Custom error class
export class AppError extends Error {
  constructor(message, statusCode, errorCode = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Async error wrapper for route handlers
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Development error response
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack,
    details: err.details
  });
};

// Production error response
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
      details: err.details
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    
    res.status(500).json({
      success: false,
      message: 'Something went wrong!',
      errorCode: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// Handle specific error types
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, 'INVALID_ID');
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400, 'DUPLICATE_FIELD');
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400, 'VALIDATION_ERROR', errors);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401, 'INVALID_TOKEN');

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401, 'TOKEN_EXPIRED');

const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError('File too large. Maximum size is 10MB.', 400, 'FILE_TOO_LARGE');
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return new AppError('Too many files. Maximum is 50 files.', 400, 'TOO_MANY_FILES');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError('Unexpected field in file upload.', 400, 'UNEXPECTED_FIELD');
  }
  return new AppError('File upload error.', 400, 'UPLOAD_ERROR');
};

// Main error handling middleware
export const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error
  if (process.env.NODE_ENV === 'development') {
    console.log('Error 💥:', err);
  } else {
    // In production, log to error tracking service
    if (!err.isOperational) {
      console.error('ERROR 💥', err);
      // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    }
  }

  // Handle specific error types
  if (err.name === 'CastError') error = handleCastErrorDB(error);
  if (err.code === 11000) error = handleDuplicateFieldsDB(error);
  if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
  if (err.name === 'MulterError') error = handleMulterError(err);

  // Handle Supabase errors
  if (err.code === 'PGRST116') {
    error = new AppError('Resource not found', 404, 'NOT_FOUND');
  }
  if (err.code === '23505') {
    error = new AppError('Duplicate entry', 409, 'DUPLICATE_ENTRY');
  }
  if (err.code === '23503') {
    error = new AppError('Referenced resource not found', 400, 'REFERENCE_ERROR');
  }

  // Handle Cloudinary errors
  if (err.http_code) {
    if (err.http_code === 401) {
      error = new AppError('Cloud storage authentication failed', 500, 'STORAGE_AUTH_ERROR');
    } else if (err.http_code === 404) {
      error = new AppError('File not found in cloud storage', 404, 'FILE_NOT_FOUND');
    } else {
      error = new AppError('Cloud storage error', 500, 'STORAGE_ERROR');
    }
  }

  // Send error response
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

// 404 handler
export const notFoundHandler = (req, res, next) => {
  const message = `Can't find ${req.originalUrl} on this server!`;
  const err = new AppError(message, 404, 'NOT_FOUND');
  next(err);
};

// Unhandled rejection handler
export const unhandledRejectionHandler = () => {
  process.on('unhandledRejection', (err) => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    // In production, perform graceful shutdown
    if (process.env.NODE_ENV === 'production') {
      // TODO: Close database connections, clean up resources
      process.exit(1);
    }
  });
};

// Uncaught exception handler
export const uncaughtExceptionHandler = () => {
  process.on('uncaughtException', (err) => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
  });
};

// Error logger middleware
export const errorLogger = (err, req, res, next) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    error: {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode || 500
    }
  };

  // Log to file or external service
  console.error('Error Log:', errorLog);
  
  next(err);
};

export default {
  AppError,
  asyncHandler,
  globalErrorHandler,
  notFoundHandler,
  unhandledRejectionHandler,
  uncaughtExceptionHandler,
  errorLogger
};
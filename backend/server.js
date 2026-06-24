require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads', 'bookings');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Security headers with CSP (Issue #14)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow file downloads
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'].filter(Boolean),
    }
  }
}));

// Request logging (Issue #21)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// CORS — restrict to frontend origin only (Issue #7)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10kb' })); // cap request body size

// Serve uploaded files securely (Removed static serve to prevent unauthenticated access)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Global rate limiter — 200 req / 15 min per IP (Issue #8)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Too many requests, please try again later' }
});
app.use(globalLimiter);

// Stricter rate limiting for auth endpoints (Issue #8)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many auth attempts, please try again later' }
});

// Stricter rate limiting for booking creation (Issue #3)
const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: 'Too many booking requests, please slow down' },
  skip: (req) => req.method !== 'POST'  // Only apply to POST (create bookings), not GET/PATCH
});

// Database connection with retry logic
const connectDB = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/batra_booking', {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        // MongoDB 8.x driver no longer needs useNewUrlParser/useUnifiedTopology
      });
      console.log('MongoDB Connected');
      return;
    } catch (err) {
      console.error(`MongoDB Connection Error (attempt ${i + 1}/${retries}):`, err.message);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('All MongoDB connection attempts failed');
        process.exit(1);
      }
    }
  }
};
connectDB();

// Routes
app.use('/auth', authLimiter, require('./routes/auth'));
app.use('/services', require('./routes/services'));
app.use('/bookings', bookingLimiter, require('./routes/bookings'));
app.use('/users', require('./routes/users'));
app.use('/analytics', require('./routes/analytics'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port} [${process.env.NODE_ENV || 'development'}]`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = Number(port) + 1;
      console.warn(`Port ${port} is already in use, retrying on ${nextPort}`);
      startServer(nextPort);
      return;
    }

    throw err;
  });
};

const PORT = Number(process.env.PORT || 5000);
startServer(PORT);

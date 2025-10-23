require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('./config/passport');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const tmdbRoutes = require('./routes/tmdb');
const comickRoutes = require('./routes/comick'); 
const jikanRoutes = require('./routes/jikan');
const mangadexRoutes = require('./routes/mangadex');

const communityRoutes = require('./routes/community');
const uploadRoutes = require('./routes/upload');
const { createServer } = require('http');
const socketIo = require('socket.io');
const { authenticate } = require('./middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const path = require('path');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const winston = require('winston');
const signature = require('cookie-signature');
const { rateLimiters } = require('./middleware/rateLimit');
const os = require('os');
const util = require('util');

const app = express();
const server = createServer(app);

const frontendPath = path.join(__dirname, '../../frontend/dist');

// Initialize Socket.IO with CORS and high traffic optimizations
const io = socketIo(server, {
  cors: {
    origin: ['https://streamr-see.web.app', 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 30000, // Reduced timeout for faster resource recovery
  pingInterval: 15000, // More frequent pings to detect disconnections faster
  upgradeTimeout: 15000, // Faster upgrade timeout
  allowUpgrades: true,
  cookie: false,
  connectTimeout: 15000, // Faster connection timeout
  maxHttpBufferSize: 1e6, // 1MB max payload size
  perMessageDeflate: {
    threshold: 1024 // Only compress messages larger than 1KB
  },
  httpCompression: {
    threshold: 1024 // Only compress HTTP requests larger than 1KB
  },
  serveClient: false, // Don't serve client files to save resources
  // High traffic optimizations
  cleanupEmptyChildNamespaces: true,
  destroyUpgrade: true, // Clean up upgrade requests
  parser: require('socket.io-msgpack-parser') // More efficient binary protocol
});

// Create community namespace
const communityNamespace = io.of('/community');

// Active users feature removed


// Middleware
const allowedOrigins = [
  'https://streamr-see.web.app', // Always allow deployed frontend
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

// Enable compression for all responses
app.use(compression({
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress responses with this header
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter function from the module
    return compression.filter(req, res);
  }
}));

// CORS middleware: allow deployed and local frontends
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      // In production, still allow the request but log it
      console.warn(`CORS: Origin ${origin} not in allowed list, but allowing request`);
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle preflight requests explicitly
app.options('*', cors());

// Session middleware with MongoDB store
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/streamr',
    collectionName: 'sessions',
    ttl: 24 * 60 * 60, // 24 hours in seconds
    autoRemove: 'native' // Use MongoDB's TTL index
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'none', // Match the sameSite setting for cross-origin
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Configure Helmet with more permissive settings for development
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  crossOriginEmbedderPolicy: false, // Disable to allow cross-origin requests
  contentSecurityPolicy: false, // Disable CSP to avoid conflicts with CORS
}));

// Winston logger setup
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    // When running locally, log human-readable output to console
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize(), winston.format.simple())
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Use morgan for HTTP logging in dev, winston stream in prod
if (process.env.NODE_ENV === 'production') {
  app.use(require('morgan')('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
} else {
  app.use(require('morgan')('dev'));
}

app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET || 'your-cookie-secret'));

// Debug middleware to log cookies only when explicitly enabled
app.use((req, res, next) => {
  if (process.env.DEBUG_COOKIE === 'true' && req.path === '/api/auth/refresh-token') {
    logger.debug('🍪 Debug: Request cookies: %o', req.cookies);
    logger.debug('🍪 Debug: Request headers: %o', req.headers);
  }
  next();
});

app.use(express.urlencoded({ extended: true }));

// Sanitize data against NoSQL injection
app.use(mongoSanitize());
// Sanitize data against XSS
app.use(xss());

// Apply general rate limiting to all routes
app.use('/api', rateLimiters.general);

// Ensure CORS headers are always present (even for errors)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.indexOf(origin) !== -1) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');
  next();
});

// Add gzip compression middleware
// compression already configured above with custom options; avoid duplicate

// Health check route
// Liveness endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Readiness endpoint (returns 503 if not ready)
let isReady = false;
app.get('/api/ready', (req, res) => {
  if (!isReady) {
    return res.status(503).json({ status: 'not ready' });
  }
  return res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

// Basic metrics endpoint
app.get('/metrics', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    requestsTotal: metrics.requestsTotal || 0,
    activeConnections: metrics.activeConnections ? metrics.activeConnections() : 0,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    hostname: os.hostname()
  });
});

// TMDB API health check
app.get('/api/tmdb/health', async (req, res) => {
  try {
    if (!process.env.TMDB_API_KEY) {
      return res.status(500).json({
        status: 'error',
        message: 'TMDB API key not configured'
      });
    }

    res.json({
      status: 'ok',
      message: 'TMDB API key configured',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('TMDB health check error: %o', error);
    res.status(500).json({
      status: 'error',
      message: 'TMDB API health check failed',
      error: error.message
    });
  }
});

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Attempt to read signed session cookie to derive a stable sessionId
function extractSessionIdFromCookie(cookieHeader, cookieSecret) {
  try {
    if (!cookieHeader) return null;
    const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
      const [k, ...rest] = c.trim().split('=');
      return [k, decodeURIComponent(rest.join('='))];
    }));
    const raw = cookies['connect.sid'];
    if (!raw) return null;
    // Cookie is typically in format: s:<signed value>
    const unsigned = raw.startsWith('s:') ? signature.unsign(raw.slice(2), cookieSecret || process.env.COOKIE_SECRET || 'your-cookie-secret') : raw;
    return unsigned || null;
  } catch (err) {
    logger.debug('Failed to extract session id from cookie: %o', err);
    return null;
  }
}

// Socket.IO middleware for authentication and session handling
io.use(async (socket, next) => {
  try {
    // Prefer explicit clientId provided by frontend, then signed cookie, then fallback to socket.id
    let sessionId = socket.handshake.auth?.clientId || null;
    if (!sessionId) {
      const cookieHeader = socket.handshake.headers?.cookie;
      const cookieSecret = process.env.COOKIE_SECRET || 'your-cookie-secret';
      sessionId = extractSessionIdFromCookie(cookieHeader, cookieSecret);
    }
    socket.sessionId = sessionId || socket.id;
    
    const token = socket.handshake.auth.token;
    if (!token) {
      // Allow anonymous connections
      socket.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Use lean() to get plain JS object instead of Mongoose document (reduces memory)
      const user = await User.findById(decoded.userId).lean().select('_id username email profilePicture');

      if (!user) {
        // Allow anonymous connections
        socket.user = null;
        return next();
      }

      socket.user = user;
      return next();
    } catch (tokenError) {
      // Token verification failed — log at debug level
      logger.debug('Socket auth token verification failed: %o', tokenError);
      socket.user = null;
      return next();
    }
  } catch (error) {
    // Allow anonymous connections
    socket.user = null;
    next();
  }
});

// Active users socket handling removed


// Socket.IO connection handling
communityNamespace.on('connection', (socket) => {
  logger.info('User connected to community namespace: %s', socket.id);

  // Join community room
  socket.join('community');

  // Join user-specific room for real-time sync if authenticated
  if (socket.user && socket.user._id) {
    socket.join(`user_${socket.user._id}`);
    logger.debug('User %s joined user room for real-time sync', socket.user._id);
  }

  // Store event listeners to properly remove them later
  const eventHandlers = {
    'discussion:create': (discussion) => {
      communityNamespace.to('community').emit('discussion:new', discussion);
    },
    'reply:create': (data) => {
      communityNamespace.to('community').emit('reply:new', data);
    },
    'discussion:like': (data) => {
      communityNamespace.to('community').emit('discussion:liked', data);
    },
    'reply:like': (data) => {
      communityNamespace.to('community').emit('reply:liked', data);
    }
  };

  // Register event handlers
  Object.entries(eventHandlers).forEach(([event, handler]) => {
    socket.on(event, handler);
  });

  socket.on('disconnect', () => {
    logger.info('User disconnected from community namespace: %s', socket.id);

    // Clean up all event listeners to prevent memory leaks
    Object.keys(eventHandlers).forEach(event => {
      socket.removeAllListeners(event);
    });

    // Leave all rooms
    if (typeof socket.leaveAll === 'function') {
      socket.leaveAll();
    } else {
      Object.keys(socket.rooms || {}).forEach(room => {
        if (room !== socket.id) {
          socket.leave(room);
        }
      });
    }
  });
});

// Make io available to routes for real-time updates
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', authenticate, userRoutes);
app.use('/api/tmdb', tmdbRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/upload', uploadRoutes);
// Comick API proxy
app.use('/api/comick', comickRoutes);
app.use('/api/v1/comick', comickRoutes);
// Jikan & MangaDex proxies
app.use('/api/jikan', jikanRoutes);
app.use('/api/mangadex', mangadexRoutes);
// Versioned mounts to match frontend getApiEndpoint
app.use('/api/v1/jikan', jikanRoutes);
app.use('/api/v1/mangadex', mangadexRoutes);

// Active users API endpoint removed

// Health check endpoints
app.get('/', (req, res) => {
  res.send('Streamr Backend API is running.');
});



// Serve uploaded files
app.use('/uploads', (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Global error handler: %o', err);
  // Ensure CORS headers are present even on errors
  const origin = req.headers.origin;
  if (origin && allowedOrigins.indexOf(origin) !== -1) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    status: err.status || 500
  });
});

// MongoDB connection options with memory leak prevention and high traffic optimizations
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50, // Increased for high traffic
  minPoolSize: 5,  // Increased for high traffic
  maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
  family: 4, // Use IPv4, avoid issues with IPv6
  connectTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
  autoIndex: false, // Don't build indexes automatically in production
  compressors: "zlib", // Enable compression for MongoDB traffic
  zlibCompressionLevel: 6, // Balance between compression ratio and CPU usage
  retryWrites: true,
  w: "majority", // Write concern for data durability
  readPreference: "secondaryPreferred" // Read from secondaries when possible
};

// Connect to MongoDB
// Track open connections so we can force-close them during shutdown
const connections = new Set();
server.on('connection', (socket) => {
  connections.add(socket);
  socket.on('close', () => connections.delete(socket));
});

// Lightweight in-memory metrics (optionally replace with Prometheus client)
const metrics = {
  requestsTotal: 0,
  activeConnections: () => connections.size,
};

// Count requests
app.use((req, res, next) => {
  metrics.requestsTotal++;
  next();
});

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, mongooseOptions);
    logger.info('MongoDB connected successfully');
    if (process.env.NODE_ENV !== 'production') {
      mongoose.set('debug', true);
    }

    // Start server
    const PORT = process.env.PORT || 3001;
    await new Promise((resolve, reject) => {
      server.listen(PORT, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    logger.info('Server running', { port: process.env.PORT || 3001, env: process.env.NODE_ENV || 'development' });
    logger.info('Allowed origins: %o', allowedOrigins);
    // Mark readiness as true once listening and DB connected
    isReady = true;
  } catch (err) {
    logger.error('MongoDB connection or server start error: %o', err);
    // Wait a moment for logs to flush
    setTimeout(() => process.exit(1), 200);
  }
};

startServer();

// Handle MongoDB connection events
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Handle process termination with comprehensive cleanup
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    // Close Socket.IO server
    if (io) {
      console.log('Closing Socket.IO server...');
      io.close(() => {
        console.log('Socket.IO server closed');
      });
    }
    
    // Close HTTP server
    if (server) {
      console.log('Closing HTTP server...');
      server.close(() => {
        console.log('HTTP server closed');
      });
    }
    
    // Close MongoDB connection
    if (mongoose.connection.readyState === 1) {
      console.log('Closing MongoDB connection...');
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
    
    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (err) {
    console.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
};

// Handle different termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Make io instance available to routes
app.set('io', communityNamespace);
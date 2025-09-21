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
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie']
}));

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
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.themoviedb.org", "https://api.jikan.moe", "https://api.mangadex.org"],
    },
  },
}));

// Winston logger setup
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
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

// Debug middleware to log cookies
app.use((req, res, next) => {
  if (req.path === '/api/auth/refresh-token') {
    console.log('🍪 Debug: Request cookies:', req.cookies);
    console.log('🍪 Debug: Request headers:', req.headers);
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


// Add gzip compression middleware
app.use(compression());

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
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
    const unsigned = raw.startsWith('s:') ? signature.unsign(raw.slice(2), cookieSecret || 'your-cookie-secret') : raw;
    return unsigned || null;
  } catch {
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
      next();
    } catch (tokenError) {
      // Token verification failed
      socket.user = null;
      next();
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
  console.log('User connected to community namespace:', socket.id);

  // Join community room
  socket.join('community');

  // Join user-specific room for real-time sync if authenticated
  if (socket.user && socket.user._id) {
    socket.join(`user_${socket.user._id}`);
    console.log(`User ${socket.user._id} joined user room for real-time sync`);
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
    console.log('User disconnected from community namespace:', socket.id);
    
    // Clean up all event listeners to prevent memory leaks
    Object.keys(eventHandlers).forEach(event => {
      socket.removeAllListeners(event);
    });
    
    // Leave all rooms
    socket.leaveAll?.() || Object.keys(socket.rooms || {}).forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
      }
    });
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
  console.error('Global error handler:', err);
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
mongoose.connect(process.env.MONGO_URI, mongooseOptions)
  .then(() => {
    console.log('MongoDB connected successfully');
    if (process.env.NODE_ENV !== 'production') {
      mongoose.set('debug', true);
    }
    // Start server
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Environment:', process.env.NODE_ENV || 'development');
      console.log('Allowed origins:', allowedOrigins);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if cannot connect to database
  });

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
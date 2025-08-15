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
const communityRoutes = require('./routes/community');
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

const app = express();
const server = createServer(app);

const frontendPath = path.join(__dirname, '../../frontend/dist');

// Initialize Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: ['https://streamr-see.web.app', 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowUpgrades: true,
  cookie: false
});

// Create community namespace
const communityNamespace = io.of('/community');

// Active users tracking with enhanced precision and accuracy
let activeUsers = new Map(); // Changed from Set to Map for better tracking
let activeUsersCount = 0;
let activeUsersHistory = []; // Track historical data for analytics
let connectionStats = {
  totalConnections: 0,
  totalDisconnections: 0,
  peakUsers: 0,
  averageUsers: 0,
  lastUpdated: new Date()
};

// Debug logging for active users
const DEBUG_ACTIVE_USERS = process.env.DEBUG_ACTIVE_USERS === 'true' || process.env.NODE_ENV === 'development';

// Enhanced user identification with fingerprinting
const generateUserId = (socket, req) => {
  // For authenticated users, use their ID
  if (socket.user && socket.user._id) {
    return `user_${socket.user._id.toString()}`;
  }
  
  // For anonymous users, use socket.id for better accuracy
  // This ensures each connection is counted separately
  return `anon_${socket.id}`;
};

// Enhanced function to update active users count with analytics
const updateActiveUsersCount = () => {
  const newCount = activeUsers.size;
  if (newCount !== activeUsersCount) {
    const oldCount = activeUsersCount;
    activeUsersCount = newCount;
    
    // Update peak users
    if (activeUsersCount > connectionStats.peakUsers) {
      connectionStats.peakUsers = activeUsersCount;
    }
    
    // Update average users (simple moving average)
    if (activeUsersHistory.length >= 10) {
      activeUsersHistory.shift();
    }
    activeUsersHistory.push(activeUsersCount);
    connectionStats.averageUsers = Math.round(
      activeUsersHistory.reduce((sum, count) => sum + count, 0) / activeUsersHistory.length
    );
    
    connectionStats.lastUpdated = new Date();
    
    if (DEBUG_ACTIVE_USERS) {
      console.log(`📊 Active users updated: ${oldCount} → ${activeUsersCount} (${Array.from(activeUsers.keys()).slice(0, 5).join(', ')}${activeUsers.size > 5 ? '...' : ''})`);
      console.log(`📈 Peak: ${connectionStats.peakUsers}, Avg: ${connectionStats.averageUsers}`);
    }
    
    // Broadcast to all connected clients with enhanced data
    io.emit('activeUsers:update', { 
      count: activeUsersCount,
      timestamp: new Date().toISOString(),
      stats: {
        peak: connectionStats.peakUsers,
        average: connectionStats.averageUsers,
        totalConnections: connectionStats.totalConnections
      }
    });
  }
};

// Enhanced function to add active user with connection tracking
const addActiveUser = (userId, socket, connectionInfo = {}) => {
  const now = new Date();
  const userData = {
    id: userId,
    connectedAt: now,
    lastSeen: now,
    socketId: socket.id,
    userAgent: connectionInfo.userAgent || '',
    ip: connectionInfo.ip || '',
    isAuthenticated: !!socket.user,
    connectionCount: 1
  };
  
  // Check if user already exists (reconnection)
  if (activeUsers.has(userId)) {
    const existingUser = activeUsers.get(userId);
    userData.connectionCount = existingUser.connectionCount + 1;
    userData.firstConnectedAt = existingUser.firstConnectedAt || existingUser.connectedAt;
  } else {
    userData.firstConnectedAt = now;
  }
  
  activeUsers.set(userId, userData);
  connectionStats.totalConnections++;
  
  if (DEBUG_ACTIVE_USERS) {
    console.log(`👤 User connected: ${userId} (${userData.isAuthenticated ? 'authenticated' : 'anonymous'})`);
    console.log(`📊 Total connections: ${connectionStats.totalConnections}`);
  }
  
  updateActiveUsersCount();
  return userData;
};

// Enhanced function to remove active user with better cleanup
const removeActiveUser = (userId, reason = 'disconnect') => {
  if (activeUsers.has(userId)) {
    const userData = activeUsers.get(userId);
    const sessionDuration = new Date() - userData.connectedAt;
    
    if (DEBUG_ACTIVE_USERS) {
      console.log(`👋 User disconnected: ${userId} (${reason}) - Session: ${Math.round(sessionDuration / 1000)}s`);
    }
    
    activeUsers.delete(userId);
    connectionStats.totalDisconnections++;
    updateActiveUsersCount();
    
    return userData;
  }
  return null;
};

// Enhanced cleanup with better stale connection detection
const cleanupStaleConnections = () => {
  const now = new Date();
  const staleTimeout = 5 * 60 * 1000; // 5 minutes (increased for better accuracy)
  const staleUsers = [];
  
  activeUsers.forEach((userData, userId) => {
    const timeSinceLastSeen = now - userData.lastSeen;
    
    // Check if socket is still connected
    const socket = io.sockets.sockets.get(userData.socketId);
    if (!socket || !socket.connected) {
      staleUsers.push(userId);
    } else if (timeSinceLastSeen > staleTimeout) {
      // Only mark as stale if no heartbeat for extended period
      staleUsers.push(userId);
    }
  });
  
  if (staleUsers.length > 0) {
    if (DEBUG_ACTIVE_USERS) {
      console.log(`🧹 Cleaning up ${staleUsers.length} stale connections`);
    }
    
    staleUsers.forEach(userId => {
      removeActiveUser(userId, 'stale_cleanup');
    });
  }
};

// Enhanced heartbeat mechanism
const updateUserHeartbeat = (userId) => {
  if (activeUsers.has(userId)) {
    const userData = activeUsers.get(userId);
    userData.lastSeen = new Date();
    activeUsers.set(userId, userData);
  }
};

// Middleware
const allowedOrigins = [
  'https://streamr-see.web.app', // Always allow deployed frontend
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

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
      connectSrc: ["'self'", "https://api.themoviedb.org"],
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

// Import custom rate limiters
const { rateLimiters } = require('./middleware/rateLimit');

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

// Socket.IO middleware for authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      // Allow anonymous connections for active user tracking
      socket.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      // Allow anonymous connections for active user tracking
      socket.user = null;
      return next();
    }

    socket.user = user;
    next();
  } catch (error) {
    // Allow anonymous connections for active user tracking
    socket.user = null;
    next();
  }
});

// Global socket connection handling for active users tracking
io.on('connection', (socket) => {
  console.log('User connected to global namespace:', socket.id);
  
  // Generate user ID based on socket and request
  const userId = generateUserId(socket, socket.request);
  const connectionInfo = {
    userAgent: socket.request?.headers['user-agent'] || '',
    ip: socket.request?.ip || socket.request?.connection?.remoteAddress || '',
    acceptLanguage: socket.request?.headers['accept-language'] || ''
  };
  
  addActiveUser(userId, socket, connectionInfo);
  
  // Send immediate update to the newly connected user
  socket.emit('activeUsers:update', { 
    count: activeUsersCount,
    timestamp: new Date().toISOString(),
    stats: {
      peak: connectionStats.peakUsers,
      average: connectionStats.averageUsers,
      totalConnections: connectionStats.totalConnections
    }
  });
  
  // Set up heartbeat for this user
  const heartbeatInterval = setInterval(() => {
    updateUserHeartbeat(userId);
  }, 60000); // 60 second heartbeat (increased for better reliability)
  
  socket.on('disconnect', (reason) => {
    console.log('User disconnected from global namespace:', socket.id, 'Reason:', reason);
    clearInterval(heartbeatInterval);
    removeActiveUser(userId, reason);
  });
  
  // Handle reconnection attempts
  socket.on('reconnect', () => {
    console.log('User reconnected to global namespace:', socket.id);
    updateUserHeartbeat(userId); // Update heartbeat on reconnection
    addActiveUser(userId, socket, connectionInfo); // Re-add user with updated connection info
  });
  
  // Handle heartbeat events from client
  socket.on('heartbeat', () => {
    updateUserHeartbeat(userId);
  });
});

// Socket.IO connection handling
communityNamespace.on('connection', (socket) => {
  console.log('User connected to community namespace:', socket.id);

  // Add user to active users if authenticated
  if (socket.user && socket.user._id) {
    const userId = generateUserId(socket, socket.request);
    addActiveUser(userId, socket);
  }

  // Join community room
  socket.join('community');

  // Handle discussion creation
  socket.on('discussion:create', (discussion) => {
    communityNamespace.to('community').emit('discussion:new', discussion);
  });

  // Handle reply creation
  socket.on('reply:create', (data) => {
    communityNamespace.to('community').emit('reply:new', data);
  });

  // Handle discussion like
  socket.on('discussion:like', (data) => {
    communityNamespace.to('community').emit('discussion:liked', data);
  });

  // Handle reply like
  socket.on('reply:like', (data) => {
    communityNamespace.to('community').emit('reply:liked', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected from community namespace:', socket.id);
    // Remove user from active users
    if (socket.user && socket.user._id) {
      const userId = generateUserId(socket, socket.request);
      removeActiveUser(userId, 'community_disconnect');
    }
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', authenticate, userRoutes);
app.use('/api/tmdb', tmdbRoutes);
app.use('/api/community', communityRoutes);

// Health check endpoints
app.get('/', (req, res) => {
  res.send('Streamr Backend API is running.');
});

// Specific health check for network status component
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Enhanced active users endpoint with detailed analytics
app.get('/api/active-users', (req, res) => {
  const now = new Date();
  const response = {
    count: activeUsersCount,
    timestamp: now.toISOString(),
    stats: {
      peak: connectionStats.peakUsers,
      average: connectionStats.averageUsers,
      totalConnections: connectionStats.totalConnections,
      totalDisconnections: connectionStats.totalDisconnections,
      lastUpdated: connectionStats.lastUpdated.toISOString()
    },
    analytics: {
      authenticatedUsers: Array.from(activeUsers.values()).filter(user => user.isAuthenticated).length,
      anonymousUsers: Array.from(activeUsers.values()).filter(user => !user.isAuthenticated).length,
      averageSessionDuration: 0, // Will be calculated below
      recentActivity: activeUsersHistory.slice(-5) // Last 5 updates
    }
  };
  
  // Calculate average session duration
  const activeSessions = Array.from(activeUsers.values());
  if (activeSessions.length > 0) {
    const totalDuration = activeSessions.reduce((sum, user) => {
      return sum + (now - user.connectedAt);
    }, 0);
    response.analytics.averageSessionDuration = Math.round(totalDuration / activeSessions.length / 1000); // in seconds
  }
  
  // Add debug information in development
  if (DEBUG_ACTIVE_USERS) {
    response.debug = {
      totalConnections: io.engine.clientsCount,
      activeUsersMap: activeUsers.size,
      sampleUsers: Array.from(activeUsers.entries()).slice(0, 3).map(([id, data]) => ({
        id: id.substring(0, 20) + '...',
        isAuthenticated: data.isAuthenticated,
        connectedAt: data.connectedAt.toISOString(),
        connectionCount: data.connectionCount
      })),
      cleanupStats: {
        lastCleanup: new Date().toISOString(),
        staleTimeout: '2 minutes'
      }
    };
  }
  
  res.status(200).json(response);
});

// Periodic cleanup of stale connections (every 5 minutes)
setInterval(() => {
  cleanupStaleConnections(); // Use the enhanced cleanup function
}, 5 * 60 * 1000); // Every 5 minutes

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

// MongoDB connection options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
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

// Handle process termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error during MongoDB disconnection:', err);
    process.exit(1);
  }
});

// Make io instance available to routes
app.set('io', communityNamespace); 
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

// Active users tracking
let activeUsers = new Set();
let activeUsersCount = 0;

// Function to update active users count
const updateActiveUsersCount = () => {
  activeUsersCount = activeUsers.size;
  // Broadcast to all connected clients
  io.emit('activeUsers:update', { count: activeUsersCount });
};

// Function to add active user
const addActiveUser = (userId) => {
  activeUsers.add(userId);
  updateActiveUsersCount();
};

// Function to remove active user
const removeActiveUser = (userId) => {
  activeUsers.delete(userId);
  updateActiveUsersCount();
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
  
  // Add to active users count (anonymous or authenticated)
  const userId = socket.user ? socket.user._id.toString() : `anon_${socket.id}`;
  addActiveUser(userId);
  
  socket.on('disconnect', () => {
    console.log('User disconnected from global namespace:', socket.id);
    removeActiveUser(userId);
  });
});

// Socket.IO connection handling
communityNamespace.on('connection', (socket) => {
  console.log('User connected to community namespace:', socket.id);

  // Add user to active users if authenticated
  if (socket.user && socket.user._id) {
    addActiveUser(socket.user._id.toString());
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
      removeActiveUser(socket.user._id.toString());
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

// Active users endpoint
app.get('/api/active-users', (req, res) => {
  res.status(200).json({
    count: activeUsersCount,
    timestamp: new Date().toISOString()
  });
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
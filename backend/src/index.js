require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const session = require('express-session');
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
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
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

// Middleware
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://streamr-see.web.app']
  : [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
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
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Sanitize data against NoSQL injection
app.use(mongoSanitize());
// Sanitize data against XSS
app.use(xss());

// Rate Limiter - exclude TMDB proxy routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 in dev, 100 in prod
  skip: (req) => req.path.startsWith('/api/tmdb/proxy')
});
app.use(limiter);

// Add gzip compression middleware
app.use(compression());

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Initialize Passport
app.use(passport.initialize());

// Socket.IO middleware for authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection handling
communityNamespace.on('connection', (socket) => {
  console.log('User connected to community namespace:', socket.id);

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
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', authenticate, userRoutes);
app.use('/api/tmdb', tmdbRoutes);
app.use('/api/community', communityRoutes);

// Add this:
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
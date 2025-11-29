import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import session from 'express-session';
import mongoose from 'mongoose';
import connectDB from './config/database.js';
import passportConfig from './config/passport.js';
import authRoutes from './routes/auth.js';
import tmdbRoutes from './routes/tmdb.js';
import downloadsRoutes from './routes/downloads.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

console.log('-------- SERVER CONFIG --------');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '(Set)' : '(Missing)');
console.log('-------------------------------');

// Check for required environment variables
const requiredEnvVars = ['MONGODB_URI', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error('❌ Error: Missing required environment variables:');
    missingEnvVars.forEach(envVar => {
        console.error(`   - ${envVar}`);
    });
    console.error('Please check your server/.env file.');
    // Only exit if running as a standalone script
    if (process.argv[1] === __filename) {
        process.exit(1);
    }
}

// Initialize Express app
const app = express();

// Trust proxy is required for Vercel/Heroku to handle secure cookies correctly
app.set('trust proxy', 1);

// Middleware (can be set up before DB connection)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '../dist');
    if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
    }
}

// CORS configuration
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:4173',
            'http://localhost:3000',
            'https://streamr-see.web.app',
            'https://streamr-see.firebaseapp.com'
        ];

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Check if origin is in the allowed list
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }

        // Allow subdomains for firebase deployments (e.g. https://streamr-see--preview-xyz.web.app)
        if (origin.endsWith('.streamr-see.web.app') || origin.endsWith('.streamr-see.firebaseapp.com')) {
            return callback(null, true);
        }

        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Session middleware (required for Passport)
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Database connection promise (will be awaited before handling requests)
let dbConnectionPromise = null;

// Middleware to ensure DB is connected before handling auth requests
const ensureDBConnection = async (req, res, next) => {
    try {
        if (!dbConnectionPromise) {
            dbConnectionPromise = connectDB();
        }
        await dbConnectionPromise;
        next();
    } catch (error) {
        console.error('Database connection failed:', error);
        res.status(503).json({
            success: false,
            message: 'Database connection unavailable'
        });
    }
};

// Initialize Passport config (can be done synchronously)
passportConfig(passport);

// Initialize Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes (with DB connection check middleware for auth routes)
app.use('/api/auth', ensureDBConnection, authRoutes);
app.use('/api/tmdb', tmdbRoutes);
app.use('/api/downloads', downloadsRoutes);

// Health check route
app.get('/health', async (req, res) => {
    let dbStatus = 'disconnected';
    try {
        if (!dbConnectionPromise) {
            dbConnectionPromise = connectDB();
        }
        await dbConnectionPromise;
        dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    } catch (error) { // eslint-disable-line no-unused-vars
        dbStatus = 'error';
    }

    res.status(200).json({
        success: true,
        message: 'Server is running',
        database: dbStatus,
        timestamp: new Date().toISOString()
    });
});

if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '../dist');
    if (fs.existsSync(distPath)) {
        app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api')) return next();
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }
}

// Root route for backend health check
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Streamr Backend is running',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handler
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error('Server Error:', err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Start server only if running directly (not in serverless environment)
if (process.argv[1] === __filename) {
    // For traditional server deployment, ensure DB connects on startup
    connectDB().then(() => {
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
            console.log(`📊 Database: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '⚠️ Connecting...'}`);
        });
    }).catch(err => {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    });
}

export default app;

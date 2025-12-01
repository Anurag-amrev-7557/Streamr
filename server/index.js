import { createServer } from 'http';
import { Server } from 'socket.io';
import chatRoutes from './routes/chat.js';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import session from 'express-session';
import mongoose from 'mongoose';
import helmet from 'helmet';
import xss from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import connectDB from './config/database.js';
import passportConfig from './config/passport.js';
import authRoutes from './routes/auth.js';
import tmdbRoutes from './routes/tmdb.js';
import downloadsRoutes from './routes/downloads.js';
import friendRoutes from './routes/friend.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import logger from './utils/logger.js';
import errorHandler from './middleware/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

logger.info('-------- SERVER CONFIG --------');
logger.info(`FRONTEND_URL: ${process.env.FRONTEND_URL}`);
logger.info(`MONGODB_URI: ${process.env.MONGODB_URI ? '(Set)' : '(Missing)'}`);
logger.info('-------------------------------');

// Check for required environment variables
const requiredEnvVars = ['MONGODB_URI', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    logger.error('❌ Error: Missing required environment variables:');
    missingEnvVars.forEach(envVar => {
        logger.error(`   - ${envVar}`);
    });
    logger.error('Please check your server/.env file.');
    // Only exit if running as a standalone script
    if (process.argv[1] === __filename) {
        process.exit(1);
    }
}

import { createServer } from 'http';
import { Server } from 'socket.io';
import chatRoutes from './routes/chat.js';

// ... (keep existing imports)

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Trust proxy is required for Vercel/Heroku to handle secure cookies correctly
app.set('trust proxy', 1);

// CORS configuration - MUST BE FIRST
const corsOptions = {
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

        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }

        if (origin.endsWith('.streamr-see.web.app') || origin.endsWith('.streamr-see.firebaseapp.com')) {
            return callback(null, true);
        }

        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Socket.io setup
const io = new Server(httpServer, {
    cors: corsOptions
});

io.on('connection', (socket) => {
    // logger.info(`User connected: ${socket.id}`);

    socket.on('join_room', (userId) => {
        socket.join(userId);
        // logger.info(`User ${socket.id} joined room ${userId}`);
    });

    socket.on('send_message', async (data) => {
        try {
            // Save to database
            const newMessage = new Message({
                sender: data.sender,
                receiver: data.receiver,
                content: data.content,
                read: false,
                createdAt: new Date() // Ensure timestamp matches client optimistic update if possible, or let DB handle it
            });
            await newMessage.save();

            // Emit to receiver
            socket.to(data.receiver).emit('receive_message', data);
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });

    socket.on('disconnect', () => {
        // logger.info('User disconnected', socket.id);
    });
});

// ... (keep middleware)

// Routes (with DB connection check middleware for auth routes)
app.use('/api/auth', ensureDBConnection, authRoutes);
app.use('/api/tmdb', tmdbRoutes);
app.use('/api/downloads', downloadsRoutes);
app.use('/api/friends', ensureDBConnection, friendRoutes);
app.use('/api/chat', ensureDBConnection, chatRoutes);

// ... (keep health check and other routes)

// Start server only if running directly (not in serverless environment)
if (process.argv[1] === __filename) {
    // For traditional server deployment, ensure DB connects on startup
    connectDB().then(() => {
        const PORT = process.env.PORT || 3000;
        httpServer.listen(PORT, () => {
            logger.info(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
            logger.info(`📊 Database: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '⚠️ Connecting...'}`);
            logger.info(`🔌 Socket.io initialized`);
        });
    }).catch(err => {
        logger.error('❌ Failed to start server:', err);
        process.exit(1);
    });
}

export default app;

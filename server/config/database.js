import mongoose from 'mongoose';

let isConnected = false;
let connectionPromise = null;

const connectDB = async () => {
    // If already connected, return immediately
    if (isConnected && mongoose.connection.readyState === 1) {
        console.log('✅ Using existing MongoDB connection');
        return;
    }

    // If a connection is already in progress, wait for it
    if (connectionPromise) {
        console.log('⏳ Waiting for existing MongoDB connection attempt...');
        return connectionPromise;
    }

    console.log('🔄 Initiating MongoDB connection...');

    // Create new connection promise
    connectionPromise = (async () => {
        const maxRetries = 3;
        let retries = 0;

        while (retries < maxRetries) {
            try {
                const conn = await mongoose.connect(process.env.MONGODB_URI, {
                    serverSelectionTimeoutMS: 5000,
                    socketTimeoutMS: 45000,
                });

                isConnected = true;
                console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

                // Handle connection events
                mongoose.connection.on('disconnected', () => {
                    console.warn('⚠️ MongoDB disconnected');
                    isConnected = false;
                    connectionPromise = null;
                });

                mongoose.connection.on('error', (err) => {
                    console.error('❌ MongoDB connection error:', err);
                    isConnected = false;
                });

                return conn;
            } catch (error) {
                retries++;
                console.error(`❌ MongoDB connection attempt ${retries}/${maxRetries} failed:`, error.message);

                if (retries >= maxRetries) {
                    connectionPromise = null;
                    isConnected = false;

                    // Don't exit process in production, just throw error
                    if (process.env.NODE_ENV !== 'production') {
                        process.exit(1);
                    }
                    throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts`);
                }

                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retries), 10000)));
            }
        }
    })();

    return connectionPromise;
};

// Export connection status checker
export const isDBConnected = () => isConnected && mongoose.connection.readyState === 1;

export default connectDB;

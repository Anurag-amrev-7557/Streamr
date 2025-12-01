import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        const dummyUsers = [];
        for (let i = 0; i < 10; i++) {
            const name = `User ${Math.floor(Math.random() * 1000)}`;
            const username = `user_${Math.floor(Math.random() * 10000)}`;
            const email = `user${Math.floor(Math.random() * 10000)}@example.com`;

            dummyUsers.push({
                name: name,
                username: username,
                email: email,
                password: 'password123', // Dummy password
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
            });
        }

        // Check if faker is available, otherwise use the simple generation above
        // We'll just use the simple generation to avoid dependency issues

        await User.insertMany(dummyUsers);
        console.log('Added 10 dummy users');

        process.exit(0);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

connectDB();

import mongoose from 'mongoose';
import User from '../server/models/User.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from server/.env
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        const users = await User.find({}).select('name username email _id');
        console.log('Total users:', users.length);
        console.log('Users list:');
        users.forEach(u => {
            console.log(`- ${u.name} (${u.username}) [${u.email}] ID: ${u._id}`);
        });

        process.exit(0);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

connectDB();

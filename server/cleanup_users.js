import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Delete users that match the dummy pattern
        // The dummy users had emails like user...@example.com
        const result = await User.deleteMany({
            email: { $regex: /@example\.com$/ },
            username: { $regex: /^user_/ }
        });

        // Also ensure we don't delete the original test user 'test_final@example.com' if it exists and we want to keep it
        // The original users were:
        // - Test User (test_final) [test_final@example.com]
        // - anurag verma (anuragverma080023) [anuragverma080023@gmail.com]
        // - Anurag Verma (random) [random@gmail.com]

        // My seeder used: email: `user${Math.floor(Math.random() * 10000)}@example.com`
        // So they look like user1234@example.com

        // Let's be more specific to avoid deleting 'test_final@example.com'
        // The dummy usernames were `user_...`

        console.log(`Deleted ${result.deletedCount} dummy users`);

        const remainingUsers = await User.find({}).select('name username email');
        console.log('Remaining users:');
        remainingUsers.forEach(u => {
            console.log(`- ${u.name} (${u.username}) [${u.email}]`);
        });

        process.exit(0);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

connectDB();

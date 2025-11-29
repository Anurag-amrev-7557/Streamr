// Migration script to fix duplicate username key in MongoDB
// Run with: node server/scripts/fixUsernameDupKey.js

import 'dotenv/config';
// import mongoose from 'mongoose';
import User from '../models/User.js';
import connectDB from '../config/database.js';

// dotenv.config();

const generateUsername = (email) => {
    if (!email) return undefined;
    const base = email.split('@')[0];
    return base;
};

const runMigration = async () => {
    try {
        await connectDB();
        console.log('✅ Connected to DB');

        // Find users with missing or null username
        const users = await User.find({ $or: [{ username: { $exists: false } }, { username: null }] });
        console.log(`Found ${users.length} user(s) without a username`);

        for (const user of users) {
            const newUsername = generateUsername(user.email);
            // Ensure uniqueness – if conflict, append a random suffix
            let uniqueUsername = newUsername;
            let counter = 1;
            while (await User.findOne({ username: uniqueUsername, _id: { $ne: user._id } })) {
                uniqueUsername = `${newUsername}_${counter}`;
                counter++;
            }
            user.username = uniqueUsername;
            await user.save();
            console.log(`✅ Updated user ${user._id} with username '${uniqueUsername}'`);
        }

        // Drop the old index if it exists (it may contain duplicate null entries)
        const indexes = await User.collection.indexes();
        const usernameIndex = indexes.find((idx) => idx.key && idx.key.username);
        if (usernameIndex) {
            await User.collection.dropIndex(usernameIndex.name);
            console.log('🗑️ Dropped existing username index');
        }

        // Recreate the unique index on username (Mongoose will do this on next app start, but we can ensure now)
        await User.collection.createIndex({ username: 1 }, { unique: true, sparse: false });
        console.log('🔑 Created unique index on username');

        console.log('✅ Migration completed successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
};

runMigration();

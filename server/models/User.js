import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        default: function () {
            return this.email ? this.email.split('@')[0] : undefined;
        }
    },
    password: {
        type: String,
        select: false,
        minlength: [6, 'Password must be at least 6 characters']
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    avatar: {
        type: String,
        default: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_150.png'
    },
    myList: [{
        type: mongoose.Schema.Types.Mixed,
        default: []
    }],
    watchHistory: [{
        type: mongoose.Schema.Types.Mixed,
        default: []
    }],
    searchHistory: [{
        query: {
            type: String,
            required: true,
            trim: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    // Only hash if password is modified
    if (!this.isModified('password')) {
        return next();
    }

    // Don't hash if this is a Google OAuth user without password
    if (!this.password) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) {
        return false;
    }
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without password)
userSchema.methods.getPublicProfile = function () {
    return {
        id: this._id,
        name: this.name,
        email: this.email,
        avatar: this.avatar,
        myList: this.myList,
        watchHistory: this.watchHistory,
        searchHistory: this.searchHistory,
        createdAt: this.createdAt
    };
};

const User = mongoose.model('User', userSchema);

export default User;

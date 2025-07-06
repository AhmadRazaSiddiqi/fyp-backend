const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    username: {
        type: String,
        required: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    playlists: [
        {
            name: { type: String, required: true },
            videos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }]
        }
    ],
    likedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
    dislikedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
    watchLater: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
    history: [
        {
            video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
            watchedAt: { type: Date, default: Date.now }
        }
    ]
});

// Hash password before saving it
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password during login
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Create the User model
const User = mongoose.model('User', userSchema);

module.exports = User;

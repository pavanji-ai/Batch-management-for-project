const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['student', 'faculty', 'supervisor'],
        required: true
    },
    // Student specific fields
    jntuNumber: {
        type: String,
        sparse: true,
        unique: true
    },
    cgpa: {
        type: Number,
        min: 0,
        max: 10
    },
    branch: {
        type: String
    },
    batch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch'
    },
    // Faculty specific fields
    assignedBatches: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch'
    }],
    date: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
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

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

module.exports = mongoose.model('User', UserSchema); 
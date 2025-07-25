const mongoose = require('mongoose');

const BatchSchema = new mongoose.Schema({
    batchNumber: {
        type: String,
        required: true,
        unique: true
    },
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    faculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    supervisor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    projectFiles: [{
        fileName: String,
        fileType: String,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        uploadDate: {
            type: Date,
            default: Date.now
        },
        filePath: String
    }],
    remarks: [{
        content: String,
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        date: {
            type: Date,
            default: Date.now
        }
    }],
    technicalReviews: [{
        reviewDate: Date,
        description: String,
        status: {
            type: String,
            enum: ['scheduled', 'completed', 'cancelled'],
            default: 'scheduled'
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Batch', BatchSchema); 
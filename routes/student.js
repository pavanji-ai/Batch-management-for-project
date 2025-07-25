const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { ensureStudent } = require('../middleware/auth');
const Batch = require('../models/Batch');
const User = require('../models/User');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: './public/uploads/projects/',
    filename: function(req, file, cb) {
        cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }, // 10MB limit
    fileFilter: function(req, file, cb) {
        checkFileType(file, cb);
    }
});

// Check file type
function checkFileType(file, cb) {
    const filetypes = /pdf|ppt|pptx|doc|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Invalid file type!');
    }
}

// Student Dashboard
router.get('/dashboard', ensureStudent, async (req, res) => {
    try {
        const student = await User.findById(req.user.id).populate('batch');
        if (!student.batch) {
            return res.render('student/dashboard', {
                user: student,
                message: 'You have not been assigned to a batch yet.'
            });
        }

        const batch = await Batch.findById(student.batch)
            .populate('students', 'name email jntuNumber')
            .populate('faculty', 'name email')
            .populate('supervisor', 'name email');

        res.render('student/dashboard', {
            user: student,
            batch: batch
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading dashboard');
        res.redirect('/');
    }
});

// Upload project file
router.post('/upload', ensureStudent, upload.single('projectFile'), async (req, res) => {
    try {
        if (!req.file) {
            req.flash('error_msg', 'Please select a file to upload');
            return res.redirect('/student/dashboard');
        }

        const student = await User.findById(req.user.id);
        const batch = await Batch.findById(student.batch);

        batch.projectFiles.push({
            fileName: req.file.originalname,
            fileType: path.extname(req.file.originalname).substring(1),
            uploadedBy: req.user.id,
            filePath: req.file.filename
        });

        await batch.save();
        req.flash('success_msg', 'File uploaded successfully');
        res.redirect('/student/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error uploading file');
        res.redirect('/student/dashboard');
    }
});

// View project files
router.get('/files', ensureStudent, async (req, res) => {
    try {
        const student = await User.findById(req.user.id);
        const batch = await Batch.findById(student.batch)
            .populate('projectFiles.uploadedBy', 'name');

        res.render('student/files', {
            files: batch.projectFiles
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading files');
        res.redirect('/student/dashboard');
    }
});

// View remarks
router.get('/remarks', ensureStudent, async (req, res) => {
    try {
        const student = await User.findById(req.user.id);
        const batch = await Batch.findById(student.batch)
            .populate('remarks.author', 'name role');

        res.render('student/remarks', {
            remarks: batch.remarks
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading remarks');
        res.redirect('/student/dashboard');
    }
});

// View technical reviews
router.get('/reviews', ensureStudent, async (req, res) => {
    try {
        const student = await User.findById(req.user.id);
        const batch = await Batch.findById(student.batch);

        res.render('student/reviews', {
            reviews: batch.technicalReviews
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading technical reviews');
        res.redirect('/student/dashboard');
    }
});

module.exports = router; 
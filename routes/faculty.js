const express = require('express');
const router = express.Router();
const { ensureFaculty } = require('../middleware/auth');
const Batch = require('../models/Batch');
const User = require('../models/User');

// Faculty Dashboard
router.get('/dashboard', ensureFaculty, async (req, res) => {
    try {
        const faculty = await User.findById(req.user.id);
        const batches = await Batch.find({ faculty: req.user.id })
            .populate('students', 'name email jntuNumber cgpa')
            .populate('supervisor', 'name email');

        res.render('faculty/dashboard', {
            user: faculty,
            batches: batches
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading dashboard');
        res.redirect('/');
    }
});

// View specific batch
router.get('/batch/:id', ensureFaculty, async (req, res) => {
    try {
        const batch = await Batch.findOne({
            _id: req.params.id,
            faculty: req.user.id
        })
            .populate('students', 'name email jntuNumber cgpa')
            .populate('supervisor', 'name email')
            .populate('projectFiles.uploadedBy', 'name');

        if (!batch) {
            req.flash('error_msg', 'Batch not found or access denied');
            return res.redirect('/faculty/dashboard');
        }

        res.render('faculty/batch-details', {
            batch: batch
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading batch details');
        res.redirect('/faculty/dashboard');
    }
});

// Add remark to batch
router.post('/batch/:id/remark', ensureFaculty, async (req, res) => {
    try {
        const { content } = req.body;
        const batch = await Batch.findOne({
            _id: req.params.id,
            faculty: req.user.id
        });

        if (!batch) {
            req.flash('error_msg', 'Batch not found or access denied');
            return res.redirect('/faculty/dashboard');
        }

        batch.remarks.push({
            content,
            author: req.user.id
        });

        await batch.save();
        req.flash('success_msg', 'Remark added successfully');
        res.redirect(`/faculty/batch/${req.params.id}`);
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error adding remark');
        res.redirect(`/faculty/batch/${req.params.id}`);
    }
});

// View batch files
router.get('/batch/:id/files', ensureFaculty, async (req, res) => {
    try {
        const batch = await Batch.findOne({
            _id: req.params.id,
            faculty: req.user.id
        }).populate('projectFiles.uploadedBy', 'name');

        if (!batch) {
            req.flash('error_msg', 'Batch not found or access denied');
            return res.redirect('/faculty/dashboard');
        }

        res.render('faculty/batch-files', {
            batch: batch,
            files: batch.projectFiles
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading batch files');
        res.redirect('/faculty/dashboard');
    }
});

// View batch reviews
router.get('/batch/:id/reviews', ensureFaculty, async (req, res) => {
    try {
        const batch = await Batch.findOne({
            _id: req.params.id,
            faculty: req.user.id
        });

        if (!batch) {
            req.flash('error_msg', 'Batch not found or access denied');
            return res.redirect('/faculty/dashboard');
        }

        res.render('faculty/batch-reviews', {
            batch: batch,
            reviews: batch.technicalReviews
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading batch reviews');
        res.redirect('/faculty/dashboard');
    }
});

module.exports = router; 
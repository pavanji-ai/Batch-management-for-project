const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');
const { forwardAuthenticated } = require('../middleware/auth');

// Role selection page
router.get('/role-select', forwardAuthenticated, (req, res) => {
    res.render('role-select');
});

// Login page
router.get('/login', forwardAuthenticated, (req, res) => {
    res.render('login');
});

// Register page
router.get('/register/:role', forwardAuthenticated, (req, res) => {
    const role = req.params.role;
    if (!['student', 'faculty', 'supervisor'].includes(role)) {
        req.flash('error_msg', 'Invalid role selected');
        return res.redirect('/auth/role-select');
    }
    res.render('register', { role });
});

// Register handle
router.post('/register', async (req, res) => {
    const { name, email, password, password2, role, jntuNumber, cgpa, branch } = req.body;
    const errors = [];

    // Validation
    if (!name || !email || !password || !password2 || !role) {
        errors.push({ msg: 'Please fill in all required fields' });
    }

    if (password !== password2) {
        errors.push({ msg: 'Passwords do not match' });
    }

    if (password.length < 6) {
        errors.push({ msg: 'Password should be at least 6 characters' });
    }

    if (role === 'student' && (!jntuNumber || !cgpa || !branch)) {
        errors.push({ msg: 'Please fill in all student-specific fields' });
    }

    if (errors.length > 0) {
        res.render('register', {
            errors,
            name,
            email,
            role,
            jntuNumber,
            cgpa,
            branch
        });
    } else {
        try {
            const userExists = await User.findOne({ email: email });
            if (userExists) {
                errors.push({ msg: 'Email is already registered' });
                res.render('register', {
                    errors,
                    name,
                    email,
                    role,
                    jntuNumber,
                    cgpa,
                    branch
                });
            } else {
                const newUser = new User({
                    name,
                    email,
                    password,
                    role,
                    ...(role === 'student' && {
                        jntuNumber,
                        cgpa,
                        branch
                    })
                });

                await newUser.save();
                req.flash('success_msg', 'You are now registered and can log in');
                res.redirect('/auth/login');
            }
        } catch (err) {
            console.error(err);
            req.flash('error_msg', 'Registration failed. Please try again.');
            res.redirect('/auth/register/' + role);
        }
    }
});

// Login handle
router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/auth/login',
        failureFlash: true
    })(req, res, next);
});

// Logout handle
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error(err);
            return next(err);
        }
        req.flash('success_msg', 'You are logged out');
        res.redirect('/auth/login');
    });
});

module.exports = router; 
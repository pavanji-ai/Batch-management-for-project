module.exports = {
    ensureAuthenticated: function(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        req.flash('error_msg', 'Please log in to view this resource');
        res.redirect('/auth/login');
    },
    
    ensureStudent: function(req, res, next) {
        if (req.isAuthenticated() && req.user.role === 'student') {
            return next();
        }
        req.flash('error_msg', 'Access denied. Students only.');
        res.redirect('/');
    },
    
    ensureFaculty: function(req, res, next) {
        if (req.isAuthenticated() && req.user.role === 'faculty') {
            return next();
        }
        req.flash('error_msg', 'Access denied. Faculty only.');
        res.redirect('/');
    },
    
    ensureSupervisor: function(req, res, next) {
        if (req.isAuthenticated() && req.user.role === 'supervisor') {
            return next();
        }
        req.flash('error_msg', 'Access denied. Supervisors only.');
        res.redirect('/');
    },
    
    forwardAuthenticated: function(req, res, next) {
        if (!req.isAuthenticated()) {
            return next();
        }
        res.redirect('/dashboard');
    }
}; 
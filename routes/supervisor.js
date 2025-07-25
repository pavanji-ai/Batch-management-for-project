const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const { ensureSupervisor } = require('../middleware/auth');
const Batch = require('../models/Batch');
const User = require('../models/User');

// Configure multer for Excel file uploads
const storage = multer.diskStorage({
    destination: './uploads/excel/',
    filename: function(req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function(req, file, cb) {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel' ||
            file.mimetype === 'text/csv') {
            cb(null, true);
        } else {
            cb(new Error('Only Excel/CSV files are allowed!'));
        }
    }
});

// Supervisor Dashboard
router.get('/dashboard', ensureSupervisor, async (req, res) => {
    try {
        const batches = await Batch.find()
            .populate('students', 'name email jntuNumber cgpa')
            .populate('faculty', 'name email')
            .populate('supervisor', 'name email');

        const faculty = await User.find({ role: 'faculty' });

        res.render('supervisor/dashboard', {
            user: req.user,
            batches: batches,
            faculty: faculty
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading dashboard');
        res.redirect('/');
    }
});

// Upload student data and create batches
router.post('/upload-students', ensureSupervisor, upload.single('studentData'), async (req, res) => {
    try {
        if (!req.file) {
            req.flash('error_msg', 'Please upload a file');
            return res.redirect('/supervisor/dashboard');
        }

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        // Sort students by CGPA in descending order
        data.sort((a, b) => b.cgpa - a.cgpa);

        // Get available faculty
        const faculty = await User.find({ role: 'faculty' });
        if (faculty.length === 0) {
            req.flash('error_msg', 'No faculty members available');
            return res.redirect('/supervisor/dashboard');
        }

        // Create batches using snake order
        const batchSize = 4; // Configurable batch size
        const numBatches = Math.ceil(data.length / batchSize);
        let facultyIndex = 0;

        for (let i = 0; i < numBatches; i++) {
            const batchStudents = data.slice(i * batchSize, (i + 1) * batchSize);
            const newBatch = new Batch({
                batchNumber: `BATCH-${i + 1}`,
                supervisor: req.user.id,
                faculty: faculty[facultyIndex]._id
            });

            // Create student accounts and add to batch
            for (const studentData of batchStudents) {
                const student = new User({
                    name: studentData.name,
                    email: studentData.email,
                    password: studentData.jntuNumber, // Set default password as JNTU number
                    role: 'student',
                    jntuNumber: studentData.jntuNumber,
                    cgpa: studentData.cgpa,
                    branch: studentData.branch
                });

                await student.save();
                newBatch.students.push(student._id);
                student.batch = newBatch._id;
                await student.save();
            }

            await newBatch.save();

            // Update faculty's assigned batches
            await User.findByIdAndUpdate(faculty[facultyIndex]._id, {
                $push: { assignedBatches: newBatch._id }
            });

            // Rotate through faculty members
            facultyIndex = (facultyIndex + 1) % faculty.length;
        }

        req.flash('success_msg', 'Student data uploaded and batches created successfully');
        res.redirect('/supervisor/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error processing student data');
        res.redirect('/supervisor/dashboard');
    }
});

// Schedule technical review
router.post('/batch/:id/schedule-review', ensureSupervisor, async (req, res) => {
    try {
        const { reviewDate, description } = req.body;
        const batch = await Batch.findById(req.params.id);

        if (!batch) {
            req.flash('error_msg', 'Batch not found');
            return res.redirect('/supervisor/dashboard');
        }

        batch.technicalReviews.push({
            reviewDate: new Date(reviewDate),
            description
        });

        await batch.save();
        req.flash('success_msg', 'Technical review scheduled successfully');
        res.redirect(`/supervisor/batch/${req.params.id}`);
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error scheduling review');
        res.redirect('/supervisor/dashboard');
    }
});

// Reassign faculty to batch
router.post('/batch/:id/reassign-faculty', ensureSupervisor, async (req, res) => {
    try {
        const { facultyId } = req.body;
        const batch = await Batch.findById(req.params.id);
        const newFaculty = await User.findById(facultyId);

        if (!batch || !newFaculty || newFaculty.role !== 'faculty') {
            req.flash('error_msg', 'Invalid batch or faculty');
            return res.redirect('/supervisor/dashboard');
        }

        // Remove batch from old faculty's assignments
        if (batch.faculty) {
            await User.findByIdAndUpdate(batch.faculty, {
                $pull: { assignedBatches: batch._id }
            });
        }

        // Assign new faculty
        batch.faculty = facultyId;
        await batch.save();

        // Add batch to new faculty's assignments
        await User.findByIdAndUpdate(facultyId, {
            $push: { assignedBatches: batch._id }
        });

        req.flash('success_msg', 'Faculty reassigned successfully');
        res.redirect(`/supervisor/batch/${req.params.id}`);
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error reassigning faculty');
        res.redirect('/supervisor/dashboard');
    }
});

// Remove student from batch
router.post('/batch/:batchId/remove-student/:studentId', ensureSupervisor, async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.batchId);
        const student = await User.findById(req.params.studentId);

        if (!batch || !student) {
            req.flash('error_msg', 'Batch or student not found');
            return res.redirect('/supervisor/dashboard');
        }

        // Remove student from batch
        batch.students = batch.students.filter(id => id.toString() !== student._id.toString());
        await batch.save();

        // Remove batch reference from student
        student.batch = null;
        await student.save();

        req.flash('success_msg', 'Student removed from batch successfully');
        res.redirect(`/supervisor/batch/${req.params.batchId}`);
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error removing student');
        res.redirect('/supervisor/dashboard');
    }
});

module.exports = router; 
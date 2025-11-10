const express = require('express');
const { body, validationResult } = require('express-validator');
const Job = require('../models/job');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateJob = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('shortDescription')
    .trim()
    .isLength({ min: 10, max: 250 })
    .withMessage('Short description must be between 10 and 250 characters'),
  body('fullDescription')
    .trim()
    .isLength({ min: 50 })
    .withMessage('Full description must be at least 50 characters'),
  body('experience')
    .isIn(['Entry Level', '1-2 years', '3-5 years', '5+ years', 'Senior Level'])
    .withMessage('Invalid experience level'),
  body('department')
    .isIn(['Engineering', 'Design', 'Marketing', 'Sales', 'Operations', 'HR', 'Finance', 'Other'])
    .withMessage('Invalid department'),
  body('employmentType')
    .isIn(['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'])
    .withMessage('Invalid employment type'),
  body('location')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters'),
  body('salary.min')
    .optional()
    .isNumeric()
    .withMessage('Minimum salary must be a number'),
  body('salary.max')
    .optional()
    .isNumeric()
    .withMessage('Maximum salary must be a number'),
  body('salary.currency')
    .optional()
    .isIn(['INR', 'USD', 'EUR', 'GBP'])
    .withMessage('Invalid currency'),
  body('salary.period')
    .optional()
    .isIn(['hourly', 'monthly', 'yearly'])
    .withMessage('Invalid salary period'),
  body('applyLink')
    .optional()
    .isURL()
    .withMessage('Invalid application link URL'),
  body('applyEmail')
    .optional()
    .isEmail()
    .withMessage('Invalid application email'),
  body('applicationDeadline')
    .optional()
    .isISO8601()
    .withMessage('Invalid deadline date format')
];

const updateJobValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('shortDescription')
    .optional()
    .trim()
    .isLength({ min: 10, max: 250 })
    .withMessage('Short description must be between 10 and 250 characters'),
  body('fullDescription')
    .optional()
    .trim()
    .isLength({ min: 50 })
    .withMessage('Full description must be at least 50 characters'),
  body('experience')
    .optional()
    .isIn(['Entry Level', '1-2 years', '3-5 years', '5+ years', 'Senior Level'])
    .withMessage('Invalid experience level'),
  body('department')
    .optional()
    .isIn(['Engineering', 'Design', 'Marketing', 'Sales', 'Operations', 'HR', 'Finance', 'Other'])
    .withMessage('Invalid department'),
  body('employmentType')
    .optional()
    .isIn(['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'])
    .withMessage('Invalid employment type'),
  body('location')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters')
];

// ==================== PUBLIC ROUTES ====================

// GET /api/job - Get all active jobs with filtering and pagination
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      department,
      location,
      employmentType,
      experience,
      remote,
      sortBy = 'priority',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { isActive: true };
    
    if (search) {
      query.$text = { $search: search };
    }
    
    if (department) query.department = department;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (employmentType) query.employmentType = employmentType;
    if (experience) query.experience = experience;
    if (remote !== undefined) query.isRemote = remote === 'true';

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    if (sortBy !== 'priority') sort.priority = -1; // Always prioritize by priority

    // Execute query
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const jobs = await Job.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Job.countDocuments(query);

    res.json({
      status: 'success',
      data: jobs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        total,
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch jobs'
    });
  }
});

// GET /api/job/:slug - Get single job by slug
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const job = await Job.findOne({ 
      slug: req.params.slug, 
      isActive: true 
    }).select('-__v');

    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }

    // Increment view count
    await Job.findByIdAndUpdate(job._id, { $inc: { views: 1 } });

    res.json({
      status: 'success',
      data: job
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch job'
    });
  }
});

// ==================== ADMIN ROUTES ====================

// GET /api/job/admin/all - Get all jobs (admin only)
router.get('/admin/all', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      department,
      status
    } = req.query;

    const query = {};
    
    if (search) {
      query.$text = { $search: search };
    }
    
    if (department) query.department = department;
    if (status !== undefined) query.isActive = status === 'active';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Job.countDocuments(query);

    res.json({
      status: 'success',
      data: jobs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        total,
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching admin jobs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch jobs'
    });
  }
});

// POST /api/job - Create new job (admin only)
router.post('/', protect, authorize('admin'), validateJob, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    const jobData = { ...req.body };
    
    // Convert string arrays to arrays if needed
    if (typeof jobData.requirements === 'string') {
      jobData.requirements = jobData.requirements.split(',').map(r => r.trim()).filter(Boolean);
    }
    if (typeof jobData.responsibilities === 'string') {
      jobData.responsibilities = jobData.responsibilities.split(',').map(r => r.trim()).filter(Boolean);
    }
    if (typeof jobData.benefits === 'string') {
      jobData.benefits = jobData.benefits.split(',').map(b => b.trim()).filter(Boolean);
    }
    if (typeof jobData.tags === 'string') {
      jobData.tags = jobData.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    // Handle salary fields
    if (jobData.salary && jobData.salary.min === '') delete jobData.salary.min;
    if (jobData.salary && jobData.salary.max === '') delete jobData.salary.max;
    if (jobData.salary && jobData.salary.min === '' && jobData.salary.max === '') delete jobData.salary;

    // Handle deadline
    if (jobData.applicationDeadline === '') delete jobData.applicationDeadline;

    const job = await Job.create(jobData);

    res.status(201).json({
      status: 'success',
      data: job
    });
  } catch (error) {
    console.error('Error creating job:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'A job with this title already exists'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to create job'
    });
  }
});

// PUT /api/job/:id - Update job (admin only)
router.put('/:id', protect, authorize('admin'), updateJobValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    const updateData = { ...req.body };
    
    // Convert string arrays to arrays if needed
    if (typeof updateData.requirements === 'string') {
      updateData.requirements = updateData.requirements.split(',').map(r => r.trim()).filter(Boolean);
    }
    if (typeof updateData.responsibilities === 'string') {
      updateData.responsibilities = updateData.responsibilities.split(',').map(r => r.trim()).filter(Boolean);
    }
    if (typeof updateData.benefits === 'string') {
      updateData.benefits = updateData.benefits.split(',').map(b => b.trim()).filter(Boolean);
    }
    if (typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    // Handle salary fields
    if (updateData.salary && updateData.salary.min === '') delete updateData.salary.min;
    if (updateData.salary && updateData.salary.max === '') delete updateData.salary.max;
    if (updateData.salary && updateData.salary.min === '' && updateData.salary.max === '') delete updateData.salary;

    // Handle deadline
    if (updateData.applicationDeadline === '') delete updateData.applicationDeadline;

    const job = await Job.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }

    res.json({
      status: 'success',
      data: job
    });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update job'
    });
  }
});

// DELETE /api/job/:id - Delete job (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete job'
    });
  }
});

// PUT /api/job/:id/toggle-status - Toggle job status (admin only)
router.put('/:id/toggle-status', protect, authorize('admin'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }

    job.isActive = !job.isActive;
    await job.save();

    res.json({
      status: 'success',
      data: job
    });
  } catch (error) {
    console.error('Error toggling job status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle job status'
    });
  }
});

// GET /api/job/admin/stats - Get job statistics (admin only)
router.get('/admin/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const stats = await Job.aggregate([
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          activeJobs: { $sum: { $cond: ['$isActive', 1, 0] } },
          inactiveJobs: { $sum: { $cond: ['$isActive', 0, 1] } },
          totalViews: { $sum: '$views' },
          totalApplications: { $sum: '$applications' }
        }
      }
    ]);

    const departmentStats = await Job.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const employmentTypeStats = await Job.aggregate([
      {
        $group: {
          _id: '$employmentType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      status: 'success',
      data: {
        overview: stats[0] || {
          totalJobs: 0,
          activeJobs: 0,
          inactiveJobs: 0,
          totalViews: 0,
          totalApplications: 0
        },
        byDepartment: departmentStats,
        byEmploymentType: employmentTypeStats
      }
    });
  } catch (error) {
    console.error('Error fetching job stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch job statistics'
    });
  }
});

module.exports = router;

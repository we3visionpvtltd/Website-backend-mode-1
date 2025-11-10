const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Blog = require('../models/Blog');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { uploadSingle, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// CRITICAL: Define backend URL once at the top
const backendUrl = (process.env.BACKEND_URL || "https://we3vision-backend-1.onrender.com/api").replace(/\/api\/?$/, '');

// @desc    Get all blogs (public)
// @route   GET /api/blog
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const query = { status: 'published' };
    
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    if (req.query.author) {
      query.author = req.query.author;
    }
    
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { content: { $regex: req.query.search, $options: 'i' } },
        { tags: { $in: [new RegExp(req.query.search, 'i')] } }
      ];
    }

    const blogs = await Blog.find(query)
      .populate('author', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-content -__v');

    const total = await Blog.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      status: 'success',
      data: blogs,
      pagination: {
        currentPage: page,
        totalPages,
        total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get blogs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get featured blogs
// @route   GET /api/blog/featured
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const blogs = await Blog.find({ 
      status: 'published', 
      isFeatured: true 
    })
      .populate('author', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(6)
      .select('-__v');

    res.json({
      status: 'success',
      data: blogs
    });
  } catch (error) {
    console.error('Get featured blogs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get all blogs (admin - includes drafts)
// @route   GET /api/blog/admin/all
// @access  Private (Admin only)
// MOVED BEFORE /:slug to prevent route conflict
router.get('/admin/all', protect, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const blogs = await Blog.find()
      .populate('author', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const total = await Blog.countDocuments();
    const totalPages = Math.ceil(total / limit);

    res.json({
      status: 'success',
      data: blogs,
      pagination: {
        currentPage: page,
        totalPages,
        total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get admin blogs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get single blog
// @route   GET /api/blog/:slug
// @access  Public
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const blog = await Blog.findOne({ 
      slug: req.params.slug,
      status: 'published'
    })
      .populate('author', 'name avatar bio')
      .populate('comments.user', 'name avatar')
      .select('-__v');

    if (!blog) {
      return res.status(404).json({
        status: 'error',
        message: 'Blog not found'
      });
    }

    blog.views += 1;
    await blog.save();

    let isLiked = false;
    if (req.user) {
      isLiked = blog.likes.includes(req.user.id);
    }

    res.json({
      status: 'success',
      data: {
        ...blog.toObject(),
        isLiked
      }
    });
  } catch (error) {
    console.error('Get blog error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Create new blog
// @route   POST /api/blog
// @access  Private (Admin only)
// FIX: Multer (uploadSingle) MUST come before validation middleware
router.post(
  '/',
  protect,
  authorize('admin'),
  uploadSingle,
  handleUploadError,
  [
    body('title')
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Title must be between 5 and 100 characters'),
    body('content')
      .trim()
      .isLength({ min: 50 })
      .withMessage('Content must be at least 50 characters'),
    body('excerpt')
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Excerpt must be between 10 and 200 characters'),
    body('category')
      .isIn(['Technology', 'Design', 'Development', 'NFT', 'Metaverse', 'AI/ML', 'Mobile', 'Web', 'Gaming', 'AR/VR', 'Other'])
      .withMessage('Please provide a valid category'),
    body('tags')
      .optional()
      .customSanitizer((value) => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed;
          } catch (_) {
            // fallthrough
          }
          return value
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);
        }
        return [];
      })
      .isArray()
      .withMessage('Tags must be an array'),
    body('status')
      .optional()
      .isIn(['draft', 'published', 'archived'])
      .withMessage('Please provide a valid status')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const {
        title,
        content,
        excerpt,
        category,
        tags,
        status = 'draft',
        seoTitle,
        seoDescription,
        seoKeywords
      } = req.body;

      // Store environment-agnostic relative path for featured image
      const folder = req.uploadFolder || 'uploads';
      const featuredImage = req.file
        ? `/${folder}/${req.file.filename}`
        : '';

      const blogData = {
        title,
        content,
        excerpt,
        category,
        tags: Array.isArray(tags) ? tags : [],
        status,
        author: req.user.id,
        seoTitle,
        seoDescription,
        seoKeywords: seoKeywords ? 
          (typeof seoKeywords === 'string' ? JSON.parse(seoKeywords) : seoKeywords) : 
          []
      };

      if (featuredImage) {
        blogData.featuredImage = featuredImage;
      }

      const blog = await Blog.create(blogData);

      const populatedBlog = await Blog.findById(blog._id)
        .populate('author', 'name avatar');

      res.status(201).json({
        status: 'success',
        data: populatedBlog
      });
    } catch (error) {
      console.error('Create blog error:', error);
      if (error && (error.code === 11000 || error.name === 'MongoServerError')) {
        // Duplicate key (likely slug unique index)
        return res.status(409).json({
          status: 'error',
          message: 'A blog with this title already exists. Please use a unique title.',
          keyValue: error.keyValue
        });
      }
      res.status(500).json({
        status: 'error',
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @desc    Update blog
// @route   PUT /api/blog/:id
// @access  Private (Admin only)
// FIX: Multer MUST come before validation middleware
router.put(
  '/:id',
  protect,
  authorize('admin'),
  uploadSingle,
  handleUploadError,
  [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Title must be between 5 and 100 characters'),
    body('content')
      .optional()
      .trim()
      .isLength({ min: 50 })
      .withMessage('Content must be at least 50 characters'),
    body('excerpt')
      .optional()
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Excerpt must be between 10 and 200 characters'),
    body('category')
      .optional()
      .isIn(['Technology', 'Design', 'Development', 'NFT', 'Metaverse', 'AI/ML', 'Mobile', 'Web', 'Gaming', 'AR/VR', 'Other'])
      .withMessage('Please provide a valid category'),
    body('tags')
      .optional()
      .customSanitizer((value) => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed;
          } catch (_) {
            // fallthrough
          }
          return value
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);
        }
        return [];
      })
      .isArray()
      .withMessage('Tags must be an array'),
    body('status')
      .optional()
      .isIn(['draft', 'published', 'archived'])
      .withMessage('Please provide a valid status')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const blog = await Blog.findById(req.params.id);
      if (!blog) {
        return res.status(404).json({
          status: 'error',
          message: 'Blog not found'
        });
      }

      const updateData = { ...req.body };
      
      // FIX: Handle file upload properly using current request host/protocol
      if (req.file) {
        const folder = req.uploadFolder || 'uploads';
        updateData.featuredImage = `/${folder}/${req.file.filename}`;
      }

      // Parse arrays properly
      if (updateData.tags && !Array.isArray(updateData.tags)) {
        try {
          const parsed = JSON.parse(updateData.tags);
          updateData.tags = Array.isArray(parsed) ? parsed : [];
        } catch (_) {
          updateData.tags = String(updateData.tags)
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
        }
      }
      
      if (updateData.seoKeywords && typeof updateData.seoKeywords === 'string') {
        try {
          updateData.seoKeywords = JSON.parse(updateData.seoKeywords);
        } catch (_) {
          updateData.seoKeywords = [];
        }
      }

      const updatedBlog = await Blog.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).populate('author', 'name avatar');

      res.json({
        status: 'success',
        data: updatedBlog
      });
    } catch (error) {
      console.error('Update blog error:', error);
      if (error && (error.code === 11000 || error.name === 'MongoServerError')) {
        return res.status(409).json({
          status: 'error',
          message: 'A blog with this title already exists. Please use a unique title.',
          keyValue: error.keyValue
        });
      }
      res.status(500).json({
        status: 'error',
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @desc    Delete blog
// @route   DELETE /api/blog/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({
        status: 'error',
        message: 'Blog not found'
      });
    }

    await Blog.findByIdAndDelete(req.params.id);

    res.json({
      status: 'success',
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    console.error('Delete blog error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Toggle like on blog
// @route   POST /api/blog/:id/like
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({
        status: 'error',
        message: 'Blog not found'
      });
    }

    const likeIndex = blog.likes.indexOf(req.user.id);
    
    if (likeIndex > -1) {
      blog.likes.splice(likeIndex, 1);
    } else {
      blog.likes.push(req.user.id);
    }

    await blog.save();

    res.json({
      status: 'success',
      data: {
        likes: blog.likes,
        likeCount: blog.likes.length,
        isLiked: likeIndex === -1
      }
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Add comment to blog
// @route   POST /api/blog/:id/comment
// @access  Private
router.post('/:id/comment', protect, [
  body('comment')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({
        status: 'error',
        message: 'Blog not found'
      });
    }

    blog.comments.push({
      user: req.user.id,
      comment: req.body.comment
    });

    await blog.save();

    const updatedBlog = await Blog.findById(req.params.id)
      .populate('comments.user', 'name avatar');

    res.json({
      status: 'success',
      data: updatedBlog.comments
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Delete a comment from a blog
// @route   DELETE /api/blog/:id/comment/:commentId
// @access  Private (Comment owner or Admin)
router.delete('/:id/comment/:commentId', protect, async (req, res) => {
  try {
    const { id, commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid blog or comment id'
      });
    }

    const blogObjectId = new mongoose.Types.ObjectId(id);
    const commentObjectId = new mongoose.Types.ObjectId(commentId);

    const blogWithComment = await Blog.findOne(
      { _id: blogObjectId, 'comments._id': commentObjectId },
      { 'comments.$': 1, author: 1 }
    );

    if (!blogWithComment) {
      return res.status(404).json({
        status: 'error',
        message: 'Blog or comment not found'
      });
    }

    const comment = blogWithComment.comments && blogWithComment.comments[0];
    if (!comment) {
      return res.status(404).json({
        status: 'error',
        message: 'Comment not found'
      });
    }

    const commentUserId = comment.user && comment.user._id
      ? comment.user._id.toString()
      : comment.user?.toString?.();
    const isOwner = commentUserId === req.user.id.toString();
    const isAdmin = req.user.role === 'admin';
    const isBlogAuthor = blogWithComment.author && blogWithComment.author.toString() === req.user.id.toString();
    
    if (!isOwner && !isAdmin && !isBlogAuthor) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this comment'
      });
    }

    await Blog.updateOne(
      { _id: blogObjectId },
      { $pull: { comments: { _id: commentObjectId } } }
    );

    const updatedBlog = await Blog.findById(blogObjectId)
      .populate('comments.user', 'name avatar');

    res.json({
      status: 'success',
      data: updatedBlog ? updatedBlog.comments : []
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

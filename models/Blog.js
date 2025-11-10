const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a blog title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    required: true
  },
  content: {
    type: String,
    required: [true, 'Please provide blog content']
  },
  excerpt: {
    type: String,
    required: [true, 'Please provide a blog excerpt'],
    maxlength: [200, 'Excerpt cannot be more than 200 characters']
  },
  featuredImage: {
    type: String,
    default: '/uploads/default-blog-image.jpg'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: [true, 'Please provide a category'],
    enum: [
      'Technology',
      'Design',
      'Development',
      'NFT',
      'Metaverse',
      'AI/ML',
      'Mobile',
      'Web',
      'Gaming',
      'AR/VR',
      'Other'
    ]
  },
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  readTime: {
    type: Number,
    default: 5
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comment: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  seoTitle: {
    type: String,
    maxlength: [60, 'SEO title cannot be more than 60 characters']
  },
  seoDescription: {
    type: String,
    maxlength: [160, 'SEO description cannot be more than 160 characters']
  },
  seoKeywords: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Create slug from title before validation so 'required' passes
blogSchema.pre('validate', function(next) {
  if (this.title && (this.isModified('title') || !this.slug)) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Virtual for comment count
blogSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Virtual for like count
blogSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Ensure virtual fields are serialized
blogSchema.set('toJSON', { virtuals: true });
blogSchema.set('toObject', { virtuals: true });

// Add indexes for better query performance
blogSchema.index({ status: 1, createdAt: -1 }); // For main blog listing
blogSchema.index({ category: 1, status: 1, createdAt: -1 }); // For category filtering
blogSchema.index({ author: 1, status: 1, createdAt: -1 }); // For author filtering
blogSchema.index({ title: 'text', content: 'text', tags: 'text' }); // For search functionality
blogSchema.index({ slug: 1 }); // For individual blog lookups

module.exports = mongoose.model('Blog', blogSchema); 
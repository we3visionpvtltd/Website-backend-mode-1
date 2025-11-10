const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    slug: {
      type: String,
      unique: true,
      required: false,
      index: true
    },
    shortDescription: {
      type: String,
      required: [true, 'Short description is required'],
      maxlength: [250, 'Short description cannot exceed 250 characters']
    },
    fullDescription: {
      type: String,
      required: [true, 'Full job description is required']
    },
    requirements: [{
      type: String,
      trim: true
    }],
    responsibilities: [{
      type: String,
      trim: true
    }],
    benefits: [{
      type: String,
      trim: true
    }],
    experience: {
      type: String,
      required: [true, 'Experience level is required'],
      enum: ['Entry Level', '1-2 years', '3-5 years', '5+ years', 'Senior Level']
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      default: 'Surat'
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      enum: ['Engineering', 'Design', 'Marketing', 'Sales', 'Operations', 'HR', 'Finance', 'Other']
    },
    employmentType: {
      type: String,
      required: [true, 'Employment type is required'],
      enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance']
    },
    salary: {
      min: {
        type: Number,
        min: 0
      },
      max: {
        type: Number,
        min: 0
      },
      currency: {
        type: String,
        default: 'INR'
      },
      period: {
        type: String,
        enum: ['hourly', 'monthly', 'yearly'],
        default: 'monthly'
      }
    },
    isRemote: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    priority: {
      type: Number,
      default: 0,
      min: 0
    },
    applicationDeadline: {
      type: Date
    },
    applyLink: {
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true; // Optional field
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Please provide a valid URL'
      }
    },
    applyEmail: {
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true; // Optional field
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Please provide a valid email address'
      }
    },
    tags: [{
      type: String,
      trim: true
    }],
    views: {
      type: Number,
      default: 0
    },
    applications: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Generate slug from title
jobSchema.pre('save', function(next) {
  // Always generate slug if it doesn't exist or if title is modified
  if (!this.slug || this.isModified('title')) {
    let baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Ensure slug is not empty after processing
    if (!baseSlug) {
      baseSlug = 'job';
    }
    
    // Add timestamp to ensure uniqueness
    this.slug = `${baseSlug}-${Date.now()}`;
  }
  next();
});

// Indexes for better performance
jobSchema.index({ isActive: 1, priority: -1, createdAt: -1 });
jobSchema.index({ department: 1, location: 1, employmentType: 1 });

// Text search index (only create if it doesn't exist)
try {
  jobSchema.index({ title: 'text', shortDescription: 'text', fullDescription: 'text' });
} catch (error) {
  // Index might already exist, ignore error
}

// Virtual for formatted salary range
jobSchema.virtual('salaryRange').get(function() {
  if (!this.salary || (!this.salary.min && !this.salary.max)) return 'Not specified';
  
  const formatSalary = (amount) => {
    // Ensure amount is a number
    const numAmount = Number(amount);
    if (isNaN(numAmount)) return 'Invalid';
    
    if (this.salary.period === 'yearly') {
      if (numAmount >= 100000) {
        return `${(numAmount / 100000).toFixed(1)}L`;
      } else if (numAmount >= 1000) {
        return `${(numAmount / 1000).toFixed(0)}K`;
      }
      return numAmount.toString();
    } else if (this.salary.period === 'monthly') {
      if (numAmount >= 100000) {
        return `${(numAmount / 100000).toFixed(1)}L`;
      } else if (numAmount >= 1000) {
        return `${(numAmount / 1000).toFixed(0)}K`;
      }
      return numAmount.toString();
    } else if (this.salary.period === 'hourly') {
      return `${numAmount}/hr`;
    }
    return numAmount.toString();
  };
  
  if (this.salary.min && this.salary.max) {
    const minFormatted = formatSalary(this.salary.min);
    const maxFormatted = formatSalary(this.salary.max);
    return `${minFormatted} - ${maxFormatted} ${this.salary.currency}/${this.salary.period}`;
  } else if (this.salary.min) {
    const minFormatted = formatSalary(this.salary.min);
    return `${minFormatted}+ ${this.salary.currency}/${this.salary.period}`;
  } else if (this.salary.max) {
    const maxFormatted = formatSalary(this.salary.max);
    return `Up to ${maxFormatted} ${this.salary.currency}/${this.salary.period}`;
  }
  
  return 'Not specified';
});

// Virtual for application status
jobSchema.virtual('isOpen').get(function() {
  if (!this.isActive) return false;
  if (this.applicationDeadline && new Date() > this.applicationDeadline) return false;
  return true;
});

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;

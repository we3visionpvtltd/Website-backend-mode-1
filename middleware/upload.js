const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage with dynamic, whitelisted destinations
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Force a single canonical uploads folder so static mounts always resolve
    const folder = 'uploads';
    const dest = path.join(__dirname, `../${folder}`);
    try {
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    } catch (_) { /* ignore */ }

    // expose chosen folder for routers to build public URL
    req.uploadFolder = folder; // always 'uploads'
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
// File filter
const fileFilter = (req, file, cb) => {
  // Allow images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload an image.'), false);
  }
};

// Configure upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit,
    fieldSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Single file upload
exports.uploadSingle = upload.single('image');

// Multiple files upload
exports.uploadMultiple = upload.array('images', 5);

// Error handling middleware
exports.handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        status: 'error',
        message: 'Too many files. Maximum is 5 files.'
      });
    }
  }
  
  if (err.message === 'Not an image! Please upload an image.') {
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
  
  next(err);
}; 
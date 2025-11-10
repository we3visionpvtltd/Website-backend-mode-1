const express = require('express');
const fs = require('fs');
const path = require('path');
const { protect, authorize } = require('../middleware/auth');
const { uploadMultiple, handleUploadError } = require('../middleware/upload');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '../uploads');

// @desc    List uploaded images
// @route   GET /api/media
// @access  Private (Admin only)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const backendUrl = `${req.protocol}://${req.get('host')}`;
    const files = await fs.promises.readdir(UPLOADS_DIR);
    console.log("Files found in uploads:", files);
    const images = files
    .filter((f) => /\.(png|jpe?g|gif|webp|svg)$/i.test(f))
    .map((filename) => ({
      filename,
      url: `${backendUrl}/uploads/${filename}`,
      }));
    res.json({ status: 'success', data: images });
  } catch (err) {
    console.error('List media error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to list media' });
  }
});

// @desc    Upload images (multiple up to limit)
// @route   POST /api/media
// @access  Private (Admin only)
router.post('/', protect, authorize('admin'), uploadMultiple, handleUploadError, (req, res) => {
  try {
    const backendUrl = `${req.protocol}://${req.get('host')}`;
    const files = (req.files || []).map((file) => ({
      filename: file.filename,
      url: `${backendUrl}/uploads/${file.filename}`,
    }));
    res.status(201).json({ status: 'success', data: files });
  } catch (err) {
    console.error('Upload media error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to upload media' });
  }
});

// @desc    Delete an image by filename
// @route   DELETE /api/media/:filename
// @access  Private (Admin only)
router.delete('/:filename', protect, authorize('admin'), async (req, res) => {
  try {
    const raw = req.params.filename;
    // Disallow path separators and parent traversal
    if (raw.includes('/') || raw.includes('\\') || raw.includes('..')) {
      return res.status(400).json({ status: 'error', message: 'Invalid filename' });
    }
    // Allow common characters including spaces
    if (!/^[A-Za-z0-9_.\- ]+$/.test(raw)) {
      return res.status(400).json({ status: 'error', message: 'Invalid filename' });
    }
    const filename = path.basename(raw);
    const filePath = path.join(UPLOADS_DIR, filename);
    await fs.promises.unlink(filePath);
    res.json({ status: 'success', message: 'File deleted' });
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({ status: 'error', message: 'File not found' });
    }
    console.error('Delete media error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete media' });
  }
});

module.exports = router;



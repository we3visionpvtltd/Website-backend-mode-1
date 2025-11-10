const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const Asset = require('../models/Asset');

const router = express.Router();

// @desc Get all assets (public for read)
// @route GET /api/assets
router.get('/', async (req, res) => {
  try {
    const assets = await Asset.find().sort({ key: 1 }).lean();
    res.json({ status: 'success', data: assets });
  } catch (err) {
    console.error('List assets error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to list assets' });
  }
});

// @desc Get a single asset by key
// @route GET /api/assets/:key
router.get('/:key', async (req, res) => {
  try {
    const asset = await Asset.findOne({ key: req.params.key });
    if (!asset) return res.status(404).json({ status: 'error', message: 'Asset not found' });
    res.json({ status: 'success', data: asset });
  } catch (err) {
    console.error('Get asset error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to get asset' });
  }
});

// @desc Create or update asset mapping
// @route PUT /api/assets/:key
// @access Private (Admin)
router.put('/:key', protect, authorize('admin'), async (req, res) => {
  try {
    const { url, alt = '' } = req.body;
    if (!url) return res.status(400).json({ status: 'error', message: 'url is required' });
    const key = req.params.key;
    const updated = await Asset.findOneAndUpdate(
      { key },
      { key, url, alt },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ status: 'success', data: updated });
  } catch (err) {
    console.error('Upsert asset error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to save asset' });
  }
});

// @desc Delete asset mapping
// @route DELETE /api/assets/:key
// @access Private (Admin)
router.delete('/:key', protect, authorize('admin'), async (req, res) => {
  try {
    await Asset.deleteOne({ key: req.params.key });
    res.json({ status: 'success', message: 'Asset mapping deleted' });
  } catch (err) {
    console.error('Delete asset error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete asset' });
  }
});

module.exports = router;



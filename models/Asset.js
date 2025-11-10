const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  url: {
    type: String,
    required: true,
  },
  alt: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Asset', AssetSchema);



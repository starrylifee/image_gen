const mongoose = require('mongoose');

const promptSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'processed', 'processing'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  generatedImage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Image'
  }
});

const Prompt = mongoose.model('Prompt', promptSchema);

module.exports = Prompt; 
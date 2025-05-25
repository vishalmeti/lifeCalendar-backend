// models/Story.js
const mongoose = require('mongoose');

const StorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: { // e.g., "My Adventures: Week of May 19, 2025", "Q1 2025 Reflections"
    type: String,
    required: true
  },
  content: { // The AI-generated narrative
    type: String,
    required: true
  },
  startDate: { // The start date of the period this story covers
    type: Date,
    required: true
  },
  endDate: { // The end date of the period this story covers
    type: Date,
    required: true
  },
  relatedEntryIds: [{ // Storing IDs of entries used, not full refs for simplicity here
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyEntry'
  }],
  aiModel: { // Which AI model generated this story
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

StorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

StorySchema.index({ user: 1, startDate: -1, endDate: -1 }); // For user's stories, sorted by period

module.exports = mongoose.model('Story', StorySchema);
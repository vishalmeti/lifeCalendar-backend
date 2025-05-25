// models/Summary.js
const mongoose = require('mongoose');

const SummarySchema = new mongoose.Schema({
  user: { // Denormalized: To quickly find all summaries for a user (good for chatbot)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  entry: { // Foreign Key linking to the DailyEntry
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyEntry',
    required: true,
    unique: true, // Enforces one summary per DailyEntry. Remove if multiple versions allowed.
    index: true
  },
  entryDate: { // Denormalized: To allow chatbot to filter summaries by date easily
    type: Date,
    required: true,
    index: true
  },
  text: { // The AI-generated summary content
    type: String,
    required: true
  },
  aiModel: { // Optional: to track which model generated it
    type: String
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: { // Tracks when the summary text itself was last updated
    type: Date,
    default: Date.now
  }
});

// Middleware to update the 'updatedAt' field on save of the Summary document
SummarySchema.pre('save', function(next) {
  if (this.isModified('text') || this.isNew) { // Only update if text changed or new
      this.updatedAt = Date.now();
  }
  next();
});

// Text index for chatbot searching
SummarySchema.index({ text: 'text' });
// Optional compound index useful for chatbot: searching user's summaries in a date range
SummarySchema.index({ user: 1, entryDate: 1 });


module.exports = mongoose.model('Summary', SummarySchema);
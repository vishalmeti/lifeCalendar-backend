const mongoose = require('mongoose');

const DailyEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId, // Special type for MongoDB Object IDs
    ref: 'User',                          // Creates a reference to the User model
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  meetings: [{ // An array of meeting objects
    title: String,
    time: String, // e.g., "10:00 AM" or a timestamp
    notes: String
  }],
  habits: [{ // An array of habit objects
    name: String,
    completed: Boolean,
    details: String
  }],
  photos: [{ // An array of photo objects
    url: String,      // URL where the photo is stored (e.g., Cloudinary URL)
    caption: String
  }],
  mood: {
    type: String,
    // enum limits the possible values for mood
    enum: ['happy', 'sad', 'neutral', 'excited', 'stressed', 'calm', 'anxious', 'grateful', 'productive', 'tired', 'other']
  },
  journalNotes: {
    type: String
  },
  summary: { // This field will store the AI-generated summary for the day
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

// Middleware to update the 'updatedAt' field on save
DailyEntrySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// To ensure that a user can only have one entry per day,
// we can create a compound index. This means the combination of 'user' and 'date' must be unique.
// Note: For the 'date' to be unique per day, you'll need to ensure you store only the date part
// (e.g., by setting hours, minutes, seconds, and ms to 0) when creating entries.
DailyEntrySchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyEntry', DailyEntrySchema);
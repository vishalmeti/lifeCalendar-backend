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
  // habits: [{ // An array of habit objects
  //   name: String,
  //   completed: Boolean,
  //   details: String
  // }],
  tasks: [{
    url: String,
    caption: String
  }],
  mood: {
    type: String,
    // enum limits the possible values for mood
    enum: [
      'happy', 'sad', 'neutral', 'excited', 'motivated', 'stressed', 'calm', 'fun',
      'anxious', 'grateful', 'productive', 'tired', 'other'
    ]
  },
  journalNotes: {
    type: String
  },
  // summary: { // This field will store the AI-generated summary for the day
  //   type: String,
  //   default: '' // Default value if no summary is generated
  // },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
},
{
  // Ensure virtuals are included when converting to JSON or an Object
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Middleware to update the 'updatedAt' field on save
DailyEntrySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

DailyEntrySchema.pre('remove', function(next) {
    // If there's a summary, you might want to remove it as well
    const summary = mongoose.model('Summary').findOne({ entry: this._id });
    if (summary) {
        summary.remove();
    }
  next();
}
);

// Virtual for populating the summary from the 'Summary' model
DailyEntrySchema.virtual('summary', { // Renamed to 'summary' for simpler access if desired
  ref: 'Summary',       // The model to use for population
  localField: '_id',    // Find 'Summary' documents where 'localField' (_id of DailyEntry)
  foreignField: 'entry', // matches 'foreignField' (entry field of Summary)
  justOne: true         // We expect only one summary per entry (due to unique index in SummarySchema)
});

// To ensure that a user can only have one entry per day,
// we can create a compound index. This means the combination of 'user' and 'date' must be unique.
// Note: For the 'date' to be unique per day, you'll need to ensure you store only the date part
// (e.g., by setting hours, minutes, seconds, and ms to 0) when creating entries.
DailyEntrySchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyEntry', DailyEntrySchema);
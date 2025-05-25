const mongoose = require('mongoose');

// Define the User Schema
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true, // This field is mandatory
    unique: true,   // Each username must be unique
    trim: true      // Removes whitespace from both ends of a string
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true // Stores the email in lowercase
  },
  password: {
    type: String,
    required: true
    // We will hash this password before saving, not store it as plain text
  },
  createdAt: {
    type: Date,
    default: Date.now // Automatically sets the creation date
  },
  updatedAt: {
    type: Date,
    default: Date.now // Automatically sets the update date
  }
});

// Add pre-save middleware to update the updatedAt field
UserSchema.pre('save', function(next) {
  // Only update updatedAt when modifying an existing document
  if (!this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

// Create and export the User model
// mongoose.model('ModelName', schema)
// 'User' will be the name of the collection in MongoDB, typically pluralized to 'users'
module.exports = mongoose.model('User', UserSchema);
// 1. Import mongoose
const mongoose = require('mongoose');

// 2. Define an asynchronous function to connect to the database
const connectDB = async () => {
  try {
    // 3. Attempt to connect to MongoDB using the URI from environment variables
    // The options object helps prevent some deprecation warnings.
    await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    });

    console.log('MongoDB Connected'); // Log success message
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message); // Log error message
    // Exit process with failure if connection fails
    process.exit(1);
  }
};

// 4. Export the connectDB function to be used in other parts of the application
module.exports = connectDB;
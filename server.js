require('dotenv').config();

const express = require('express');
const mongodb = require('./config/db');
const listEndpoints = require('express-list-endpoints');

const app = express();

try {
    mongodb();
} catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1); // Exit the process if there's an error
}

app.use(express.json({ extended: false })); 

const PORT = process.env.PORT || 3000;


app.get('/api/v1/test', (req, res) => {
  res.json({ message: 'Test route works' });
});

// Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/entries', require('./routes/dailyEntries'));

console.log('All Routes:', listEndpoints(app));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
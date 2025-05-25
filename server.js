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

app.get('/', (req, res) => {
  res.send('Life Calendar API is starting...');
});

app.get('/api/v1/test', (req, res) => {
  res.json({ message: 'Test route works' });
});


app.use('/api/v1', require('./routes/auth'));

// console.log('All Routes:', listEndpoints(app));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
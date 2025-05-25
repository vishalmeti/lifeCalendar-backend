require('dotenv').config();

const express = require('express');
const mongodb = require('../config/db'); // adjust path because it's now inside /api
const listEndpoints = require('express-list-endpoints');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const serverless = require('serverless-http');

const app = express();

// Lazy DB connect to avoid cold-start issues
let isDbConnected = false;

async function connectDbIfNeeded() {
  if (!isDbConnected) {
    try {
      await mongodb();
      isDbConnected = true;
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('Error connecting to MongoDB:', error.message);
    }
  }
}

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Life Calendar API',
      version: '1.0.0',
      description: 'Life Calendar API documentation',
    },
    servers: [
      {
        url: `/api`, // relative path for Vercel
        description: 'Production server',
      },
    ],
  },
  apis: ['./routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

app.use(express.json({ extended: false }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Routes
app.get('/test', (req, res) => {
  res.json({ message: 'Test route works' });
});
app.use('/auth', require('../routes/auth'));
app.use('/entries', require('../routes/dailyEntries'));
app.use('/stories', require('../routes/story'));

const handler = serverless(async (req, res) => {
  await connectDbIfNeeded();
  return app(req, res);
});

module.exports = handler;

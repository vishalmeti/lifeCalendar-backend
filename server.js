require('dotenv').config();

const express = require('express');
const mongodb = require('./config/db');
const listEndpoints = require('express-list-endpoints');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const serverless = require('serverless-http');

// Swagger configuration
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
        url: `http://localhost:${process.env.PORT || 3000}/api/v1`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

const app = express();

try {
    mongodb();
} catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1); // Exit the process if there's an error
}

app.use(express.json({ extended: false })); 

// Swagger UI
app.use('/api/v1/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

const PORT = process.env.PORT || 3000;


app.get('/api/v1/test', (req, res) => {
  res.json({ message: 'Test route works' });
});

// Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/entries', require('./routes/dailyEntries'));
app.use('/api/v1/stories', require('./routes/story'));

// console.log('All Routes:', listEndpoints(app));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Swagger documentation available at http://localhost:${PORT}/api/v1/api-docs`);
});

const handler = serverless(async (req, res) => {
  await mongodb(); // Ensure DB connection is established for serverless
  return app(req, res);
});

module.exports = handler;
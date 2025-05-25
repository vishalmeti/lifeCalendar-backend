const { body } = require('express-validator');

// Validation for chatbot queries
exports.chatbotQueryValidator = [
  body('queryText')
    .notEmpty().withMessage('Query text is required')
    .isString().withMessage('Query must be a string')
    .isLength({ min: 2, max: 500 }).withMessage('Query must be between 2 and 500 characters')
];
const { body, param } = require('express-validator');
const mongoose = require('mongoose');

// Helper for validating MongoDB ObjectIDs
const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

// Validation for generating a story
exports.generateStoryValidator = [
  body('title')
    .notEmpty().withMessage('Story title is required')
    .isString().withMessage('Story title must be a string')
    .isLength({ min: 3, max: 100 }).withMessage('Story title must be between 3 and 100 characters'),
  
  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Start date must be a valid date in ISO format (YYYY-MM-DD)'),
  
  body('endDate')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('End date must be a valid date in ISO format (YYYY-MM-DD)')
    .custom((value, { req }) => {
      if (req.body.startDate) {
        const startDate = new Date(req.body.startDate);
        const endDate = new Date(value);
        
        if (endDate < startDate) {
          throw new Error('End date cannot be before start date');
        }
      }
      return true;
    }),
  
  body('periodDescription')
    .notEmpty().withMessage('Period description is required')
    .isString().withMessage('Period description must be a string')
    .isLength({ min: 3, max: 100 }).withMessage('Period description must be between 3 and 100 characters')
];

// Validation for getting a story by ID
exports.getStoryByIdValidator = [
  param('id')
    .custom(isValidObjectId).withMessage('Invalid story ID format')
];

// Validation for deleting a story
exports.deleteStoryValidator = [
  param('id')
    .custom(isValidObjectId).withMessage('Invalid story ID format')
];

// Get all stories does not require validation as it's simply fetching all stories for the authenticated user
exports.getAllStoriesValidator = [];
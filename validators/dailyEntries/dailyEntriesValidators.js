const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');

// Helper for validating MongoDB ObjectIDs
const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

// Validate meeting object structure in array
const validateMeetings = (meetings) => {
  if (!Array.isArray(meetings)) {
    throw new Error('Meetings must be an array');
  }

  meetings.forEach((meeting, index) => {
    if (typeof meeting !== 'object') {
      throw new Error(`Meeting at position ${index} must be an object`);
    }
    
    if (!meeting.title || typeof meeting.title !== 'string') {
      throw new Error(`Meeting at position ${index} must have a title`);
    }
    
    // Other fields are optional but we can validate their types if present
    if (meeting.time !== undefined && typeof meeting.time !== 'string') {
      throw new Error(`Time for meeting at position ${index} must be a string`);
    }
    
    if (meeting.notes !== undefined && typeof meeting.notes !== 'string') {
      throw new Error(`Notes for meeting at position ${index} must be a string`);
    }
  });
  
  return true;
};

// Validate task object structure in array
const validateTasks = (tasks) => {
  if (!Array.isArray(tasks)) {
    throw new Error('Tasks must be an array');
  }

  tasks.forEach((task, index) => {
    if (typeof task !== 'object') {
      throw new Error(`Task at position ${index} must be an object`);
    }
    
    if (!task.caption || typeof task.caption !== 'string') {
      throw new Error(`Task at position ${index} must have a caption`);
    }
    
    // URL is optional but we can validate if present
    if (task.url !== undefined && typeof task.url !== 'string') {
      throw new Error(`URL for task at position ${index} must be a string`);
    }
  });
  
  return true;
};

// Common date validation function
const validateDate = () => {
  return body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Date must be a valid date in ISO format (YYYY-MM-DD)')
    .custom((value) => {
      const inputDate = new Date(value);
      const currentDate = new Date();
      
      if (inputDate > currentDate) {
        throw new Error('Cannot create entries for future dates');
      }
      return true;
    });
};

// Validation for creating a daily entry
exports.createEntryValidator = [
  validateDate(),
  
  body('meetings')
    .optional()
    .custom(validateMeetings),
  
  body('tasks')
    .optional()
    .custom(validateTasks),
  
  body('mood')
    .optional()
    .isIn(['happy', 'sad', 'neutral', 'excited', 'motivated', 'stressed', 
          'calm', 'fun', 'anxious', 'grateful', 'productive', 'tired', 'other'])
    .withMessage('Mood must be one of the valid options'),
  
  body('journalNotes')
    .optional()
    .isString().withMessage('Journal notes must be a string')
];

// Validation for updating a daily entry
exports.updateEntryValidator = [
  param('id')
    .custom(isValidObjectId).withMessage('Invalid entry ID format'),
  
  validateDate(),
  
  body('meetings')
    .optional()
    .custom(validateMeetings),
  
  body('tasks')
    .optional()
    .custom(validateTasks),
  
  body('mood')
    .optional()
    .isIn(['happy', 'sad', 'neutral', 'excited', 'motivated', 'stressed', 
          'calm', 'fun', 'anxious', 'grateful', 'productive', 'tired', 'other'])
    .withMessage('Mood must be one of the valid options'),
  
  body('journalNotes')
    .optional()
    .isString().withMessage('Journal notes must be a string')
];

// Validation for patching a daily entry (partial update)
exports.patchEntryValidator = [
  param('id')
    .custom(isValidObjectId).withMessage('Invalid entry ID format'),
  
  body('date')
    .optional()
    .isISO8601().withMessage('Date must be a valid date in ISO format (YYYY-MM-DD)')
    .custom((value) => {
      const inputDate = new Date(value);
      const currentDate = new Date();
      
      if (inputDate > currentDate) {
        throw new Error('Cannot update to future dates');
      }
      return true;
    }),
  
  body('meetings')
    .optional()
    .custom(validateMeetings),
  
  body('tasks')
    .optional()
    .custom(validateTasks),
  
  body('mood')
    .optional()
    .isIn(['happy', 'sad', 'neutral', 'excited', 'motivated', 'stressed', 
          'calm', 'fun', 'anxious', 'grateful', 'productive', 'tired', 'other'])
    .withMessage('Mood must be one of the valid options'),
  
  body('journalNotes')
    .optional()
    .isString().withMessage('Journal notes must be a string')
];

// Validation for getting a daily entry by ID
exports.getEntryByIdValidator = [
  param('id')
    .custom(isValidObjectId).withMessage('Invalid entry ID format')
];

// Validation for deleting a daily entry
exports.deleteEntryValidator = [
  param('id')
    .custom(isValidObjectId).withMessage('Invalid entry ID format')
];

// Validation for generating summary for an entry
exports.generateSummaryValidator = [
  param('id')
    .custom(isValidObjectId).withMessage('Invalid entry ID format')
];

// Validation for getting all entries (with optional date filtering)
exports.getAllEntriesValidator = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date in ISO format (YYYY-MM-DD)'),
  
  query('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid date in ISO format (YYYY-MM-DD)')
    .custom((value, { req }) => {
      if (req.query.startDate && value) {
        const startDate = new Date(req.query.startDate);
        const endDate = new Date(value);
        
        if (endDate < startDate) {
          throw new Error('End date cannot be before start date');
        }
      }
      return true;
    })
];
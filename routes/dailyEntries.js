const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createEntry,
  getAllEntries,
  getEntryById,
  updateEntry,
  deleteEntry
} = require('../controllers/dailyEntries/dailyEntriesController');

// Routes with controller functions
router.post('/', authMiddleware, createEntry);
router.get('/', authMiddleware, getAllEntries);
router.get('/:id', authMiddleware, getEntryById);
router.put('/:id', authMiddleware, updateEntry);
router.delete('/:id', authMiddleware, deleteEntry);

module.exports = router;
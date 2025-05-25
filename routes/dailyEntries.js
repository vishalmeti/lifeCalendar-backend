const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createEntry,
  getAllEntries,
  getEntryById,
  updateEntry,
  patchEntry,
  deleteEntry,
  generateSummaryForEntry
} = require('../controllers/dailyEntries/dailyEntriesController');
const {
  createEntryValidator,
  getAllEntriesValidator,
  getEntryByIdValidator,
  updateEntryValidator,
  patchEntryValidator,
  deleteEntryValidator,
  generateSummaryValidator
} = require('../validators/dailyEntries/dailyEntriesValidators');
const validate = require('../validators/validationMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     DailyEntry:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *           description: The date of the entry
 *         mood:
 *           type: string
 *           description: The mood for the day
 *         notes:
 *           type: string
 *           description: Additional notes
 *         activities:
 *           type: array
 *           items:
 *             type: string
 *           description: List of activities done for the day
 */

/**
 * @swagger
 * /entries:
 *   get:
 *     summary: Get all entries
 *     tags: [Entries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DailyEntry'
 *       401:
 *         description: Not authorized
 *
 *   post:
 *     summary: Create a new entry
 *     tags: [Entries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DailyEntry'
 *     responses:
 *       201:
 *         description: Entry created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Not authorized
 */

/**
 * @swagger
 * /entries/{id}:
 *   get:
 *     summary: Get an entry by ID
 *     tags: [Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Entry details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DailyEntry'
 *       404:
 *         description: Entry not found
 *
 *   put:
 *     summary: Update an entry
 *     tags: [Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DailyEntry'
 *     responses:
 *       200:
 *         description: Entry updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Entry not found
 * 
 *   patch:
 *     summary: Partially update an entry
 *     tags: [Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               mood:
 *                 type: string
 *               journalNotes:
 *                 type: string
 *               meetings:
 *                 type: array
 *               habits:
 *                 type: array
 *               photos:
 *                 type: array
 *     responses:
 *       200:
 *         description: Entry patched successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Entry not found
 *
 *   delete:
 *     summary: Delete an entry
 *     tags: [Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Entry deleted successfully
 *       404:
 *         description: Entry not found
 */

// Routes with controller functions and validators
router.post('/', authMiddleware, createEntryValidator, validate, createEntry);
router.get('/', authMiddleware, getAllEntriesValidator, validate, getAllEntries);
router.get('/:id', authMiddleware, getEntryByIdValidator, validate, getEntryById);
router.put('/:id', authMiddleware, updateEntryValidator, validate, updateEntry);
router.patch('/:id', authMiddleware, patchEntryValidator, validate, patchEntry);
router.delete('/:id', authMiddleware, deleteEntryValidator, validate, deleteEntry);
router.get('/:id/generate-summary', authMiddleware, generateSummaryValidator, validate, generateSummaryForEntry);

module.exports = router;
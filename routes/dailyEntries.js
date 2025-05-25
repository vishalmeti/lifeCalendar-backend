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

// Routes with controller functions
router.post('/', authMiddleware, createEntry);
router.get('/', authMiddleware, getAllEntries);
router.get('/:id', authMiddleware, getEntryById);
router.put('/:id', authMiddleware, updateEntry);
router.delete('/:id', authMiddleware, deleteEntry);

module.exports = router;
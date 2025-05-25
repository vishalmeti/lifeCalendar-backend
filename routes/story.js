// routes/stories.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const storyController = require('../controllers/story/storyController');

/**
 * @swagger
 * /api/story/generate:
 *   post:
 *     summary: Generate a new story
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Prompt for generating the story
 *     responses:
 *       200:
 *         description: Story generated successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/generate', authMiddleware, storyController.generateStory);

/**
 * @swagger
 * /api/story:
 *   get:
 *     summary: Get all stories
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all stories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   content:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', authMiddleware, storyController.getAllStories);

/**
 * @swagger
 * /api/story/{id}:
 *   get:
 *     summary: Get a story by ID
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the story
 *     responses:
 *       200:
 *         description: Story details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 content:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Story not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authMiddleware, storyController.getStoryById);

/**
 * @swagger
 * /api/story/{id}:
 *   delete:
 *     summary: Delete a story
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the story to delete
 *     responses:
 *       200:
 *         description: Story deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Story not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authMiddleware, storyController.deleteStory);

module.exports = router;
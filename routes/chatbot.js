// routes/chatbot.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Summary = require('../models/Summary'); // To search summaries
const { generateChatbotResponse } = require('../services/aiService');
const { chatbotQueryValidator } = require('../validators/chatbot/chatbotValidators');
const validate = require('../validators/validationMiddleware');

/**
 * @swagger
 * /api/chatbot/query:
 *   post:
 *     summary: Query the chatbot
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - queryText
 *             properties:
 *               queryText:
 *                 type: string
 *                 description: The query text from the user
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 answer:
 *                   type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/query', authMiddleware, chatbotQueryValidator, validate, async (req, res) => {
  const { queryText } = req.body; // User's question, e.g., "When did I start Project Alpha?"

  try {
    let dbQuery = { user: req.user.id };
    let searchResultsContext = null;
    let sortOrder = {}; // Default no sort, or sort by relevance (text score)

    // --- Simplified NLU / Keyword Spotting ---
    // This is a very basic approach. Real NLU is more complex.
    const lowerQueryText = queryText.toLowerCase();
    let searchTerm = queryText; // Default to searching the whole query

    // Date pattern: YYYY-MM-DD or MM/DD/YYYY
    const datePattern = /\b(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4})\b/;
    const dateMatch = queryText.match(datePattern);
    
    if (dateMatch && dateMatch[1]) {
      const dateStr = dateMatch[1];
      const parsedDate = new Date(dateStr);
      
      // Check if date is valid
      if (!isNaN(parsedDate.getTime())) {
        // Create start and end of the day for the query
        const startDate = new Date(parsedDate);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(parsedDate);
        endDate.setHours(23, 59, 59, 999);
        
        // Replace text search with date range query
        delete dbQuery.$text;
        dbQuery.entryDate = { $gte: startDate, $lte: endDate };
        sortOrder = { entryDate: 1 }; // Sort chronologically throughout the day
        
        console.log(`Chatbot detected date query for: ${dateStr}`);
        searchTerm = `activities on ${dateStr}`;
      }
    } else if (lowerQueryText.includes('when did i start') || lowerQueryText.includes('when did i begin')) {
      // Try to extract the project/activity name
      // Example: "When did I start [Project Alpha]"
      const match = lowerQueryText.match(/(?:start|begin)\s(?:my\s|work\son\s|on\s|the\s)?(.+)/i);
      if (match && match[1]) {
        searchTerm = match[1].replace(/[?.]/g, '').trim(); // Clean up the extracted term
        sortOrder = { entryDate: 1 }; // Sort by date ascending to find the earliest
        // console.log(`Chatbot identified 'find start date' intent for term: "${searchTerm}"`);
      }
    } else if (lowerQueryText.includes('what did i do on') || lowerQueryText.includes('summary for') || 
               lowerQueryText.includes('what happened on')) {
        // Look for date mentions in natural language
        const dateRegex = /on\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\w+\s+\d{1,2}(?:st|nd|rd|th)?)/i;
        const dateMatch = lowerQueryText.match(dateRegex);
        
        if (dateMatch && dateMatch[1]) {
          const naturalDate = dateMatch[1].trim();
          const parsedDate = new Date(naturalDate);
          
          if (!isNaN(parsedDate.getTime())) {
            // Valid date found in natural language
            const startDate = new Date(parsedDate);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = new Date(parsedDate);
            endDate.setHours(23, 59, 59, 999);
            
            delete dbQuery.$text;
            dbQuery.entryDate = { $gte: startDate, $lte: endDate };
            sortOrder = { entryDate: 1 };
            console.log(`Chatbot detected natural date query for: ${naturalDate}`);
            searchTerm = `activities on ${naturalDate}`;
          } else {
            // If date parsing failed, fall back to text search
            sortOrder = { entryDate: -1 }; // Show most recent if a date is mentioned
          }
        } else {
          sortOrder = { entryDate: -1 }; // Show most recent if a date is mentioned
        }
    } else {
        console.log(`Chatbot performing general search for term: "${searchTerm}"`);
    }
    // --- End of Simplified NLU ---
    
    // Add text search if we're not doing a date-specific search
    if (!dbQuery.entryDate && searchTerm) {
      dbQuery.$text = { $search: searchTerm };
    }

    const summariesFromDB = await Summary.find(dbQuery)
      .sort(sortOrder) // Apply sort order (empty if no specific sort)
      .limit(10); // Limit to top 10 relevant summaries to keep context for AI manageable
    
    console.log(`Found ${summariesFromDB.length} results for query: ${JSON.stringify(dbQuery)}`);

    if (summariesFromDB && summariesFromDB.length > 0) {
      if (dbQuery.entryDate) { // Date-specific query
        const formattedDate = new Date(dbQuery.entryDate.$gte).toLocaleDateString();
        searchResultsContext = `Here's what I found for ${formattedDate}:\n` +
          summariesFromDB.map(s => `- ${s.text}`).join('\n');
      } else if (Object.keys(sortOrder).length > 0 && sortOrder.entryDate === 1) { // "When did I start X"
        const firstMention = summariesFromDB[0];
        searchResultsContext = `Regarding your question about starting "${searchTerm}", the earliest mention found was on ${new Date(firstMention.entryDate).toLocaleDateString()}: "${firstMention.text}"`;
      } else {
        // General case, provide a few summaries
        searchResultsContext = `Here's what I found related to "${searchTerm}":\n` +
          summariesFromDB.map(s => `On ${new Date(s.entryDate).toLocaleDateString()}: "${s.text}"`).join('\n---\n');
      }
    } else {
      if (dbQuery.entryDate) {
        const formattedDate = new Date(dbQuery.entryDate.$gte).toLocaleDateString();
        searchResultsContext = `I couldn't find any entries for ${formattedDate}.`;
      } else {
        searchResultsContext = null; // No specific results found
      }
    }

    // Generate a natural language response using Gemini
    const aiResponse = await generateChatbotResponse(queryText, searchResultsContext);
    res.json({ answer: aiResponse });

  } catch (err) {
    console.error('Error in chatbot query route:', err.message);
    res.status(500).send('Server Error processing your chat query.');
  }
});

module.exports = router;
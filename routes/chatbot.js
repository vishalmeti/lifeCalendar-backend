// routes/chatbot.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Summary = require('../models/Summary'); // To search summaries
const { generateChatbotResponse } = require('../services/aiService');

router.post('/query', authMiddleware, async (req, res) => {
  const { queryText } = req.body; // User's question, e.g., "When did I start Project Alpha?"

  if (!queryText) {
    return res.status(400).json({ msg: 'Query text is required.' });
  }

  try {
    let dbQuery = { user: req.user.id };
    let searchResultsContext = null;
    let sortOrder = {}; // Default no sort, or sort by relevance (text score)

    // --- Simplified NLU / Keyword Spotting ---
    // This is a very basic approach. Real NLU is more complex.
    const lowerQueryText = queryText.toLowerCase();
    let searchTerm = queryText; // Default to searching the whole query

    if (lowerQueryText.includes('when did i start') || lowerQueryText.includes('when did i begin')) {
      // Try to extract the project/activity name
      // Example: "When did I start [Project Alpha]"
      const match = lowerQueryText.match(/(?:start|begin)\s(?:my\s|work\son\s|on\s|the\s)?(.+)/i);
      if (match && match[1]) {
        searchTerm = match[1].replace(/[?.]/g, '').trim(); // Clean up the extracted term
        sortOrder = { entryDate: 1 }; // Sort by date ascending to find the earliest
        // console.log(`Chatbot identified 'find start date' intent for term: "${searchTerm}"`);
      }
    } else if (lowerQueryText.includes('what did i do on') || lowerQueryText.includes('summary for')) {
        // Potentially extract a date here if NLU was more advanced
        // For now, just uses the general searchTerm
        sortOrder = { entryDate: -1 }; // Show most recent if a date is mentioned
        // console.log(`Chatbot identified 'find activity on date' (general search) for term: "${searchTerm}"`);
    } else {
        console.log(`Chatbot performing general search for term: "${searchTerm}"`);
    }
    // --- End of Simplified NLU ---

    dbQuery.$text = { $search: searchTerm };

    const summariesFromDB = await Summary.find(dbQuery)
      .sort(sortOrder) // Apply sort order (empty if no specific sort)
      .limit(10); // Limit to top 5 relevant summaries to keep context for AI manageable

    if (summariesFromDB && summariesFromDB.length > 0) {
      if (Object.keys(sortOrder).length > 0 && sortOrder.entryDate === 1) { // "When did I start X"
        const firstMention = summariesFromDB[0];
        searchResultsContext = `Regarding your question about starting "${searchTerm}", the earliest mention found was on ${new Date(firstMention.entryDate).toLocaleDateString()}: "${firstMention.text}"`;
      } else {
        // General case, provide a few summaries
        searchResultsContext = `Here's what I found related to "${searchTerm}":\n` +
          summariesFromDB.map(s => `On ${new Date(s.entryDate).toLocaleDateString()}: "${s.text}"`).join('\n---\n');
      }
    } else {
      searchResultsContext = null; // No specific results found
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
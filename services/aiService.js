// services/aiService.js
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ],
});

async function summarizeDailyEntry(entryData) {
  // Destructure based on your DailyEntrySchema
  const { meetings, tasks, mood, journalNotes } = entryData;

  let promptParts = ["Please provide a comprehensive, detailed first-person summary of the following daily activities for my personal life calendar. I want you to be thorough and mention ALL tasks I worked on, include details about meetings. The summary should be concise. Don't include any personal information or sensitive data. Donot make the summary dramatic. Keep it simple and official."];

  if (journalNotes) {
    promptParts.push(`\nMy Journal Notes for the day: "${journalNotes}"`);
  }
  if (mood) {
    promptParts.push(`\nOverall, I felt: ${mood}. Please elaborate on this emotional state in the summary.`);
  }
  if (meetings && meetings.length > 0) {
    promptParts.push(`\nMeetings I attended (mention each one in detail):`);
    meetings.forEach(m => {
      promptParts.push(`- ${m.title}${m.time ? ` at ${m.time}` : ''}${m.notes ? ` (Notes: ${m.notes})` : ''}`);
    });
  }
  
  if (tasks && tasks.length > 0) {
    promptParts.push(`\nTasks I worked on (ensure ALL tasks are mentioned in detail):`);
    tasks.forEach(t => {
      promptParts.push(`- ${t.caption}${t.url ? ` (related link: ${t.url})` : ''}`);
    });
  }

  // Instructions for more detailed output
  promptParts.push("\nWhen writing the summary, please ensure it includes specific details about every task mentioned above, my accomplishments, and how I felt throughout the day. Make it brief.");

  // Check if there's enough specific content to summarize
  const hasContent = journalNotes || mood || (meetings && meetings.length > 0) || (tasks && tasks.length > 0);
  if (!hasContent) {
    return "Not enough specific data provided to generate a meaningful summary.";
  }

  const prompt = promptParts.join("\n");

//   console.log("Sending prompt to Gemini for detailed daily summary:\n", prompt); // For debugging

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;

    if (response.promptFeedback && response.promptFeedback.blockReason) {
        console.error('Gemini API Block Reason for daily summary:', response.promptFeedback.blockReason, response.promptFeedback.safetyRatings);
        return `Summary generation was blocked by the AI for safety reasons (${response.promptFeedback.blockReason}). Please review your input.`;
    }
    if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts || response.candidates[0].content.parts.length === 0) {
        console.error('Gemini API returned no content for daily summary. Response:', JSON.stringify(response, null, 2));
        return "The AI didn't return any content for the summary. This might be due to the input or a temporary issue.";
    }

    const summary = response.candidates[0].content.parts[0].text;
    console.log("Generated daily summary:", summary.trim()); // For debugging
    return summary.trim();

  } catch (error) {
    console.error('Error summarizing daily entry with Gemini AI:', error);
    return "An error occurred while trying to generate the daily summary with the AI.";
  }
}

// generateStoryFromEntries function remains the same as before,
// but if you use it, ensure its prompt also reflects your schema (e.g., uses 'tasks').
async function generateStoryFromEntries(dailySummaries, periodDescription) {
  // dailySummaries is an array of objects like: { date: 'YYYY-MM-DD', summaryText: '...' }
  // or full DailyEntry objects with their populated summaries.

  let promptParts = [
    `You are a genz young enthusiast person. Your task is to summarize in the first person, based on the following daily summaries from ${periodDescription}. keep the summary concise, engaging, not too long ,and reflective of my personal journey during this period.`,
    `Focus on personal growth, significant moments, recurring themes, overall mood progression, and any observed patterns. Make it feel like a personal storybook chapter. Keep the tone reflective and insightful. Highlight key achievements and challenges if mentioned.`
  ];

  if (!dailySummaries || dailySummaries.length === 0) {
    return "Not enough daily information provided to generate a story for this period.";
  }

  dailySummaries.forEach(item => {
    // Assuming item is an object { date: Date, summary: { text: String } } or similar structure
    // from a populated DailyEntry. Adjust access as needed.
    let entryDateStr = '';
    if (item.date) {
        entryDateStr = new Date(item.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    let summaryText = '';
    if (item.summary && typeof item.summary === 'object' && item.summary.text) { // If summary is populated object
        summaryText = item.summary.text;
    } else if (typeof item.summary === 'string') { // If summary is just text (less likely with our current setup)
        summaryText = item.summary;
    } else if (item.journalNotes) { // Fallback to journal notes if no summary text
        summaryText = `Journal: ${item.journalNotes}`;
    }


    if (summaryText) {
      promptParts.push(`\nOn ${entryDateStr}:\n"${summaryText}"`);
    }
  });

  promptParts.push("\nNow, please synthesize these daily notes into a flowing narrative for the period.");

  const prompt = promptParts.join("\n---\n"); // Use a clear separator
  console.log("Sending prompt to Gemini for story generation:\n", prompt);

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;

    if (response.promptFeedback && response.promptFeedback.blockReason) {
        console.error('Gemini API Block Reason for story:', response.promptFeedback.blockReason, response.promptFeedback.safetyRatings);
        return `Story generation was blocked by the AI for safety reasons (${response.promptFeedback.blockReason}).`;
    }
    if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts || response.candidates[0].content.parts.length === 0) {
        console.error('Gemini API returned no content for story. Response:', JSON.stringify(response, null, 2));
        return "The AI didn't return any content for the story.";
    }

    const storyContent = response.candidates[0].content.parts[0].text;
    return storyContent.trim();
  } catch (error) {
    console.error('Error generating story with Gemini AI:', error);
    return "An error occurred while trying to generate the story with the AI.";
  }
}

async function generateChatbotResponse(userQuery, searchResultsContext) {
  // searchResultsContext could be a string like "On YYYY-MM-DD, you mentioned 'Project X'. The summary was: '...'"
  // Or it could be null/empty if nothing relevant was found.

  let prompt;

  if (searchResultsContext) {
    prompt = `The user asked: "${userQuery}"
Based on their life calendar entries, the following information was found:
${searchResultsContext}

Please provide a helpful and conversational answer to the user's question based *only* on this provided context. If the context doesn't directly answer the question, say that you couldn't find specific information related to their query in the provided context. Be concise.`;
  } else {
    prompt = `The user asked: "${userQuery}"
No specific entries were found in their life calendar that seem to directly match this query.
Please provide a polite and helpful response acknowledging their query and stating that no specific information was found. You can suggest they try rephrasing or checking their entries.`;
  }

  console.log("Sending prompt to Gemini for chatbot response:\n", prompt);

  try {
    const result = await model.generateContent(prompt); // Assuming 'model' is your initialized Gemini model
    const response = result.response;

    if (response.promptFeedback && response.promptFeedback.blockReason) {
        console.error('Gemini API Block Reason for chatbot response:', response.promptFeedback.blockReason);
        return `I encountered an issue processing that: ${response.promptFeedback.blockReason}.`;
    }
    if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts || response.candidates[0].content.parts.length === 0) {
        console.error('Gemini API returned no content for chatbot response.');
        return "I'm sorry, I couldn't formulate a response at this moment.";
    }

    const chatResponse = response.candidates[0].content.parts[0].text;
    return chatResponse.trim();
  } catch (error) {
    console.error('Error generating chatbot response with Gemini AI:', error);
    return "I'm having a little trouble responding right now. Please try again later.";
  }
}

module.exports = {
  summarizeDailyEntry,
  generateStoryFromEntries,
  generateChatbotResponse
};
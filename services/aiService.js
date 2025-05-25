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
async function generateStoryFromEntries(entries, periodDescription) {
    let storyPromptParts = [`Craft an engaging narrative or milestone reflection in the first person, based on the following life entries from ${periodDescription}. Focus on personal growth, significant moments, emotions, and observed patterns. Make it feel like a personal storybook entry.`];
    if (!entries || entries.length === 0) return "No entries provided to generate a story.";

    entries.forEach(entry => {
        let entryDetails = `\nOn ${new Date(entry.date).toLocaleDateString()}:\n`;
        if (entry.summary) entryDetails += `  My day's summary was: "${entry.summary}"\n`;
        else {
            if (entry.journalNotes) entryDetails += `  I wrote in my journal: "${entry.journalNotes}"\n`;
            if (entry.mood) entryDetails += `  I felt: ${entry.mood}\n`;
        }
        if (entry.meetings && entry.meetings.length > 0) entryDetails += `  Key meetings: ${entry.meetings.map(m=>m.title).join(', ')}\n`;
        // Adapt to 'tasks' if needed for story generation
        if (entry.tasks && entry.tasks.length > 0) entryDetails += `  Key tasks: ${entry.tasks.map(t=>t.caption).join(', ')}\n`;
        storyPromptParts.push(entryDetails + "---\n");
      });
    const prompt = storyPromptParts.join("\n");
    console.log("Sending prompt to Gemini for story generation:\n", prompt);

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        if (response.promptFeedback && response.promptFeedback.blockReason) {
            return `Story generation blocked: ${response.promptFeedback.blockReason}.`;
        }
        if (!response.candidates || response.candidates.length === 0) return "AI didn't return content for story.";
        const story = response.candidates[0].content.parts[0].text;
        return story.trim();
    } catch (error) {
        console.error('Error generating story with Gemini AI:', error);
        return "Error generating story.";
    }
}


module.exports = {
  summarizeDailyEntry,
  generateStoryFromEntries,
};
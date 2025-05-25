const DailyEntry = require('../../models/DailyEntry');
const User = require('../../models/User');
const Summary = require('../../models/Summary');
const { summarizeDailyEntry } = require('../../services/aiService');
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
// Create a new daily entry
exports.createEntry = async (req, res) => {
  const {
    date,
    meetings,
    tasks,
    mood,
    journalNotes
  } = req.body;

  // Basic validation for required date
  if (!date) {
    return res.status(400).json({ msg: 'Date is required' });
  }  // Convert to date strings (YYYY-MM-DD format) for fair comparison
  const currentDateStr = new Date().toISOString().split('T')[0];
  const inputDateStr = new Date(date).toISOString().split('T')[0];

  if (currentDateStr < inputDateStr) {
    return res.status(400).json({ msg: 'Cannot add for future dates' });
  }

  try {
    // Normalize the date to the beginning of the day (midnight UTC)
    // This is crucial for the unique index (user + date) to work correctly per day.
    const entryDate = new Date(date);
    entryDate.setUTCHours(0, 0, 0, 0); // Set to midnight UTC

    // Check if an entry already exists for this user on this normalized date
    const existingEntry = await DailyEntry.findOne({
      user: req.user.id,
      date: entryDate
    });

    if (existingEntry) {
      return res.status(400).json({
        msg: 'An entry for this date already exists. You can update it instead.'
      });
    }

    // Create new entry object
    const newEntry = new DailyEntry({
      user: req.user.id, // ID of the logged-in user from authMiddleware
      date: entryDate,
      meetings: meetings || [],
      tasks: tasks || [],
      mood,
      journalNotes
      // summary will be added later by an AI process
    });

    // Save the entry to the database
    const savedEntry = await newEntry.save();
    // Now, generate the AI summary
    const summaryText = await summarizeDailyEntry({
        meetings: savedEntry.meetings,
        tasks: savedEntry.tasks, // Pass 'tasks'
        mood: savedEntry.mood,
        journalNotes: savedEntry.journalNotes
    });

    // Create and save the new Summary document
    if (summaryText && !summaryText.toLowerCase().includes("error") && !summaryText.toLowerCase().includes("blocked")) {
      const newSummaryDoc = new Summary({
        user: savedEntry.user,         // Store user ID in Summary
        entry: savedEntry._id,        // Link to the DailyEntry
        entryDate: savedEntry.date,   // Denormalize entryDate for easier querying
        text: summaryText,
        aiModel: GEMINI_MODEL //
      });
      await newSummaryDoc.save();
    } else {
      console.log(`AI Summary not generated or problematic for new entry ${savedEntry._id}: ${summaryText}`);
      // You might want to log this more formally or alert if summary generation is critical
    }

    // Return the created DailyEntry.
    // The client can make another request to get it with populated summary if needed immediately,
    // or you can populate here (adds a DB call). For now, returning the entry.
    const entryWithSummary = await DailyEntry.findById(savedEntry._id).populate('summary');
    res.status(201).json(entryWithSummary);

  } catch (err) {
    console.error('Error creating daily entry:', err.message);
    if (err.name === 'ValidationError') {
        return res.status(400).json({ msg: 'Validation error', errors: err.errors });
    }
    res.status(500).send('Server Error');
  }
};

// Get all daily entries for a user with optional date filtering
exports.getAllEntries = async (req, res) => {
  try {
    const { startDate, endDate } = req.query; // Get from query parameters like /api/entries?startDate=2023-01-01&endDate=2023-01-31
    let query = { user: req.user.id };
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(new Date(startDate).setUTCHours(0,0,0,0)),
        $lte: new Date(new Date(endDate).setUTCHours(23,59,59,999))
      };
    } else if (startDate) {
      query.date = { $gte: new Date(new Date(startDate).setUTCHours(0,0,0,0)) };
    } else if (endDate) {
      query.date = { $lte: new Date(new Date(endDate).setUTCHours(23,59,59,999)) };
    }
    const entries = await DailyEntry.find(query).sort({ date: -1 });
    res.json(entries);
  } catch (err) { 
    console.error('Error fetching daily entries:', err.message);
    res.status(500).send('Server Error');
   }
};

// Get a single daily entry by ID
exports.getEntryById = async (req, res) => {
  try {
    const entry = await DailyEntry.findById(req.params.id).populate('summary');

    // Check if entry exists
    if (!entry) {
      return res.status(404).json({ msg: 'Entry not found' });
    }

    // Check if the logged-in user owns this entry
    // entry.user is an ObjectId, req.user.id is a string. Convert for comparison.
    if (entry.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized to access this entry' });
    }

    res.json(entry);
  } catch (err) {
    console.error('Error fetching single daily entry:', err.message);
    if (err.kind === 'ObjectId') { // If the ID format is invalid
        return res.status(404).json({ msg: 'Entry not found (invalid ID format)' });
    }
    res.status(500).send('Server Error');
  }
};

// Update a daily entry
exports.updateEntry = async (req, res) => {
  const {
    date,
    meetings,
    tasks,
    mood,
    journalNotes
  } = req.body;

  const summaryRelevantFieldsChanged = (
    meetings !== undefined ||
    tasks !== undefined || // Check 'tasks'
    mood !== undefined ||
    journalNotes !== undefined
  );
  try {
    let entry = await DailyEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ msg: 'Entry not found' });
    }

    if (entry.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized to update this entry' });
    }

    // If the date is being changed, we need to normalize it and check for conflicts
    let newEntryDate;
    if (date && new Date(date).toISOString().split('T')[0] !== entry.date.toISOString().split('T')[0]) {
      newEntryDate = new Date(date);
      newEntryDate.setUTCHours(0, 0, 0, 0);

      const existingEntryOnNewDate = await DailyEntry.findOne({
        user: req.user.id,
        date: newEntryDate,
        _id: { $ne: req.params.id } // Exclude the current entry from the check
      });

      if (existingEntryOnNewDate) {
        return res.status(400).json({
          msg: 'An entry for the new date already exists. Cannot change to this date.'
        });
      }
      entry.date = newEntryDate;
    }

    // Update fields if they are provided in the request body
    if (meetings !== undefined) entry.meetings = meetings;
    if (tasks !== undefined) entry.tasks = tasks;
    if (mood !== undefined) entry.mood = mood;
    if (journalNotes !== undefined) entry.journalNotes = journalNotes;
    // 'summary' would be re-generated by AI if significant content changes. We'll handle AI later.

    const updatedEntry = await entry.save(); // .save() will trigger the 'pre' save hook for 'updatedAt'
    // If relevant fields OR the date changed, regenerate/update summary
    if (summaryRelevantFieldsChanged || entryDateChanged) {
      const summaryText = await summarizeDailyEntry({
        meetings: updatedEntry.meetings,
        tasks: updatedEntry.tasks, // Use 'tasks'
        mood: updatedEntry.mood,
        journalNotes: updatedEntry.journalNotes,
      });

      if (summaryText && !summaryText.toLowerCase().includes("error") && !summaryText.toLowerCase().includes("blocked")) {
        await Summary.findOneAndUpdate(
          { entry: updatedEntry._id, user: req.user.id }, // Ensure user matches for security
          {
            text: summaryText,
            entryDate: updatedEntry.date, // Update denormalized date if it changed
            user: req.user.id,            // Ensure user is set/correct
            aiModel: GEMINI_MODEL, // Store the AI model used
            generatedAt: Date.now()       // Reset generation time
          },
          { upsert: true, new: true, setDefaultsOnInsert: true } // Upsert: update if exists, insert if not
        );
      } else {
        console.log(`AI Summary not updated/created for entry ${updatedEntry._id} due to generation issue: ${summaryText}`);
      }
    }
    // Populate the summary to return it with the updated entry
    const entryWithSummary = await DailyEntry.findById(updatedEntry._id).populate('summary');
    res.json(entryWithSummary);

  } catch (err) {
    console.error('Error updating daily entry:', err.message);
    if (err.name === 'ValidationError') {
        return res.status(400).json({ msg: 'Validation error', errors: err.errors });
    }
    if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Entry not found (invalid ID format)' });
    }
    res.status(500).send('Server Error');
  }
};

// Patch a daily entry (for partial updates)
exports.patchEntry = async (req, res) => {
  try {
    let entry = await DailyEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ msg: 'Entry not found' });
    }

    if (entry.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized to update this entry' });
    }

    // Check if content fields that affect summary are being updated
    const summaryRelevantFieldsChanged = (
      req.body.meetings !== undefined ||
      req.body.tasks !== undefined ||
      req.body.mood !== undefined ||
      req.body.journalNotes !== undefined
    );
    
    // Handle special case for date changes (if included)
    let dateChanged = false;
    if (req.body.date) {
      const newEntryDate = new Date(req.body.date);
      newEntryDate.setUTCHours(0, 0, 0, 0);

      // Only check for conflicts if the date is actually changing
      if (newEntryDate.toISOString().split('T')[0] !== entry.date.toISOString().split('T')[0]) {
        dateChanged = true;
        const existingEntryOnNewDate = await DailyEntry.findOne({
          user: req.user.id,
          date: newEntryDate,
          _id: { $ne: req.params.id } // Exclude the current entry
        });

        if (existingEntryOnNewDate) {
          return res.status(400).json({
            msg: 'An entry for the new date already exists. Cannot change to this date.'
          });
        }
        req.body.date = newEntryDate;
      }
    }

    // Update only the fields that are provided in the request
    const updatedEntry = await DailyEntry.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    // If summary-relevant fields changed or date changed, update the summary
    if (summaryRelevantFieldsChanged || dateChanged) {
      const summaryText = await summarizeDailyEntry({
        meetings: updatedEntry.meetings,
        tasks: updatedEntry.tasks,
        mood: updatedEntry.mood,
        journalNotes: updatedEntry.journalNotes,
      });

      if (summaryText && !summaryText.toLowerCase().includes("error") && !summaryText.toLowerCase().includes("blocked")) {
        await Summary.findOneAndUpdate(
          { entry: updatedEntry._id, user: req.user.id },
          {
            text: summaryText,
            entryDate: updatedEntry.date,
            user: req.user.id,
            aiModel: GEMINI_MODEL,
            generatedAt: Date.now()
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } else {
        console.log(`AI Summary not updated/created for entry ${updatedEntry._id} due to generation issue: ${summaryText}`);
      }
      
      // Populate the summary to return it with the updated entry
      const entryWithSummary = await DailyEntry.findById(updatedEntry._id).populate('summary');
      return res.json(entryWithSummary);
    }

    res.json(updatedEntry);
  } catch (err) {
    console.error('Error patching daily entry:', err.message);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ msg: 'Validation error', errors: err.errors });
    }
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Entry not found (invalid ID format)' });
    }
    res.status(500).send('Server Error');
  }
};

// Delete a daily entry
exports.deleteEntry = async (req, res) => {
  try {
    const entry = await DailyEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ msg: 'Entry not found' });
    }

    if (entry.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized to delete this entry' });
    }

    // Mongoose v5+ `findByIdAndDelete` is a good option
    await entry.remove();
    // Or: await entry.remove(); // if you already fetched the entry

    res.json({ msg: 'Entry removed successfully' });
  } catch (err) {
    console.error('Error deleting daily entry:', err.message);
    if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Entry not found (invalid ID format)' });
    }
    res.status(500).send('Server Error');
  }
};

// AI-generated summary for a daily entry
exports.generateSummaryForEntry = async (req, res) => {
  try {
    const entry = await DailyEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ msg: 'Entry not found' });
    }

    // Check if the logged-in user owns this entry
    if (entry.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized to access this entry' });
    }

    // Generate the AI summary using the entry's current data
    const summaryText = await summarizeDailyEntry({
      meetings: entry.meetings,
      tasks: entry.tasks,
      mood: entry.mood,
      journalNotes: entry.journalNotes,
    });

    if (!summaryText || summaryText.toLowerCase().includes("error") || summaryText.toLowerCase().includes("blocked")) {
      return res.status(500).json({ msg: 'Failed to generate a valid summary' });
    }

    // Create or update the summary in the Summary collection
    const updatedSummary = await Summary.findOneAndUpdate(
      { entry: entry._id, user: req.user.id }, // Find by entry ID and user ID
      {
        text: summaryText,
        entryDate: entry.date,
        user: req.user.id,
        aiModel: GEMINI_MODEL,
        generatedAt: Date.now()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true } // Create if doesn't exist
    );

    res.json({
      msg: "AI summary generated successfully",
      entry: entry,
      summary: updatedSummary
    });

  } catch (err) {
    console.error('Error generating on-demand AI summary:', err.message);
    if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Entry not found (invalid ID format)' });
    }
    res.status(500).send('Server Error');
  }
}
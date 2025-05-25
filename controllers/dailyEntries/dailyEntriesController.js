const DailyEntry = require('../../models/DailyEntry');
const User = require('../../models/User');

// Create a new daily entry
exports.createEntry = async (req, res) => {
  const {
    date,
    meetings,
    habits,
    photos,
    mood,
    journalNotes
  } = req.body;

  // Basic validation for required date
  if (!date) {
    return res.status(400).json({ msg: 'Date is required' });
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
      habits: habits || [],
      photos: photos || [],
      mood,
      journalNotes
      // summary will be added later by an AI process
    });

    // Save the entry to the database
    const entry = await newEntry.save();
    res.status(201).json(entry); // 201 status for successful creation

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
    const entry = await DailyEntry.findById(req.params.id);

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
    habits,
    photos,
    mood,
    journalNotes
  } = req.body;

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
    if (habits !== undefined) entry.habits = habits;
    if (photos !== undefined) entry.photos = photos;
    if (mood !== undefined) entry.mood = mood;
    if (journalNotes !== undefined) entry.journalNotes = journalNotes;
    // 'summary' would be re-generated by AI if significant content changes. We'll handle AI later.

    const updatedEntry = await entry.save(); // .save() will trigger the 'pre' save hook for 'updatedAt'
    res.json(updatedEntry);

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
    await DailyEntry.findByIdAndDelete(req.params.id);
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
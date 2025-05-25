const DailyEntry = require('../../models/dailyEntry');
const Story = require('../../models/Story');
const { generateStoryFromEntries } = require('../../services/aiService');
const mongoose = require('mongoose');

// Generate a new story from daily entries for a date range
exports.generateStory = async (req, res) => {
  const { title, startDate, endDate, periodDescription } = req.body;

  if (!title || !startDate || !endDate || !periodDescription) {
    return res.status(400).json({ msg: 'Please provide title, startDate, endDate, and periodDescription' });
  }

  try {
    const sDate = new Date(startDate);
    sDate.setUTCHours(0, 0, 0, 0);
    const eDate = new Date(endDate);
    eDate.setUTCHours(23, 59, 59, 999);
    
    // Check for existing stories with the same date range for this user
    const existingStory = await Story.findOne({
      user: req.user.id,
      startDate: sDate,
      endDate: eDate
    });
    

    // 1. Fetch DailyEntry documents with their summaries populated
    const entriesForStory = await DailyEntry.find({
      user: req.user.id,
      date: { $gte: sDate, $lte: eDate }
    })
    .populate('summary')
    .sort({ date: 'asc' });

    if (entriesForStory.length === 0) {
      return res.status(404).json({ msg: 'No entries found for the selected period to generate a story.' });
    }

    // 2. Prepare data for AI
    const dailyDataForAI = entriesForStory.map(entry => ({
        date: entry.date,
        summary: entry.summary,
        journalNotes: entry.journalNotes,
    }));

    // 3. Call AI service to generate story content
    const storyContent = await generateStoryFromEntries(dailyDataForAI, periodDescription);

    if (!storyContent || storyContent.toLowerCase().includes("error") || storyContent.toLowerCase().includes("blocked") || storyContent.toLowerCase().includes("no content")) {
      return res.status(500).json({ msg: 'AI failed to generate story content or content was problematic.', details: storyContent });
    }

    // 4. If an existing story is found, delete it
    if (existingStory) {
      await existingStory.deleteOne();
      console.log(`Deleted existing story with ID: ${existingStory._id} to replace with new one`);
    }

    // 5. Create and save the new Story document
    const newStory = new Story({
      user: req.user.id,
      title,
      content: storyContent,
      startDate: sDate,
      endDate: eDate,
      relatedEntryIds: entriesForStory.map(entry => entry._id),
      aiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest',
    });

    await newStory.save();
    res.status(201).json(newStory);

  } catch (err) {
    console.error('Error generating story:', err.message);
    if (err.name === 'ValidationError') {
        return res.status(400).json({ msg: 'Validation error creating story', errors: err.errors });
    }
    res.status(500).send('Server Error');
  }
};

// Get all stories for the logged-in user
exports.getAllStories = async (req, res) => {
  try {
    const stories = await Story.find({ user: req.user.id }).sort({ startDate: -1 });
    res.json(stories);
  } catch (err) {
    console.error('Error fetching stories:', err.message);
    res.status(500).send('Server Error');
  }
};

// Get a specific story by ID
exports.getStoryById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'Invalid story ID format' });
    }
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ msg: 'Story not found' });
    }
    if (story.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    res.json(story);
  } catch (err) {
    console.error('Error fetching story by ID:', err.message);
    res.status(500).send('Server Error');
  }
};

// Delete a story
exports.deleteStory = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'Invalid story ID format' });
    }
    const story = await Story.findById(req.params.id);
    if (!story) {
        return res.status(404).json({ msg: 'Story not found' });
    }
    if (story.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not authorized' });
    }
    await story.deleteOne(); // Updated from remove() which is deprecated
    res.json({ msg: 'Story removed successfully' });
  } catch (err) {
    console.error('Error deleting story:', err.message);
    res.status(500).send('Server Error');
  }
};

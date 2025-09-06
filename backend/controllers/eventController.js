const Event = require('../models/Event');
const Batch = require('../models/Batch');

// Create event (Teacher only)
const createEvent = async (req, res) => {
  try {
    const { title, description, type, date, startTime, endTime, batchId } = req.body;
    const teacherId = req.user.id;

    // Validate batch exists and teacher is assigned
    const batch = await Batch.findOne({
      _id: batchId,
      'subjects.teacher': teacherId,
      isActive: true
    });

    if (!batch) {
      return res.status(404).json({ 
        success: false, 
        message: 'Batch not found or you are not assigned to this batch' 
      });
    }

    const event = new Event({
      title: title.trim(),
      description: description?.trim() || '',
      type, // Changed from eventType to type to match frontend
      date: new Date(date),
      startTime: startTime || '',
      endTime: endTime || '',
      batchId, // Changed from batch to batchId to match frontend
      createdBy: teacherId,
      isActive: true
    });

    await event.save();
    
    const populatedEvent = await Event.findById(event._id)
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: populatedEvent
    });
  } catch (error) {
    console.error('Event creation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create event',
      error: error.message 
    });
  }
};

// Get events for a batch
const getBatchEvents = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { month, year } = req.query;

    // Check if user has access to this batch
    const batch = await Batch.findOne({
      _id: batchId,
      $or: [
        { 'subjects.teacher': req.user.id },
        { 'studentAssignments.student': req.user.id }
      ],
      isActive: true
    });

    if (!batch) {
      return res.status(404).json({ 
        success: false, 
        message: 'Batch not found or access denied' 
      });
    }

    let query = { batchId: batchId, isActive: true }; // Changed from batch to batchId

    // Filter by month/year if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const events = await Event.find(query)
      .populate('createdBy', 'name email')
      .sort({ date: 1 });

    res.json({
      success: true,
      data: events,
      count: events.length,
      message: 'Events fetched successfully'
    });
  } catch (error) {
    console.error('Fetch events error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch events',
      error: error.message 
    });
  }
};

// Update event (Teacher only - creator)
const updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { title, description, type, date, startTime, endTime } = req.body;
    const teacherId = req.user.id;

    const event = await Event.findOne({
      _id: eventId,
      createdBy: teacherId,
      isActive: true
    });

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found or you are not authorized to edit this event' 
      });
    }

    // Update fields
    if (title) event.title = title.trim();
    if (description !== undefined) event.description = description.trim();
    if (type) event.type = type; // Changed from eventType to type
    if (date) event.date = new Date(date);
    if (startTime !== undefined) event.startTime = startTime;
    if (endTime !== undefined) event.endTime = endTime;

    await event.save();

    const updatedEvent = await Event.findById(eventId)
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: updatedEvent
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update event',
      error: error.message 
    });
  }
};

// Delete event (Teacher only - creator)
const deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const teacherId = req.user.id;

    const event = await Event.findOneAndDelete({
      _id: eventId,
      createdBy: teacherId,
      isActive: true
    });

    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found or you are not authorized to delete this event' 
      });
    }

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete event',
      error: error.message 
    });
  }
};

// Get teacher's events across all batches
const getTeacherEvents = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { month, year } = req.query;

    let query = { createdBy: teacherId, isActive: true };

    // Filter by month/year if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const events = await Event.find(query)
      .populate('batchId', 'batchName') // Changed from batch to batchId
      .sort({ date: 1 });

    res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    console.error('Get teacher events error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch your events',
      error: error.message 
    });
  }
};

// Get student's events from all assigned batches
const getStudentEvents = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { month, year } = req.query;

    // Find all batches where student is assigned
    const batches = await Batch.find({
      'studentAssignments.student': studentId,
      isActive: true
    }).select('_id');

    const batchIds = batches.map(batch => batch._id);

    let query = { 
      batchId: { $in: batchIds }, // Changed from batch to batchId
      isActive: true 
    };

    // Filter by month/year if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const events = await Event.find(query)
      .populate('createdBy', 'name email')
      .populate('batchId', 'batchName') // Changed from batch to batchId
      .sort({ date: 1 });

    res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    console.error('Get student events error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch your events',
      error: error.message 
    });
  }
};

module.exports = {
  createEvent,
  getBatchEvents,
  updateEvent,
  deleteEvent,
  getTeacherEvents,
  getStudentEvents
};
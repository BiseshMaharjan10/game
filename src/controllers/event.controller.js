const { asyncHandler } = require('../utils/asyncHandler');
const { listEvents, acceptEvent, completeEvent } = require('../services/event.service');

const listEventsHandler = asyncHandler(async (_req, res) => {
  const events = await listEvents();
  res.json({ events });
});

const acceptEventHandler = asyncHandler(async (req, res) => {
  const assignment = await acceptEvent(req.user.id, req.body.eventId);
  res.status(201).json({ assignment });
});

const completeEventHandler = asyncHandler(async (req, res) => {
  const result = await completeEvent(req.user.id, req.body.eventId, req.body.success !== false);
  res.json(result);
});

module.exports = { listEventsHandler, acceptEventHandler, completeEventHandler };

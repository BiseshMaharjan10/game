const { asyncHandler } = require('../utils/asyncHandler');
const { listEvents, getPlayerEventHistory, acceptEvent, completeEvent } = require('../services/event.service');
const {
  getEventListContractPayload,
  getEventAcceptContractPayload,
  getEventCompleteContractPayload
} = require('../utils/responseMappers');

const listEventsHandler = asyncHandler(async (req, res) => {
  // Fetch all available events AND this player's current event states
  const [events, playerEvents] = await Promise.all([
    listEvents(),
    getPlayerEventHistory(req.user.id)
  ]);

  // Both arrays are passed to the mapper — no longer discarded
  res.json(getEventListContractPayload(events, playerEvents));
});

const acceptEventHandler = asyncHandler(async (req, res) => {
  const eventId = req.body ? (req.body.eventId || null) : null;
  if (!eventId) {
    return res.status(400).json({ error: { message: 'eventId is required' } });
  }

  // assignment = Prisma PlayerEvent row with { event, company } included
  const assignment = await acceptEvent(req.user.id, eventId);

  // Pass real assignment (which includes event.title, event.description)
  res.status(201).json(getEventAcceptContractPayload(assignment));
});

const completeEventHandler = asyncHandler(async (req, res) => {
  // CRITICAL FIX: completeEvent() was never called before — player state never mutated
  const eventId = req.body ? (req.body.eventId || null) : null;
  if (!eventId) {
    return res.status(400).json({ error: { message: 'eventId is required' } });
  }

  // success flag: default true, can be overridden by client for failure scenarios
  const success = req.body.success !== false;

  // outcome = { participation: PlayerEvent (with .event), outcome: { moneyDelta, trustDelta, subscriberDelta } }
  const outcome = await completeEvent(req.user.id, eventId, success);

  res.json(getEventCompleteContractPayload(outcome));
});

module.exports = { listEventsHandler, acceptEventHandler, completeEventHandler };

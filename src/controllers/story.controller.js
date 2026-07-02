const { asyncHandler } = require("../utils/asyncHandler");
const { AppError } = require("../utils/appError");
const {
  generateStoryInstance,
  getAvailableEvents,
  getOrCreateCountryState,
  resolveStoryChoice,
  serializeStoryInstance,
  serializeEvent,
  serializeCountryState,
} = require("../services/storyEngine.service");
const { storyRepository } = require("../modules/story/story.repository");

const generateStoryHandler = asyncHandler(async (_req, res) => {
  const result = await generateStoryInstance();

  res.status(200).json(serializeStoryInstance(result.storyInstance));
});

const listStoryEventsHandler = asyncHandler(async (req, res) => {
  const storyId = req.params.storyId;
  if (!storyId) {
    throw new AppError("storyId is required", 400);
  }

  const storyInstance = await storyRepository.findStoryInstanceById(storyId);
  if (!storyInstance) {
    throw new AppError("story not found", 404);
  }

  const playerState = await getOrCreatePlayerState(req.user.id, req.user);
  const countryState = await getOrCreateCountryState();
  const events = await getAvailableEvents(
    storyInstance,
    playerState,
    countryState,
  );

  res.json({
    story_id: storyInstance.id,
    events: events.map(serializeEvent),
  });
});

const submitChoiceHandler = asyncHandler(async (req, res) => {
  const storyId = req.body.story_id || req.body.storyId;
  const eventId = req.body.event_id || req.body.eventId;
  const choiceIndex = Number(
    req.body.choice_index != null
      ? req.body.choice_index
      : req.body.choiceIndex,
  );

  if (
    !storyId ||
    !eventId ||
    !Number.isInteger(choiceIndex) ||
    choiceIndex < 0
  ) {
    throw new AppError(
      "story_id, event_id, and choice_index are required",
      400,
    );
  }

  const outcome = await resolveStoryChoice({
    playerId: req.user.id,
    storyId,
    eventId,
    choiceIndex,
  });

  res.json({
    player_state: serializePlayerState(outcome.playerState),
    country_state: serializeCountryState(outcome.countryState),
    new_events: outcome.newEvents.map(serializeEvent),
  });
});

const getCountryStateHandler = asyncHandler(async (_req, res) => {
  const countryState = await getOrCreateCountryState();
  res.json(serializeCountryState(countryState));
});

module.exports = {
  generateStoryHandler,
  listStoryEventsHandler,
  submitChoiceHandler,
  getCountryStateHandler,
};

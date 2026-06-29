const { Router } = require('express');
const { authRequired } = require('../../middleware/auth');
const { requireFields } = require('../../middleware/validate');
const {
  generateStoryHandler,
  listStoryEventsHandler,
  submitChoiceHandler,
  getPlayerStateHandler,
  getCountryStateHandler
} = require('../../controllers/story.controller');

const storyRouter = Router();

storyRouter.get('/stories/generate', authRequired, generateStoryHandler);
storyRouter.get('/events/:storyId', authRequired, listStoryEventsHandler);
storyRouter.post('/events/choice', authRequired, requireFields(['story_id', 'event_id', 'choice_index']), submitChoiceHandler);
storyRouter.get('/player/state', authRequired, getPlayerStateHandler);
storyRouter.get('/country/state', authRequired, getCountryStateHandler);

module.exports = { storyRouter };

const { Router } = require('express');
const { authRequired } = require('../../middleware/auth');
const { requireFields } = require('../../middleware/validate');
const { listEventsHandler, acceptEventHandler, completeEventHandler } = require('../../controllers/event.controller');

const eventRouter = Router();

eventRouter.get('/', authRequired, listEventsHandler);
eventRouter.post('/accept', authRequired, acceptEventHandler);
eventRouter.post('/complete', authRequired, completeEventHandler);

module.exports = { eventRouter };
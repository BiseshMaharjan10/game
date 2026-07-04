const { Router } = require('express');
const { authRequired } = require('../../middleware/auth');
const {
  saveDraftHandler,
  getDraftHandler,
  deleteDraftHandler,
  publishArticleHandler,
} = require('../../controllers/news.controller');

const newsRouter = Router();

newsRouter.post('/draft', authRequired, saveDraftHandler);
newsRouter.get('/draft/:scenarioId', authRequired, getDraftHandler);
newsRouter.delete('/draft/:scenarioId', authRequired, deleteDraftHandler);
newsRouter.post('/publish', authRequired, publishArticleHandler);

module.exports = { newsRouter };

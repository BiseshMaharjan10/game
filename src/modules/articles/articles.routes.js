const { Router } = require('express');
const { authRequired } = require('../../middleware/auth');
const { requireFields } = require('../../middleware/validate');
const { publishArticleHandler, articleHistoryHandler } = require('../../controllers/article.controller');

const articleRouter = Router();

articleRouter.post('/publish', authRequired, requireFields(['title', 'type', 'quality']), publishArticleHandler);
articleRouter.get('/history', authRequired, articleHistoryHandler);

module.exports = { articleRouter };
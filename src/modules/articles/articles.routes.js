const { Router } = require('express');
const { authRequired } = require('../../middleware/auth');
const { requireFields } = require('../../middleware/validate');
const { publishArticleHandler, articleHistoryHandler } = require('../../controllers/article.controller');

const articleRouter = Router();

articleRouter.post('/publish', authRequired, (req, _res, next) => {
  if (!req.body?.strategy) {
    return _res.status(400).json({ error: 'Missing fields: strategy' });
  }
  next();
}, publishArticleHandler);
articleRouter.get('/history', authRequired, articleHistoryHandler);

module.exports = { articleRouter };
const { asyncHandler } = require('../utils/asyncHandler');
const { publishArticle, articleHistory } = require('../services/article.service');

const publishArticleHandler = asyncHandler(async (req, res) => {
  const result = await publishArticle(req.user.id, req.body);
  res.status(201).json(result);
});

const articleHistoryHandler = asyncHandler(async (req, res) => {
  const articles = await articleHistory(req.user.id);
  res.json({ articles });
});

module.exports = { publishArticleHandler, articleHistoryHandler };

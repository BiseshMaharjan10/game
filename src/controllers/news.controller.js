const { asyncHandler } = require('../utils/asyncHandler');
const newsService = require('../services/news.service');

const saveDraftHandler = asyncHandler(async (req, res) => {
  const { scenarioId, headline } = req.body;
  if (!scenarioId) {
    return res.status(400).json({ error: 'scenarioId is required' });
  }
  if (!headline) {
    return res.status(400).json({ error: 'headline is required' });
  }

  const article = await newsService.saveDraft(req.user.id, { scenarioId, headline });

  const result = { article: { ...article } };
  if (article._generationError) {
    result.generationError = article._generationError;
    delete result.article._generationError;
  }

  res.json(result);
});

const getDraftHandler = asyncHandler(async (req, res) => {
  const { scenarioId } = req.params;
  if (!scenarioId) {
    return res.status(400).json({ error: 'scenarioId is required' });
  }

  const article = await newsService.getDraft(req.user.id, scenarioId);
  if (!article) {
    return res.status(404).json({ error: 'No draft found for this scenario' });
  }

  res.json({ article });
});

const deleteDraftHandler = asyncHandler(async (req, res) => {
  const { scenarioId } = req.params;
  if (!scenarioId) {
    return res.status(400).json({ error: 'scenarioId is required' });
  }

  const result = await newsService.deleteDraft(req.user.id, scenarioId);
  res.json(result);
});

const publishArticleHandler = asyncHandler(async (req, res) => {
  const { articleId } = req.body;
  if (!articleId) {
    return res.status(400).json({ error: 'articleId is required' });
  }

  const article = await newsService.publishArticle(req.user.id, articleId);
  res.json({ article });
});

const getRoomNewsHandler = asyncHandler(async (req, res) => {
  const news = await newsService.getRoomNews(req.user.id);
  res.json({ news });
});

module.exports = {
  saveDraftHandler,
  getDraftHandler,
  deleteDraftHandler,
  publishArticleHandler,
  getRoomNewsHandler,
};

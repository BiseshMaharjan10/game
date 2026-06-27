const { asyncHandler } = require('../utils/asyncHandler');
const { publishArticle, articleHistory } = require('../services/article.service');
const {
  getArticleHistoryContractPayload,
  getArticlePublishContractPayload
} = require('../utils/responseMappers');

const publishArticleHandler = asyncHandler(async (req, res) => {
  const strategy = req.body ? (req.body.strategy || 'fast') : 'fast';

  const mappedBody = {
    title:        (req.body && req.body.title)        || 'Contract article',
    type:         (req.body && req.body.type)         || 'news',
    quality:      (req.body && req.body.quality)      || (strategy === 'full' ? 5 : strategy === 'partial' ? 3 : 1),
    verifiedInfo: Boolean(req.body && req.body.verifiedInfo),
    isFakeNews:   Boolean(req.body && req.body.isFakeNews)
  };

  // result = { article: PrismaArticle, effects: { revenue, salaryExpense, trustDelta, subscriberDelta, nextMoney, nextTrustScore, nextSubscribers, nextCompanyValue } }
  const result = await publishArticle(req.user.id, mappedBody);

  // Pass the real article row and effects — no longer using req.body as data source
  res.status(201).json(
    getArticlePublishContractPayload(result.article, result.effects, strategy)
  );
});

const articleHistoryHandler = asyncHandler(async (req, res) => {
  // Real article rows from the DB — mapper now uses all fields
  const articles = await articleHistory(req.user.id);
  res.json(getArticleHistoryContractPayload(articles));
});

module.exports = { publishArticleHandler, articleHistoryHandler };

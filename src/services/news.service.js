const { AppError } = require('../utils/appError');
const { log } = require('../utils/logger');
const { getPlayerRoom } = require('./room.manager');
const { newsRepository } = require('../modules/news/news.repository');
const { findScenarioById } = require('./scenario.service');
const { generateArticle } = require('./gemini.service');
const { generateBackgroundNews } = require('./backgroundNews.service');
const { storeSnapshot } = require('./investigationSnapshot.service');
const { judgePublishedArticle } = require('./judge.service');
const { playerRepository } = require('../modules/auth/auth.repository');
const { emitToRoom } = require('../websocket/wsServer');

function _getRoomOrThrow(playerId) {
  const room = getPlayerRoom(playerId);
  if (!room) {
    throw new AppError('Not in any room', 400);
  }
  return room;
}

function _validateScenarioExists(room, scenarioId) {
  const scenario = findScenarioById(room, scenarioId);
  if (!scenario) {
    throw new AppError('Scenario not found in this room', 404);
  }
}

function _validatePlayerInvestigated(room, playerId, scenarioId) {
  const hasInvestigation = room.completedInvestigations.some(
    inv => inv.playerId === playerId && inv.scenarioId === scenarioId
  );
  if (!hasInvestigation) {
    throw new AppError('You must investigate this scenario before writing about it', 400);
  }
}

async function saveDraft(playerId, { scenarioId, headline }) {
  const room = _getRoomOrThrow(playerId);

  _validateScenarioExists(room, scenarioId);
  _validatePlayerInvestigated(room, playerId, scenarioId);

  if (!headline || headline.trim().length < 10) {
    throw new AppError('Headline must be at least 10 characters', 400);
  }

  const existing = await newsRepository.findByPlayerAndScenario(playerId, scenarioId);
  if (existing && existing.status === 'PUBLISHED') {
    throw new AppError('Article already published for this scenario', 400);
  }

  const article = await newsRepository.upsert(playerId, scenarioId, {
    roomId: room.roomId,
    headline: headline.trim(),
  });

  emitToRoom(room.roomId, 'news:draft_saved', {
    articleId: article.id,
    scenarioId,
    playerId,
    headline: headline.trim(),
    roomId: room.roomId,
  });

  log('INFO', 'News draft saved', {
    playerId,
    roomId: room.roomId,
    scenarioId,
    articleId: article.id,
    isUpdate: !!existing,
  });

  if (!article.body) {
    try {
      const scenario = findScenarioById(room, scenarioId);

      const completedInv = room.completedInvestigations.find(
        inv => inv.playerId === playerId && inv.scenarioId === scenarioId
      );

      const backgroundNews = generateBackgroundNews(scenario.templateId, scenario.templateVars || {});

      const context = {
        headline: headline.trim(),
        anonymousTip: scenario.anonymousTip || '',
        backgroundNews: backgroundNews || [],
        discoveredEvidence: completedInv?.discoveredEvidence || [],
        witnessStatements: completedInv?.discoveredWitnesses || [],
      };

      const generatedBody = await generateArticle(context);

      const updated = await newsRepository.update(article.id, { body: generatedBody });

      await storeSnapshot(article.id, playerId, scenarioId, {
        ...context,
        generatedArticleBody: generatedBody,
      });

      log('INFO', 'Article body generated via Gemini', {
        playerId,
        articleId: article.id,
        scenarioId,
        wordCount: generatedBody.split(/\s+/).length,
      });

      return updated;
    } catch (err) {
      log('WARN', 'Failed to generate article body via Gemini, returning draft without body', {
        playerId,
        articleId: article.id,
        scenarioId,
        error: err.message,
      });

      const draft = await newsRepository.findById(article.id);
      draft._generationError = err.message;
      return draft;
    }
  }

  return article;
}

async function getDraft(playerId, scenarioId) {
  const room = _getRoomOrThrow(playerId);

  const article = await newsRepository.findByPlayerAndScenario(playerId, scenarioId);
  if (!article) {
    return null;
  }

  return article;
}

async function deleteDraft(playerId, scenarioId) {
  const room = _getRoomOrThrow(playerId);

  const article = await newsRepository.findByPlayerAndScenario(playerId, scenarioId);
  if (!article) {
    throw new AppError('No draft found for this scenario', 404);
  }
  if (article.status !== 'DRAFT') {
    throw new AppError('Cannot delete a published article', 400);
  }

  await newsRepository.deleteByPlayerAndScenario(playerId, scenarioId);

  log('INFO', 'News draft deleted', {
    playerId,
    roomId: room.roomId,
    scenarioId,
    articleId: article.id,
  });

  return { deleted: true };
}

async function publishArticle(playerId, articleId) {
  const room = _getRoomOrThrow(playerId);

  const article = await newsRepository.findById(articleId);
  if (!article) {
    throw new AppError('Article not found', 404);
  }
  if (article.playerId !== playerId) {
    throw new AppError('Article does not belong to you', 403);
  }
  if (article.status !== 'DRAFT') {
    throw new AppError('Article is already published or not in draft state', 400);
  }

  const scenario = findScenarioById(room, article.scenarioId);
  if (scenario && (scenario.status === 'EXPIRED' || scenario.status === 'RESOLVED')) {
    throw new AppError('Cannot publish for an expired scenario', 400);
  }

  const updated = await newsRepository.update(articleId, {
    status: 'PUBLISHED',
    publishedAt: new Date().toISOString(),
  });

  let outlet = 'Unknown Outlet';
  try {
    const playerRecord = await playerRepository.findById(playerId);
    if (playerRecord) {
      outlet = playerRecord.companyName || playerRecord.email || 'Unknown Outlet';
    }
  } catch (_err) {
    // fallback
  }

  emitToRoom(room.roomId, 'news:published', {
    articleId,
    scenarioId: article.scenarioId,
    playerId,
    outlet,
    headline: article.headline,
    publishedAt: updated.publishedAt,
    roomId: room.roomId,
  });

  emitToRoom(room.roomId, 'activity:message', {
    type: 'article_published',
    playerId,
    outlet,
    message: `${outlet} published a story: \"${article.headline}\"`,
    headline: article.headline,
    roomId: room.roomId,
  });

  log('INFO', 'News article published', {
    playerId,
    roomId: room.roomId,
    articleId,
    outlet,
    scenarioId: article.scenarioId,
  });

  judgePublishedArticle(playerId, articleId).catch(err => {
    log('ERROR', '[JUDGE] Background judging failed', {
      articleId,
      playerId,
      error: err.message,
    });
  });

  return updated;
}

async function getRoomNews(playerId) {
  const room = _getRoomOrThrow(playerId);
  const articles = await newsRepository.findByRoom(room.roomId);
  return articles;
}

module.exports = {
  saveDraft,
  getDraft,
  deleteDraft,
  publishArticle,
  getRoomNews,
};

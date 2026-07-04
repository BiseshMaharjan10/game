const { log } = require('../utils/logger');
const { getPlayerRoom, getRoom } = require('./room.manager');
const { findScenarioById } = require('./scenario.service');
const { newsRepository } = require('../modules/news/news.repository');
const { judgementRepository } = require('../modules/judgement/judgement.repository');
const { getSnapshotByArticleId } = require('./investigationSnapshot.service');
const { judgeArticle } = require('./geminiJudge.service');
const { calculateScore, determineFinalVerdict } = require('./scoreEngine.service');
const { recalculateLeaderboard, getRoomLeaderboard } = require('./leaderboard.service');
const { emitToRoom } = require('../websocket/wsServer');

async function judgePublishedArticle(playerId, articleId) {
  log('INFO', '[JUDGE] Article received for judging', { playerId, articleId });

  const article = await newsRepository.findById(articleId);
  if (!article) {
    log('WARN', '[JUDGE] Article not found', { articleId });
    throw new Error('Article not found');
  }

  if (article.status !== 'PUBLISHED') {
    log('WARN', '[JUDGE] Article not in published state', { articleId, status: article.status });
    throw new Error('Article must be published before judging');
  }

  const existing = await judgementRepository.findByArticleId(articleId);
  if (existing) {
    log('WARN', '[JUDGE] Article already judged, skipping', { articleId, judgementId: existing.id });
    return existing;
  }

  const room = getPlayerRoom(playerId);
  if (!room) {
    throw new Error('Player not in any room');
  }

  const scenario = findScenarioById(room, article.scenarioId);
  if (!scenario) {
    log('WARN', '[JUDGE] Scenario not found in room', { roomId: room.roomId, scenarioId: article.scenarioId });
    throw new Error('Scenario not found');
  }

  const snapshot = await getSnapshotByArticleId(articleId);
  if (!snapshot) {
    log('WARN', '[JUDGE] No investigation snapshot found for article', { articleId });
    throw new Error('Investigation snapshot not found. Was the article generated through the proper flow?');
  }

  const context = {
    hiddenTruth: scenario.truth,
    hiddenFacts: scenario.hiddenFacts || {},
    anonymousTip: snapshot.anonymousTip || '',
    discoveredEvidence: snapshot.discoveredEvidence || [],
    witnessStatements: snapshot.witnessStatements || [],
    backgroundNews: snapshot.backgroundNews || [],
    headline: snapshot.headline || article.headline || '',
    articleBody: snapshot.generatedArticleBody || article.body || '',
  };

  log('INFO', '[JUDGE] Calling Gemini for analysis', {
    articleId,
    playerId,
    hiddenTruth: scenario.truth,
    evidenceCount: context.discoveredEvidence.length,
    witnessCount: context.witnessStatements.length,
  });

  let geminiAnalysis;
  try {
    geminiAnalysis = await judgeArticle(context);
    log('INFO', '[JUDGE] Gemini analysis complete', {
      articleId,
      verdict: geminiAnalysis.overallVerdict,
      claimCount: geminiAnalysis.claims?.length || 0,
      sensationalism: geminiAnalysis.sensationalism,
    });
  } catch (err) {
    log('ERROR', '[JUDGE] Gemini analysis failed', { articleId, error: err.message });

    geminiAnalysis = {
      claims: [],
      missingFacts: [],
      falseClaims: [],
      sensationalism: 0,
      bias: 0,
      overallVerdict: 'PARTIALLY_TRUE',
      summary: 'Gemini analysis unavailable. Scored with default values.',
    };
  }

  const isLate = _isLatePublication(room, article);
  const score = calculateScore(geminiAnalysis, { latePublication: isLate });
  const finalVerdict = determineFinalVerdict(geminiAnalysis.overallVerdict, score);

  log('INFO', '[SCORE] Calculated score', {
    articleId,
    playerId,
    score,
    verdict: finalVerdict,
    latePublication: isLate,
  });

  const judgement = await judgementRepository.create({
    articleId,
    scenarioId: article.scenarioId,
    playerId,
    roomId: room.roomId,
    geminiAnalysis: JSON.parse(JSON.stringify(geminiAnalysis)),
    backendScore: score,
    finalVerdict,
  });

  log('INFO', '[JUDGE] Judgement saved', {
    judgementId: judgement.id,
    articleId,
    playerId,
    score,
    verdict: finalVerdict,
  });

  try {
    await recalculateLeaderboard();
    const roomLeaderboard = await getRoomLeaderboard(room.roomId);
    emitToRoom(room.roomId, 'leaderboard:updated', {
      roomId: room.roomId,
      leaderboard: roomLeaderboard,
    });
    log('INFO', '[LEADERBOARD] Player updated after judging', { playerId, score });
  } catch (err) {
    log('ERROR', '[LEADERBOARD] Update failed after judging', { playerId, error: err.message });
  }

  return judgement;
}

function _isLatePublication(room, article) {
  if (!article.publishedAt || !room.scenarios) return false;

  const scenario = room.scenarios.find(s => s.scenarioId === article.scenarioId);
  if (!scenario || !scenario.investigationDeadline) return false;

  const publishedTime = new Date(article.publishedAt).getTime();
  const deadlineTime = new Date(scenario.investigationDeadline).getTime();

  return publishedTime > deadlineTime;
}

module.exports = { judgePublishedArticle };

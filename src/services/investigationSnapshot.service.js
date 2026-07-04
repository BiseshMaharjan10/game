const { prisma } = require('../config/prisma');
const { log } = require('../utils/logger');

async function storeSnapshot(articleId, playerId, scenarioId, context) {
  const snapshot = await prisma.investigationSnapshot.create({
    data: {
      articleId,
      playerId,
      scenarioId,
      headline: context.headline || '',
      anonymousTip: context.anonymousTip || '',
      backgroundNews: context.backgroundNews || [],
      discoveredEvidence: context.discoveredEvidence || [],
      witnessStatements: context.witnessStatements || [],
      generatedArticleBody: context.generatedArticleBody || null,
    },
  });

  log('INFO', '[SNAPSHOT] Investigation snapshot stored', {
    snapshotId: snapshot.id,
    articleId,
    playerId,
    scenarioId,
    evidenceCount: (context.discoveredEvidence || []).length,
    witnessCount: (context.witnessStatements || []).length,
  });

  return snapshot;
}

async function getSnapshotByArticleId(articleId) {
  const snapshot = await prisma.investigationSnapshot.findUnique({ where: { articleId } });
  if (!snapshot) return null;

  return {
    ...snapshot,
    backgroundNews: _parseJsonArray(snapshot.backgroundNews),
    discoveredEvidence: _parseJsonArray(snapshot.discoveredEvidence),
    witnessStatements: _parseJsonArray(snapshot.witnessStatements),
  };
}

function _parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

module.exports = { storeSnapshot, getSnapshotByArticleId };

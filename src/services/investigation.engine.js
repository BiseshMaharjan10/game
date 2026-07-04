const { log } = require('../utils/logger');

const BASE_DURATION_MS = 15000;
const MIN_DURATION_MS = 5000;
const RELIABILITY_VARIANCE = 0.15;
const MIN_RELIABILITY = 0.1;
const MAX_RELIABILITY = 1.0;
const MIN_DISCOVERY_CHANCE = 0.05;
const MAX_DISCOVERY_CHANCE = 0.95;

function _generateInvestigationId() {
  return 'inv_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function calculateDuration(speed) {
  const duration = BASE_DURATION_MS * (50 / Math.max(speed, 1));
  return Math.max(Math.round(duration), MIN_DURATION_MS);
}

function _calculateDiscoveryProbability(investigationStat, difficulty) {
  const raw = investigationStat / (investigationStat + difficulty * 2);
  return Math.max(MIN_DISCOVERY_CHANCE, Math.min(MAX_DISCOVERY_CHANCE, raw));
}

function _calculateReliability(ethics) {
  const base = ethics / 100;
  const variance = (Math.random() * 2 - 1) * RELIABILITY_VARIANCE;
  return Math.max(MIN_RELIABILITY, Math.min(MAX_RELIABILITY, base + variance));
}

function discoverEvidence(evidenceList, investigationStat, ethics, journalistId) {
  const discovered = [];
  for (const item of evidenceList) {
    const probability = _calculateDiscoveryProbability(investigationStat, item.difficulty);
    if (Math.random() < probability) {
      discovered.push({
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        difficulty: item.difficulty,
        reliability: parseFloat(_calculateReliability(ethics).toFixed(3)),
        discoveredBy: journalistId,
        discoveredAt: new Date().toISOString(),
      });
    }
  }
  return discovered;
}

function discoverWitnesses(witnessList, investigationStat, journalistId) {
  const discovered = [];
  for (const witness of witnessList) {
    const probability = _calculateDiscoveryProbability(investigationStat, 50);
    if (Math.random() < probability) {
      discovered.push({
        id: witness.id,
        type: witness.type,
        description: witness.description,
        discoveredBy: journalistId,
        discoveredAt: new Date().toISOString(),
      });
    }
  }
  return discovered;
}

function calculateConfidence(discoveredCount, totalCount) {
  if (totalCount === 0) return 0;
  return Math.round((discoveredCount / totalCount) * 100);
}

function createInvestigation(roomId, playerId, journalistId, scenarioId, stats) {
  const duration = calculateDuration(stats.speed);
  const now = Date.now();

  const investigation = {
    investigationId: _generateInvestigationId(),
    roomId,
    playerId,
    journalistId,
    scenarioId,
    startedAt: new Date(now).toISOString(),
    estimatedCompletionAt: new Date(now + duration).toISOString(),
    status: 'active',
  };

  log('INFO', '[INVESTIGATION] Started', {
    investigationId: investigation.investigationId,
    roomId,
    playerId,
    journalistId,
    scenarioId,
    durationMs: duration,
    estimatedCompletionAt: investigation.estimatedCompletionAt,
    stats,
  });

  return { investigation, duration };
}

function completeInvestigation(investigation, scenario, stats) {
  const discoveredEvidence = discoverEvidence(
    scenario.evidence || [],
    stats.investigation,
    stats.ethics,
    investigation.journalistId
  );

  const discoveredWitnesses = discoverWitnesses(
    scenario.witnesses || [],
    stats.investigation,
    investigation.journalistId
  );

  const totalItems = (scenario.evidence || []).length + (scenario.witnesses || []).length;
  const foundItems = discoveredEvidence.length + discoveredWitnesses.length;
  const confidenceScore = calculateConfidence(foundItems, totalItems);

  const result = {
    investigationId: investigation.investigationId,
    roomId: investigation.roomId,
    playerId: investigation.playerId,
    journalistId: investigation.journalistId,
    scenarioId: investigation.scenarioId,
    startedAt: investigation.startedAt,
    completedAt: new Date().toISOString(),
    discoveredEvidence,
    discoveredWitnesses,
    confidenceScore,
  };

  log('INFO', '[INVESTIGATION] Completed', {
    investigationId: result.investigationId,
    roomId: result.roomId,
    playerId: result.playerId,
    journalistId: result.journalistId,
    scenarioId: result.scenarioId,
    evidenceFound: discoveredEvidence.length,
    witnessesFound: discoveredWitnesses.length,
    confidenceScore,
  });

  return result;
}

module.exports = {
  createInvestigation,
  completeInvestigation,
  calculateDuration,
  discoverEvidence,
  discoverWitnesses,
  calculateConfidence,
};

const { log } = require('../utils/logger');
const { getRoom } = require('./room.manager');
const { generateScenario } = require('./scenario.engine');
const { generateBackgroundNews } = require('./backgroundNews.service');
const { GAMEPLAY } = require('../config/gameplay');
const { getRoomLeaderboard } = require('./leaderboard.service');
const { judgementRepository } = require('../modules/judgement/judgement.repository');
const { playerRepository } = require('../modules/auth/auth.repository');
const { emitToRoom } = require('../websocket/wsServer');

const matchTimers = new Map();

function _initTimerStore(roomId) {
  if (!matchTimers.has(roomId)) {
    matchTimers.set(roomId, []);
  }
}

function _registerTimer(roomId, timer) {
  _initTimerStore(roomId);
  matchTimers.get(roomId).push(timer);
}

function _clearAllTimers(roomId) {
  const timers = matchTimers.get(roomId);
  if (timers) {
    for (const t of timers) {
      clearTimeout(t);
    }
    matchTimers.delete(roomId);
  }
}

function _getCountdownInterval(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;

  const remainingMs = room.matchCountdownStartedAt
    ? Math.max(0, GAMEPLAY.COUNTDOWN_DURATION_MS - (Date.now() - room.matchCountdownStartedAt))
    : 0;

  return { remainingMs, startedAt: room.matchCountdownStartedAt };
}

function getCountdownRemaining(roomId) {
  const result = _getCountdownInterval(roomId);
  return result ? result.remainingMs : null;
}


function startCountdown(roomId) {
  const room = getRoom(roomId);
  if (!room) return;
  if (room.matchStatus !== 'idle') return;

  room.matchStatus = 'countdown';
  room.matchCountdownStartedAt = Date.now();

  let remainingMs = GAMEPLAY.COUNTDOWN_DURATION_MS;

  const countdownTimer = setInterval(() => {
    remainingMs -= 1000;
    if (remainingMs <= 0) {
      clearInterval(countdownTimer);
      emitToRoom(roomId, 'match:countdown', { remainingMs: 0 });
      startMatch(roomId);
      return;
    }
    emitToRoom(roomId, 'match:countdown', { remainingMs });
  }, 1000);

  _registerTimer(roomId, countdownTimer);

  emitToRoom(roomId, 'match:countdown', { remainingMs });

  log('INFO', '[MATCH] Countdown started', { roomId, durationMs: GAMEPLAY.COUNTDOWN_DURATION_MS });
}


function cancelCountdown(roomId) {
  const room = getRoom(roomId);
  if (!room || room.matchStatus !== 'countdown') return;

  room.matchStatus = 'idle';
  room.matchCountdownStartedAt = null;

  emitToRoom(roomId, 'match:countdown_cancelled', { roomId });

  log('INFO', '[MATCH] Countdown cancelled', { roomId });
}


function _calculateSpawnDelays() {
  const delays = [];
  for (let i = 0; i < GAMEPLAY.SCENARIO_COUNT; i++) {
    delays.push(GAMEPLAY.FIRST_SCENARIO_DELAY_MS + i * GAMEPLAY.SCENARIO_INTERVAL_MS);
  }
  return delays;
}

function _scheduleScenarioSpawns(roomId) {
  const delays = _calculateSpawnDelays();
  for (let i = 0; i < delays.length; i++) {
    const timer = setTimeout(() => {
      _spawnScenario(roomId, i + 1);
    }, delays[i]);
    _registerTimer(roomId, timer);
  }
}

function _spawnScenario(roomId, scenarioNumber) {
  const room = getRoom(roomId);
  if (!room || room.matchStatus !== 'running') return;

  const scenario = generateScenario(roomId);
  const scenarioId = scenario.scenarioId;
  const now = Date.now();

  const backgroundNews = generateBackgroundNews(scenario.templateId, _extractVars(scenario));

  const lifecycle = {
    investigationDeadline: new Date(now + GAMEPLAY.INVESTIGATION_WINDOW_MS).toISOString(),
    publicationDeadline: new Date(now + GAMEPLAY.INVESTIGATION_WINDOW_MS + GAMEPLAY.PUBLICATION_GRACE_MS).toISOString(),
    expiredAt: new Date(now + GAMEPLAY.INVESTIGATION_WINDOW_MS + GAMEPLAY.PUBLICATION_GRACE_MS).toISOString(),
    backgroundNews,
    spawnedAt: new Date(now).toISOString(),
    scenarioNumber,
  };

  const enhancedScenario = {
    ...scenario,
    ...lifecycle,
    status: 'ACTIVE',
  };

  room.scenarios.push(enhancedScenario);

  emitToRoom(roomId, 'scenario:created', {
    scenarioId,
    scenarioNumber,
    category: scenario.category,
    anonymousTip: scenario.anonymousTip,
    status: 'ACTIVE',
    investigationDeadline: lifecycle.investigationDeadline,
    publicationDeadline: lifecycle.publicationDeadline,
    expiredAt: lifecycle.expiredAt,
    spawnedAt: lifecycle.spawnedAt,
  });

  emitToRoom(roomId, 'activity:message', {
    type: 'scenario_spawned',
    scenarioId,
    scenarioNumber,
    category: scenario.category,
    message: `New tip #${scenarioNumber} arrived — ${scenario.anonymousTip || 'Check your leads'}`,
    roomId,
  });

  log('INFO', '[MATCH] Scenario #' + scenarioNumber + ' spawned', {
    roomId,
    scenarioId,
    category: scenario.category,
    templateId: scenario.templateId,
    investigationDeadline: lifecycle.investigationDeadline,
    publicationDeadline: lifecycle.publicationDeadline,
    backgroundNewsCount: backgroundNews.length,
  });

  _scheduleInvestigationDeadline(roomId, scenarioId, scenarioNumber);
  _schedulePublicationDeadline(roomId, scenarioId, scenarioNumber);
}

function _extractVars(scenario) {
  return scenario.templateVars ? { ...scenario.templateVars } : {};
}

function _scheduleInvestigationDeadline(roomId, scenarioId, scenarioNumber) {
  const timer = setTimeout(() => {
    const room = getRoom(roomId);
    if (!room || room.matchStatus !== 'running') return;
    const scenario = room.scenarios.find(s => s.scenarioId === scenarioId);
    if (!scenario || scenario.status !== 'ACTIVE') return;

    scenario.status = 'PUBLICATION_OPEN';

    log('INFO', '[SCENARIO] Investigation deadline reached', {
      roomId,
      scenarioId,
      scenarioNumber,
      status: scenario.status,
    });

    emitToRoom(roomId, 'scenario:active', {
      scenarioId,
      scenarioNumber,
      status: scenario.status,
    });
  }, GAMEPLAY.INVESTIGATION_WINDOW_MS);

  _registerTimer(roomId, timer);
}

function _schedulePublicationDeadline(roomId, scenarioId, scenarioNumber) {
  const totalDelay = GAMEPLAY.INVESTIGATION_WINDOW_MS + GAMEPLAY.PUBLICATION_GRACE_MS;

  const timer = setTimeout(() => {
    const room = getRoom(roomId);
    if (!room || room.matchStatus !== 'running') return;
    const scenario = room.scenarios.find(s => s.scenarioId === scenarioId);
    if (!scenario || scenario.status === 'EXPIRED' || scenario.status === 'RESOLVED') return;

    scenario.status = 'EXPIRED';

    log('INFO', '[SCENARIO] Publication deadline reached', {
      roomId,
      scenarioId,
      scenarioNumber,
      status: scenario.status,
    });

    emitToRoom(roomId, 'scenario:expired', {
      scenarioId,
      scenarioNumber,
      status: scenario.status,
    });
  }, totalDelay);

  _registerTimer(roomId, timer);
}

function startMatch(roomId) {
  const room = getRoom(roomId);
  if (!room) {
    log('WARN', '[MATCH] Cannot start - room not found', { roomId });
    return;
  }

  if (room.matchStatus === 'running') {
    log('WARN', '[MATCH] Cannot start - match already running', { roomId });
    return;
  }

  room.matchStatus = 'running';
  room.matchStartedAt = new Date().toISOString();
  room.matchEndsAt = new Date(Date.now() + GAMEPLAY.MATCH_DURATION_MS).toISOString();
  room.scenarios = [];
  room.activeInvestigations = [];
  room.completedInvestigations = [];

  emitToRoom(roomId, 'match:started', {
    roomId,
    startedAt: room.matchStartedAt,
    endsAt: room.matchEndsAt,
  });

  log('INFO', '[MATCH] Started', {
    roomId,
    durationMs: GAMEPLAY.MATCH_DURATION_MS,
    scenariosCount: GAMEPLAY.SCENARIO_COUNT,
    matchEndsAt: room.matchEndsAt,
  });

  _scheduleScenarioSpawns(roomId);

  const endTimer = setTimeout(async () => {
    await endMatch(roomId);
  }, GAMEPLAY.MATCH_DURATION_MS);
  _registerTimer(roomId, endTimer);
}

async function endMatch(roomId) {
  const room = getRoom(roomId);
  if (!room) {
    log('WARN', '[MATCH] Cannot end - room not found', { roomId });
    return;
  }

  _clearAllTimers(roomId);

  for (const scenario of room.scenarios) {
    if (scenario.status !== 'EXPIRED') {
      scenario.status = 'RESOLVED';
    }
  }

  try {
    const leaderboard = await getRoomLeaderboard(roomId);

    const winner = leaderboard.length > 0 ? leaderboard[0] : null;

    const playerIds = leaderboard.map(e => e.playerId);
    const players = await Promise.all(
      playerIds.map(id => playerRepository.findById(id))
    );

    let fastestPublisher = null;
    let mostAccuratePlayer = null;
    let mostMisleadingPlayer = null;
    let highestAccuracy = -Infinity;
    let lowestAccuracy = Infinity;

    for (const entry of leaderboard) {
      const player = players.find(p => p && p.id === entry.playerId);
      const playerName = player?.companyName || player?.email || entry.playerId;

      if (entry.articleCount > 0) {
        if (entry.averageScore > highestAccuracy) {
          highestAccuracy = entry.averageScore;
          mostAccuratePlayer = playerName;
        }
        if (entry.averageScore < lowestAccuracy) {
          lowestAccuracy = entry.averageScore;
          mostMisleadingPlayer = playerName;
        }
      }
    }

    const publishedArticles = await judgementRepository.findByRoomId(roomId);
    if (publishedArticles.length > 0) {
      const sortedByTime = [...publishedArticles].sort(
        (a, b) => new Date(a.judgedAt).getTime() - new Date(b.judgedAt).getTime()
      );
      const firstArticle = sortedByTime[0];
      if (firstArticle) {
        const firstPlayer = players.find(p => p && p.id === firstArticle.playerId);
        fastestPublisher = firstPlayer?.companyName || firstPlayer?.email || firstArticle.playerId;
      }
    }

    const summary = {
      roomId,
      matchEndedAt: new Date().toISOString(),
      totalScenarios: room.scenarios.length,
      totalArticlesJudged: publishedArticles.length,
      winner: winner ? {
        playerId: winner.playerId,
        totalScore: winner.totalScore,
      } : null,
      mostAccurate: mostAccuratePlayer,
      mostMisleading: mostMisleadingPlayer,
      fastestPublisher,
      leaderboard,
    };

    room.matchSummary = summary;
    room.matchStatus = 'ended';

    emitToRoom(roomId, 'match:ended', {
      roomId,
      summary,
    });

    log('INFO', '[MATCH] Finished with summary', {
      roomId,
      totalScenarios: room.scenarios.length,
      totalArticlesJudged: publishedArticles.length,
      winner: winner ? winner.playerId : null,
    });
  } catch (err) {
    log('ERROR', '[MATCH] Error computing match summary', {
      roomId,
      error: err.message,
    });
    room.matchStatus = 'ended';
  }
}

function getMatchState(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;

  const now = Date.now();
  const matchStarted = room.matchStartedAt ? new Date(room.matchStartedAt).getTime() : null;
  const matchEnd = room.matchEndsAt ? new Date(room.matchEndsAt).getTime() : null;

  const scenarios = room.scenarios.map(s => {
    const invDeadline = new Date(s.investigationDeadline).getTime();
    const pubDeadline = new Date(s.publicationDeadline).getTime();

    return {
      scenarioId: s.scenarioId,
      scenarioNumber: s.scenarioNumber,
      category: s.category,
      anonymousTip: s.anonymousTip,
      backgroundNews: s.backgroundNews,
      status: s.status,
      spawnedAt: s.spawnedAt,
      investigationDeadline: s.investigationDeadline,
      publicationDeadline: s.publicationDeadline,
      expiredAt: s.expiredAt,
      timeRemaining: {
        investigation: Math.max(0, invDeadline - now),
        publication: Math.max(0, pubDeadline - now),
      },
    };
  });

  const result = {
    status: room.matchStatus,
    startedAt: room.matchStartedAt,
    endsAt: room.matchEndsAt,
    remainingTime: matchEnd ? Math.max(0, matchEnd - now) : 0,
    scenarios,
  };

  if (room.matchStatus === 'ended' && room.matchSummary) {
    result.summary = room.matchSummary;
  }

  return result;
}

function forceSpawnScenario(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;
  const nextNumber = room.scenarios.length + 1;
  _spawnScenario(roomId, nextNumber);
  return nextNumber;
}

function expireScenarioById(roomId, scenarioId) {
  const room = getRoom(roomId);
  if (!room) return false;
  const scenario = room.scenarios.find(s => s.scenarioId === scenarioId);
  if (!scenario || scenario.status === 'EXPIRED' || scenario.status === 'RESOLVED') return false;
  scenario.status = 'EXPIRED';
  emitToRoom(roomId, 'scenario:expired', {
    scenarioId,
    scenarioNumber: scenario.scenarioNumber,
    status: 'EXPIRED',
  });
  return true;
}

function resetMatchTimer(roomId, remainingMs) {
  const room = getRoom(roomId);
  if (!room) return;
  _initTimerStore(roomId);
  _clearAllTimers(roomId);
  room.matchEndsAt = new Date(Date.now() + remainingMs).toISOString();
  const endTimer = setTimeout(async () => {
    await endMatch(roomId);
  }, remainingMs);
  _registerTimer(roomId, endTimer);
}

function changeScenarioTime(roomId, scenarioId, remainingMs) {
  const room = getRoom(roomId);
  if (!room) return false;
  const scenario = room.scenarios.find(s => s.scenarioId === scenarioId);
  if (!scenario) return false;
  const now = Date.now();
  scenario.investigationDeadline = new Date(now + remainingMs).toISOString();
  scenario.publicationDeadline = new Date(now + remainingMs + GAMEPLAY.PUBLICATION_GRACE_MS).toISOString();
  return true;
}

module.exports = {
  startMatch,
  endMatch,
  getMatchState,
  startCountdown,
  cancelCountdown,
  getCountdownRemaining,
  forceSpawnScenario,
  expireScenarioById,
  resetMatchTimer,
  changeScenarioTime,
};

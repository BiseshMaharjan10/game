const { AppError } = require('../utils/appError');
const { calculateCompanyValue } = require('../utils/gameMath');
const { companyRepository } = require('../modules/company/company.repository');
const { ensureCompany } = require('./company.service');
const { eventRepository } = require('../modules/events/events.repository');
const { playerRepository } = require('../modules/auth/auth.repository');
const { recalculateLeaderboard } = require('./leaderboard.service');
const { emitEvent } = require('../sockets/hub');

async function listEvents() {
  return eventRepository.list();
}

async function getPlayerEventHistory(playerId) {
  return eventRepository.listPlayerEvents(playerId);
}

async function acceptEvent(playerId, eventId) {
  const company = await ensureCompany(playerId);

  const event = await eventRepository.findById(eventId);
  if (!event) {
    throw new AppError('event not found', 404);
  }

  const assignment = await eventRepository.createAssignment({
    playerId,
    companyId: company.id,
    eventId,
    status: 'accepted',
    progress: 0
  });

  emitEvent('event_created', event);
  return assignment;
}

async function completeEvent(playerId, eventId, success = true) {
  const assignment = await eventRepository.findAssignment(playerId, eventId);
  if (!assignment) {
    throw new AppError('event participation not found', 404);
  }

  const company = await ensureCompany(playerId);
  const player = await playerRepository.findById(playerId);
  const event = assignment.event;
  const moneyDelta = success ? event.reward : -Math.floor(event.reward / 2);
  const trustDelta = success ? Math.max(1, Math.floor(event.difficulty / 2)) : -event.risk;
  const subscriberDelta = success ? event.difficulty * 2 : -event.risk * 2;
  const nextMoney = Math.max(0, player.coins + moneyDelta);
  const nextTrustScore = Math.max(0, Math.min(100, player.trustScore + trustDelta));
  const nextSubscribers = Math.max(0, player.gems + subscriberDelta);
  const nextCompanyValue = calculateCompanyValue({
    money: nextMoney,
    trustScore: nextTrustScore,
    subscribers: nextSubscribers,
    level: company.level
  });

  await playerRepository.update(playerId, {
    coins: nextMoney,
    trustScore: nextTrustScore,
    gems: nextSubscribers,
    companyValue: nextCompanyValue
  });

  await eventRepository.updateAssignment(assignment.id, {
    status: success ? 'completed' : 'failed',
    progress: 100
  });

  await recalculateLeaderboard();
  emitEvent('coins_updated', { playerId, coins: nextMoney });
  emitEvent('trust_updated', { playerId, trustScore: nextTrustScore });
  emitEvent('gems_updated', { playerId, gems: nextSubscribers });

  return {
    participation: assignment,
    outcome: { moneyDelta, trustDelta, subscriberDelta }
  };
}

module.exports = { listEvents, getPlayerEventHistory, acceptEvent, completeEvent };

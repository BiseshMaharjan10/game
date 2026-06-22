const { AppError } = require('../utils/appError');
const { calculateCompanyValue } = require('../utils/gameMath');
const { companyRepository } = require('../modules/company/company.repository');
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
  const company = await companyRepository.findByOwnerId(playerId);
  if (!company) {
    throw new AppError('company not found', 404);
  }

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

  const company = await companyRepository.findByOwnerId(playerId);
  const player = await playerRepository.findById(playerId);
  const event = assignment.event;
  const moneyDelta = success ? event.reward : -Math.floor(event.reward / 2);
  const trustDelta = success ? Math.max(1, Math.floor(event.difficulty / 2)) : -event.risk;
  const subscriberDelta = success ? event.difficulty * 2 : -event.risk * 2;
  const nextMoney = Math.max(0, player.money + moneyDelta);
  const nextTrustScore = Math.max(0, Math.min(100, player.trustScore + trustDelta));
  const nextSubscribers = Math.max(0, player.subscribers + subscriberDelta);
  const nextCompanyValue = calculateCompanyValue({
    money: nextMoney,
    trustScore: nextTrustScore,
    subscribers: nextSubscribers,
    level: company.level
  });

  await playerRepository.update(playerId, {
    money: nextMoney,
    trustScore: nextTrustScore,
    subscribers: nextSubscribers,
    companyValue: nextCompanyValue
  });

  await eventRepository.updateAssignment(assignment.id, {
    status: success ? 'completed' : 'failed',
    progress: 100
  });

  await recalculateLeaderboard();
  emitEvent('money_updated', { playerId, money: nextMoney });
  emitEvent('trust_updated', { playerId, trustScore: nextTrustScore });
  emitEvent('subscriber_updated', { playerId, subscribers: nextSubscribers });

  return {
    participation: assignment,
    outcome: { moneyDelta, trustDelta, subscriberDelta }
  };
}

module.exports = { listEvents, getPlayerEventHistory, acceptEvent, completeEvent };

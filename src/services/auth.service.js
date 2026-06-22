const { randomUUID } = require('crypto');
const { AppError } = require('../utils/appError');
const { durationToMs } = require('../utils/time');
const { hashPassword, comparePassword } = require('../utils/password');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sha256 } = require('../utils/hash');
const { playerRepository, authSessionRepository } = require('../modules/auth/auth.repository');
const { recalculateLeaderboard } = require('./leaderboard.service');

function toPlayerDto(player) {
  return {
    id: player.id,
    username: player.username,
    email: player.email,
    money: player.money,
    trustScore: player.trustScore,
    subscribers: player.subscribers,
    companyValue: player.companyValue,
    createdAt: player.createdAt,
    updatedAt: player.updatedAt
  };
}

function createAccessTokenPayload(player, sessionId) {
  return {
    sub: player.id,
    username: player.username,
    email: player.email,
    sid: sessionId
  };
}

async function createSession(player, sessionId) {
  const refreshToken = signRefreshToken(createAccessTokenPayload(player, sessionId));
  const refreshTokenHash = sha256(refreshToken);
  const expiresAt = new Date(Date.now() + durationToMs(process.env.JWT_REFRESH_EXPIRES_IN || '7d'));

  await authSessionRepository.create({
    id: sessionId,
    playerId: player.id,
    refreshTokenHash,
    expiresAt
  });

  return refreshToken;
}

async function register({ username, email, password }) {
  const existing = await playerRepository.findByEmailOrUsername(username) || await playerRepository.findByEmailOrUsername(email);
  if (existing) {
    throw new AppError('username or email already exists', 409);
  }

  const passwordHash = await hashPassword(password);
  const player = await playerRepository.create({ username, email, passwordHash });
  const sessionId = randomUUID();
  const refreshToken = await createSession(player, sessionId);
  const accessToken = signAccessToken(createAccessTokenPayload(player, sessionId));

  await recalculateLeaderboard();

  return {
    player: toPlayerDto(player),
    accessToken,
    refreshToken
  };
}

async function login({ identity, password }) {
  const player = await playerRepository.findByEmailOrUsername(identity);
  if (!player) {
    throw new AppError('invalid credentials', 401);
  }

  const matches = await comparePassword(password, player.passwordHash);
  if (!matches) {
    throw new AppError('invalid credentials', 401);
  }

  const sessionId = randomUUID();
  const refreshToken = await createSession(player, sessionId);
  const accessToken = signAccessToken(createAccessTokenPayload(player, sessionId));

  return {
    player: toPlayerDto(player),
    accessToken,
    refreshToken
  };
}

async function refresh({ refreshToken }) {
  const payload = verifyRefreshToken(refreshToken);
  const session = await authSessionRepository.findByTokenHash(sha256(refreshToken));

  if (!session || session.revokedAt || session.id !== payload.sid) {
    throw new AppError('invalid session', 401);
  }

  const player = await playerRepository.findById(payload.sub);
  if (!player) {
    throw new AppError('invalid session', 401);
  }

  const accessToken = signAccessToken(createAccessTokenPayload(player, payload.sid));
  return {
    player: toPlayerDto(player),
    accessToken,
    refreshToken
  };
}

async function logout({ refreshToken }) {
  if (!refreshToken) {
    return { ok: true };
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    await authSessionRepository.revoke(payload.sid);
  } catch (_error) {
    // logout should be idempotent
  }

  return { ok: true };
}

module.exports = {
  register,
  login,
  refresh,
  logout
};

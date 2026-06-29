const bcrypt = require('bcryptjs');
const { AppError } = require('../utils/appError');
const { playerRepository } = require('../modules/auth/auth.repository');
const { companyRepository } = require('../modules/company/company.repository');
const { recalculateLeaderboard } = require('./leaderboard.service');
const { signAccessToken, signRefreshToken } = require('../config/jwt');

const SALT_ROUNDS = 10;

function toPlayerDto(player) {
  return {
    id: player.id,
    firebaseUid: player.firebaseUid,
    username: player.username,
    email: player.email,
    displayName: player.displayName,
    profilePicture: player.profilePicture,
    money: player.money,
    trustScore: player.trustScore,
    subscribers: player.subscribers,
    companyValue: player.companyValue,
    createdAt: player.createdAt,
    updatedAt: player.updatedAt,
  };
}

async function register({ email, password, company_name }) {
  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const existing = await playerRepository.findByEmail(email);
  if (existing) {
    throw new AppError('A player with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const player = await playerRepository.create({
    email,
    passwordHash,
    displayName: email.split('@')[0],
  });

  let company = null;
  if (company_name) {
    company = await companyRepository.create({
      ownerId: player.id,
      name: company_name,
      level: 1,
      reputation: 50,
    });
  }

  await recalculateLeaderboard();

  const accessToken = signAccessToken({ id: player.id, email: player.email });
  const refreshToken = signRefreshToken({ id: player.id, email: player.email });

  return {
    player: toPlayerDto(player),
    company,
    access_token: accessToken,
    refresh_token: refreshToken,
  };
}

async function login({ email, password }) {
  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const player = await playerRepository.findByEmail(email);
  if (!player) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!player.passwordHash) {
    throw new AppError('This account uses Google Sign-In. Please sign in with Google.', 401);
  }

  const valid = await bcrypt.compare(password, player.passwordHash);
  if (!valid) {
    throw new AppError('Invalid email or password', 401);
  }

  let company = null;
  if (player.company) {
    company = player.company;
  }

  const accessToken = signAccessToken({ id: player.id, email: player.email });
  const refreshToken = signRefreshToken({ id: player.id, email: player.email });

  return {
    player: toPlayerDto(player),
    company,
    access_token: accessToken,
    refresh_token: refreshToken,
  };
}

async function refreshTokens(refreshToken) {
  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400);
  }

  const { verifyRefreshToken } = require('../config/jwt');
  const decoded = verifyRefreshToken(refreshToken);

  const player = await playerRepository.findById(decoded.id);
  if (!player) {
    throw new AppError('Player not found', 401);
  }

  const accessToken = signAccessToken({ id: player.id, email: player.email });
  const newRefreshToken = signRefreshToken({ id: player.id, email: player.email });

  return {
    access_token: accessToken,
    refresh_token: newRefreshToken,
  };
}

module.exports = {
  register,
  login,
  refreshTokens,
};

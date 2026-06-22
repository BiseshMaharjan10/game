const jwt = require('jsonwebtoken');
const { getJwtConfig } = require('../config/jwt');

function signAccessToken(payload) {
  const { accessSecret, accessExpiresIn } = getJwtConfig();
  return jwt.sign(payload, accessSecret, { expiresIn: accessExpiresIn });
}

function signRefreshToken(payload) {
  const { refreshSecret, refreshExpiresIn } = getJwtConfig();
  return jwt.sign(payload, refreshSecret, { expiresIn: refreshExpiresIn });
}

function verifyAccessToken(token) {
  const { accessSecret } = getJwtConfig();
  return jwt.verify(token, accessSecret);
}

function verifyRefreshToken(token) {
  const { refreshSecret } = getJwtConfig();
  return jwt.verify(token, refreshSecret);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
const { AppError } = require('../utils/appError');
const { prisma } = require('../config/prisma');
const { verifyAccessToken } = require('../config/jwt');

async function authRequired(req, res, next) {
  const _t0 = Date.now();
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    const decoded = verifyAccessToken(token);
    const _t_verify = Date.now();

    const player = await prisma.player.findUnique({
      where: { id: decoded.id },
      include: { company: true },
    });
    const _t_db = Date.now();

    if (!player) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = player;
    req.auth = decoded;

    console.log(`[TIMING] Auth JWT verify: ${_t_verify - _t0} ms`);
    console.log(`[TIMING] Auth DB query: ${_t_db - _t_verify} ms`);
    console.log(`[TIMING] Auth total: ${Date.now() - _t0} ms`);

    return next();
  } catch (error) {
    return res.status(401).json({ error: error.message || 'Invalid or expired token' });
  }
}

module.exports = { authRequired, AppError };

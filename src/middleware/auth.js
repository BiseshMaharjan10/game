const { verifyAccessToken } = require('../utils/jwt');
const { AppError } = require('../utils/appError');
const { prisma } = require('../config/prisma');

async function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing access token' });
  }

  try {
    const payload = verifyAccessToken(token);
    const player = await prisma.player.findUnique({
      where: { id: payload.sub },
      include: { company: true }
    });

    if (!player) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = player;
    req.auth = payload;
    return next();
  } catch (_error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authRequired, AppError };

const { AppError } = require('../utils/appError');
const { prisma } = require('../config/prisma');
const { verifyAccessToken } = require('../config/jwt');

async function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    const decoded = verifyAccessToken(token);

    const player = await prisma.player.findUnique({
      where: { id: decoded.id },
      include: { company: true },
    });

    if (!player) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = player;
    req.auth = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ error: error.message || 'Invalid or expired token' });
  }
}

module.exports = { authRequired, AppError };

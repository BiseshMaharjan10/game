const { AppError } = require('../utils/appError');
const { prisma } = require('../config/prisma');
const { verifyFirebaseToken } = require('../config/firebase');

async function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!idToken) {
    return res.status(401).json({ error: 'Missing Firebase ID token' });
  }

  try {
    const decodedToken = await verifyFirebaseToken(idToken);

    const player = await prisma.player.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: { company: true }
    });

    if (!player) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = player;
    req.auth = decodedToken;
    return next();
  } catch (error) {
    return res.status(401).json({ error: error.message || 'Invalid or expired Firebase token' });
  }
}

module.exports = { authRequired, AppError };

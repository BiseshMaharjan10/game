const { AppError } = require('../utils/appError');
const { playerRepository } = require('../modules/auth/auth.repository');
const { recalculateLeaderboard } = require('./leaderboard.service');
const { verifyFirebaseToken } = require('../config/firebase');

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
    updatedAt: player.updatedAt
  };
}

async function googleSignIn({ idToken }) {
  if (!idToken) {
    throw new AppError('ID Token is required', 400);
  }

  const decodedToken = await verifyFirebaseToken(idToken);
  const { uid, email, name, picture } = decodedToken;

  if (!uid) {
    throw new AppError('Invalid Firebase ID token', 401);
  }

  if (!email) {
    throw new AppError('Firebase user email is required', 400);
  }

  let player = await playerRepository.findByFirebaseUid(uid);

  if (!player) {
    player = await playerRepository.findByEmail(email);
    if (player) {
      player = await playerRepository.update(player.id, {
        firebaseUid: uid,
        displayName: name || player.displayName,
        profilePicture: picture || player.profilePicture
      });
    }
  }

  if (!player) {
    player = await playerRepository.create({
      firebaseUid: uid,
      email,
      displayName: name || '',
      profilePicture: picture || ''
    });

    await recalculateLeaderboard();
  }

  return {
    player: toPlayerDto(player)
  };
}

module.exports = {
  googleSignIn
};

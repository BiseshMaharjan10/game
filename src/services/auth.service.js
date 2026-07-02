const bcrypt = require("bcryptjs");
const { AppError } = require("../utils/appError");
const { playerRepository } = require("../modules/auth/auth.repository");
const { deskRepository } = require("../modules/desks/desks.repository");
const { companyRepository } = require("../modules/company/company.repository");
const { recalculateLeaderboard } = require("./leaderboard.service");
const { ensureCompany } = require("./company.service");
const { signAccessToken, signRefreshToken } = require("../config/jwt");
const { verifyFirebaseToken } = require("../config/firebase");

const SALT_ROUNDS = 10;
const MAX_COMPANY_NAME_LENGTH = 40;

function toPlayerDto(player) {
  return {
    id: player.id,
    firebaseUid: player.firebaseUid,
    companyName: player.companyName,
    email: player.email,
    displayName: player.displayName,
    profilePicture: player.profilePicture,
    money: player.coins,
    trustScore: player.trustScore,
    subscribers: player.gems,
    companyValue: player.companyValue,
    createdAt: player.createdAt,
    updatedAt: player.updatedAt,
  };
}

function issueLocalAuthTokens(player) {
  const accessToken = signAccessToken({ id: player.id, email: player.email });
  const refreshToken = signRefreshToken({ id: player.id, email: player.email });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
  };
}

function normalizeGoogleProfileValue(value) {
  return value ? String(value).trim() : null;
}

function shouldReplaceDisplayName(existingValue, nextValue, email) {
  if (!nextValue) {
    return false;
  }

  if (!existingValue) {
    return true;
  }

  const emailLocalPart = email ? String(email).split("@")[0] : null;
  return existingValue === emailLocalPart;
}

function buildGoogleIdentityPayload({
  firebaseUid,
  email,
  displayName,
  photoURL,
}) {
  return {
    firebaseUid: normalizeGoogleProfileValue(firebaseUid),
    email: normalizeGoogleProfileValue(email),
    displayName: normalizeGoogleProfileValue(displayName),
    photoURL: normalizeGoogleProfileValue(photoURL),
  };
}

async function resolveGooglePlayer({
  firebaseUid,
  email,
  displayName,
  photoURL,
}) {
  const identity = buildGoogleIdentityPayload({
    firebaseUid,
    email,
    displayName,
    photoURL,
  });

  if (!identity.firebaseUid || !identity.email) {
    throw new AppError("Google account payload is incomplete", 400);
  }

  const playerByFirebaseUid = await playerRepository.findByFirebaseUid(
    identity.firebaseUid,
  );
  const playerByEmail = await playerRepository.findByEmail(identity.email);

  if (
    playerByFirebaseUid &&
    playerByEmail &&
    playerByFirebaseUid.id !== playerByEmail.id
  ) {
    throw new AppError("Google account already linked", 409);
  }

  let player = playerByFirebaseUid || playerByEmail;

  if (player) {
    if (player.firebaseUid && player.firebaseUid !== identity.firebaseUid) {
      throw new AppError("Google account already linked", 409);
    }

    const updates = {};

    if (!player.firebaseUid) {
      updates.firebaseUid = identity.firebaseUid;
    }

    if (player.email !== identity.email) {
      updates.email = identity.email;
    }

    if (
      shouldReplaceDisplayName(
        player.displayName,
        identity.displayName,
        player.email,
      )
    ) {
      updates.displayName = identity.displayName;
    }

    if (identity.photoURL && !player.profilePicture) {
      updates.profilePicture = identity.photoURL;
    }

    if (Object.keys(updates).length) {
      player = await playerRepository.update(player.id, updates);
    }

    await ensureCompany(player.id);

    return player;
  }

  const newPlayer = await playerRepository.create({
    firebaseUid: identity.firebaseUid,
    email: identity.email,
    companyName: null,
    displayName: identity.displayName,
    profilePicture: identity.photoURL,
  });

  await deskRepository.initializeForPlayer(newPlayer.id);

  await companyRepository.create({
    ownerId: newPlayer.id,
    name: "",
    level: 1,
    reputation: 50,
  });

  return newPlayer;
}

async function register({ email, password, companyName }) {
	if (!email || !password) {
		throw new AppError("Email and password are required", 400);
	}

	const existing = await playerRepository.findByEmail(email);
	if (existing) {
		throw new AppError("A player with this email already exists", 409);
	}

	const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

	const player = await playerRepository.create({
		email,
		passwordHash,
		companyName: companyName ? String(companyName).trim() : null,
		displayName: email.split("@")[0],
	});

  await deskRepository.initializeForPlayer(player.id);

  const company = await companyRepository.create({
    ownerId: player.id,
    name: player.companyName || "",
    level: 1,
    reputation: 50,
  });

  await recalculateLeaderboard();

  const tokens = issueLocalAuthTokens(player);

  return {
    player: toPlayerDto(player),
    company,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  };
}

async function login({ email, password }) {
  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const player = await playerRepository.findByEmail(email);
  if (!player) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!player.passwordHash) {
    throw new AppError(
      "This account uses Google Sign-In. Please sign in with Google.",
      401,
    );
  }

  const valid = await bcrypt.compare(password, player.passwordHash);
  if (!valid) {
    throw new AppError("Invalid email or password", 401);
  }

  let company = player.company;
  if (!company) {
    company = await ensureCompany(player.id);
  }

  const tokens = issueLocalAuthTokens(player);

  return {
    player: toPlayerDto(player),
    company,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  };
}

async function refreshTokens(refreshToken) {
  if (!refreshToken) {
    throw new AppError("Refresh token is required", 400);
  }

  const { verifyRefreshToken } = require("../config/jwt");
  const decoded = verifyRefreshToken(refreshToken);

  const player = await playerRepository.findById(decoded.id);
  if (!player) {
    throw new AppError("Player not found", 401);
  }

  const tokens = issueLocalAuthTokens(player);

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  };
}

async function setCompanyName(playerId, companyName) {
  if (!companyName || !String(companyName).trim()) {
    throw new AppError("Company name is required", 400);
  }

  const trimmed = String(companyName).trim();

  if (trimmed.length > MAX_COMPANY_NAME_LENGTH) {
    throw new AppError(
      `Company name must be at most ${MAX_COMPANY_NAME_LENGTH} characters`,
      400,
    );
  }

  const player = await playerRepository.findById(playerId);
  if (!player) {
    throw new AppError("Player not found", 404);
  }

  if (player.companyName) {
    throw new AppError("Company name already set", 409);
  }

  const updated = await playerRepository.update(playerId, {
    companyName: trimmed,
  });

  return toPlayerDto(updated);
}

async function googleAuth({ idToken }) {
  if (!idToken) {
    throw new AppError("Firebase ID token is required", 400);
  }

  let decodedToken;
  try {
    decodedToken = await verifyFirebaseToken(idToken);
  } catch (error) {
    throw new AppError(error.message || "Invalid Firebase ID token", 401);
  }

  const firebaseUid = decodedToken.uid;
  const email = decodedToken.email;
  const displayName =
    decodedToken.name ||
    decodedToken.displayName ||
    (email ? email.split("@")[0] : null);
  const photoURL = decodedToken.picture || decodedToken.photoURL || null;

  if (!firebaseUid || !email) {
    throw new AppError("Firebase token must include uid and email", 400);
  }

  const player = await resolveGooglePlayer({
    firebaseUid,
    email,
    displayName,
    photoURL,
  });

  const company = await ensureCompany(player.id);

  const tokens = issueLocalAuthTokens(player);

  return {
    player: toPlayerDto(player),
    company,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  };
}

module.exports = {
  register,
  login,
  refreshTokens,
  googleAuth,
  issueLocalAuthTokens,
  resolveGooglePlayer,
  setCompanyName,
};

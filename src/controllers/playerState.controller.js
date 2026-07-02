const { asyncHandler } = require("../utils/asyncHandler");
const { buildPlayerState } = require("../services/playerState.service");

const getPlayerStateHandler = asyncHandler(async (req, res) => {
  const state = await buildPlayerState(req.user.id);
  res.json(state);
});

module.exports = { getPlayerStateHandler };

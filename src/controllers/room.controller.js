const { asyncHandler } = require('../utils/asyncHandler');
const roomService = require('../services/room.service');

const listRoomsHandler = asyncHandler(async (req, res) => {
  const rooms = roomService.listRooms();
  res.json({ rooms });
});

const joinRoomHandler = asyncHandler(async (req, res) => {
  const roomId = parseInt(req.body.roomId, 10);
  if (isNaN(roomId) || roomId < 1 || roomId > 5) {
    return res.status(400).json({ error: 'Invalid roomId. Must be 1-5.' });
  }
  const playerName = req.user.displayName || req.user.email?.split('@')[0] || req.user.id;
  const companyName = req.user.company?.name || req.user.companyName || '';
  const result = roomService.joinRoom(req.user.id, roomId, playerName, companyName);
  res.json(result);
});

const leaveRoomHandler = asyncHandler(async (req, res) => {
  const result = roomService.leaveRoom(req.user.id);
  res.json(result);
});

const getCurrentRoomHandler = asyncHandler(async (req, res) => {
  const room = await roomService.getCurrentRoom(req.user.id);
  res.json({ room });
});

module.exports = {
  listRoomsHandler,
  joinRoomHandler,
  leaveRoomHandler,
  getCurrentRoomHandler,
};

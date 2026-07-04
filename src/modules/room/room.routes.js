const { Router } = require('express');
const { authRequired } = require('../../middleware/auth');
const {
  listRoomsHandler,
  joinRoomHandler,
  leaveRoomHandler,
  getCurrentRoomHandler,
} = require('../../controllers/room.controller');
const {
  getRoomNewsHandler,
} = require('../../controllers/news.controller');

const roomRouter = Router();

roomRouter.get('/', authRequired, listRoomsHandler);
roomRouter.post('/join', authRequired, joinRoomHandler);
roomRouter.post('/leave', authRequired, leaveRoomHandler);
roomRouter.get('/current', authRequired, getCurrentRoomHandler);
roomRouter.get('/current/news', authRequired, getRoomNewsHandler);

module.exports = { roomRouter };

require('dotenv').config();

const { createServer } = require('http');
const { buildApp } = require('./src/app');
const { initSocket } = require('./src/sockets');
const { initWsServer } = require('./src/websocket/wsServer');
const { startLeaderboardJob } = require('./src/jobs/leaderboard.job');
const { warmup } = require('./src/config/prisma');

const app = buildApp();
const server = createServer(app);

initSocket(server);
initWsServer(server);
startLeaderboardJob();

const port = process.env.PORT || 3001;

warmup().then(() => {
  server.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
});
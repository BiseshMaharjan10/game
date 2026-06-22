require('dotenv').config();

const { createServer } = require('http');
const { buildApp } = require('./src/app');
const { initSocket } = require('./src/sockets');
const { startLeaderboardJob } = require('./src/jobs/leaderboard.job');

const app = buildApp();
const server = createServer(app);

initSocket(server);
startLeaderboardJob();

const port = process.env.PORT || 3001;

server.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
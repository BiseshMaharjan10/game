function debugModeRequired(req, res, next) {
  if (process.env.DEBUG_MODE !== 'true') {
    return res.status(403).json({ error: 'Debug mode is not enabled. Set DEBUG_MODE=true in .env' });
  }
  next();
}

module.exports = { debugModeRequired };

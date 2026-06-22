function requireCompanyOwnership(req, res, next) {
  if (!req.user?.company) {
    return res.status(403).json({ error: 'Company required' });
  }

  return next();
}

module.exports = { requireCompanyOwnership };
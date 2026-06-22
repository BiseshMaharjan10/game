function durationToMs(duration) {
  if (typeof duration !== 'string') {
    return 0;
  }

  const match = duration.trim().match(/^(\d+)([smhd])$/i);
  if (!match) {
    return 0;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return amount * multipliers[unit];
}

module.exports = { durationToMs };
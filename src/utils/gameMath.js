function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calculateRevenue({ subscribers, articleQuality, trustScore }) {
  const qualityMultiplier = 0.5 + articleQuality / 20;
  const trustMultiplier = 0.5 + clamp(trustScore, 0, 100) / 100;
  return Math.max(0, Math.round(subscribers * qualityMultiplier * trustMultiplier));
}

function calculateTrustDelta({ quality, verifiedInfo, isFakeNews }) {
  let delta = 0;
  if (verifiedInfo) delta += 4 + Math.floor(quality / 3);
  if (quality >= 8) delta += 3;
  if (quality <= 4) delta -= 3;
  if (isFakeNews) delta -= 10;
  return delta;
}

function calculateSubscriberDelta({ trustDelta, quality }) {
  let delta = Math.floor(trustDelta * 4);
  if (quality >= 8) delta += 10;
  if (quality <= 4) delta -= 8;
  return delta;
}

function calculateCompanyValue({ money, trustScore, subscribers, level }) {
  return Math.max(0, Math.round(money + trustScore * 100 + subscribers * 10 + level * 500));
}

function calculateLeaderboardScore({ companyValue, trustScore, subscribers }) {
  return Math.round(companyValue + trustScore * 50 + subscribers * 5);
}

module.exports = {
  clamp,
  calculateRevenue,
  calculateTrustDelta,
  calculateSubscriberDelta,
  calculateCompanyValue,
  calculateLeaderboardScore
};
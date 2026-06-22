const {
  calculateRevenue,
  calculateTrustDelta,
  calculateSubscriberDelta,
  calculateCompanyValue
} = require('../src/utils/gameMath');

describe('game math', () => {
  test('revenue is positive with healthy stats', () => {
    expect(calculateRevenue({ subscribers: 100, articleQuality: 8, trustScore: 70 })).toBeGreaterThan(0);
  });

  test('trust reacts to fake news', () => {
    expect(calculateTrustDelta({ quality: 3, verifiedInfo: false, isFakeNews: true })).toBeLessThan(0);
  });

  test('subscriber delta can grow on strong articles', () => {
    expect(calculateSubscriberDelta({ trustDelta: 5, quality: 9 })).toBeGreaterThan(0);
  });

  test('company value scales with stat inputs', () => {
    expect(calculateCompanyValue({ money: 1000, trustScore: 50, subscribers: 10, level: 2 })).toBeGreaterThan(1000);
  });
});
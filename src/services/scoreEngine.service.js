const { GAMEPLAY } = require('../config/gameplay');
const { log } = require('../utils/logger');

const S = GAMEPLAY.SCORING;

function calculateScore(geminiAnalysis, meta = {}) {
  log('INFO', '[SCORE] Calculating score from Gemini analysis', {
    claimCount: geminiAnalysis.claims?.length || 0,
    missingFactsCount: geminiAnalysis.missingFacts?.length || 0,
    falseClaimsCount: geminiAnalysis.falseClaims?.length || 0,
    sensationalism: geminiAnalysis.sensationalism,
    bias: geminiAnalysis.bias,
    verdict: geminiAnalysis.overallVerdict,
  });

  let score = 0;

  if (geminiAnalysis.claims && Array.isArray(geminiAnalysis.claims)) {
    for (const claim of geminiAnalysis.claims) {
      if (claim.supported) {
        score += S.SUPPORTED_CLAIM;
        log('DEBUG', '[SCORE] +Supported claim', { claim: claim.text, points: S.SUPPORTED_CLAIM });
      } else {
        score += S.UNSUPPORTED_CLAIM;
        log('DEBUG', '[SCORE] +Unsupported claim', { claim: claim.text, points: S.UNSUPPORTED_CLAIM });
      }
    }
  }

  if (geminiAnalysis.missingFacts && Array.isArray(geminiAnalysis.missingFacts)) {
    const penalty = geminiAnalysis.missingFacts.length * S.MISSING_FACT_PENALTY;
    score += penalty;
    log('DEBUG', '[SCORE] +Missing facts', { count: geminiAnalysis.missingFacts.length, points: penalty });
  }

  if (geminiAnalysis.falseClaims && Array.isArray(geminiAnalysis.falseClaims)) {
    const penalty = geminiAnalysis.falseClaims.length * S.FALSE_CLAIM_PENALTY;
    score += penalty;
    log('DEBUG', '[SCORE] +False claims', { count: geminiAnalysis.falseClaims.length, points: penalty });
  }

  const sens = geminiAnalysis.sensationalism || 0;
  if (sens <= S.LOW_SENSATIONALISM_THRESHOLD) {
    score += S.LOW_SENSATIONALISM_BONUS;
    log('DEBUG', '[SCORE] +Low sensationalism bonus', { points: S.LOW_SENSATIONALISM_BONUS });
  } else if (sens >= S.HIGH_SENSATIONALISM_THRESHOLD) {
    score += S.HIGH_SENSATIONALISM_PENALTY;
    log('DEBUG', '[SCORE] +High sensationalism penalty', { points: S.HIGH_SENSATIONALISM_PENALTY });
  }

  if (meta.latePublication) {
    score += S.LATE_PUBLICATION_PENALTY;
    log('DEBUG', '[SCORE] +Late publication penalty', { points: S.LATE_PUBLICATION_PENALTY });
  }

  log('INFO', '[SCORE] Final calculated score', { score });

  return score;
}

function determineFinalVerdict(geminiVerdict, score) {
  const verdicts = ['TRUE', 'MOSTLY_TRUE', 'PARTIALLY_TRUE', 'MISLEADING', 'MOSTLY_FALSE', 'FALSE'];

  const normalized = geminiVerdict ? geminiVerdict.toUpperCase().replace(/[^A-Z_]/g, '') : 'PARTIALLY_TRUE';
  if (verdicts.includes(normalized)) {
    return normalized;
  }

  if (score >= 20) return 'TRUE';
  if (score >= 10) return 'MOSTLY_TRUE';
  if (score >= 0) return 'PARTIALLY_TRUE';
  if (score >= -10) return 'MISLEADING';
  if (score >= -20) return 'MOSTLY_FALSE';
  return 'FALSE';
}

module.exports = { calculateScore, determineFinalVerdict };

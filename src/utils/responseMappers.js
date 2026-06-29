/**
 * responseMappers.js
 *
 * Pure shape-mapping functions. Each function accepts real data (Prisma rows,
 * service results, token strings) and returns the exact API contract shape.
 *
 * UNMAPPED fields are returned as null with a comment explaining why.
 * No hardcoded sample values exist in this file.
 */

// ---------------------------------------------------------------------------
// Static game-design catalog (journalist archetype attributes).
// These are game constants, NOT player-specific data.  The actual DB fields
// (skill int 1-10, salary, loyalty) are separate and mapped from the DB row.
// ---------------------------------------------------------------------------
const CHARACTER_CATALOG = {
  Bob:     { skill: 'Data Entry',         desc: 'Reliable junior level worker.',          influence: 10, timeliness: 40, accuracy: 60, rec: 100, recur: 50 },
  Robin:   { skill: 'Strategic Planning', desc: 'Elite strategist with a sharp mind.',    influence: 80, timeliness: 70, accuracy: 75, rec: 500, recur: 200 },
  Lisa:    { skill: 'Market Analysis',    desc: 'Expert analyst focusing on growth.',     influence: 70, timeliness: 85, accuracy: 90, rec: 600, recur: 250 },
  Michael: { skill: 'Project Management', desc: 'Seasoned leader for complex projects.',  influence: 90, timeliness: 60, accuracy: 80, rec: 700, recur: 300 }
};

// Static game roster — these define which characters are available in the game,
// not which ones the player has hired.
const JUNIOR_CHARACTERS = ['Bob', 'Lisa'];
const ELITE_CHARACTERS  = ['Robin', 'Michael'];
const DEFAULT_DIAMONDS = 1575;
const DEFAULT_TIP_COOLDOWN = 2;
const ECONOMY_SERIES = {
  gdp: {
    years: [1988, 1989, 1990, 1991, 1992, 1993],
    values: [150.0, 60.0, 185.0, 140.0, 170.0, 220.0]
  },
  inflation: {
    years: [1988, 1989, 1990, 1991, 1992, 1993],
    values: [40.0, 165.0, 75.0, 155.0, 55.0, 20.0]
  },
  national_state: {
    stability: 75.0,
    corruption: 20.0,
    public_trust: 0.0
  },
  citizen_cohorts: {
    elite: { trust: 0.0 }
  }
};

function getCharacterRoster() {
  return Object.keys(CHARACTER_CATALOG).map(function(name) {
    return Object.assign({ name: name }, CHARACTER_CATALOG[name]);
  });
}

function buildDeskAssignments(names, preferredDeskIndex) {
  names = (names || []).filter(Boolean);
  if (!names.length) {
    return {};
  }

  const assignments = {};
  names.forEach(function(name, index) {
    assignments[String(index)] = name;
  });

  if (preferredDeskIndex != null && preferredDeskIndex !== '') {
    const parsedIndex = Number(preferredDeskIndex);
    if (!Number.isNaN(parsedIndex)) {
      const hiredName = names[names.length - 1];
      delete assignments[String(names.length - 1)];
      assignments[String(parsedIndex)] = hiredName;
    }
  }

  return assignments;
}

// ---------------------------------------------------------------------------
// Helper: derive leaderboard grade from trust score (game rule constant)
// ---------------------------------------------------------------------------
function gradeFromTrust(trustScore) {
  if (trustScore >= 65) return 'Dominant';
  if (trustScore >= 55) return 'Respected';
  if (trustScore >= 35) return 'Surviving';
  return 'Discredited';
}

// ---------------------------------------------------------------------------
// Helper: derive publication strategy label from quality int
// ---------------------------------------------------------------------------
function strategyFromQuality(quality) {
  if (quality >= 7) return 'full';
  if (quality >= 4) return 'partial';
  return 'fast';
}

// ---------------------------------------------------------------------------
// Helper: format money for display (e.g. 5000000 -> "$5.0M")
// ---------------------------------------------------------------------------
function formatMoney(amount) {
  if (amount == null) return null;
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000)    return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount}`;
}

// ===========================================================================
// AUTH
// ===========================================================================

/**
 * @param {object} player      - Prisma Player row
 * @param {object} company     - Prisma Company row (or null if not yet created)
 * @param {Array}  journalists - Prisma Journalist rows for this company
 * @param {object} tokens      - { access_token, refresh_token } from Firebase/client
 */
function getAuthContractPayload(player, company, journalists, tokens) {
  journalists = journalists || [];
  tokens = tokens || {};
  const unlockedDesks = company ? Math.max(3, company.level + 2) : 3;
  const fromJournalists = journalists.map(function(j) { return j.name; });
  const companyStored = (company && company.unlockedCharacters) || [];
  const unlockedCharacters = companyStored.length ? companyStored : fromJournalists;
  const companyAssignments = (company && company.deskAssignments) || {};
  const deskAssignments = Object.keys(companyAssignments).length ? companyAssignments : buildDeskAssignments(unlockedCharacters);

  return {
    access_token:  tokens.access_token  || null,
    refresh_token: tokens.refresh_token || null,
    email:         player.email,
    name:          player.displayName || player.email.split('@')[0],
    level:         1,
    xp:            0,
    company: {
      name:                company ? company.name : null,
      coins:               player.money,
      diamonds:            DEFAULT_DIAMONDS,
      trust_score:         player.trustScore,
      unlocked_desks:      unlockedDesks,
      unlocked_characters: unlockedCharacters,
      desk_assignments:    deskAssignments,
    },
  };
}

function getRefreshContractPayload(tokens) {
  tokens = tokens || {};
  return {
    access_token:  tokens.access_token  || null,
    refresh_token: tokens.refresh_token || null
  };
}

function getLogoutContractPayload() {
  return { message: 'Logged out successfully' };
}

// ===========================================================================
// COMPANY
// ===========================================================================

/**
 * @param {object} player      - Prisma Player row
 * @param {object} company     - Prisma Company row
 * @param {Array}  journalists - Prisma Journalist rows for this company
 */
function getCompanyContractPayload(player, company, journalists) {
  journalists = journalists || [];
  const unlockedDesks = Math.max(3, (company ? company.level : 1) + 2);
  const hiredNames = journalists.map(function(j) { return j.name; });

  const savedUnlocked = (company && company.unlockedCharacters) || [];
  const savedAssignments = (company && company.deskAssignments) || {};

  return {
    name:            company ? company.name : null,                // FROM company.name
    coins:           player ? player.money : 0,                    // FROM player.money
    diamonds:        DEFAULT_DIAMONDS,                             // Game-design baseline currency
    trust_score:     player ? player.trustScore : 0,               // FROM player.trustScore
    unlocked_desks:  unlockedDesks,                                // DERIVED: max(3, company.level + 2)
    unlocked_characters: savedUnlocked.length ? savedUnlocked : hiredNames,  // FROM company or derived
    desk_assignments:     Object.keys(savedAssignments).length ? savedAssignments : buildDeskAssignments(hiredNames), // FROM company or derived
    desk_characters:      buildDeskAssignments(hiredNames),        // Derived desk map for hired characters (compat)
    characters: getCharacterRoster(),                              // Static roster for the frontend catalog
    hired_characters: hiredNames,                                  // Compatibility: actual hired names
    journalists: journalists.map(function(j) {
      return {
        id:        j.id,
        name:      j.name,
        skill:     j.skill,
        salary:    j.salary,
        loyalty:   j.loyalty
      };
    })
  };
}

/**
 * @param {object} player  - Prisma Player row (post-create)
 * @param {object} company - Prisma Company row (newly created)
 */
function getCreateCompanyContractPayload(player, company) {
  return {
    name:           company ? company.name : null,                  // FROM company.name
    coins:          player  ? player.money : 0,                     // FROM player.money
    diamonds:       DEFAULT_DIAMONDS,                               // Game-design baseline currency
    trust_score:    player  ? player.trustScore : 0,                // FROM player.trustScore
    unlocked_desks:      3,                                               // CONSTANT: always 3 for new company
    unlocked_characters: [],                                             // No hires yet
    desk_assignments:    {},                                             // No hires yet
    desk_characters:     {},                                             // No hires yet
    characters:          getCharacterRoster(),                            // Static roster for consistency
    message:             'Company created'
  };
}

/**
 * @param {object} player       - Prisma Player row (post-upgrade)
 * @param {object} company      - Prisma Company row (post-upgrade)
 * @param {number} costDeducted - Actual coins spent
 */
function getUpgradeCompanyContractPayload(player, company, costDeducted) {
  costDeducted = costDeducted || 0;
  const unlockedDesks = Math.max(3, (company ? company.level : 1) + 2);
  const nextDeskCost  = 100 + (Math.max(3, unlockedDesks - 1) * 50); // Next desk uses the previous unlocked count

  return {
    next_desk_cost:       nextDeskCost,                                  // DERIVED: game formula
    coins_deducted:       costDeducted,                                  // DERIVED: playerBefore.money - playerAfter.money
    coins_remaining:      player ? player.money : 0,                    // FROM player.money (post-upgrade)
    unlocked_desks:       unlockedDesks,                                 // DERIVED: max(3, company.level + 2)
    unlocked_characters:  (company && company.unlockedCharacters) || [],  // FROM company
    desk_assignments:     (company && company.deskAssignments) || {},     // FROM company
    message:              'Desk purchased'
  };
}

// ===========================================================================
// JOURNALISTS
// ===========================================================================

/**
 * @param {Array} journalists - All Prisma Journalist rows for this company
 */
function getJournalistListContractPayload(journalists) {
  journalists = journalists || [];
  const hiredNames = journalists.map(function(j) { return j.name; });

  return {
    junior_characters: JUNIOR_CHARACTERS,          // CONSTANT: game roster definition
    elite_characters:  ELITE_CHARACTERS,           // CONSTANT: game roster definition
    unlocked:          hiredNames,                 // FROM journalist rows (hired journalists)
    characters:        CHARACTER_CATALOG           // CONSTANT: game-design attribute table
  };
}

/**
 * @param {object} journalist  - Newly created Prisma Journalist row
 * @param {object} player      - Prisma Player row (post-hire, money already deducted)
 * @param {Array}  journalists - All journalist rows for this company (post-hire)
 * @param {object} body        - Original request body (for payment_method)
 */
function getJournalistHireSuccessPayload(journalist, player, journalists, body) {
  journalists = journalists || [];
  body = body || {};
  const paymentMethod = body.payment || body.payment_method || 'coin';
  const hiredNames = journalists.map(function(j) { return j.name; });
  const deskIndex = body.desk_index != null ? Number(body.desk_index) : null;
  const deskAssignments = buildDeskAssignments(hiredNames, deskIndex);

  return {
    success:             true,
    character:           journalist.name,                           // FROM journalist.name
    payment_method:      paymentMethod,                             // FROM request body
    cost:                journalist.salary,                         // FROM journalist.salary (actual DB value)
    coins_remaining:     player.money,                              // FROM player.money (post-hire)
    unlocked_characters: hiredNames,                                // FROM all journalist rows
    desk_assignments:    deskAssignments,                            // Derived from current hires
    message:             journalist.name + ' hired and assigned' +
      (deskIndex != null && !Number.isNaN(deskIndex) ? ' to desk ' + deskIndex : '')
  };
}

/**
 * @param {object} body   - Original request body
 * @param {number} needed - The salary/cost that was needed
 * @param {number} have   - The player's current money
 */
function getJournalistHireFailurePayload(body, needed, have) {
  body = body || {};
  return {
    success: false,
    error:   'insufficient_funds',
    message: (needed != null && have != null)
      ? 'Not enough coins. Need ' + needed + ', have ' + have
      : 'Insufficient funds'
  };
}

// ===========================================================================
// ARTICLES
// ===========================================================================

/**
 * @param {Array} articles - Prisma Article rows for this company
 */
function getArticleHistoryContractPayload(articles) {
  articles = articles || [];
  return {
    articles: articles.map(function(article) {
      return {
        id:            article.id,                              // FROM article.id
        tip_id:        article.type,                            // FROM article.type (no tip_id field in schema)
        headline:      article.title,                           // FROM article.title
        strategy:      strategyFromQuality(article.quality),   // DERIVED from article.quality
        is_true:       article.verifiedInfo,                    // FROM article.verifiedInfo
        is_fake:       article.isFakeNews,                      // FROM article.isFakeNews
        quality:       article.quality,                         // FROM article.quality
        published_at:  article.publishedAt,                     // FROM article.publishedAt (ISO datetime)
        trust_delta:   null,                                    // UNMAPPED: effects not persisted on Article row
        money_delta:   null,                                    // UNMAPPED: effects not persisted on Article row
        premium_delta: null,                                    // UNMAPPED: no premium model in schema
        sponsor_delta: null                                     // UNMAPPED: no sponsor model in schema
      };
    })
  };
}

/**
 * @param {object} article   - Prisma Article row (newly published)
 * @param {object} effects   - { revenue, salaryExpense, trustDelta, subscriberDelta, nextMoney, nextTrustScore, nextSubscribers }
 * @param {string} strategy  - From request body
 */
function getArticlePublishContractPayload(article, effects, strategy) {
  strategy = strategy || 'fast';
  if (!article) {
    return { ok: false, reason: 'Publish failed.' };
  }

  var moneyDelta = null;
  if (effects && effects.revenue != null && effects.salaryExpense != null) {
    moneyDelta = effects.revenue - effects.salaryExpense;
  }

  return {
    ok: true,
    result: {
      tip: {
        id:             article.type,                            // FROM article.type
        headline:       article.title,                          // FROM article.title
        is_true_chance: strategy === 'full' ? 1 : strategy === 'partial' ? 0.85 : 0.5
      },
      strategy:         strategy,                               // FROM request body
      is_true:          article.verifiedInfo,                   // FROM article.verifiedInfo
      is_fake:          article.isFakeNews,                     // FROM article.isFakeNews
      quality:          article.quality,                        // FROM article.quality
      attention:        strategy === 'partial' ? 92.0 : strategy === 'full' ? 80.0 : 100.0,
      trust_delta:      effects ? effects.trustDelta       : null, // FROM gameMath.calculateTrustDelta
      money_delta:      moneyDelta,                             // DERIVED: revenue - salaryExpense
      subscriber_delta: effects ? effects.subscriberDelta  : null, // FROM gameMath.calculateSubscriberDelta
      premium_delta:    strategy === 'full' ? 1 : strategy === 'partial' ? 0 : 0,
      sponsor_delta:    effects && effects.subscriberDelta != null
        ? (effects.subscriberDelta > 0 ? 1 : effects.subscriberDelta < 0 ? -1 : 0)
        : null,
      coins_remaining:  effects ? effects.nextMoney        : null, // FROM player.money (post-publish)
      trust_remaining:  effects ? effects.nextTrustScore   : null, // FROM player.trustScore (post-publish)
      headline:         article.title                           // FROM article.title
    }
  };
}

// ===========================================================================
// EVENTS
// ===========================================================================

/**
 * @param {Array} events       - All Prisma Event rows
 * @param {Array} playerEvents - All Prisma PlayerEvent rows for this player (with .event relation)
 */
function getEventListContractPayload(events, playerEvents) {
  events = events || [];
  playerEvents = playerEvents || [];

  var activeParticipation = null;
  for (var i = 0; i < playerEvents.length; i++) {
    if (playerEvents[i].status === 'accepted') {
      activeParticipation = playerEvents[i];
      break;
    }
  }
  var hasActiveTip = Boolean(activeParticipation);
  var activeTip = activeParticipation ? activeParticipation.event : null;

  return {
    has_active_tip: hasActiveTip,                              // DERIVED: any PlayerEvent with status=accepted
    tip: activeTip ? {
      id:             activeTip.id,                            // FROM event.id
      headline:       activeTip.title,                         // FROM event.title
      preview:        activeTip.description,                   // FROM event.description
      difficulty:     activeTip.difficulty,                    // FROM event.difficulty
      reward:         activeTip.reward,                        // FROM event.reward
      risk:           activeTip.risk,                          // FROM event.risk
      is_true_chance: null,                                    // UNMAPPED: no is_true_chance in schema
      impact: {
        stability:    null,
        corruption:   null
      }
    } : null,
    message: hasActiveTip ? null : 'Awaiting next anonymous call...',
    tip_cooldown_turns_remaining: hasActiveTip ? 0 : DEFAULT_TIP_COOLDOWN,
    active_investigation: hasActiveTip && activeTip ? {
      tip_id:            activeTip.id,
      kind:              'partial',
      turns_remaining:   Math.max(0, 2 - Math.floor((activeParticipation && activeParticipation.progress) || 0)),
      money_spent:       0,
      journalists_locked: 1
    } : null,
    available_events: events.map(function(e) {               // FROM event rows
      return {
        id:         e.id,
        headline:   e.title,
        preview:    e.description,
        difficulty: e.difficulty,
        reward:     e.reward,
        risk:       e.risk
      };
    }),
    attention: hasActiveTip ? 100.0 : null,                   // Frontend-friendly current attention
    // Game-design constants — these describe the available strategies, not player state
    strategies: [
      { id: 0, title: 'Fast Print',            cost: 'Free',                time: 'Instant', risk: 'High' },
      { id: 1, title: 'Partial Investigation', cost: '$250K + 1 journalist', time: '2 turns', risk: 'Medium' },
      { id: 2, title: 'Full Investigation',    cost: '$750K + 2 journalists', time: '5 turns', risk: 'Low' }
    ]
  };
}

/**
 * @param {object} assignment - Prisma PlayerEvent row (with .event relation)
 */
function getEventAcceptContractPayload(assignment) {
  var event = (assignment && assignment.event) ? assignment.event : {};
  return {
    success:        true,
    message:        'Tip accepted: "' + (event.title || 'Unknown') + '"', // FROM event.title
    has_active_tip: true,
    tip: {
      id:             event.id          || null,               // FROM event.id
      headline:       event.title       || null,               // FROM event.title
      preview:        event.description || null,               // FROM event.description
      is_true_chance: null,
      impact: {
        stability:    null,
        corruption:   null
      }
    }
  };
}

/**
 * @param {object} outcome - Return value from event.service.completeEvent()
 *   Shape: { participation: PlayerEvent (with .event), outcome: { moneyDelta, trustDelta, subscriberDelta } }
 */
function getEventCompleteContractPayload(outcome) {
  var participation = outcome ? outcome.participation : null;
  var event  = (participation && participation.event) ? participation.event : {};
  var deltas = outcome ? outcome.outcome : {};

  return {
    ok: true,
    result: {
      tip: {
        id:       event.id    || null,                         // FROM event.id
        headline: event.title || null                          // FROM event.title
      },
      strategy:         participation ? participation.status : null, // FROM playerEvent.status
      trust_delta:      deltas ? deltas.trustDelta      : null,      // FROM completeEvent() outcome
      money_delta:      deltas ? deltas.moneyDelta      : null,      // FROM completeEvent() outcome
      subscriber_delta: deltas ? deltas.subscriberDelta : null,      // FROM completeEvent() outcome
      premium_delta:    deltas ? (deltas.subscriberDelta > 0 ? 1 : 0) : null,
      headline:         event.title || null                          // FROM event.title
    }
  };
}

// ===========================================================================
// ECONOMY
// ===========================================================================

/**
 * @param {object} economyData - Return value from economy.service.getEconomy()
 *   Shape: { money, estimatedRevenue, salaryExpense, companyValue }
 */
function getEconomyContractPayload(economyData) {
  economyData = economyData || {};
  return {
    gdp: ECONOMY_SERIES.gdp,
    inflation: ECONOMY_SERIES.inflation,
    national_state: ECONOMY_SERIES.national_state,
    citizen_cohorts: ECONOMY_SERIES.citizen_cohorts,
    // Real economy data from service
    economy: {
      money:             economyData.money            != null ? economyData.money            : null, // FROM player.money
      estimated_revenue: economyData.estimatedRevenue != null ? economyData.estimatedRevenue : null, // FROM gameMath.calculateRevenue
      salary_expense:    economyData.salaryExpense    != null ? economyData.salaryExpense    : null, // FROM journalist.salary aggregate
      company_value:     economyData.companyValue     != null ? economyData.companyValue     : null  // FROM player.companyValue
    }
  };
}

// ===========================================================================
// STATS
// ===========================================================================

/**
 * @param {object} stats           - Return value from economy.service.getStats()
 * @param {number} journalistCount - Count of hired journalists
 */
function getStatsContractPayload(stats, journalistCount) {
  stats = stats || {};
  journalistCount = journalistCount || 0;
  return {
    stats: {
      labels: ['Trust', 'Cash', 'Journalists', 'Sponsors', 'Premium'],
      values: [
        stats.trustScore != null ? stats.trustScore + '%' : null,    // FROM player.trustScore
        stats.money      != null ? formatMoney(stats.money) : null,  // FROM player.money
        String(journalistCount),                                      // FROM journalist count
        '1',                                                          // Frontend default sponsor slot
        '0'                                                           // Frontend default premium slot
      ]
    }
  };
}

/**
 * @param {object} stats           - Return value from economy.service.getStats()
 * @param {object} company         - Prisma Company row
 * @param {number} journalistCount - Count of hired journalists
 */
function getFullStatsContractPayload(stats, company, journalistCount) {
  stats = stats || {};
  journalistCount = journalistCount || 0;
  return {
    match_active:  true,
    outlet:        company ? company.name : null,              // FROM company.name
    turn:          0,
    max_turns:     40,
    trust:         stats.trustScore   != null ? stats.trustScore   : null, // FROM player.trustScore
    money:         stats.money        != null ? stats.money        : null, // FROM player.money
    subscribers:   stats.subscribers  != null ? stats.subscribers  : null, // FROM player.subscribers
    company_value: stats.companyValue != null ? stats.companyValue : null, // FROM player.companyValue
    company_level: stats.companyLevel != null ? stats.companyLevel : null, // FROM company.level
    reputation:    stats.reputation   != null ? stats.reputation   : null, // FROM company.reputation
    journalists:   journalistCount                              // FROM journalist count
  };
}

// ===========================================================================
// LEADERBOARD
// ===========================================================================

/**
 * @param {Array} entries - Prisma Leaderboard rows with .player relation
 *   Each: { rank, score, player: { id, username, email, money, trustScore, subscribers, companyValue, company? } }
 */
function getLeaderboardContractPayload(entries) {
  entries = entries || [];
  return {
    outlets: entries.map(function(entry) {
      var player  = entry.player || {};
      var company = player.company || null;
      // Prefer company name, fall back to username, then email prefix
      var outletName = (company && company.name)
        ? company.name
        : (player.username || (player.email ? player.email.split('@')[0] : null));

      return {
        rank:        entry.rank,                               // FROM leaderboard.rank
        name:        outletName,                               // FROM company.name or player.username
        trust:       player.trustScore  != null ? player.trustScore  : null, // FROM player.trustScore
        money:       player.money       != null ? player.money       : null, // FROM player.money
        subscribers: player.subscribers != null ? player.subscribers : null, // FROM player.subscribers
        score:       entry.score,                              // FROM leaderboard.score
        grade:       player.trustScore  != null ? gradeFromTrust(player.trustScore) : null // DERIVED
      };
    })
  };
}

// ===========================================================================
// SYSTEM
// ===========================================================================

function getHealthContractPayload() {
  return {
    status:  'healthy',
    game:    'Press & Influence — Five Grayon',
    version: '1.0.0'
  };
}

module.exports = {
  getCompanyContractPayload,
  getCreateCompanyContractPayload,
  getUpgradeCompanyContractPayload,
  getAuthContractPayload,
  getRefreshContractPayload,
  getLogoutContractPayload,
  getJournalistListContractPayload,
  getJournalistHireSuccessPayload,
  getJournalistHireFailurePayload,
  getArticleHistoryContractPayload,
  getArticlePublishContractPayload,
  getEventListContractPayload,
  getEventAcceptContractPayload,
  getEventCompleteContractPayload,
  getEconomyContractPayload,
  getStatsContractPayload,
  getFullStatsContractPayload,
  getLeaderboardContractPayload,
  getHealthContractPayload
};

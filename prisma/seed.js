const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const storyTemplates = [
  {
    id: 'story_corruption_minister',
    titleTemplate: '{person} allegedly {crime} in {location}',
    descriptionTemplate: 'Reports suggest {person} may have {crime}.',
    category: 'politics',
    difficulty: 1,
    tags: ['corruption', 'politics', 'national'],
    variables: ['person', 'crime', 'location']
  },
  {
    id: 'story_corruption_contract',
    titleTemplate: '{person} tied to {crime} near {location}',
    descriptionTemplate: 'A trail of payments suggests {person} could have {crime}.',
    category: 'politics',
    difficulty: 2,
    tags: ['corruption', 'investigation', 'national'],
    variables: ['person', 'crime', 'location']
  },
  {
    id: 'story_crime_smuggling',
    titleTemplate: '{person} linked to {crime} at {location}',
    descriptionTemplate: 'Police are examining whether {person} was involved in {crime}.',
    category: 'crime',
    difficulty: 2,
    tags: ['crime', 'law_enforcement'],
    variables: ['person', 'crime', 'location']
  },
  {
    id: 'story_crime_land',
    titleTemplate: '{person} allegedly {crime} over a plot in {location}',
    descriptionTemplate: 'Investigators believe {person} may have {crime}.',
    category: 'crime',
    difficulty: 3,
    tags: ['crime', 'real_estate'],
    variables: ['person', 'crime', 'location']
  },
  {
    id: 'story_economy_bank',
    titleTemplate: '{person} warns of {crime} across {location}',
    descriptionTemplate: 'Financial sources say {person} may have triggered wider instability.',
    category: 'economy',
    difficulty: 2,
    tags: ['economy', 'finance', 'national'],
    variables: ['person', 'crime', 'location']
  },
  {
    id: 'story_economy_market',
    titleTemplate: '{person} accused of {crime} in {location} markets',
    descriptionTemplate: 'Traders claim {person} influenced prices after {crime}.',
    category: 'economy',
    difficulty: 3,
    tags: ['economy', 'markets', 'national'],
    variables: ['person', 'crime', 'location']
  },
  {
    id: 'story_disaster_flood',
    titleTemplate: '{person} reaches {location} after {crime}',
    descriptionTemplate: 'Emergency crews say the situation may worsen if {person} cannot coordinate support.',
    category: 'disaster',
    difficulty: 2,
    tags: ['disaster', 'response', 'national'],
    variables: ['person', 'crime', 'location']
  },
  {
    id: 'story_disaster_quake',
    titleTemplate: '{person} surveys {location} after {crime}',
    descriptionTemplate: 'Officials are trying to determine whether {person} mishandled the response.',
    category: 'disaster',
    difficulty: 4,
    tags: ['disaster', 'infrastructure', 'national'],
    variables: ['person', 'crime', 'location']
  },
  {
    id: 'story_politics_vote',
    titleTemplate: '{person} linked to {crime} before {location} vote',
    descriptionTemplate: 'Campaign observers say {person} may have distorted the race.',
    category: 'politics',
    difficulty: 2,
    tags: ['politics', 'elections', 'national'],
    variables: ['person', 'crime', 'location']
  },
  {
    id: 'story_politics_resign',
    titleTemplate: '{person} under pressure after {crime} in {location}',
    descriptionTemplate: 'Senior leaders are privately debating whether {person} can stay in office.',
    category: 'politics',
    difficulty: 3,
    tags: ['politics', 'leadership', 'national'],
    variables: ['person', 'crime', 'location']
  }
];

const storyEvents = [
  {
    id: 'witness_interview',
    title: 'Witness Contact',
    description: 'Someone claims to know details.',
    requiredTags: ['corruption'],
    conditions: { investigation_progress: 30 },
    choices: [
      { text: 'Pay for information', effects: { money: -20000, evidence: 20 } },
      { text: 'Promise anonymity', effects: { trust: 5, evidence: 10 } }
    ],
    repeatable: false,
    difficulty: 1,
    reward: 15000,
    risk: 5
  },
  {
    id: 'document_leak',
    title: 'Leaked File',
    description: 'A folder of documents appears in your inbox.',
    requiredTags: ['corruption', 'investigation'],
    conditions: { evidence: 10 },
    choices: [
      { text: 'Verify with sources', effects: { evidence: 15, investigation_progress: 10 } },
      { text: 'Run immediately', effects: { reputation: -5, investigation_progress: 20 } }
    ],
    repeatable: true,
    difficulty: 2,
    reward: 22000,
    risk: 10
  },
  {
    id: 'forensic_review',
    title: 'Forensic Review',
    description: 'Experts can analyze the trail if you fund it.',
    requiredTags: ['crime'],
    conditions: { money: 20000 },
    choices: [
      { text: 'Commission analysis', effects: { money: -15000, evidence: 25, investigation_progress: 10 } },
      { text: 'Use internal notes', effects: { investigation_progress: 5 } }
    ],
    repeatable: false,
    difficulty: 2,
    reward: 18000,
    risk: 8
  },
  {
    id: 'street_sources',
    title: 'Street Sources',
    description: 'Sources on the ground want to speak off the record.',
    requiredTags: ['crime', 'law_enforcement'],
    conditions: { investigation_progress: 20 },
    choices: [
      { text: 'Meet at dusk', effects: { evidence: 12, trust: 4 } },
      { text: 'Bring a fixer', effects: { money: -5000, evidence: 8 } }
    ],
    repeatable: true,
    difficulty: 1,
    reward: 9000,
    risk: 6
  },
  {
    id: 'audit_request',
    title: 'Audit Request',
    description: 'A public records audit could expose missing money.',
    requiredTags: ['economy'],
    conditions: { reputation: 40 },
    choices: [
      { text: 'File the paperwork', effects: { investigation_progress: 10, evidence: 10 } },
      { text: 'Push harder', effects: { trust: -3, evidence: 15 } }
    ],
    repeatable: false,
    difficulty: 2,
    reward: 14000,
    risk: 7
  },
  {
    id: 'market_mood',
    title: 'Market Mood',
    description: 'Traders are reacting to rumors in real time.',
    requiredTags: ['economy', 'markets'],
    conditions: { money: 5000 },
    choices: [
      { text: 'Interview traders', effects: { investigation_progress: 15, evidence: 5 } },
      { text: 'Track price moves', effects: { evidence: 10, money: -2000 } }
    ],
    repeatable: true,
    difficulty: 1,
    reward: 8000,
    risk: 4
  },
  {
    id: 'relief_center',
    title: 'Relief Center',
    description: 'A shelter opens after the disaster.',
    requiredTags: ['disaster'],
    conditions: { stability: 30 },
    choices: [
      { text: 'Volunteer coverage', effects: { reputation: 4, evidence: 8 } },
      { text: 'Interview responders', effects: { investigation_progress: 10, trust: 3 } }
    ],
    repeatable: true,
    difficulty: 1,
    reward: 10000,
    risk: 3
  },
  {
    id: 'evacuation_warning',
    title: 'Evacuation Warning',
    description: 'Officials are pushing an early warning.',
    requiredTags: ['disaster', 'response'],
    conditions: { investigation_progress: 15 },
    choices: [
      { text: 'Amplify the warning', effects: { trust: 6, stability: 5 } },
      { text: 'Investigate failure', effects: { evidence: 15, investigation_progress: 10 } }
    ],
    repeatable: false,
    difficulty: 2,
    reward: 12000,
    risk: 6
  },
  {
    id: 'campaign_rumor',
    title: 'Campaign Rumor',
    description: 'A rumor about vote buying starts to spread.',
    requiredTags: ['politics', 'elections'],
    conditions: { reputation: 35 },
    choices: [
      { text: 'Check the ledger', effects: { evidence: 12, investigation_progress: 8 } },
      { text: 'Push the headline', effects: { trust: -4, reputation: -2 } }
    ],
    repeatable: false,
    difficulty: 2,
    reward: 16000,
    risk: 9
  },
  {
    id: 'cabinet_source',
    title: 'Cabinet Source',
    description: 'A source inside government wants to talk.',
    requiredTags: ['politics', 'leadership'],
    conditions: { evidence: 5 },
    choices: [
      { text: 'Arrange a quiet meeting', effects: { evidence: 18, trust: 5 } },
      { text: 'Demand documents', effects: { investigation_progress: 12, reputation: -2 } }
    ],
    repeatable: true,
    difficulty: 3,
    reward: 21000,
    risk: 8
  },
  {
    id: 'budget_breakdown',
    title: 'Budget Breakdown',
    description: 'The numbers do not add up in the latest budget.',
    requiredTags: ['politics', 'economy'],
    conditions: { money: 10000 },
    choices: [
      { text: 'Audit allocations', effects: { evidence: 10, investigation_progress: 14 } },
      { text: 'Interview economists', effects: { trust: 4, evidence: 6 } }
    ],
    repeatable: false,
    difficulty: 2,
    reward: 17000,
    risk: 7
  },
  {
    id: 'court_hearing',
    title: 'Court Hearing',
    description: 'A hearing opens a new trail of evidence.',
    requiredTags: ['crime', 'law_enforcement'],
    conditions: { investigation_progress: 40 },
    choices: [
      { text: 'Sit through the hearing', effects: { evidence: 20, reputation: 3 } },
      { text: 'Question the clerk', effects: { money: -4000, investigation_progress: 10 } }
    ],
    repeatable: false,
    difficulty: 3,
    reward: 25000,
    risk: 10
  },
  {
    id: 'border_tip',
    title: 'Border Tip',
    description: 'A border official says something unusual passed through.',
    requiredTags: ['crime'],
    conditions: { evidence: 8 },
    choices: [
      { text: 'Follow the route', effects: { investigation_progress: 16, evidence: 10 } },
      { text: 'Pay for a manifest', effects: { money: -8000, evidence: 18 } }
    ],
    repeatable: true,
    difficulty: 2,
    reward: 13000,
    risk: 6
  },
  {
    id: 'factory_shutdown',
    title: 'Factory Shutdown',
    description: 'A factory closure shakes the local economy.',
    requiredTags: ['economy'],
    conditions: { economy: 35 },
    choices: [
      { text: 'Cover the layoffs', effects: { reputation: 5, trust: 2 } },
      { text: 'Investigate the contract', effects: { evidence: 10, investigation_progress: 8 } }
    ],
    repeatable: false,
    difficulty: 2,
    reward: 11000,
    risk: 5
  },
  {
    id: 'rescue_logs',
    title: 'Rescue Logs',
    description: 'Emergency logs hint at delayed action.',
    requiredTags: ['disaster', 'infrastructure'],
    conditions: { stability: 40 },
    choices: [
      { text: 'Pull the logs', effects: { evidence: 14, investigation_progress: 12 } },
      { text: 'Interview crews', effects: { trust: 4, reputation: 3 } }
    ],
    repeatable: true,
    difficulty: 3,
    reward: 19000,
    risk: 8
  },
  {
    id: 'public_march',
    title: 'Public March',
    description: 'Crowds gather with competing demands.',
    requiredTags: ['politics'],
    conditions: { reputation: 30 },
    choices: [
      { text: 'Join the crowd', effects: { trust: 6, reputation: 2 } },
      { text: 'Map the organizers', effects: { evidence: 8, investigation_progress: 6 } }
    ],
    repeatable: true,
    difficulty: 1,
    reward: 7000,
    risk: 4
  },
  {
    id: 'whistleblower_drop',
    title: 'Whistleblower Drop',
    description: 'A whistleblower offers a drive with hidden files.',
    requiredTags: ['corruption', 'politics'],
    conditions: { evidence: 20 },
    choices: [
      { text: 'Secure the drive', effects: { evidence: 25, investigation_progress: 10 } },
      { text: 'Verify metadata', effects: { trust: 5, evidence: 15 } }
    ],
    repeatable: false,
    difficulty: 3,
    reward: 28000,
    risk: 9
  },
  {
    id: 'shipping_manifest',
    title: 'Shipping Manifest',
    description: 'A manifest reveals unusual cargo routes.',
    requiredTags: ['crime', 'economy'],
    conditions: { money: 15000 },
    choices: [
      { text: 'Trace the cargo', effects: { investigation_progress: 14, evidence: 12 } },
      { text: 'Pay for copies', effects: { money: -10000, evidence: 20 } }
    ],
    repeatable: false,
    difficulty: 2,
    reward: 15000,
    risk: 7
  },
  {
    id: 'aid_misuse',
    title: 'Aid Misuse',
    description: 'Relief money may have gone missing.',
    requiredTags: ['disaster', 'corruption'],
    conditions: { corruption: 40 },
    choices: [
      { text: 'Track the transfers', effects: { evidence: 18, investigation_progress: 10 } },
      { text: 'Interview donors', effects: { trust: 4, reputation: 2 } }
    ],
    repeatable: false,
    difficulty: 3,
    reward: 24000,
    risk: 9
  },
  {
    id: 'policy_leak',
    title: 'Policy Leak',
    description: 'A draft policy leaks before the public release.',
    requiredTags: ['politics', 'economy'],
    conditions: { investigation_progress: 25 },
    choices: [
      { text: 'Publish the leak', effects: { trust: -3, evidence: 14 } },
      { text: 'Cross-check the draft', effects: { investigation_progress: 12, reputation: 4 } }
    ],
    repeatable: true,
    difficulty: 2,
    reward: 17000,
    risk: 6
  }
];

const nationalEvents = [
  {
    id: 'national_budget_shock',
    title: 'National Budget Shock',
    description: 'The finance ministry announces an unexpected budget shift.',
    requiredTags: ['national', 'economy'],
    conditions: { stability: 45 },
    choices: [
      { text: 'Cover the impact', effects: { economy: -5, public_trust: -2 } },
      { text: 'Investigate the winners', effects: { evidence: 12, corruption: 5 } }
    ],
    repeatable: false,
    difficulty: 3,
    reward: 22000,
    risk: 9
  },
  {
    id: 'national_court_ruling',
    title: 'Supreme Court Ruling',
    description: 'A ruling could reshape several high-profile investigations.',
    requiredTags: ['national', 'politics'],
    conditions: { public_trust: 40 },
    choices: [
      { text: 'Analyze the ruling', effects: { investigation_progress: 12, trust: 4 } },
      { text: 'Interview legal experts', effects: { evidence: 10, reputation: 3 } }
    ],
    repeatable: false,
    difficulty: 2,
    reward: 18000,
    risk: 7
  },
  {
    id: 'national_banking_alert',
    title: 'Central Bank Alert',
    description: 'Officials warn that banks may need emergency support.',
    requiredTags: ['national', 'economy'],
    conditions: { economy: 35 },
    choices: [
      { text: 'Track the bailout', effects: { evidence: 10, corruption: 4 } },
      { text: 'Interview traders', effects: { trust: 3, investigation_progress: 8 } }
    ],
    repeatable: true,
    difficulty: 2,
    reward: 19000,
    risk: 6
  },
  {
    id: 'national_vote_break',
    title: 'Parliamentary Vote Break',
    description: 'A confidence vote could end the current administration.',
    requiredTags: ['national', 'politics'],
    conditions: { reputation: 35 },
    choices: [
      { text: 'Track party whips', effects: { evidence: 14, investigation_progress: 8 } },
      { text: 'Call political sources', effects: { trust: 5, reputation: 2 } }
    ],
    repeatable: false,
    difficulty: 3,
    reward: 25000,
    risk: 8
  },
  {
    id: 'national_strike_wave',
    title: 'Nationwide Strike Wave',
    description: 'Workers across the country begin coordinated strikes.',
    requiredTags: ['national', 'economy'],
    conditions: { stability: 40 },
    choices: [
      { text: 'Cover the unions', effects: { public_trust: 4, reputation: 3 } },
      { text: 'Trace the sponsors', effects: { evidence: 16, corruption: 4 } }
    ],
    repeatable: true,
    difficulty: 2,
    reward: 15000,
    risk: 7
  },
  {
    id: 'national_monsoon_alert',
    title: 'Monsoon Alert',
    description: 'Meteorologists issue a national monsoon alert.',
    requiredTags: ['national', 'disaster'],
    conditions: { stability: 30 },
    choices: [
      { text: 'Focus on relief', effects: { trust: 5, public_trust: 4 } },
      { text: 'Inspect preparedness', effects: { evidence: 12, investigation_progress: 8 } }
    ],
    repeatable: true,
    difficulty: 1,
    reward: 12000,
    risk: 5
  },
  {
    id: 'national_quake_aftershock',
    title: 'Aftershock Report',
    description: 'Officials brace for another round of tremors.',
    requiredTags: ['national', 'disaster'],
    conditions: { stability: 25 },
    choices: [
      { text: 'Report the danger', effects: { trust: 6, public_trust: 3 } },
      { text: 'Audit the response', effects: { evidence: 10, corruption: 3 } }
    ],
    repeatable: false,
    difficulty: 2,
    reward: 14000,
    risk: 6
  },
  {
    id: 'national_fuel_shortage',
    title: 'Fuel Shortage',
    description: 'A national shortage sends prices climbing.',
    requiredTags: ['national', 'economy'],
    conditions: { economy: 30 },
    choices: [
      { text: 'Cover the queues', effects: { investigation_progress: 8, trust: 3 } },
      { text: 'Trace the suppliers', effects: { evidence: 15, corruption: 4 } }
    ],
    repeatable: true,
    difficulty: 2,
    reward: 16000,
    risk: 7
  },
  {
    id: 'national_anti_corruption',
    title: 'Anti-Corruption Sweep',
    description: 'Police launch a coordinated anti-corruption operation.',
    requiredTags: ['national', 'corruption'],
    conditions: { corruption: 45 },
    choices: [
      { text: 'Follow the raids', effects: { evidence: 18, investigation_progress: 10 } },
      { text: 'Interview investigators', effects: { trust: 5, reputation: 3 } }
    ],
    repeatable: false,
    difficulty: 3,
    reward: 26000,
    risk: 9
  },
  {
    id: 'national_election_result',
    title: 'Election Results',
    description: 'The final national tally is expected at any moment.',
    requiredTags: ['national', 'politics', 'elections'],
    conditions: { public_trust: 35 },
    choices: [
      { text: 'Publish the count', effects: { reputation: 4, trust: 3 } },
      { text: 'Audit the tally', effects: { evidence: 12, investigation_progress: 9 } }
    ],
    repeatable: false,
    difficulty: 2,
    reward: 20000,
    risk: 8
  }
];

async function upsertRows(model, rows) {
  for (const row of rows) {
    await prisma[model].upsert({
      where: { id: row.id },
      create: row,
      update: row
    });
  }
}

async function main() {
  await upsertRows('storyTemplate', storyTemplates);
  await upsertRows('event', [...storyEvents, ...nationalEvents]);

  await prisma.countryState.upsert({
    where: { key: 'global' },
    create: {
      key: 'global',
      economy: 50,
      corruption: 50,
      stability: 50,
      publicTrust: 50,
      currentEvents: []
    },
    update: {
      economy: 50,
      corruption: 50,
      stability: 50,
      publicTrust: 50
    }
  });

  console.log('Story engine seed completed.');
}

main()
  .catch((error) => {
    console.error('Story engine seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

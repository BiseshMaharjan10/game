const { prisma } = require('../src/config/prisma');

const EXPECTED_COUNTS = {
  storyTemplate: 10,
  event: 30,
  countryState: 1
};

const REQUIRED_STORY_TEMPLATE_IDS = [
  'story_corruption_minister',
  'story_corruption_contract',
  'story_crime_smuggling',
  'story_crime_land',
  'story_economy_bank',
  'story_economy_market',
  'story_disaster_flood',
  'story_disaster_quake',
  'story_politics_vote',
  'story_politics_resign'
];

const REQUIRED_EVENT_IDS = [
  'witness_interview',
  'document_leak',
  'forensic_review',
  'street_sources',
  'audit_request',
  'market_mood',
  'relief_center',
  'evacuation_warning',
  'campaign_rumor',
  'cabinet_source',
  'budget_breakdown',
  'court_hearing',
  'border_tip',
  'factory_shutdown',
  'rescue_logs',
  'public_march',
  'whistleblower_drop',
  'shipping_manifest',
  'aid_misuse',
  'policy_leak',
  'national_budget_shock',
  'national_court_ruling',
  'national_banking_alert',
  'national_vote_break',
  'national_strike_wave',
  'national_monsoon_alert',
  'national_quake_aftershock',
  'national_fuel_shortage',
  'national_anti_corruption',
  'national_election_result'
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function toIdSet(rows) {
  return new Set(rows.map((row) => row.id));
}

async function main() {
  await prisma.$connect();

  const [storyTemplateCount, eventCount, countryStateCount, templates, events, countryState] = await Promise.all([
    prisma.storyTemplate.count(),
    prisma.event.count(),
    prisma.countryState.count({ where: { key: 'global' } }),
    prisma.storyTemplate.findMany({
      select: {
        id: true,
        titleTemplate: true,
        descriptionTemplate: true,
        category: true,
        tags: true,
        variables: true
      }
    }),
    prisma.event.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        requiredTags: true,
        conditions: true,
        choices: true
      }
    }),
    prisma.countryState.findUnique({ where: { key: 'global' } })
  ]);

  assert(
    storyTemplateCount >= EXPECTED_COUNTS.storyTemplate,
    `Expected at least ${EXPECTED_COUNTS.storyTemplate} story templates, found ${storyTemplateCount}`
  );
  assert(
    eventCount >= EXPECTED_COUNTS.event,
    `Expected at least ${EXPECTED_COUNTS.event} events, found ${eventCount}`
  );
  assert(
    countryStateCount >= EXPECTED_COUNTS.countryState,
    'Expected a seeded global country state row'
  );
  assert(countryState, 'Global country state row is missing');

  const templateIds = toIdSet(templates);
  const eventIds = toIdSet(events);

  REQUIRED_STORY_TEMPLATE_IDS.forEach((id) => {
    assert(templateIds.has(id), `Missing story template seed: ${id}`);
  });

  REQUIRED_EVENT_IDS.forEach((id) => {
    assert(eventIds.has(id), `Missing event seed: ${id}`);
  });

  templates.forEach((template) => {
    assert(typeof template.titleTemplate === 'string' && template.titleTemplate.length > 0, `Invalid titleTemplate for ${template.id}`);
    assert(typeof template.descriptionTemplate === 'string' && template.descriptionTemplate.length > 0, `Invalid descriptionTemplate for ${template.id}`);
    assert(typeof template.category === 'string' && template.category.length > 0, `Invalid category for ${template.id}`);
    assert(Array.isArray(template.tags), `Invalid tags for ${template.id}`);
    assert(template.variables != null, `Invalid variables for ${template.id}`);
  });

  events.forEach((event) => {
    assert(typeof event.title === 'string' && event.title.length > 0, `Invalid event title for ${event.id}`);
    assert(typeof event.description === 'string' && event.description.length > 0, `Invalid event description for ${event.id}`);
    assert(Array.isArray(event.requiredTags), `Invalid requiredTags for ${event.id}`);
    assert(event.conditions != null, `Invalid conditions for ${event.id}`);
    assert(Array.isArray(event.choices), `Invalid choices for ${event.id}`);
  });

  console.log('Story engine seed validation passed.');
}

main()
  .catch((error) => {
    console.error('Story engine seed validation failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

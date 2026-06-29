const { AppError } = require('../utils/appError');
const { storyRepository } = require('../modules/story/story.repository');
const { playerRepository } = require('../modules/auth/auth.repository');

const STORY_POOLS = {
  people: ['Education Minister', 'Police Chief', 'CEO', 'Business Owner', 'Mayor'],
  crimes: ['accepted bribes', 'manipulated contracts', 'concealed evidence', 'embezzled funds'],
  locations: ['Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar']
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function randomItem(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  return values[Math.floor(Math.random() * values.length)];
}

function shuffle(values) {
  const copy = values.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const swapValue = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = swapValue;
  }
  return copy;
}

function normalizeVariableSpec(spec) {
  if (Array.isArray(spec)) {
    return spec;
  }

  if (spec && typeof spec === 'object') {
    if (Array.isArray(spec.choices)) {
      return spec.choices;
    }

    if (Array.isArray(spec.values)) {
      return spec.values;
    }

    if (Array.isArray(spec.pool)) {
      return spec.pool;
    }
  }

  if (typeof spec === 'string') {
    return [spec];
  }

  return [];
}

function generateVariableValue(variableName, spec) {
  const explicitValues = normalizeVariableSpec(spec);
  if (explicitValues.length > 0) {
    return randomItem(explicitValues);
  }

  const poolKey = String(variableName || '').toLowerCase();
  const pool = STORY_POOLS[poolKey];
  if (pool && pool.length) {
    return randomItem(pool);
  }

  return variableName.replace(/_/g, ' ');
}

function replacePlaceholders(template, variables) {
  if (!template) {
    return '';
  }

  return String(template).replace(/\{(\w+)\}/g, (_match, key) => {
    if (variables && Object.prototype.hasOwnProperty.call(variables, key)) {
      return variables[key];
    }
    return key;
  });
}

function buildVariables(template) {
  const rawVariables = template && template.variables;
  const variableNames = Array.isArray(rawVariables)
    ? rawVariables
    : rawVariables && typeof rawVariables === 'object'
      ? Object.keys(rawVariables)
      : [];

  const variables = {};
  variableNames.forEach((name) => {
    variables[name] = generateVariableValue(name, Array.isArray(rawVariables) ? null : rawVariables[name]);
  });

  return variables;
}

function generateStory(template) {
  const variables = buildVariables(template);
  const title = replacePlaceholders(template.titleTemplate, variables);
  const description = replacePlaceholders(template.descriptionTemplate, variables);
  const tags = Array.from(new Set([...(template.tags || []), template.category].filter(Boolean)));

  return {
    title,
    description,
    variables,
    tags
  };
}

function storyMatchesTags(eventTags, storyTags) {
  const requiredTags = Array.isArray(eventTags) ? eventTags : [];
  const availableTags = new Set(Array.isArray(storyTags) ? storyTags : []);

  return requiredTags.every((tag) => availableTags.has(tag));
}

function resolveConditionValue(field, playerState, countryState, storyInstance) {
  const normalizedField = String(field || '').toLowerCase().replace(/\s+/g, '_');

  const playerLookup = {
    money: playerState && playerState.money,
    reputation: playerState && playerState.reputation,
    trust: playerState && playerState.reputation,
    evidence: playerState && playerState.evidence,
    investigation_progress: playerState && playerState.investigationProgress,
    investigationprogress: playerState && playerState.investigationProgress,
    journalists: playerState && playerState.journalists ? playerState.journalists.length : 0
  };

  const countryLookup = {
    economy: countryState && countryState.economy,
    corruption: countryState && countryState.corruption,
    stability: countryState && countryState.stability,
    public_trust: countryState && countryState.publicTrust,
    publictrust: countryState && countryState.publicTrust
  };

  if (Object.prototype.hasOwnProperty.call(playerLookup, normalizedField)) {
    return playerLookup[normalizedField];
  }

  if (Object.prototype.hasOwnProperty.call(countryLookup, normalizedField)) {
    return countryLookup[normalizedField];
  }

  if (storyInstance && storyInstance.variables && typeof storyInstance.variables === 'object') {
    const storyValue = storyInstance.variables[field];
    if (storyValue !== undefined) {
      return storyValue;
    }
  }

  return undefined;
}

function conditionSatisfied(expected, actual) {
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    if (expected.gte != null && Number(actual) < Number(expected.gte)) return false;
    if (expected.lte != null && Number(actual) > Number(expected.lte)) return false;
    if (expected.gt != null && Number(actual) <= Number(expected.gt)) return false;
    if (expected.lt != null && Number(actual) >= Number(expected.lt)) return false;
    if (expected.eq != null && actual !== expected.eq) return false;
    return true;
  }

  return Number(actual) >= Number(expected);
}

function conditionsMet(conditions, playerState, countryState, storyInstance) {
  if (!conditions || typeof conditions !== 'object') {
    return true;
  }

  return Object.entries(conditions).every(([field, expected]) => {
    const actual = resolveConditionValue(field, playerState, countryState, storyInstance);
    if (actual === undefined || actual === null) {
      return false;
    }
    return conditionSatisfied(expected, actual);
  });
}

function normalizeChoiceEffects(choice) {
  if (!choice) {
    return {};
  }

  if (choice.effects && typeof choice.effects === 'object') {
    return choice.effects;
  }

  return typeof choice === 'object' ? choice : {};
}

function applyBoundedDelta(value, delta, min = 0, max = 100) {
  return clamp(Number(value || 0) + Number(delta || 0), min, max);
}

function applyChoiceEffects(choice, playerState, countryState) {
  const effects = normalizeChoiceEffects(choice);
  const nextPlayerState = Object.assign({}, playerState);
  const nextCountryState = Object.assign({}, countryState);

  if (effects.money != null) {
    nextPlayerState.money = Math.max(0, Number(nextPlayerState.money || 0) + Number(effects.money));
  }

  if (effects.reputation != null) {
    nextPlayerState.reputation = applyBoundedDelta(nextPlayerState.reputation, effects.reputation);
  }

  if (effects.evidence != null) {
    nextPlayerState.evidence = Math.max(0, Number(nextPlayerState.evidence || 0) + Number(effects.evidence));
  }

  if (effects.investigation_progress != null) {
    nextPlayerState.investigationProgress = applyBoundedDelta(nextPlayerState.investigationProgress, effects.investigation_progress);
  }

  if (effects.trust != null) {
    nextPlayerState.reputation = applyBoundedDelta(nextPlayerState.reputation, effects.trust);
  }

  if (effects.economy != null) {
    nextCountryState.economy = applyBoundedDelta(nextCountryState.economy, effects.economy);
  }

  if (effects.stability != null) {
    nextCountryState.stability = applyBoundedDelta(nextCountryState.stability, effects.stability);
  }

  if (effects.corruption != null) {
    nextCountryState.corruption = applyBoundedDelta(nextCountryState.corruption, effects.corruption);
  }

  if (effects.public_trust != null) {
    nextCountryState.publicTrust = applyBoundedDelta(nextCountryState.publicTrust, effects.public_trust);
  }

  return {
    playerState: nextPlayerState,
    countryState: nextCountryState,
    effects
  };
}

function serializeStoryInstance(storyInstance) {
  return {
    story_id: storyInstance.id,
    title: storyInstance.generatedTitle,
    description: storyInstance.generatedDescription,
    tags: storyInstance.tags || [],
    variables: storyInstance.variables || {}
  };
}

function serializeEvent(event) {
  return {
    event_id: event.id,
    title: event.title,
    description: event.description,
    required_tags: event.requiredTags || [],
    conditions: event.conditions || {},
    choices: event.choices || [],
    repeatable: Boolean(event.repeatable)
  };
}

function serializePlayerState(playerState) {
  return {
    money: playerState.money,
    reputation: playerState.reputation,
    evidence: playerState.evidence,
    investigation_progress: playerState.investigationProgress,
    journalists: playerState.journalists || []
  };
}

function serializeCountryState(countryState) {
  return {
    economy: countryState.economy,
    corruption: countryState.corruption,
    stability: countryState.stability,
    public_trust: countryState.publicTrust,
    current_events: countryState.currentEvents || []
  };
}

async function generateStoryInstance() {
  const templates = await storyRepository.listTemplates();
  if (!templates.length) {
    throw new AppError('no story templates available', 404);
  }

  const template = randomItem(templates);
  const generated = generateStory(template);

  const storyInstance = await storyRepository.createStoryInstance({
    templateId: template.id,
    generatedTitle: generated.title,
    generatedDescription: generated.description,
    tags: generated.tags,
    variables: generated.variables,
    status: 'active'
  });

  return {
    storyInstance,
    template,
    generated
  };
}

async function getOrCreatePlayerState(playerId, playerRecord) {
  const existingState = await storyRepository.findPlayerState(playerId);
  if (existingState) {
    return existingState;
  }

  const player = playerRecord || await playerRepository.findById(playerId);
  if (!player) {
    throw new AppError('player not found', 404);
  }

  return storyRepository.upsertPlayerState(
    playerId,
    {
      money: player.money,
      reputation: player.trustScore,
      evidence: 0,
      investigationProgress: 0,
      journalists: player.company ? player.company.journalists.map((journalist) => journalist.name) : []
    },
    {}
  );
}

async function getOrCreateCountryState() {
  return storyRepository.upsertCountryState(
    'global',
    {
      economy: 50,
      corruption: 50,
      stability: 50,
      publicTrust: 50,
      currentEvents: []
    },
    {}
  );
}

async function getAvailableEvents(storyInstance, playerState, countryState) {
  const events = await storyRepository.listEvents();
  const history = await storyRepository.listEventHistoryForStory(playerState.playerId, storyInstance.id);
  const completedNonRepeatableEvents = new Set(
    history.filter((entry) => entry.event && entry.event.repeatable === false).map((entry) => entry.eventId)
  );

  const validEvents = events.filter((event) => {
    if (!storyMatchesTags(event.requiredTags, storyInstance.tags)) {
      return false;
    }

    if (!conditionsMet(event.conditions, playerState, countryState, storyInstance)) {
      return false;
    }

    if (!event.repeatable && completedNonRepeatableEvents.has(event.id)) {
      return false;
    }

    return true;
  });

  return shuffle(validEvents).slice(0, Math.min(validEvents.length, 5));
}

async function resolveStoryChoice({ playerId, storyId, eventId, choiceIndex }) {
  const storyInstance = await storyRepository.findStoryInstanceById(storyId);
  if (!storyInstance) {
    throw new AppError('story not found', 404);
  }

  const event = await storyRepository.findEventById(eventId);
  if (!event) {
    throw new AppError('event not found', 404);
  }

  const playerState = await getOrCreatePlayerState(playerId);
  const countryState = await getOrCreateCountryState();
  const availableEvents = await getAvailableEvents(storyInstance, playerState, countryState);
  const availableEventIds = new Set(availableEvents.map((entry) => entry.id));

  if (!availableEventIds.has(event.id)) {
    throw new AppError('event is not available for this story', 400);
  }

  const choices = Array.isArray(event.choices) ? event.choices : [];
  const selectedChoice = choices[choiceIndex];
  if (!selectedChoice) {
    throw new AppError('choice index is invalid', 400);
  }

  const applied = applyChoiceEffects(selectedChoice, playerState, countryState);
  const nextPlayerState = await storyRepository.updatePlayerState(playerId, {
    money: applied.playerState.money,
    reputation: applied.playerState.reputation,
    evidence: applied.playerState.evidence,
    investigationProgress: applied.playerState.investigationProgress,
    journalists: applied.playerState.journalists || []
  });

  const nextCountryState = await storyRepository.updateCountryState(countryState.id, {
    economy: applied.countryState.economy,
    corruption: applied.countryState.corruption,
    stability: applied.countryState.stability,
    publicTrust: applied.countryState.publicTrust,
    currentEvents: applied.countryState.currentEvents || []
  });

  await storyRepository.createEventHistory({
    playerId,
    storyInstanceId: storyInstance.id,
    eventId: event.id,
    selectedChoice: {
      choiceIndex,
      choice: selectedChoice
    }
  });

  await playerRepository.update(playerId, {
    money: nextPlayerState.money,
    trustScore: nextPlayerState.reputation
  });

  const newEvents = await getAvailableEvents(storyInstance, nextPlayerState, nextCountryState);

  return {
    playerState: nextPlayerState,
    countryState: nextCountryState,
    newEvents,
    storyInstance
  };
}

module.exports = {
  STORY_POOLS,
  generateStory,
  getAvailableEvents,
  applyChoiceEffects,
  generateStoryInstance,
  getOrCreatePlayerState,
  getOrCreateCountryState,
  resolveStoryChoice,
  serializeStoryInstance,
  serializeEvent,
  serializePlayerState,
  serializeCountryState
};

const {
  generateStory,
  applyChoiceEffects,
  serializeStoryInstance,
  serializePlayerState,
  serializeCountryState
} = require('../src/services/storyEngine.service');

describe('story engine', () => {
  test('generates a story from template variables', () => {
    const story = generateStory({
      titleTemplate: '{person} allegedly {crime} in {location}',
      descriptionTemplate: 'Reports suggest {person} may have {crime}.',
      category: 'politics',
      tags: ['corruption'],
      variables: ['person', 'crime', 'location']
    });

    expect(story.title).toMatch(/allegedly/);
    expect(story.description).toMatch(/Reports suggest/);
    expect(story.tags).toEqual(expect.arrayContaining(['corruption', 'politics']));
    expect(story.variables.person).toBeDefined();
    expect(story.variables.crime).toBeDefined();
    expect(story.variables.location).toBeDefined();
  });

  test('applies player and country effects', () => {
    const result = applyChoiceEffects(
      {
        effects: {
          money: -200,
          reputation: 5,
          evidence: 10,
          investigation_progress: 15,
          trust: 3,
          economy: -4,
          stability: 2,
          corruption: -6,
          public_trust: 7
        }
      },
      {
        money: 1000,
        reputation: 40,
        evidence: 2,
        investigationProgress: 5,
        journalists: ['Asha']
      },
      {
        economy: 50,
        corruption: 60,
        stability: 40,
        publicTrust: 45,
        currentEvents: []
      }
    );

    expect(result.playerState.money).toBe(800);
    expect(result.playerState.reputation).toBe(48);
    expect(result.playerState.evidence).toBe(12);
    expect(result.playerState.investigationProgress).toBe(20);
    expect(result.countryState.economy).toBe(46);
    expect(result.countryState.stability).toBe(42);
    expect(result.countryState.corruption).toBe(54);
    expect(result.countryState.publicTrust).toBe(52);
  });

  test('serializes story and state payloads with API field names', () => {
    expect(
      serializeStoryInstance({
        id: 'story-1',
        generatedTitle: 'A headline',
        generatedDescription: 'A description',
        tags: ['politics'],
        variables: { person: 'Mayor' }
      })
    ).toEqual({
      story_id: 'story-1',
      title: 'A headline',
      description: 'A description',
      tags: ['politics'],
      variables: { person: 'Mayor' }
    });

    expect(
      serializePlayerState({
        money: 100,
        reputation: 55,
        evidence: 8,
        investigationProgress: 12,
        journalists: ['Asha']
      })
    ).toEqual({
      money: 100,
      reputation: 55,
      evidence: 8,
      investigation_progress: 12,
      journalists: ['Asha']
    });

    expect(
      serializeCountryState({
        economy: 44,
        corruption: 61,
        stability: 39,
        publicTrust: 48,
        currentEvents: ['national_budget_shock']
      })
    ).toEqual({
      economy: 44,
      corruption: 61,
      stability: 39,
      public_trust: 48,
      current_events: ['national_budget_shock']
    });
  });
});

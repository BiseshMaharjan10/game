jest.mock("../src/middleware/auth", () => ({
  authRequired: (req, _res, next) => {
    req.user = { id: "player-1" };
    next();
  },
}));

jest.mock("../src/controllers/playerState.controller", () => ({
  getPlayerStateHandler: (req, res) => {
    res.json({
      coin: 1200,
        gems: 100,
      trust_score: 55,
      company_name: "Daily Byte",
      unlocked_desks: 4,
      unlocked_characters: ["bob"],
      desk_characters: { 0: "bob" },
      characters: [
        { characterId: "bob", quantity: 1 },
      ],
      stats: { match_active: true, turn: 2, max_turns: 40, reputation: 50 },
      economy: { gdp: 1000, inflation: 12, national_state: "stable" },
      events: [],
    });
  },
}));

const request = require("supertest");
const { buildApp } = require("../src/app");

describe("player state route", () => {
  const app = buildApp();

  test("returns the unified gameplay state contract", async () => {
    const response = await request(app).get("/api/player/state");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        coin: 1200,
      gems: 100,
        trust_score: 55,
        company_name: "Daily Byte",
        unlocked_desks: 4,
        unlocked_characters: ["bob"],
        desk_characters: { 0: "bob" },
        characters: [{ characterId: "bob", quantity: 1 }],
        stats: expect.objectContaining({
          match_active: true,
          turn: 2,
          max_turns: 40,
          reputation: 50,
        }),
        economy: expect.objectContaining({
          gdp: 1000,
          inflation: 12,
          national_state: "stable",
        }),
        events: [],
      }),
    );
  });
});

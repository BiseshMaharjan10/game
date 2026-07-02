jest.mock("../src/config/firebase", () => ({
  verifyFirebaseToken: jest.fn().mockResolvedValue({
    uid: "firebase-123",
    email: "google@example.com",
    name: "Google User",
    picture: "https://example.com/avatar.png",
    firebase: { sign_in_provider: "google.com" },
  }),
}));

jest.mock("../src/modules/auth/auth.repository", () => ({
  playerRepository: {
    findByFirebaseUid: jest.fn(),
    findByEmail: jest.fn(),

    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock("../src/modules/company/company.repository", () => ({
  companyRepository: {
    create: jest.fn(),
    findByOwnerId: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("../src/modules/desks/desks.repository", () => ({
  deskRepository: {
    initializeForPlayer: jest.fn().mockResolvedValue(undefined),
    findByPlayerId: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    upsert: jest.fn(),
    assignCharacter: jest.fn(),
    unassignCharacter: jest.fn(),
  },
}));

const { playerRepository } = require("../src/modules/auth/auth.repository");

const request = require("supertest");
const { buildApp } = require("../src/app");

describe("google auth route", () => {
  const app = buildApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("creates a new google user and returns local jwt tokens", async () => {
    playerRepository.findByFirebaseUid.mockResolvedValue(null);
    playerRepository.findByEmail.mockResolvedValue(null);
    playerRepository.create.mockResolvedValue({
      id: "player-1",
      firebaseUid: "firebase-123",
      email: "google@example.com",
      companyName: null,
      displayName: "Google User",
      profilePicture: "https://example.com/avatar.png",
      coins: 1000,
      trustScore: 50,
      gems: 0,
      companyValue: 1000,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const response = await request(app)
      .post("/auth/google")
      .send({ idToken: "firebase-token" });

    expect(response.status).toBe(200);
    expect(response.body.player.email).toBe("google@example.com");
    expect(response.body.player.firebaseUid).toBe("firebase-123");
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
  });
});

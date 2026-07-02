jest.mock("../src/config/firebase", () => ({
  verifyFirebaseToken: jest.fn(),
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

const { googleAuth } = require("../src/services/auth.service");
const { verifyFirebaseToken } = require("../src/config/firebase");
const { playerRepository } = require("../src/modules/auth/auth.repository");

describe("google auth service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects non-google providers", async () => {
    verifyFirebaseToken.mockRejectedValue(
      new Error("Only Google sign-in is allowed"),
    );

    await expect(googleAuth({ idToken: "firebase-token" })).rejects.toThrow(
      "Only Google sign-in is allowed",
    );
  });

  test("links an existing player by email when firebase uid is missing", async () => {
    verifyFirebaseToken.mockResolvedValue({
      uid: "firebase-123",
      email: "google@example.com",
      name: "Google User",
      picture: "https://example.com/avatar.png",
      firebase: { sign_in_provider: "google.com" },
    });

    playerRepository.findByFirebaseUid.mockResolvedValue(null);
    playerRepository.findByEmail.mockResolvedValue({
      id: "player-1",
      firebaseUid: null,
      companyName: null,
      email: "google@example.com",
      displayName: null,
      profilePicture: null,
      coins: 1000,
      trustScore: 50,
      gems: 0,
      companyValue: 1000,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    playerRepository.update.mockResolvedValue({
      id: "player-1",
      firebaseUid: "firebase-123",
      companyName: null,
      email: "google@example.com",
      displayName: "Google User",
      profilePicture: "https://example.com/avatar.png",
      coins: 1000,
      trustScore: 50,
      gems: 0,
      companyValue: 1000,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const result = await googleAuth({ idToken: "firebase-token" });

    expect(playerRepository.update).toHaveBeenCalledWith(
      "player-1",
      expect.objectContaining({
        firebaseUid: "firebase-123",
        displayName: "Google User",
        profilePicture: "https://example.com/avatar.png",
      }),
    );
    expect(result.player.email).toBe("google@example.com");
    expect(result.access_token).toBeDefined();
    expect(result.refresh_token).toBeDefined();
  });
});

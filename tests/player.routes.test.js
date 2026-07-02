jest.mock("../src/middleware/auth", () => ({
  authRequired: (req, _res, next) => {
    req.user = { id: "player-1" };
    next();
  },
}));

jest.mock("../src/services/auth.service", () => ({
  setCompanyName: jest.fn().mockResolvedValue({
    id: "player-1",
    companyName: "kantipur",
    email: "player@example.com",
  }),
}));

const request = require("supertest");
const { buildApp } = require("../src/app");
const { setCompanyName } = require("../src/services/auth.service");

describe("player routes", () => {
  const app = buildApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("saves company name from snake_case payload", async () => {
    const response = await request(app)
      .post("/api/player/company-name")
      .send({ company_name: "kantipur" });

    expect(response.status).toBe(200);
    expect(setCompanyName).toHaveBeenCalledWith("player-1", "kantipur");
    expect(response.body.player.companyName).toBe("kantipur");
  });

  test("accepts camelCase payload too", async () => {
    const response = await request(app)
      .post("/api/player/company-name")
      .send({ companyName: "The Post" });

    expect(response.status).toBe(200);
    expect(setCompanyName).toHaveBeenCalledWith("player-1", "The Post");
    expect(response.body.player.companyName).toBe("kantipur");
  });
});

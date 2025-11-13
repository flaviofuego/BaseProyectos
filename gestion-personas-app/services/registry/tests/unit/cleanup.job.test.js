/**
 * Unit Test: Automatic cleanup job removes unhealthy services
 * - Mocks node-cron to capture scheduled callback
 * - Registers a service
 * - Advances time beyond heartbeat threshold
 * - Invokes scheduled cleanup and verifies service removed
 */

const request = require("supertest");

let scheduledCleanup;

// Mock node-cron BEFORE requiring the app to capture the scheduled function
jest.mock("node-cron", () => ({
  schedule: jest.fn((expr, fn) => {
    scheduledCleanup = fn;
    return { stop: jest.fn() };
  }),
}));

// Use modern fake timers to control time
jest.useFakeTimers();
jest.spyOn(global, "Date");

describe("Service Registry - automatic cleanup job", () => {
  let app;

  beforeAll(() => {
    // Fix initial time
    const startAt = new Date("2025-01-01T00:00:00Z");
    jest.setSystemTime(startAt);

    // Load the app (this wires the cron.schedule mock)
    app = require("../../index");
    expect(typeof scheduledCleanup).toBe("function");
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("removes services with stale heartbeat (older than 30s)", async () => {
    // 1) Register a service at T0
    await request(app)
      .post("/register")
      .send({
        serviceId: "stale-svc-1",
        name: "personas-service",
        host: "localhost",
        port: 3999,
      })
      .expect(201);

    // Sanity: service should be listed
    const before = await request(app).get("/services").expect(200);
    const beforeIds = before.body.services.map((s) => s.serviceId);
    expect(beforeIds).toContain("stale-svc-1");

    // 2) Advance time by 31 seconds so isHealthy(30000) becomes false
    jest.setSystemTime(new Date(Date.now() + 31_000));

    // 3) Run scheduled cleanup callback manually
    await scheduledCleanup();

    // 4) Verify service is gone
    const after = await request(app).get("/services").expect(200);
    const afterIds = after.body.services.map((s) => s.serviceId);
    expect(afterIds).not.toContain("stale-svc-1");
  });
});

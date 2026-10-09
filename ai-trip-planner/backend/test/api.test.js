const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
delete process.env.MONGODB_URI; // in-memory store
const app = require("../api/index.js");

let server, base;
before(() => new Promise((r) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
after(() => server.close());

const call = (method, path, body) => fetch(base + path, {
  method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined,
}).then(async (r) => ({ status: r.status, body: r.status === 204 ? null : await r.json() }));

test("create, read, update, list and delete a trip", async () => {
  const created = await call("POST", "/api/trips", { destination: "Jaipur", budget: 20000, startDate: "2026-11-01", endDate: "2026-11-03", travellers: 2 });
  assert.equal(created.status, 201);
  const id = created.body._id;
  assert.equal((await call("GET", `/api/trips/${id}`)).body.destination, "Jaipur");
  const patched = await call("PATCH", `/api/trips/${id}`, { plan: { days: 3 } });
  assert.equal(patched.body.plan.days, 3);
  assert.equal((await call("GET", "/api/trips")).body.length, 1);
  assert.equal((await call("DELETE", `/api/trips/${id}`)).status, 204);
  assert.equal((await call("GET", `/api/trips/${id}`)).status, 404);
});

test("rejects invalid trips", async () => {
  assert.equal((await call("POST", "/api/trips", { destination: "", budget: 1 })).status, 400);
  assert.equal((await call("POST", "/api/trips", { destination: "Goa", budget: 1000, startDate: "2026-11-05", endDate: "2026-11-01" })).status, 400);
});

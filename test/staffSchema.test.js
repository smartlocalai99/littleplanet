const test = require("node:test");
const assert = require("node:assert/strict");

const { ensureStaffAttendanceColumn } = require("../lib/staffSchema");

test("ensures staff attendance link column before reading staff records", async () => {
  const queries = [];
  const client = {
    query(sql) {
      queries.push(sql);
      return Promise.resolve();
    },
  };

  await ensureStaffAttendanceColumn(client);

  assert.equal(queries.length, 1);
  assert.match(queries[0], /ALTER TABLE public\.staff/);
  assert.match(queries[0], /ADD COLUMN IF NOT EXISTS attendance_staff_id UUID/);
});

const test = require("node:test");
const assert = require("node:assert/strict");

const { SCHOOL_CLASS_OPTIONS } = require("../lib/schoolClasses");

test("includes Play Class before Nursery", () => {
  assert.deepEqual(SCHOOL_CLASS_OPTIONS.slice(0, 2), ["Play Class", "Nursery"]);
});

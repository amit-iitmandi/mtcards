const { test } = require('node:test');
const assert = require('node:assert/strict');
const { currentCardYear } = require('../utils/cardYear');
test('card year follows the shop calendar at New Year', () => {
  assert.equal(currentCardYear(new Date('2026-12-31T18:29:59Z')), 2026);
  assert.equal(currentCardYear(new Date('2026-12-31T18:30:00Z')), 2027);
});

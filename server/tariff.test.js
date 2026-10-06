const assert = require('assert');
const { calculateBill } = require('./tariff');
assert.strictEqual(calculateBill(0), 500);
assert.strictEqual(calculateBill(5), 5 * 340 + 500);
assert.strictEqual(calculateBill(10), 5 * 340 + 5 * 720 + 500);
console.log('tariff tests passed');

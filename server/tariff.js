// Illustrative tiers - replace with official WASAC rates.
const TIERS = [
  { upTo: 5, rate: 340 },
  { upTo: 20, rate: 720 },
  { upTo: 50, rate: 850 },
  { upTo: Infinity, rate: 900 },
];
const FIXED_FEE = 500;

function calculateBill(m3) {
  let remaining = m3, prev = 0, total = 0;
  for (const t of TIERS) {
    const size = Math.min(remaining, t.upTo - prev);
    if (size > 0) total += size * t.rate;
    remaining -= size;
    prev = t.upTo;
    if (remaining <= 0) break;
  }
  return Math.round(total + FIXED_FEE);
}
module.exports = { calculateBill, FIXED_FEE };

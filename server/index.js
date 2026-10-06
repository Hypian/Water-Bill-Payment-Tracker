require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('./db');
const { calculateBill } = require('./tariff');

const SECRET = process.env.JWT_SECRET || 'dev-secret';
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---- middleware ----
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { res.status(401).json({ error: 'Not authenticated' }); }
}
const adminOnly = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admin only' });

const sign = u => jwt.sign({ id: u.id, role: u.role, name: u.full_name }, SECRET, { expiresIn: '7d' });

// ---- auth ----
app.post('/api/auth/register', (req, res) => {
  const { full_name, email, phone, password } = req.body;
  if (!full_name || !email || !password || password.length < 6)
    return res.status(400).json({ error: 'Name, email and password (6+ chars) required' });
  try {
    const r = db.prepare('INSERT INTO users (full_name,email,phone,password_hash) VALUES (?,?,?,?)')
      .run(full_name, email.toLowerCase(), phone || null, bcrypt.hashSync(password, 10));
    const u = { id: r.lastInsertRowid, role: 'customer', full_name };
    res.json({ token: sign(u), user: { name: full_name, role: 'customer' } });
  } catch { res.status(409).json({ error: 'Email already registered' }); }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const u = db.prepare('SELECT * FROM users WHERE email=?').get((email || '').toLowerCase());
  if (!u || !bcrypt.compareSync(password || '', u.password_hash))
    return res.status(401).json({ error: 'Invalid email or password' });
  res.json({ token: sign(u), user: { name: u.full_name, role: u.role } });
});

// ---- meters ----
app.get('/api/meters', auth, (req, res) => {
  const rows = req.user.role === 'admin'
    ? db.prepare('SELECT m.*, u.full_name FROM meters m JOIN users u ON u.id=m.user_id').all()
    : db.prepare('SELECT * FROM meters WHERE user_id=?').all(req.user.id);
  res.json(rows);
});
app.post('/api/meters', auth, (req, res) => {
  const { meter_number, location } = req.body;
  if (!meter_number) return res.status(400).json({ error: 'Meter number required' });
  try {
    db.prepare('INSERT INTO meters (user_id,meter_number,location) VALUES (?,?,?)')
      .run(req.user.id, meter_number, location || null);
    res.json({ ok: true });
  } catch { res.status(409).json({ error: 'Meter number already exists' }); }
});

// ---- readings -> bill ----
app.post('/api/readings', auth, adminOnly, (req, res) => {
  const { meter_id, current_value, reading_date } = req.body;
  const cur = Number(current_value);
  const meter = db.prepare('SELECT * FROM meters WHERE id=?').get(meter_id);
  if (!meter || !Number.isFinite(cur)) return res.status(400).json({ error: 'Valid meter and reading required' });
  const last = db.prepare('SELECT current_value FROM readings WHERE meter_id=? ORDER BY id DESC LIMIT 1').get(meter_id);
  const prev = last ? last.current_value : 0;
  if (cur < prev) return res.status(400).json({ error: `Reading must be >= previous (${prev})` });

  const date = reading_date || new Date().toISOString().slice(0, 10);
  const consumption = cur - prev;
  const amount = calculateBill(consumption);
  const due = new Date(date); due.setDate(due.getDate() + 15);

  const tx = db.transaction(() => {
    const r = db.prepare('INSERT INTO readings (meter_id,reading_date,previous_value,current_value,consumption,recorded_by) VALUES (?,?,?,?,?,?)')
      .run(meter_id, date, prev, cur, consumption, req.user.id);
    db.prepare('INSERT INTO bills (reading_id,meter_id,period,consumption,amount_rwf,due_date) VALUES (?,?,?,?,?,?)')
      .run(r.lastInsertRowid, meter_id, date.slice(0, 7), consumption, amount, due.toISOString().slice(0, 10));
  });
  tx();
  res.json({ consumption, amount_rwf: amount });
});

// ---- bills ----
app.get('/api/bills', auth, (req, res) => {
  db.prepare("UPDATE bills SET status='overdue' WHERE status='unpaid' AND due_date < date('now')").run();
  const base = `SELECT b.*, m.meter_number FROM bills b JOIN meters m ON m.id=b.meter_id`;
  const rows = req.user.role === 'admin'
    ? db.prepare(base + ' ORDER BY b.id DESC').all()
    : db.prepare(base + ' WHERE m.user_id=? ORDER BY b.id DESC').all(req.user.id);
  res.json(rows);
});

// ---- payments ----
app.post('/api/payments', auth, (req, res) => {
  const { bill_id, method, phone } = req.body;
  const bill = db.prepare('SELECT b.*, m.user_id FROM bills b JOIN meters m ON m.id=b.meter_id WHERE b.id=?').get(bill_id);
  if (!bill || bill.user_id !== req.user.id) return res.status(404).json({ error: 'Bill not found' });
  if (bill.status === 'paid') return res.status(400).json({ error: 'Bill already paid' });
  if (!['momo', 'airtel'].includes(method) || !/^07\d{8}$/.test(phone || ''))
    return res.status(400).json({ error: 'Choose a method and enter a valid 07XXXXXXXX phone' });

  // SIMULATED mobile-money call. Replace with the real provider API later.
  const receipt = 'WB' + Date.now().toString(36).toUpperCase();
  db.transaction(() => {
    db.prepare('INSERT INTO payments (bill_id,user_id,amount_rwf,method,phone,reference,receipt_no) VALUES (?,?,?,?,?,?,?)')
      .run(bill.id, req.user.id, bill.amount_rwf, method, phone, 'SIM-' + receipt, receipt);
    db.prepare("UPDATE bills SET status='paid' WHERE id=?").run(bill.id);
  })();
  res.json({ receipt_no: receipt, amount_rwf: bill.amount_rwf });
});

app.get('/api/payments', auth, (req, res) => {
  const { status, from, to } = req.query;
  let sql = `SELECT p.*, b.period, m.meter_number FROM payments p
             JOIN bills b ON b.id=p.bill_id JOIN meters m ON m.id=b.meter_id WHERE 1=1`;
  const args = [];
  if (req.user.role !== 'admin') { sql += ' AND p.user_id=?'; args.push(req.user.id); }
  if (status) { sql += ' AND p.status=?'; args.push(status); }
  if (from) { sql += ' AND date(p.paid_at)>=date(?)'; args.push(from); }
  if (to) { sql += ' AND date(p.paid_at)<=date(?)'; args.push(to); }
  res.json(db.prepare(sql + ' ORDER BY p.id DESC').all(...args));
});

// ---- admin stats ----
app.get('/api/stats', auth, adminOnly, (req, res) => {
  const q = s => db.prepare(s).get();
  res.json({
    billed: q('SELECT COALESCE(SUM(amount_rwf),0) v FROM bills').v,
    collected: q("SELECT COALESCE(SUM(amount_rwf),0) v FROM payments WHERE status='success'").v,
    overdue: q("SELECT COUNT(*) v FROM bills WHERE status='overdue'").v,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`WaterBill running on http://localhost:${PORT}`));

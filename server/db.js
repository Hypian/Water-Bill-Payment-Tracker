const Database = require('better-sqlite3');
const db = new Database(require('path').join(__dirname, 'waterbill.db'));
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS meters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  meter_number TEXT NOT NULL UNIQUE,
  location TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meter_id INTEGER NOT NULL REFERENCES meters(id),
  reading_date TEXT NOT NULL,
  previous_value REAL NOT NULL,
  current_value REAL NOT NULL,
  consumption REAL NOT NULL,
  recorded_by INTEGER REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reading_id INTEGER NOT NULL UNIQUE REFERENCES readings(id),
  meter_id INTEGER NOT NULL REFERENCES meters(id),
  period TEXT NOT NULL,
  consumption REAL NOT NULL,
  amount_rwf INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','paid','overdue')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER NOT NULL REFERENCES bills(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount_rwf INTEGER NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('momo','airtel','cash')),
  phone TEXT,
  reference TEXT,
  receipt_no TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed','pending')),
  paid_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);
module.exports = db;

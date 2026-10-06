const bcrypt = require('bcryptjs');
const db = require('./db');
const add = db.prepare('INSERT OR IGNORE INTO users (full_name,email,phone,password_hash,role) VALUES (?,?,?,?,?)');
add.run('Admin Officer', 'admin@demo.rw', '0780000000', bcrypt.hashSync('admin123', 10), 'admin');
add.run('Demo Customer', 'customer@demo.rw', '0781111111', bcrypt.hashSync('user123', 10), 'customer');
const c = db.prepare('SELECT id FROM users WHERE email=?').get('customer@demo.rw');
db.prepare('INSERT OR IGNORE INTO meters (user_id,meter_number,location) VALUES (?,?,?)').run(c.id, 'WM-0001', 'Kigali, Gasabo');
console.log('Seeded. admin@demo.rw/admin123  customer@demo.rw/user123');

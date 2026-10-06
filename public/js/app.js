import { api, session, rwf, toast } from './api.js';

const user = session.user;
if (!session.token || !user) location.href = '/';
const isAdmin = user.role === 'admin';
const $ = id => document.getElementById(id);
const view = $('view');

$('who').textContent = user.name;
$('logout').onclick = () => { session.clear(); location.href = '/'; };

const tabs = isAdmin
  ? { Overview: adminOverview, 'Enter Reading': readingForm, Payments: history }
  : { Dashboard: dashboard, Bills: bills, History: history, Meters: meters };

const nav = $('nav');
Object.keys(tabs).forEach(name => {
  const b = document.createElement('button');
  b.textContent = name;
  b.onclick = () => show(name);
  nav.appendChild(b);
});

function show(name) {
  [...nav.children].forEach(b => b.classList.toggle('active', b.textContent === name));
  tabs[name]().catch(e => toast(e.message));
}

const badge = s => `<span class="badge ${s}">${s}</span>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- customer ----------
async function dashboard() {
  const list = await api('/bills');
  const owed = list.filter(b => b.status !== 'paid').reduce((s, b) => s + b.amount_rwf, 0);
  view.innerHTML = `<div class="stats">
    <div class="card stat"><b>${rwf(owed)}</b>Outstanding balance</div>
    <div class="card stat"><b>${list.filter(b => b.status === 'overdue').length}</b>Overdue bills</div>
    <div class="card stat"><b>${list.length}</b>Total bills</div></div>
    <div class="card"><h3>Consumption (m³)</h3>${chart(list)}</div>`;
}

function chart(list) {
  const data = list.slice(0, 6).reverse();
  if (!data.length) return '<p>No bills yet.</p>';
  const max = Math.max(...data.map(b => b.consumption), 1);
  return data.map(b => `<div style="display:flex;align-items:center;gap:8px;margin:4px 0">
    <span style="width:70px">${b.period}</span>
    <div style="background:var(--accent);height:16px;width:${(b.consumption / max) * 100}%"></div>
    <span>${b.consumption}</span></div>`).join('');
}

async function bills() {
  const list = await api('/bills');
  view.innerHTML = `<div class="card table-wrap"><h3>My Bills</h3><table>
    <tr><th>Period</th><th>Meter</th><th>m³</th><th>Amount</th><th>Due</th><th>Status</th><th></th></tr>
    ${list.map(b => `<tr><td>${b.period}</td><td>${esc(b.meter_number)}</td><td>${b.consumption}</td>
      <td>${rwf(b.amount_rwf)}</td><td>${b.due_date}</td><td>${badge(b.status)}</td>
      <td>${b.status !== 'paid' ? `<button class="btn" data-pay="${b.id}" style="margin:0">Pay</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7">No bills yet</td></tr>'}
    </table></div><div id="payBox"></div>`;
  view.querySelectorAll('[data-pay]').forEach(btn => btn.onclick = () => payForm(btn.dataset.pay));
}

function payForm(id) {
  $('payBox').innerHTML = `<div class="card"><h3>Pay bill #${id}</h3>
    <label for="method">Method</label><select id="method"><option value="momo">MTN MoMo</option><option value="airtel">Airtel Money</option></select>
    <label for="phone">Phone (07XXXXXXXX)</label><input id="phone" type="tel">
    <button class="btn" id="confirm">Confirm payment</button></div>`;
  $('confirm').onclick = async () => {
    try {
      const r = await api('/payments', 'POST', { bill_id: Number(id), method: $('method').value, phone: $('phone').value });
      toast('Paid! Receipt ' + r.receipt_no);
      show('History');
    } catch (e) { toast(e.message); }
  };
}

async function history() {
  const rows = await api('/payments');
  view.innerHTML = `<div class="card table-wrap"><h3>Payment History</h3><table>
    <tr><th>Receipt</th><th>Date</th><th>Period</th><th>Meter</th><th>Method</th><th>Amount</th></tr>
    ${rows.map(p => `<tr><td>${esc(p.receipt_no)}</td><td>${p.paid_at}</td><td>${p.period}</td>
      <td>${esc(p.meter_number)}</td><td>${p.method}</td><td>${rwf(p.amount_rwf)}</td></tr>`).join('') || '<tr><td colspan="6">No payments yet</td></tr>'}
    </table><button class="btn secondary" onclick="window.print()">Print</button></div>`;
}

async function meters() {
  const list = await api('/meters');
  view.innerHTML = `<div class="card"><h3>My Meters</h3><ul>${list.map(m => `<li>${esc(m.meter_number)} - ${esc(m.location)}</li>`).join('')}</ul></div>
    <div class="card"><h3>Add meter</h3>
    <label for="mn">Meter number</label><input id="mn"><label for="ml">Location</label><input id="ml">
    <button class="btn" id="addM">Add</button></div>`;
  $('addM').onclick = async () => {
    try { await api('/meters', 'POST', { meter_number: $('mn').value, location: $('ml').value }); meters(); }
    catch (e) { toast(e.message); }
  };
}

// ---------- admin ----------
async function adminOverview() {
  const s = await api('/stats');
  view.innerHTML = `<div class="stats">
    <div class="card stat"><b>${rwf(s.billed)}</b>Total billed</div>
    <div class="card stat"><b>${rwf(s.collected)}</b>Collected</div>
    <div class="card stat"><b>${s.overdue}</b>Overdue bills</div></div>`;
}

async function readingForm() {
  const list = await api('/meters');
  view.innerHTML = `<div class="card"><h3>Enter meter reading</h3>
    <label for="meter">Meter</label><select id="meter">${list.map(m => `<option value="${m.id}">${esc(m.meter_number)} - ${esc(m.full_name)}</option>`).join('')}</select>
    <label for="val">Current reading (m³)</label><input id="val" type="number" min="0" step="0.1">
    <button class="btn" id="save">Save & generate bill</button></div>`;
  $('save').onclick = async () => {
    try {
      const r = await api('/readings', 'POST', { meter_id: Number($('meter').value), current_value: $('val').value });
      toast(`Bill created: ${r.consumption} m³ = ${rwf(r.amount_rwf)}`);
    } catch (e) { toast(e.message); }
  };
}

show(Object.keys(tabs)[0]);

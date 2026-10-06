import { api, session, rwf, toast, dialog, theme } from './api.js';
import { messages } from './messages.js';

const user = session.user;
if (!session.token || !user) {
  location.href = '/';
}

const isAdmin = user.role === 'admin';
const $ = id => document.getElementById(id);
const view = $('view');

// Header user pill
$('who').textContent = user.name;

// Theme toggle button in header
const themeToggle = $('themeToggle');
const themeIcon = $('themeIcon');
const syncThemeIcon = () => {
  const current = theme.get();
  themeIcon.className = current === 'dark' ? 'bx bx-sun' : 'bx bx-moon';
};
syncThemeIcon();
themeToggle.onclick = () => {
  theme.toggle();
  syncThemeIcon();
};

// Accessible logout confirmation dialog
$('logout').onclick = () => {
  dialog.open({
    title: messages.session.logoutConfirmTitle,
    contentHtml: `<p>${messages.session.logoutConfirmBody}</p>`,
    confirmText: messages.session.logoutConfirmAction,
    cancelText: messages.session.cancel,
    isDestructive: true,
    onConfirm: () => {
      session.clear();
      location.href = '/';
    }
  });
};

// Tabs definition with Boxicons
const tabConfig = isAdmin
  ? [
      { id: 'Overview', label: 'Overview', icon: 'bx-pie-chart-alt-2', fn: adminOverview },
      { id: 'Enter Reading', label: 'Enter Reading', icon: 'bx-tachometer', fn: readingForm },
      { id: 'Payments', label: 'Payments', icon: 'bx-receipt', fn: history }
    ]
  : [
      { id: 'Dashboard', label: 'Dashboard', icon: 'bx-grid-alt', fn: dashboard },
      { id: 'Bills', label: 'Bills', icon: 'bx-file', fn: bills },
      { id: 'History', label: 'History', icon: 'bx-history', fn: history },
      { id: 'Meters', label: 'Meters', icon: 'bx-water', fn: meters }
    ];

const nav = $('nav');
tabConfig.forEach(tab => {
  const b = document.createElement('button');
  b.innerHTML = `<i class="bx ${tab.icon}"></i> <span>${tab.label}</span>`;
  b.onclick = () => show(tab.id);
  nav.appendChild(b);
});

function show(tabId) {
  const target = tabConfig.find(t => t.id === tabId);
  if (!target) return;
  [...nav.children].forEach((b, idx) => {
    b.classList.toggle('active', tabConfig[idx].id === tabId);
  });
  renderLoadingState();
  target.fn().catch(e => {
    toast.error(e.message);
    renderErrorState(e.message, () => show(tabId));
  });
}

// Helpers
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const badge = status => {
  const map = {
    paid: { text: messages.status.paid, icon: 'bx-check-circle', cls: 'paid' },
    success: { text: messages.status.paid, icon: 'bx-check-circle', cls: 'paid' },
    unpaid: { text: messages.status.unpaid, icon: 'bx-time-five', cls: 'unpaid' },
    pending: { text: messages.status.unpaid, icon: 'bx-time-five', cls: 'unpaid' },
    overdue: { text: messages.status.overdue, icon: 'bx-error-circle', cls: 'overdue' },
    failed: { text: 'Failed', icon: 'bx-x-circle', cls: 'overdue' }
  };
  const item = map[status] || { text: status, icon: 'bx-info-circle', cls: '' };
  return `<span class="badge ${item.cls}"><i class="bx ${item.icon}"></i> ${item.text}</span>`;
};

function renderLoadingState() {
  view.innerHTML = `
    <div style="padding:48px 0;text-align:center;">
      <i class="bx bx-loader-alt bx-spin" style="font-size:2.5rem;color:var(--primary-500);margin-bottom:12px;"></i>
      <p style="font-size:0.9375rem;color:var(--text-secondary);">${messages.common.loading}</p>
    </div>
  `;
}

function renderErrorState(err, onRetry) {
  view.innerHTML = `
    <div class="card empty-state">
      <div class="empty-icon"><i class="bx bx-wifi-off"></i></div>
      <div class="empty-title">Unable to load data</div>
      <div class="empty-desc">${esc(err)}</div>
      <button class="btn btn-primary" id="retryBtn"><i class="bx bx-refresh"></i> ${messages.common.retry}</button>
    </div>
  `;
  $('retryBtn').onclick = onRetry;
}

/* ==========================================================================
   CUSTOMER: Screen 1 — Dashboard
   ========================================================================== */
async function dashboard() {
  const [list, meterList] = await Promise.all([api('/bills'), api('/meters')]);
  const unpaidList = list.filter(b => b.status !== 'paid');
  const owed = unpaidList.reduce((s, b) => s + b.amount_rwf, 0);
  const overdueCount = list.filter(b => b.status === 'overdue').length;

  // Hero card (Stripe/Monzo calm luxury)
  const heroHtml = `
    <div class="hero-card">
      <div class="hero-label">
        <i class="bx bx-wallet"></i> ${messages.dashboard.heroTitle}
      </div>
      <div class="hero-amount tabular-num">${rwf(owed)}</div>
      <div class="hero-footer">
        <div>
          ${owed > 0
            ? `<span style="color:var(--text-secondary);font-size:0.875rem;">
                <i class="bx bx-bell" style="color:var(--warning-solid)"></i> ${unpaidList.length} outstanding invoice(s)
               </span>`
            : `<span style="color:var(--success-text);font-weight:600;font-size:0.875rem;">
                <i class="bx bx-check-double"></i> ${messages.dashboard.noBalance}
               </span>`
          }
          ${overdueCount > 0 ? `<span class="badge overdue" style="margin-left:8px;"><i class="bx bx-error-circle"></i> ${overdueCount} Overdue</span>` : ''}
        </div>
        ${owed > 0 ? `<button class="btn btn-primary btn-sm" id="heroPayBtn"><i class="bx bx-credit-card"></i> Pay Outstanding</button>` : ''}
      </div>
    </div>
  `;

  // Stats Grid
  const statsHtml = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon primary"><i class="bx bx-water"></i></div>
        <div class="stat-info">
          <b class="tabular-num">${meterList.length}</b>
          <span>${messages.dashboard.statActiveMeters}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon warning"><i class="bx bx-error"></i></div>
        <div class="stat-info">
          <b class="tabular-num">${overdueCount}</b>
          <span>${messages.dashboard.statOverdue}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon success"><i class="bx bx-file"></i></div>
        <div class="stat-info">
          <b class="tabular-num">${list.length}</b>
          <span>${messages.dashboard.statTotalBills}</span>
        </div>
      </div>
    </div>
  `;

  // Consumption Visualizer
  const chartHtml = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <i class="bx bx-line-chart"></i>
          <div>
            <h3>${messages.dashboard.consumptionTitle}</h3>
            <p style="font-size:0.8125rem;color:var(--text-tertiary);">${messages.dashboard.consumptionSubtitle}</p>
          </div>
        </div>
      </div>
      ${renderConsumptionChart(list)}
    </div>
  `;

  view.innerHTML = heroHtml + statsHtml + chartHtml;

  const heroPayBtn = $('heroPayBtn');
  if (heroPayBtn) {
    heroPayBtn.onclick = () => show('Bills');
  }
}

function renderConsumptionChart(list) {
  const data = list.slice(0, 6).reverse();
  if (!data.length) {
    return `
      <div class="empty-state" style="padding:24px;">
        <i class="bx bx-bar-chart-alt-2 empty-icon" style="font-size:2rem;"></i>
        <div class="empty-desc">${messages.dashboard.noConsumption}</div>
      </div>
    `;
  }
  const max = Math.max(...data.map(b => b.consumption), 1);
  return `
    <div class="chart-container">
      ${data.map(b => {
        const pct = Math.max((b.consumption / max) * 100, 3);
        return `
          <div class="chart-row">
            <span class="chart-period">${b.period}</span>
            <div class="chart-bar-bg">
              <div class="chart-bar-fill" style="width:${pct}%"></div>
            </div>
            <span class="chart-value tabular-num">${b.consumption} m³</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/* ==========================================================================
   CUSTOMER: Screen 2 — Bills & Invoices List
   ========================================================================== */
async function bills() {
  const list = await api('/bills');

  view.innerHTML = `
    <div class="card">
      <div class="card-header" style="flex-wrap:wrap;gap:12px;">
        <div class="card-title">
          <i class="bx bx-receipt"></i>
          <div>
            <h2>${messages.bills.title}</h2>
            <p style="font-size:0.8125rem;">${messages.bills.subtitle}</p>
          </div>
        </div>
        <div class="nav-pills" id="billFilters" style="margin:0;">
          <button class="active" data-filter="all">${messages.bills.filterAll}</button>
          <button data-filter="unpaid">${messages.bills.filterUnpaid}</button>
          <button data-filter="overdue">${messages.bills.filterOverdue}</button>
          <button data-filter="paid">${messages.bills.filterPaid}</button>
        </div>
      </div>

      <div class="table-wrap">
        <table class="table-cards" id="billsTable">
          <thead>
            <tr>
              <th>${messages.bills.colPeriod}</th>
              <th>${messages.bills.colMeter}</th>
              <th>${messages.bills.colConsumption}</th>
              <th>${messages.bills.colAmount}</th>
              <th>${messages.bills.colDue}</th>
              <th>${messages.bills.colStatus}</th>
              <th style="text-align:right;">${messages.bills.colActions}</th>
            </tr>
          </thead>
          <tbody id="billsBody">
            ${renderBillRows(list)}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Attach pay buttons
  attachPayButtons(list);

  // Status Filter clicks
  const filters = $('billFilters');
  filters.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => {
      filters.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      const filtered = f === 'all' ? list : list.filter(b => b.status === f);
      $('billsBody').innerHTML = renderBillRows(filtered);
      attachPayButtons(filtered);
    };
  });
}

function renderBillRows(items) {
  if (!items.length) {
    return `
      <tr>
        <td colspan="7" style="text-align:center;padding:36px;">
          <i class="bx bx-check-circle" style="font-size:2rem;color:var(--text-tertiary);display:block;margin-bottom:8px;"></i>
          <span style="color:var(--text-secondary);font-size:0.9rem;">${messages.bills.emptyTitle}</span>
        </td>
      </tr>
    `;
  }

  return items.map(b => `
    <tr>
      <td data-label="${messages.bills.colPeriod}"><strong>${b.period}</strong></td>
      <td data-label="${messages.bills.colMeter}"><span class="tabular-num">${esc(b.meter_number)}</span></td>
      <td data-label="${messages.bills.colConsumption}"><span class="tabular-num">${b.consumption} m³</span></td>
      <td data-label="${messages.bills.colAmount}"><strong class="tabular-num">${rwf(b.amount_rwf)}</strong></td>
      <td data-label="${messages.bills.colDue}"><span class="due-date tabular-num">${b.due_date}</span></td>
      <td data-label="${messages.bills.colStatus}">${badge(b.status)}</td>
      <td data-label="${messages.bills.colActions}" style="text-align:right;">
        ${b.status !== 'paid'
          ? `<button class="btn btn-primary btn-sm" data-pay="${b.id}">
               <i class="bx bx-credit-card"></i> ${messages.bills.actionPay}
             </button>`
          : `<span style="color:var(--success-text);font-size:0.8125rem;font-weight:600;"><i class="bx bx-check"></i> Settled</span>`
        }
      </td>
    </tr>
  `).join('');
}

function attachPayButtons(billList) {
  view.querySelectorAll('[data-pay]').forEach(btn => {
    btn.onclick = () => {
      const bId = Number(btn.dataset.pay);
      const targetBill = billList.find(x => x.id === bId);
      if (targetBill) openPayModal(targetBill);
    };
  });
}

/* ==========================================================================
   CUSTOMER: Screen 3 — Focused Checkout / Pay Flow
   ========================================================================== */
function openPayModal(bill) {
  const content = `
    <div style="background-color:var(--bg);padding:16px;border-radius:var(--radius-sm);margin-bottom:20px;border:1px solid var(--border-subtle);">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:0.875rem;">
        <span style="color:var(--text-secondary);">${messages.pay.period}</span>
        <strong>${bill.period}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:0.875rem;">
        <span style="color:var(--text-secondary);">${messages.pay.meter}</span>
        <strong class="tabular-num">${esc(bill.meter_number)}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:0.875rem;">
        <span style="color:var(--text-secondary);">${messages.pay.consumption}</span>
        <strong>${bill.consumption} m³</strong>
      </div>
      <div style="display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid var(--border-subtle);align-items:center;">
        <span style="font-weight:600;">${messages.pay.amountDue}</span>
        <strong style="font-size:1.35rem;color:var(--primary-500);font-family:var(--font-display);" class="tabular-num">${rwf(bill.amount_rwf)}</strong>
      </div>
    </div>

    <div class="form-group">
      <label for="payMethod">${messages.pay.selectMethod}</label>
      <div class="input-wrap">
        <i class="bx bx-mobile-alt"></i>
        <select id="payMethod">
          <option value="momo">MTN Mobile Money</option>
          <option value="airtel">Airtel Money</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label for="payPhone">${messages.pay.phoneLabel}</label>
      <div class="input-wrap">
        <i class="bx bx-phone"></i>
        <input id="payPhone" type="tel" placeholder="07XXXXXXXX" value="${user.phone || ''}">
      </div>
      <div class="input-hint">${messages.pay.phoneHelper}</div>
      <div class="input-error" id="payPhoneErr" style="display:none;"></div>
    </div>
  `;

  dialog.open({
    title: messages.pay.checkoutTitle,
    contentHtml: content,
    confirmText: `<i class="bx bx-lock-alt"></i> ${messages.pay.confirmAction}`,
    cancelText: messages.common.close,
    onConfirm: async () => {
      const method = document.getElementById('payMethod').value;
      const phone = document.getElementById('payPhone').value.trim();
      const errEl = document.getElementById('payPhoneErr');

      if (!/^07\d{8}$/.test(phone)) {
        errEl.textContent = messages.pay.errors.invalidPhone;
        errEl.style.display = 'flex';
        return false;
      }

      // Show processing feedback
      const confirmBtn = document.getElementById('dlgConfirm');
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Processing...';

      try {
        const r = await api('/payments', 'POST', { bill_id: bill.id, method, phone });
        dialog.close();
        openReceiptModal(r, bill);
        return true;
      } catch (e) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `<i class="bx bx-lock-alt"></i> ${messages.pay.confirmAction}`;
        errEl.textContent = e.message;
        errEl.style.display = 'flex';
        return false;
      }
    }
  });
}

function openReceiptModal(payment, bill) {
  const content = `
    <div style="text-align:center;margin-bottom:20px;">
      <div style="width:54px;height:54px;border-radius:var(--radius-full);background-color:var(--success-bg);color:var(--success-solid);display:inline-flex;align-items:center;justify-content:center;font-size:2rem;margin-bottom:12px;">
        <i class="bx bx-check"></i>
      </div>
      <h3 style="font-size:1.25rem;color:var(--text-primary);margin-bottom:4px;">${messages.pay.successTitle}</h3>
      <p style="font-size:0.875rem;">${messages.pay.successBody}</p>
    </div>

    <div style="background-color:var(--bg);padding:18px;border-radius:var(--radius-md);border:1px solid var(--border-subtle);font-size:0.875rem;line-height:1.7;">
      <div style="display:flex;justify-content:space-between;">
        <span style="color:var(--text-secondary);">${messages.pay.receiptNo}:</span>
        <strong class="receipt-badge" style="font-family:monospace;letter-spacing:0.05em;">${payment.receipt_no}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:var(--text-secondary);">${messages.pay.period}:</span>
        <strong>${bill.period}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:var(--text-secondary);">${messages.pay.meter}:</span>
        <strong class="tabular-num">${esc(bill.meter_number)}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;padding-top:10px;margin-top:6px;border-top:1px solid var(--border-subtle);align-items:center;">
        <span style="font-weight:600;">Amount Settled:</span>
        <strong style="color:var(--success-solid);font-size:1.15rem;" class="tabular-num">${rwf(payment.amount_rwf)}</strong>
      </div>
    </div>
  `;

  dialog.open({
    title: 'Payment Receipt',
    contentHtml: content,
    confirmText: `<i class="bx bx-printer"></i> ${messages.pay.downloadReceipt}`,
    cancelText: messages.pay.done,
    onConfirm: () => {
      window.print();
      show('History');
      return true;
    }
  });
}

/* ==========================================================================
   CUSTOMER/ADMIN: Screen 4 — Payment History
   ========================================================================== */
async function history() {
  const rows = await api('/payments');

  view.innerHTML = `
    <div class="card">
      <div class="card-header" style="flex-wrap:wrap;gap:12px;">
        <div class="card-title">
          <i class="bx bx-history"></i>
          <div>
            <h2>${messages.history.title}</h2>
            <p style="font-size:0.8125rem;">${messages.history.subtitle}</p>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="window.print()">
          <i class="bx bx-printer"></i> ${messages.history.actionPrint}
        </button>
      </div>

      <div class="table-wrap">
        <table class="table-cards">
          <thead>
            <tr>
              <th>${messages.history.colReceipt}</th>
              <th>${messages.history.colDate}</th>
              <th>${messages.history.colPeriod}</th>
              <th>${messages.history.colMeter}</th>
              <th>${messages.history.colMethod}</th>
              <th>${messages.history.colAmount}</th>
              <th style="text-align:right;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map(p => `
              <tr>
                <td data-label="${messages.history.colReceipt}"><strong class="tabular-num">${esc(p.receipt_no)}</strong></td>
                <td data-label="${messages.history.colDate}"><span class="tabular-num" style="color:var(--text-secondary);font-size:0.875rem;">${p.paid_at}</span></td>
                <td data-label="${messages.history.colPeriod}"><strong>${p.period}</strong></td>
                <td data-label="${messages.history.colMeter}"><span class="tabular-num">${esc(p.meter_number)}</span></td>
                <td data-label="${messages.history.colMethod}">
                  <span style="display:inline-flex;align-items:center;gap:4px;text-transform:uppercase;font-size:0.8125rem;font-weight:600;">
                    <i class="bx bx-mobile-alt"></i> ${p.method}
                  </span>
                </td>
                <td data-label="${messages.history.colAmount}"><strong class="tabular-num" style="color:var(--success-solid);">${rwf(p.amount_rwf)}</strong></td>
                <td data-label="Status" style="text-align:right;">${badge('paid')}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="7" style="text-align:center;padding:36px;">
                  <i class="bx bx-receipt" style="font-size:2rem;color:var(--text-tertiary);display:block;margin-bottom:8px;"></i>
                  <span style="color:var(--text-secondary);font-size:0.9rem;">${messages.history.emptyTitle}</span>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ==========================================================================
   CUSTOMER: Screen 5 — Meters Management
   ========================================================================== */
async function meters() {
  const list = await api('/meters');

  const metersListHtml = list.length
    ? list.map(m => `
        <div class="stat-card" style="margin-bottom:12px;">
          <div class="stat-icon primary"><i class="bx bx-water"></i></div>
          <div class="stat-info" style="flex:1;">
            <b class="tabular-num" style="font-size:1.15rem;">${esc(m.meter_number)}</b>
            <span><i class="bx bx-map-pin"></i> ${esc(m.location || 'Standard location')}</span>
            <div style="margin-top:6px;font-size:0.75rem;color:var(--text-tertiary);">
              Connected: ${m.created_at || 'Active'}
            </div>
          </div>
          <span class="badge paid"><i class="bx bx-check"></i> Active</span>
        </div>
      `).join('')
    : `
        <div class="empty-state" style="padding:24px;">
          <i class="bx bx-tachometer empty-icon"></i>
          <div class="empty-title">${messages.meters.emptyTitle}</div>
          <div class="empty-desc">${messages.meters.emptyBody}</div>
        </div>
      `;

  view.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:20px;">
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <i class="bx bx-water"></i>
            <div>
              <h2>${messages.meters.title}</h2>
              <p style="font-size:0.8125rem;">${messages.meters.subtitle}</p>
            </div>
          </div>
        </div>
        ${metersListHtml}
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <i class="bx bx-plus-circle"></i>
            <div>
              <h2>${messages.meters.addTitle}</h2>
              <p style="font-size:0.8125rem;">${messages.meters.addSubtitle}</p>
            </div>
          </div>
        </div>

        <form id="addMeterForm" onsubmit="return false;" novalidate>
          <div class="form-group">
            <label for="mn">${messages.meters.addMeterNumberLabel}</label>
            <div class="input-wrap">
              <i class="bx bx-barcode"></i>
              <input id="mn" placeholder="${messages.meters.addMeterNumberPlaceholder}" required>
            </div>
            <div class="input-error" id="mnErr" style="display:none;"></div>
          </div>

          <div class="form-group">
            <label for="ml">${messages.meters.addLocationLabel}</label>
            <div class="input-wrap">
              <i class="bx bx-map"></i>
              <input id="ml" placeholder="${messages.meters.addLocationPlaceholder}">
            </div>
          </div>

          <button class="btn btn-primary" id="addM" style="width:100%;margin-top:8px;">
            <i class="bx bx-plus"></i> ${messages.meters.addAction}
          </button>
        </form>
      </div>
    </div>
  `;

  $('addM').onclick = async () => {
    const meter_number = $('mn').value.trim();
    const location = $('ml').value.trim();
    const errEl = $('mnErr');

    if (!meter_number) {
      errEl.textContent = messages.meters.errors.numberRequired;
      errEl.style.display = 'flex';
      return;
    }
    errEl.style.display = 'none';

    try {
      await api('/meters', 'POST', { meter_number, location });
      toast.success(messages.meters.successAdded);
      meters();
    } catch (e) {
      toast.error(e.message);
    }
  };
}

/* ==========================================================================
   ADMIN: Screen 6 — Executive Stats Overview
   ========================================================================== */
async function adminOverview() {
  const s = await api('/stats');

  view.innerHTML = `
    <div style="margin-bottom:24px;">
      <h2>${messages.admin.overviewTitle}</h2>
      <p>${messages.admin.overviewSubtitle}</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon primary"><i class="bx bx-coin-stack"></i></div>
        <div class="stat-info">
          <b class="tabular-num">${rwf(s.billed)}</b>
          <span>${messages.admin.kpiBilled}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon success"><i class="bx bx-check-shield"></i></div>
        <div class="stat-info">
          <b class="tabular-num" style="color:var(--success-solid);">${rwf(s.collected)}</b>
          <span>${messages.admin.kpiCollected}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon danger"><i class="bx bx-error-circle"></i></div>
        <div class="stat-info">
          <b class="tabular-num" style="color:var(--danger-text);">${s.overdue}</b>
          <span>${messages.admin.kpiOverdue}</span>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:24px;">
      <div class="card-header">
        <div class="card-title">
          <i class="bx bx-bulb"></i>
          <h3>Fast Administrative Actions</h3>
        </div>
      </div>
      <p style="margin-bottom:16px;">Quickly record new meter readings or inspect system-wide payment settlements.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" id="adminGoReadings"><i class="bx bx-tachometer"></i> Record Meter Reading</button>
        <button class="btn btn-secondary btn-sm" id="adminGoPayments"><i class="bx bx-receipt"></i> View Payments Ledger</button>
      </div>
    </div>
  `;

  $('adminGoReadings').onclick = () => show('Enter Reading');
  $('adminGoPayments').onclick = () => show('Payments');
}

/* ==========================================================================
   ADMIN: Screen 7 — Enter Meter Reading
   ========================================================================== */
async function readingForm() {
  const list = await api('/meters');

  if (!list.length) {
    view.innerHTML = `
      <div class="card empty-state">
        <i class="bx bx-info-circle empty-icon"></i>
        <div class="empty-title">No meters configured</div>
        <div class="empty-desc">Customers have not registered any water meters yet.</div>
      </div>
    `;
    return;
  }

  view.innerHTML = `
    <div class="card" style="max-width:540px;margin:0 auto;">
      <div class="card-header">
        <div class="card-title">
          <i class="bx bx-tachometer"></i>
          <div>
            <h2>${messages.admin.readingTitle}</h2>
            <p style="font-size:0.8125rem;">${messages.admin.readingSubtitle}</p>
          </div>
        </div>
      </div>

      <form id="readingFormEl" onsubmit="return false;" novalidate>
        <div class="form-group">
          <label for="meter">${messages.admin.selectMeterLabel}</label>
          <div class="input-wrap">
            <i class="bx bx-barcode"></i>
            <select id="meter">
              ${list.map(m => `<option value="${m.id}">${esc(m.meter_number)} — ${esc(m.full_name)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="val">${messages.admin.currentReadingLabel}</label>
          <div class="input-wrap">
            <i class="bx bx-slider-alt"></i>
            <input id="val" type="number" min="0" step="0.1" placeholder="${messages.admin.currentReadingPlaceholder}" required>
          </div>
          <div class="input-hint">Must be greater than or equal to the previous reading</div>
          <div class="input-error" id="valErr" style="display:none;"></div>
        </div>

        <button class="btn btn-primary" id="save" style="width:100%;margin-top:10px;">
          <i class="bx bx-check"></i> ${messages.admin.saveReadingAction}
        </button>
      </form>
    </div>
  `;

  $('save').onclick = async () => {
    const meter_id = Number($('meter').value);
    const current_value = $('val').value.trim();
    const errEl = $('valErr');

    if (!current_value || Number(current_value) < 0) {
      errEl.textContent = 'Please enter a valid reading value in cubic meters (m³).';
      errEl.style.display = 'flex';
      return;
    }
    errEl.style.display = 'none';

    const saveBtn = $('save');
    const origHtml = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Saving...';

    try {
      const r = await api('/readings', 'POST', { meter_id, current_value });
      toast.success(
        messages.admin.readingSuccess.replace('{consumption}', r.consumption).replace('{amount}', rwf(r.amount_rwf)),
        'Invoice Generated'
      );
      $('val').value = '';
      saveBtn.disabled = false;
      saveBtn.innerHTML = origHtml;
    } catch (e) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = origHtml;
      errEl.textContent = e.message;
      errEl.style.display = 'flex';
      toast.error(e.message);
    }
  };
}

// Initial view boot
show(tabConfig[0].id);

import { messages } from './messages.js';

export const session = {
  get token() { return localStorage.getItem('wb_token'); },
  get user() { return JSON.parse(localStorage.getItem('wb_user') || 'null'); },
  set(token, user) {
    localStorage.setItem('wb_token', token);
    localStorage.setItem('wb_user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('wb_token');
    localStorage.removeItem('wb_user');
  },
};

// Theme preference
export const theme = {
  get() { return localStorage.getItem('wb_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); },
  set(val) {
    localStorage.setItem('wb_theme', val);
    document.documentElement.setAttribute('data-theme', val);
  },
  toggle() {
    const next = this.get() === 'dark' ? 'light' : 'dark';
    this.set(next);
    return next;
  },
  init() {
    document.documentElement.setAttribute('data-theme', this.get());
  }
};
theme.init();

// Currency formatter for Rwandan Francs (RWF)
export const rwf = n => new Intl.NumberFormat('en-RW', {
  style: 'currency',
  currency: 'RWF',
  maximumFractionDigits: 0
}).format(n ?? 0);

// API Fetch Helper (Zero alteration to business logic/routes)
export async function api(path, method = 'GET', body) {
  const res = await fetch('/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(session.token && { Authorization: 'Bearer ' + session.token }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && session.token) {
    session.clear();
    toast.show({
      type: 'warning',
      title: messages.session.expiredTitle,
      message: messages.session.expiredBody,
    });
    setTimeout(() => { location.href = '/'; }, 1200);
    throw new Error(messages.session.expiredBody);
  }

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

/* ==========================================================================
   FEEDBACK LAYER: Toast Stack System
   ========================================================================== */
class ToastManager {
  constructor() {
    this.container = null;
  }

  ensureContainer() {
    if (!this.container || !document.body.contains(this.container)) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.setAttribute('aria-live', 'polite');
      document.body.appendChild(this.container);
    }
  }

  show({ type = 'info', title = '', message = '', duration = 4000 }) {
    this.ensureContainer();

    const toastEl = document.createElement('div');
    toastEl.className = `toast ${type}`;
    toastEl.setAttribute('role', type === 'error' ? 'alert' : 'status');

    const iconMap = {
      success: 'bx-check-circle',
      error: 'bx-error-circle',
      warning: 'bx-error',
      info: 'bx-info-circle'
    };
    const iconClass = iconMap[type] || 'bx-bell';

    toastEl.innerHTML = `
      <i class="bx ${iconClass} toast-icon" aria-hidden="true"></i>
      <div class="toast-body">
        ${title ? `<b>${title}</b>` : ''}
        <div>${message}</div>
      </div>
      <button class="btn-icon" style="width:24px;height:24px;border:none;margin-left:8px;" aria-label="Dismiss">
        <i class="bx bx-x" style="font-size:1.1rem"></i>
      </button>
    `;

    const closeBtn = toastEl.querySelector('button');
    let timer = null;

    const dismiss = () => {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateY(8px) scale(0.95)';
      setTimeout(() => toastEl.remove(), 200);
    };

    closeBtn.onclick = dismiss;

    if (duration > 0) {
      timer = setTimeout(dismiss, duration);
      toastEl.onmouseenter = () => clearTimeout(timer);
      toastEl.onmouseleave = () => { timer = setTimeout(dismiss, 1500); };
    }

    this.container.appendChild(toastEl);
  }

  success(msg, title = 'Success') { this.show({ type: 'success', title, message: msg }); }
  error(msg, title = 'Notice') { this.show({ type: 'error', title, message: msg }); }
  warning(msg, title = 'Attention') { this.show({ type: 'warning', title, message: msg }); }
  info(msg, title = '') { this.show({ type: 'info', title, message: msg }); }
}

export const toast = new ToastManager();

/* ==========================================================================
   FEEDBACK LAYER: Dialog / Modal System (Focus Trap, ESC, ARIA, Bottom-sheet)
   ========================================================================== */
export const dialog = {
  activeDialog: null,
  previousActiveElement: null,

  open({ title = '', contentHtml = '', confirmText = 'Confirm', cancelText = 'Cancel', isDestructive = false, onConfirm = null }) {
    this.close(); // Close any currently open dialog

    this.previousActiveElement = document.activeElement;

    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.setAttribute('role', 'presentation');

    const box = document.createElement('div');
    box.className = 'dialog-box';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'dialog-title');

    box.innerHTML = `
      <div class="dialog-head">
        <h2 id="dialog-title" style="font-size:1.125rem">${title}</h2>
        <button class="btn-icon" id="dlgClose" aria-label="Close dialog">
          <i class="bx bx-x"></i>
        </button>
      </div>
      <div class="dialog-body" id="dlgBody">${contentHtml}</div>
      <div class="dialog-foot">
        ${cancelText ? `<button class="btn btn-secondary" id="dlgCancel">${cancelText}</button>` : ''}
        ${confirmText ? `<button class="btn ${isDestructive ? 'btn-danger' : 'btn-primary'}" id="dlgConfirm">${confirmText}</button>` : ''}
      </div>
    `;

    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    this.activeDialog = backdrop;

    // Focus first interactive element
    const firstBtn = box.querySelector('#dlgConfirm') || box.querySelector('#dlgCancel') || box.querySelector('#dlgClose');
    if (firstBtn) firstBtn.focus();

    // Backdrop click
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });

    // Close button
    const closeBtn = box.querySelector('#dlgClose');
    if (closeBtn) closeBtn.onclick = () => this.close();

    // Cancel button
    const cancelBtn = box.querySelector('#dlgCancel');
    if (cancelBtn) cancelBtn.onclick = () => this.close();

    // Confirm button
    const confirmBtn = box.querySelector('#dlgConfirm');
    if (confirmBtn) {
      confirmBtn.onclick = async () => {
        if (onConfirm) {
          const res = await onConfirm();
          if (res !== false) dialog.close();
        } else {
          dialog.close();
        }
      };
    }

    // Keyboard handlers (ESC & Tab trapping)
    this._keyHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'Tab') {
        const focusables = box.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  },

  close() {
    if (this.activeDialog) {
      document.removeEventListener('keydown', this._keyHandler);
      this.activeDialog.remove();
      this.activeDialog = null;
      if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
        this.previousActiveElement.focus();
      }
    }
  }
};

export const session = {
  get token() { return localStorage.getItem('wb_token'); },
  get user() { return JSON.parse(localStorage.getItem('wb_user') || 'null'); },
  set(token, user) { localStorage.setItem('wb_token', token); localStorage.setItem('wb_user', JSON.stringify(user)); },
  clear() { localStorage.removeItem('wb_token'); localStorage.removeItem('wb_user'); },
};

export async function api(path, method = 'GET', body) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(session.token && { Authorization: 'Bearer ' + session.token }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && session.token) { session.clear(); location.href = '/'; }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const rwf = n => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(n);

export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.display = 'block';
  setTimeout(() => (t.style.display = 'none'), 3000);
}

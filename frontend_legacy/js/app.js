/* app.js — Core app logic: auth, navigation, modals, toast */

// ── Auth ──────────────────────────────────────────────────────────────
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  if (!email || !password) {
    showError(errEl, 'Please enter email and password.');
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  errEl.classList.add('hidden');

  try {
    const res = await apiPost('/auth/login', { email, password });
    if (!res) return;
    localStorage.setItem('farm_token', res.token);
    localStorage.setItem('farm_user', JSON.stringify(res.user));
    onLogin(res.user);
  } catch (e) {
    showError(errEl, e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

async function handleRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const farmName = document.getElementById('reg-farm').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl = document.getElementById('register-error');
  const btn = document.getElementById('register-btn');

  if (!name || !email || !password) {
    showError(errEl, 'Name, email, and password are required.');
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Creating…';
  errEl.classList.add('hidden');

  try {
    const res = await apiPost('/auth/register', { name, email, phone, farm_name: farmName, password });
    if (!res) return;
    localStorage.setItem('farm_token', res.token);
    localStorage.setItem('farm_user', JSON.stringify(res.user));
    onLogin(res.user);
  } catch (e) {
    showError(errEl, e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

function onLogin(user) {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  updateSidebarUser(user);
  navigate('dashboard');
}

function handleLogout() {
  localStorage.removeItem('farm_token');
  localStorage.removeItem('farm_user');
  showAuthScreen();
}

function showAuthScreen() {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('register-form').classList.add('hidden');
}

function showLogin() {
  document.getElementById('register-form').classList.add('hidden');
  document.getElementById('login-form').classList.remove('hidden');
}

function showRegister() {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('register-form').classList.remove('hidden');
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

function updateSidebarUser(user) {
  const nameEl = document.getElementById('sidebar-name');
  const farmEl = document.getElementById('sidebar-farm');
  const avatarEl = document.getElementById('sidebar-avatar');
  if (nameEl) nameEl.textContent = user.name || 'Farmer';
  if (farmEl) farmEl.textContent = user.farm_name || 'My Farm';
  if (avatarEl) avatarEl.textContent = (user.name || 'F').charAt(0).toUpperCase();
}

// ── Navigation ────────────────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard: '🌾 Dashboard',
  crops: '🌱 Crops',
  'completed-crops': '🌾 Completed Crops',
  workers: '👷 Workers',
  tasks: '✅ Tasks',
  expenses: '💰 Expenses',
  inventory: '📦 Inventory',
  customers: '👥 Customers',
  sales: '💰 Sales',
};

let currentPage = null;

function navigate(page) {
  if (currentPage === page) return;
  currentPage = page;

  // Update nav items
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Show/hide pages
  document.querySelectorAll('.page').forEach(el => {
    const isTarget = el.id === `page-${page}`;
    el.classList.toggle('active', isTarget);
    el.classList.toggle('hidden', !isTarget);
  });

  // Update title
  document.getElementById('page-title').textContent = PAGE_TITLES[page] || page;

  // Load page data
  const loaders = {
    dashboard: loadDashboard,
    crops: loadCrops,
    'completed-crops': loadCompletedCrops,
    workers: loadWorkers,
    tasks: loadTasks,
    expenses: loadExpenses,
    inventory: loadInventory,
    customers: loadCustomers,
    sales: loadSales,
  };
  if (loaders[page]) loaders[page]();

  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('mobile-open');
  }
}

// ── Sidebar Toggle ────────────────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebar.classList.toggle('collapsed');
  }
}

// ── Modals ────────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.body.style.overflow = '';
}

function closeModalOnBg(e, id) {
  if (e.target === e.currentTarget) closeModal(id);
}

// ── Toast ─────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
}

// ── Confirm Dialog ────────────────────────────────────────────────────
function confirmDialog(msg) {
  return new Promise(resolve => {
    const overlay = document.getElementById('confirm-overlay');
    document.getElementById('confirm-msg').textContent = msg;
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const ok = document.getElementById('confirm-ok');
    const cancel = document.getElementById('confirm-cancel');

    function cleanup() {
      overlay.classList.add('hidden');
      document.body.style.overflow = '';
      ok.replaceWith(ok.cloneNode(true));
      cancel.replaceWith(cancel.cloneNode(true));
    }

    document.getElementById('confirm-ok').onclick = () => { cleanup(); resolve(true); };
    document.getElementById('confirm-cancel').onclick = () => { cleanup(); resolve(false); };
  });
}

// ── Date Helpers ──────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}
function thisMonth() {
  return new Date().toISOString().slice(0, 7);
}
function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtCurrency(n) {
  const val = parseFloat(n) || 0;
  if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + 'Cr';
  if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + 'L';
  if (val >= 1000) return '₹' + (val / 1000).toFixed(1) + 'K';
  return '₹' + val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtRupees(n) {
  const val = parseFloat(n) || 0;
  return '₹' + val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// ── Bootstrap ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const token = getToken();
  const user = localStorage.getItem('farm_user');

  // Set today's date as default for date inputs
  document.querySelectorAll('input[type="date"]').forEach(el => {
    if (!el.value) el.value = today();
  });
  document.querySelectorAll('input[type="month"]').forEach(el => {
    if (!el.value) el.value = thisMonth();
  });

  // Also set the date for attendance
  const attDate = document.getElementById('attendance-date');
  if (attDate) attDate.value = today();
  const salaryMonth = document.getElementById('salary-month');
  if (salaryMonth) salaryMonth.value = thisMonth();
  const expenseMonth = document.getElementById('expense-month');
  if (expenseMonth) expenseMonth.value = thisMonth();

  if (token && user) {
    onLogin(JSON.parse(user));
  } else {
    showAuthScreen();
  }

  // Allow Enter key on auth forms
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('reg-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleRegister();
  });

  // Salary month change
  document.getElementById('salary-month').addEventListener('change', loadSalary);
  // Attendance date change
  document.getElementById('attendance-date').addEventListener('change', loadAttendanceTable);

  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered:', registration);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  }
});

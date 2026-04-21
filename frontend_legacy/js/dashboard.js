/* dashboard.js */

function fmtCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

async function loadDashboard() {
  // Set date heading
  const dateEl = document.getElementById('dash-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  // Fetch all dashboard data in parallel
  const [dash, attendance, upcoming, lowStock] = await Promise.all([
    apiGet('/dashboard/'),
    apiGet('/workers/attendance/today'),
    apiGet('/tasks/upcoming'),
    apiGet('/inventory/alerts'),
  ]).catch(() => [null, null, null, null]);

  if (dash) renderDashStats(dash);
  renderRecentExpenses(dash?.recent_expenses || []);
  renderTodayAttendance(attendance || []);
  renderUpcomingTasks(upcoming || []);
  renderLowStock(lowStock?.alerts || []);
}

function renderDashStats(dash) {
  const crops   = document.getElementById('stat-crops');
  const completedCrops = document.getElementById('stat-completed-crops');
  const workers = document.getElementById('stat-workers');
  const expenses= document.getElementById('stat-expenses');
  const tasks   = document.getElementById('stat-tasks');

  if (crops)    crops.textContent    = dash.crops?.growing ?? '—';
  if (completedCrops) completedCrops.textContent = dash.crops?.completed ?? '—';
  if (workers)  workers.textContent  = dash.workers?.active ?? '—';
  if (expenses) expenses.textContent = fmtCurrency(dash.expenses?.this_month ?? 0);
  if (tasks)    tasks.textContent    = dash.tasks?.pending ?? '—';

  // Badge for low stock
  const lowStock = dash.inventory?.low_stock_alerts;
  if (lowStock > 0) {
    const statEl = document.querySelector('.stat-card.stat-purple');
    if (statEl) {
      const badge = document.createElement('div');
      badge.style.cssText = 'margin-top:0.5rem;font-size:0.72rem;color:var(--amber);';
      badge.textContent = `⚠️ ${lowStock} low stock`;
      statEl.appendChild(badge);
    }
  }
}

function renderRecentExpenses(expenses) {
  const el = document.getElementById('recent-expenses-list');
  if (!el) return;
  if (!expenses.length) {
    el.innerHTML = '<div class="activity-empty">No expenses recorded yet</div>';
    return;
  }
  const CAT_COLORS = {
    seeds: 'var(--green)', fertilizer: 'var(--blue)', pesticide: 'var(--red)',
    labor: 'var(--purple)', equipment: 'var(--cyan)', irrigation: 'var(--blue)',
    transport: 'var(--amber)', other: 'var(--text-3)',
  };
  el.innerHTML = expenses.map(e => `
    <div class="activity-item">
      <div class="activity-dot" style="background:${CAT_COLORS[e.category] || 'var(--text-3)'}"></div>
      <div class="activity-main">
        <div class="activity-title">${e.title}</div>
        <div class="activity-sub">${capitalize(e.category)} · ${fmtDate(e.date)}</div>
      </div>
      <div class="activity-amount">${fmtCurrency(e.amount)}</div>
    </div>
  `).join('');
}

function renderTodayAttendance(records) {
  const el = document.getElementById('today-attendance-list');
  if (!el) return;
  if (!records.length) {
    el.innerHTML = '<div class="activity-empty">No attendance marked today</div>';
    return;
  }
  el.innerHTML = records.map(r => `
    <div class="activity-item">
      <div class="activity-dot" style="background:${r.status === 'present' ? 'var(--green)' : r.status === 'absent' ? 'var(--red)' : 'var(--amber)'}"></div>
      <div class="activity-main">
        <div class="activity-title">${r.name}</div>
        <div class="activity-sub">${r.role || 'Worker'}</div>
      </div>
      <div class="status-${r.status}" style="font-size:0.78rem;font-weight:600;">${capitalize(r.status)}</div>
    </div>
  `).join('');
}

function renderUpcomingTasks(tasks) {
  const el = document.getElementById('upcoming-tasks-list');
  if (!el) return;
  if (!tasks.length) {
    el.innerHTML = '<div class="activity-empty">No upcoming tasks</div>';
    return;
  }
  const PRIORITY_COLOR = { low: 'var(--green)', medium: 'var(--blue)', high: 'var(--amber)', urgent: 'var(--red)' };
  el.innerHTML = tasks.slice(0, 5).map(t => `
    <div class="activity-item">
      <div class="activity-dot" style="background:${PRIORITY_COLOR[t.priority] || 'var(--text-3)'}"></div>
      <div class="activity-main">
        <div class="activity-title">${t.title}</div>
        <div class="activity-sub">${t.due_date ? fmtDate(t.due_date) : 'No due date'}${t.worker_name ? ' · ' + t.worker_name : ''}</div>
      </div>
    </div>
  `).join('');
}

function renderLowStock(alerts) {
  const el = document.getElementById('low-stock-list');
  if (!el) return;
  if (!alerts.length) {
    el.innerHTML = '<div class="activity-empty">All stock levels are healthy ✓</div>';
    return;
  }
  el.innerHTML = alerts.map(a => `
    <div class="activity-item">
      <div class="activity-dot" style="background:var(--red)"></div>
      <div class="activity-main">
        <div class="activity-title">${a.name}</div>
        <div class="activity-sub">${capitalize(a.category)} · ${a.location || 'No location'}</div>
      </div>
      <div style="font-size:0.78rem;font-weight:600;color:var(--red);">${a.quantity} ${a.unit}</div>
    </div>
  `).join('');
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

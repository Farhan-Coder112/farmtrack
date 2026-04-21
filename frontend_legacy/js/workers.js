/* workers.js */

let allWorkers = [];
let currentWorkerTab = 'list';

async function loadWorkers() {
  await loadWorkerList();
}

// ── Worker List ───────────────────────────────────────────────────────
async function loadWorkerList() {
  const grid = document.getElementById('workers-list');
  grid.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const [active, inactive] = await Promise.all([
      apiGet('/workers/?status=active'),
      apiGet('/workers/?status=inactive'),
    ]);
    allWorkers = [...(active || []), ...(inactive || [])];
    renderWorkers(allWorkers);
  } catch (e) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load workers</div></div>`;
  }
}

function renderWorkers(workers) {
  const grid = document.getElementById('workers-list');
  if (!workers.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">👷</div>
        <div class="empty-title">No workers found</div>
        <div class="empty-sub">Add your first worker to get started</div>
      </div>`;
    return;
  }
  grid.innerHTML = workers.map(w => workerCard(w)).join('');
}

function workerCard(w) {
  const initials = w.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return `
    <div class="worker-card">
      <div class="worker-avatar-row">
        <div class="worker-avatar">${initials}</div>
        <div>
          <div class="worker-name">${w.name}</div>
          <div class="worker-role">${w.role || 'General Worker'}</div>
          <div class="worker-wage">₹${w.daily_wage || 0}/day | ₹${w.weekly_wages || 0}/week</div>
        </div>
      </div>
      <div class="worker-meta">
        ${w.phone ? `<div class="worker-meta-row">📞 ${w.phone}</div>` : ''}
        ${w.address ? `<div class="worker-meta-row">📍 ${w.address}</div>` : ''}
        ${w.join_date ? `<div class="worker-meta-row">🗓️ Since ${fmtDate(w.join_date)}</div>` : ''}
        <div class="worker-meta-row">
          <span class="${w.status === 'active' ? 'text-green' : 'text-red'} fw-600">
            ● ${capitalize(w.status)}
          </span>
        </div>
      </div>
      <div class="worker-actions">
        <button class="btn-icon success" title="Edit" onclick="editWorker(${w.id})">✏️</button>
        <button class="btn-icon danger" title="Delete" onclick="deleteWorker(${w.id})">🗑️</button>
      </div>
    </div>`;
}

// ── Tabs ──────────────────────────────────────────────────────────────
function showWorkerTab(tab) {
  currentWorkerTab = tab;
  ['list', 'attendance', 'salary'].forEach(t => {
    document.getElementById(`tab-${t === 'list' ? 'workers-list' : t}`)?.classList.toggle('active', t === tab);
    document.getElementById(`${t === 'list' ? 'workers-list' : t}-tab`)?.classList.toggle('hidden', t !== tab);
  });
  if (tab === 'attendance') loadAttendanceTable();
  if (tab === 'salary') loadSalary();
}

// ── Attendance ────────────────────────────────────────────────────────
async function loadAttendanceTable() {
  const wrapper = document.getElementById('attendance-table-wrapper');
  const date = document.getElementById('attendance-date').value || today();
  wrapper.innerHTML = '<div class="loading-spinner"></div>';

  const workers = allWorkers.filter(w => w.status === 'active');
  if (!workers.length) {
    wrapper.innerHTML = '<div class="activity-empty">No active workers found</div>';
    return;
  }

  // Fetch already-marked attendance for this date
  let todayRecs = [];
  try {
    // Get today's attendance
    const recs = await apiGet(`/workers/attendance/today`);
    // For a specific date, we load each worker's recent attendance
    const allAtt = await Promise.all(
      workers.map(w => apiGet(`/workers/${w.id}/attendance`).catch(() => []))
    );
    // Build a map: workerId -> status for this date
    const attMap = {};
    allAtt.forEach((recs, i) => {
      if (!Array.isArray(recs)) return;
      const rec = recs.find(r => r.date === date);
      if (rec) attMap[workers[i].id] = rec;
    });
    renderAttendanceTable(workers, attMap, date);
  } catch (e) {
    renderAttendanceTable(workers, {}, date);
  }
}

function renderAttendanceTable(workers, attMap, date) {
  const wrapper = document.getElementById('attendance-table-wrapper');
  wrapper.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Worker</th>
            <th>Role</th>
            <th>Status</th>
            <th>Hours</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${workers.map(w => {
            const att = attMap[w.id] || {};
            return `
              <tr>
                <td><span class="td-name">${w.name}</span></td>
                <td>${w.role || '—'}</td>
                <td>
                  <select class="att-select" id="att-status-${w.id}">
                    <option value="present" ${att.status === 'present' ? 'selected' : ''}>Present</option>
                    <option value="absent" ${att.status === 'absent' ? 'selected' : ''}>Absent</option>
                    <option value="half_day" ${att.status === 'half_day' ? 'selected' : ''}>Half Day</option>
                    <option value="leave" ${att.status === 'leave' ? 'selected' : ''}>Leave</option>
                  </select>
                </td>
                <td>
                  <input type="number" id="att-hours-${w.id}" value="${att.hours_worked ?? 8}"
                    min="0" max="24" step="0.5"
                    style="width:70px; padding:0.3rem 0.5rem; font-size:0.8rem;" />
                </td>
                <td>
                  <input type="text" id="att-notes-${w.id}" value="${att.notes || ''}"
                    placeholder="Optional notes..."
                    style="font-size:0.8rem; padding:0.3rem 0.5rem;" />
                </td>
                <td>
                  <button class="btn-icon success" onclick="markWorkerAttendance(${w.id}, '${date}')" title="Save">💾</button>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div style="padding:1rem 1.25rem; border-top:1px solid var(--border); display:flex; justify-content:flex-end;">
      <button class="btn-primary" onclick="markAllAttendance('${date}', [${workers.map(w => w.id).join(',')}])">
        Save All Attendance
      </button>
    </div>`;
}

async function markWorkerAttendance(wid, date) {
  const status = document.getElementById(`att-status-${wid}`)?.value;
  const hours = parseFloat(document.getElementById(`att-hours-${wid}`)?.value) || 8;
  const notes = document.getElementById(`att-notes-${wid}`)?.value || '';
  try {
    await apiPost(`/workers/${wid}/attendance`, { date, status, hours_worked: hours, notes });
    showToast(`Attendance saved ✓`);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function markAllAttendance(date, ids) {
  try {
    await Promise.all(ids.map(wid => {
      const status = document.getElementById(`att-status-${wid}`)?.value;
      const hours = parseFloat(document.getElementById(`att-hours-${wid}`)?.value) || 8;
      const notes = document.getElementById(`att-notes-${wid}`)?.value || '';
      return apiPost(`/workers/${wid}/attendance`, { date, status, hours_worked: hours, notes });
    }));
    showToast('All attendance saved ✓');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ── Salary ────────────────────────────────────────────────────────────
async function loadSalary() {
  const wrapper = document.getElementById('salary-table-wrapper');
  const week = document.getElementById('salary-month').value || thisWeek();
  wrapper.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const data = await apiGet(`/workers/salary/weekly?week=${week}`);
    renderSalaryTable(data || []);
  } catch (e) {
    wrapper.innerHTML = '<div class="activity-empty">Failed to load salary data</div>';
  }
}

function thisWeek() {
  const now = new Date();
  const year = now.getFullYear();
  const week = String(Math.ceil((now - new Date(year, 0, 1).getTime()) / 604800000)).padStart(2, '0');
  return `${year}-${week}`;
}

function renderSalaryTable(rows) {
  const wrapper = document.getElementById('salary-table-wrapper');
  if (!rows.length) {
    wrapper.innerHTML = '<div class="activity-empty">No salary data for this week</div>';
    return;
  }
  const total = rows.reduce((s, r) => s + (r.weekly_salary || 0), 0);
  wrapper.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Worker</th>
            <th>Role</th>
            <th>Daily Wage</th>
            <th>Days Present</th>
            <th>Weekly Salary</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td><span class="td-name">${r.name}</span></td>
              <td>${r.role || '—'}</td>
              <td>₹${r.daily_wage || 0}</td>
              <td><span class="text-green fw-600">${r.present_days || 0}</span> / ${r.days_worked || 0}</td>
              <td><span class="text-amber fw-600">${fmtCurrency(r.weekly_salary || 0)}</span></td>
            </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" style="font-weight:600; color:var(--text); padding-top:0.75rem;">Total Payroll</td>
            <td style="font-weight:700; color:var(--amber); font-size:1rem; padding-top:0.75rem;">${fmtCurrency(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>`;
}

// ── Worker CRUD ───────────────────────────────────────────────────────
function openWorkerModal() {
  document.getElementById('worker-modal-title').textContent = 'Add Worker';
  document.getElementById('worker-id').value = '';
  document.getElementById('worker-name').value = '';
  document.getElementById('worker-phone').value = '';
  document.getElementById('worker-role').value = '';
  document.getElementById('worker-wage').value = '';
  document.getElementById('worker-weekly-wages').value = '';
  document.getElementById('worker-join-date').value = today();
  document.getElementById('worker-status').value = 'active';
  document.getElementById('worker-address').value = '';
  openModal('worker-modal');
}

function editWorker(id) {
  const w = allWorkers.find(x => x.id === id);
  if (!w) return;
  document.getElementById('worker-modal-title').textContent = 'Edit Worker';
  document.getElementById('worker-id').value = w.id;
  document.getElementById('worker-name').value = w.name || '';
  document.getElementById('worker-phone').value = w.phone || '';
  document.getElementById('worker-role').value = w.role || '';
  document.getElementById('worker-wage').value = w.daily_wage || '';
  document.getElementById('worker-weekly-wages').value = w.weekly_wages || '';
  document.getElementById('worker-join-date').value = w.join_date || '';
  document.getElementById('worker-status').value = w.status || 'active';
  document.getElementById('worker-address').value = w.address || '';
  openModal('worker-modal');
}

async function saveWorker() {
  const id = document.getElementById('worker-id').value;
  const name = document.getElementById('worker-name').value.trim();
  if (!name) { showToast('Worker name is required', 'error'); return; }

  const payload = {
    name,
    phone: document.getElementById('worker-phone').value.trim(),
    role: document.getElementById('worker-role').value.trim(),
    daily_wage: parseFloat(document.getElementById('worker-wage').value) || 0,
    join_date: document.getElementById('worker-join-date').value,
    status: document.getElementById('worker-status').value,
    address: document.getElementById('worker-address').value.trim(),
  };

  try {
    if (id) {
      await apiPut(`/workers/${id}`, payload);
      showToast('Worker updated ✓');
    } else {
      await apiPost('/workers/', payload);
      showToast('Worker added ✓');
    }
    closeModal('worker-modal');
    loadWorkerList();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function deleteWorker(id) {
  const ok = await confirmDialog('Remove this worker? This cannot be undone.');
  if (!ok) return;
  try {
    await apiDelete(`/workers/${id}`);
    showToast('Worker removed');
    loadWorkerList();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function calculateWeeklyWages() {
  const dailyWage = parseFloat(document.getElementById('worker-wage').value) || 0;
  const weeklyWages = dailyWage * 6; // 6-day work week
  document.getElementById('worker-weekly-wages').value = weeklyWages.toFixed(2);
}

// Patch Add Worker button on load
document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('[onclick="openModal(\'worker-modal\')"]')
    ?.setAttribute('onclick', 'openWorkerModal()');
});

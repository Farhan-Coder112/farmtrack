/* tasks.js */

let allTasks = [];
let taskWorkers = [];
let currentTaskFilter = null;

async function loadTasks() {
  const list = document.getElementById('tasks-list');
  list.innerHTML = '<div class="loading-spinner"></div>';
  try {
    [allTasks, taskWorkers] = await Promise.all([
      apiGet('/tasks/') || [],
      apiGet('/workers/?status=active') || [],
    ]);
    populateTaskWorkerSelect();
    renderTasks(allTasks);
  } catch (e) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load tasks</div></div>`;
  }
}

function populateTaskWorkerSelect() {
  const sel = document.getElementById('task-worker');
  if (!sel) return;
  const existing = sel.innerHTML;
  sel.innerHTML = '<option value="">Unassigned</option>' +
    (taskWorkers || []).map(w => `<option value="${w.id}">${w.name}</option>`).join('');
}

function filterTasks(status, btn) {
  currentTaskFilter = status;
  document.querySelectorAll('#page-tasks .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const filtered = status ? allTasks.filter(t => t.status === status) : allTasks;
  renderTasks(filtered);
}

function renderTasks(tasks) {
  const list = document.getElementById('tasks-list');
  if (!tasks.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✅</div>
        <div class="empty-title">No tasks found</div>
        <div class="empty-sub">Add tasks to track farm activities</div>
      </div>`;
    return;
  }
  list.innerHTML = tasks.map(t => taskItem(t)).join('');
}

function taskItem(t) {
  const done = t.status === 'completed';
  const inProgress = t.status === 'in_progress';
  const priorityClass = `priority-${t.priority || 'medium'}`;
  const statusBadge = t.status === 'pending' ? '🔄 Pending' : 
                     t.status === 'in_progress' ? '⚡ In Progress' : 
                     '✅ Completed';
  const statusColor = t.status === 'pending' ? 'var(--warning)' : 
                      t.status === 'in_progress' ? 'var(--info)' : 
                      'var(--success)';
  const catEmoji = { general:'📋', watering:'💧', harvesting:'🌾', planting:'🌱', spraying:'🧪', equipment:'🔧', other:'📌' };
  return `
    <div class="task-item" id="task-item-${t.id}">
      <div class="task-checkbox-wrap">
        <button class="task-checkbox ${done ? 'completed' : ''}"
          onclick="toggleTask(${t.id}, ${done})" title="${done ? 'Mark pending' : 'Mark complete'}">
        </button>
      </div>
      <div class="task-body">
        <div class="task-title ${done ? 'done' : ''}">${t.title}</div>
        <div class="task-meta">
          <span class="task-badge" style="background:${statusColor}; color:white;">${statusBadge}</span>
          <span class="task-badge ${priorityClass}">${capitalize(t.priority || 'medium')}</span>
          <span class="task-badge" style="background:var(--bg-3); color:var(--text-2);">
            ${catEmoji[t.category] || '📋'} ${capitalize(t.category || 'general')}
          </span>
          ${t.due_date ? `<span class="task-due">📅 ${fmtDate(t.due_date)}${t.due_time ? ' ' + t.due_time : ''}</span>` : ''}
          ${t.worker_name ? `<span class="task-worker">👤 ${t.worker_name}</span>` : ''}
          ${t.description ? `<span class="date-chip" style="color:var(--text-3);">${t.description.slice(0, 60)}${t.description.length > 60 ? '…' : ''}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-icon success" title="Edit" onclick="editTask(${t.id})">✏️</button>
        <button class="btn-icon danger" title="Delete" onclick="deleteTask(${t.id})">🗑️</button>
      </div>
    </div>`;
}

async function toggleTask(id, wasDone) {
  let newStatus;
  if (wasDone) {
    newStatus = 'pending';
  } else {
    const currentTask = allTasks.find(t => t.id === id);
    newStatus = currentTask.status === 'pending' ? 'in_progress' : 'completed';
  }
  try {
    const updated = await apiPut(`/tasks/${id}`, { status: newStatus });
    const idx = allTasks.findIndex(t => t.id === id);
    if (idx !== -1) allTasks[idx] = { ...allTasks[idx], ...updated };
    const filtered = currentTaskFilter ? allTasks.filter(t => t.status === currentTaskFilter) : allTasks;
    renderTasks(filtered);
    const message = newStatus === 'completed' ? 'Task completed ✓' : 
                   newStatus === 'in_progress' ? 'Task started ⚡' : 
                   'Task reopened 🔄';
    showToast(message);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function openTaskModal() {
  if (!taskWorkers.length) {
    apiGet('/workers/?status=active').then(w => { taskWorkers = w || []; populateTaskWorkerSelect(); });
  }
  document.getElementById('task-modal-title').textContent = 'Add Task';
  document.getElementById('task-id').value = '';
  document.getElementById('task-title').value = '';
  document.getElementById('task-category').value = 'general';
  document.getElementById('task-priority').value = 'medium';
  document.getElementById('task-due-date').value = today();
  document.getElementById('task-due-time').value = '';
  document.getElementById('task-status').value = 'pending';
  document.getElementById('task-worker').value = '';
  document.getElementById('task-description').value = '';
  openModal('task-modal');
}

function editTask(id) {
  const t = allTasks.find(x => x.id === id);
  if (!t) return;
  document.getElementById('task-modal-title').textContent = 'Edit Task';
  document.getElementById('task-id').value = t.id;
  document.getElementById('task-title').value = t.title || '';
  document.getElementById('task-category').value = t.category || 'general';
  document.getElementById('task-priority').value = t.priority || 'medium';
  document.getElementById('task-due-date').value = t.due_date || '';
  document.getElementById('task-due-time').value = t.due_time || '';
  document.getElementById('task-status').value = t.status || 'pending';
  document.getElementById('task-worker').value = t.worker_id || '';
  document.getElementById('task-description').value = t.description || '';
  openModal('task-modal');
}

async function saveTask() {
  const id = document.getElementById('task-id').value;
  const title = document.getElementById('task-title').value.trim();
  if (!title) { showToast('Task title is required', 'error'); return; }

  const workerVal = document.getElementById('task-worker').value;
  const payload = {
    title,
    category: document.getElementById('task-category').value,
    priority: document.getElementById('task-priority').value,
    status: document.getElementById('task-status').value,
    due_date: document.getElementById('task-due-date').value,
    due_time: document.getElementById('task-due-time').value,
    worker_id: workerVal ? parseInt(workerVal) : null,
    description: document.getElementById('task-description').value.trim(),
  };

  try {
    if (id) {
      await apiPut(`/tasks/${id}`, payload);
      showToast('Task updated ✓');
    } else {
      await apiPost('/tasks/', payload);
      showToast('Task added ✓');
    }
    closeModal('task-modal');
    loadTasks();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function deleteTask(id) {
  const ok = await confirmDialog('Delete this task? This cannot be undone.');
  if (!ok) return;
  try {
    await apiDelete(`/tasks/${id}`);
    showToast('Task deleted');
    loadTasks();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('[onclick="openModal(\'task-modal\')"]')
    ?.setAttribute('onclick', 'openTaskModal()');
});

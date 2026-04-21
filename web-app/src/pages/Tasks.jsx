import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: '', title: '', category: 'general', priority: 'medium', status: 'pending',
    due_date: new Date().toISOString().split('T')[0], due_time: '', worker_id: '', description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tasksData, workersData] = await Promise.all([
        apiGet('/tasks/'),
        apiGet('/workers/?status=active')
      ]);
      setTasks(tasksData || []);
      setWorkers(workersData || []);
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (task = null) => {
    if (task) {
      setFormData({
        id: task.id,
        title: task.title || '',
        category: task.category || 'general',
        priority: task.priority || 'medium',
        status: task.status || 'pending',
        due_date: task.due_date || '',
        due_time: task.due_time || '',
        worker_id: task.worker_id || '',
        description: task.description || ''
      });
    } else {
      setFormData({
        id: '', title: '', category: 'general', priority: 'medium', status: 'pending',
        due_date: new Date().toISOString().split('T')[0], due_time: '', worker_id: '', description: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title) return alert('Task title is required');

    const payload = { ...formData };
    payload.worker_id = payload.worker_id ? parseInt(payload.worker_id) : null;

    try {
      if (payload.id) {
        await apiPut(`/tasks/${payload.id}`, payload);
      } else {
        await apiPost('/tasks/', payload);
      }
      closeModal();
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    try {
      await apiDelete(`/tasks/${id}`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleTask = async (task) => {
    const wasDone = task.status === 'completed';
    const newStatus = wasDone ? 'pending' : (task.status === 'pending' ? 'in_progress' : 'completed');
    try {
      await apiPut(`/tasks/${task.id}`, { status: newStatus });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredTasks = filter ? tasks.filter(t => t.status === filter) : tasks;
  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  const catEmoji = { general:'📋', watering:'💧', harvesting:'🌾', planting:'🌱', spraying:'🧪', equipment:'🔧', other:'📌' };

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <h2 className="page-heading">Tasks</h2>
          <div className="page-subheading">Manage daily farm tasks and assignments.</div>
        </div>
        <button className="btn-primary" onClick={() => openModal()}>+ Add Task</button>
      </div>

      <div className="filter-bar">
        <button className={`filter-btn ${filter === null ? 'active' : ''}`} onClick={() => setFilter(null)}>All</button>
        <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>Pending</button>
        <button className={`filter-btn ${filter === 'in_progress' ? 'active' : ''}`} onClick={() => setFilter('in_progress')}>In Progress</button>
        <button className={`filter-btn ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>Completed</button>
      </div>

      {loading ? (
        <div className="loading-spinner"></div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <div className="empty-title">Failed to load tasks</div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <div className="empty-title">No tasks found</div>
          <div className="empty-sub">Add tasks to track farm activities</div>
        </div>
      ) : (
        <div className="tasks-list">
          {filteredTasks.map(t => {
            const done = t.status === 'completed';
            const priorityClass = `priority-${t.priority || 'medium'}`;
            const statusBadge = t.status === 'pending' ? '🔄 Pending' : 
                               t.status === 'in_progress' ? '⚡ In Progress' : '✅ Completed';
            const statusColor = t.status === 'pending' ? 'var(--amber)' : 
                                t.status === 'in_progress' ? 'var(--blue)' : 'var(--green)';
            
            return (
              <div key={t.id} className="task-item">
                <div className="task-checkbox-wrap">
                  <button className={`task-checkbox ${done ? 'completed' : ''}`} onClick={() => toggleTask(t)}></button>
                </div>
                <div className="task-body">
                  <div className={`task-title ${done ? 'done' : ''}`}>{t.title}</div>
                  <div className="task-meta">
                    <span className="task-badge" style={{background: statusColor, color: 'white'}}>{statusBadge}</span>
                    <span className={`task-badge ${priorityClass}`}>{capitalize(t.priority || 'medium')}</span>
                    <span className="task-badge" style={{background: 'var(--bg-3)', color: 'var(--text-2)'}}>
                      {catEmoji[t.category] || '📋'} {capitalize(t.category || 'general')}
                    </span>
                    {t.due_date && <span className="task-due">📅 {t.due_date}{t.due_time ? ' ' + t.due_time : ''}</span>}
                    {t.worker_name && <span className="task-worker">👤 {t.worker_name}</span>}
                    {t.description && <span style={{color: 'var(--text-3)'}}>{t.description.slice(0, 60)}{t.description.length > 60 ? '…' : ''}</span>}
                  </div>
                </div>
                <div className="task-actions">
                  <button className="btn-icon success" title="Edit" onClick={() => openModal(t)}>✏️</button>
                  <button className="btn-icon danger" title="Delete" onClick={() => handleDelete(t.id)}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{formData.id ? 'Edit Task' : 'Add Task'}</div>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Title</label>
                  <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Mend fence in North field" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      <option value="general">General</option>
                      <option value="watering">Watering</option>
                      <option value="harvesting">Harvesting</option>
                      <option value="planting">Planting</option>
                      <option value="spraying">Spraying</option>
                      <option value="equipment">Equipment</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Due Date</label>
                    <input type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Due Time (Optional)</label>
                    <input type="time" value={formData.due_time} onChange={e => setFormData({...formData, due_time: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Assignee</label>
                    <select value={formData.worker_id} onChange={e => setFormData({...formData, worker_id: e.target.value})}>
                      <option value="">Unassigned</option>
                      {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Detailed instructions..."></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">Save Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tasks;

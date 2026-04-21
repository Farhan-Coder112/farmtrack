import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

function Workers() {
  const [activeTab, setActiveTab] = useState('list');
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: '', name: '', phone: '', role: '', daily_wage: '', join_date: new Date().toISOString().split('T')[0], status: 'active', address: ''
  });

  // Attendance State
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attMap, setAttMap] = useState({});
  const [attLoading, setAttLoading] = useState(false);

  // Salary State
  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [salaryData, setSalaryData] = useState([]);
  const [salaryLoading, setSalaryLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'list') {
      loadWorkers();
    } else if (activeTab === 'attendance') {
      loadAttendance();
    } else if (activeTab === 'salary') {
      loadSalary();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'attendance') loadAttendance();
  }, [attDate]);

  useEffect(() => {
    if (activeTab === 'salary') loadSalary();
  }, [salaryMonth]);

  const loadWorkers = async () => {
    setLoading(true);
    setError(null);
    try {
      const [active, inactive] = await Promise.all([
        apiGet('/workers/?status=active'),
        apiGet('/workers/?status=inactive'),
      ]);
      setWorkers([...(active || []), ...(inactive || [])]);
      
      // Also init attendance map with defaults
      const map = {};
      [...(active || [])].forEach(w => {
        map[w.id] = { status: 'present', hours_worked: 8, notes: '' };
      });
      setAttMap(prev => ({...map, ...prev}));
    } catch (err) {
      setError(err.message || 'Failed to load workers');
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    setAttLoading(true);
    try {
      if (workers.length === 0) {
        const [active, inactive] = await Promise.all([
          apiGet('/workers/?status=active'),
          apiGet('/workers/?status=inactive'),
        ]);
        setWorkers([...(active || []), ...(inactive || [])]);
      }
      
      const activeWorkers = workers.filter(w => w.status === 'active');
      if (activeWorkers.length === 0 && workers.length === 0) {
        // Just let it be empty
      } else {
        const workersToUse = activeWorkers.length > 0 ? activeWorkers : workers;
        const allAtt = await Promise.all(
          workersToUse.map(w => apiGet(`/workers/${w.id}/attendance`).catch(() => []))
        );
        const map = {};
        allAtt.forEach((recs, i) => {
          if (!Array.isArray(recs)) return;
          const rec = recs.find(r => r.date === attDate);
          if (rec) map[workersToUse[i].id] = rec;
          else map[workersToUse[i].id] = { status: 'present', hours_worked: 8, notes: '' };
        });
        setAttMap(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAttLoading(false);
    }
  };

  const loadSalary = async () => {
    setSalaryLoading(true);
    try {
      const data = await apiGet(`/workers/salary/monthly?month=${salaryMonth}`);
      setSalaryData(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSalaryLoading(false);
    }
  };

  const openModal = (worker = null) => {
    if (worker) {
      setFormData({
        id: worker.id,
        name: worker.name || '',
        phone: worker.phone || '',
        role: worker.role || '',
        daily_wage: worker.daily_wage || '',
        join_date: worker.join_date || '',
        status: worker.status || 'active',
        address: worker.address || ''
      });
    } else {
      setFormData({
        id: '', name: '', phone: '', role: '', daily_wage: '', join_date: new Date().toISOString().split('T')[0], status: 'active', address: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) return alert('Worker name is required');

    const payload = { ...formData };
    payload.daily_wage = parseFloat(payload.daily_wage) || 0;

    try {
      if (payload.id) {
        await apiPut(`/workers/${payload.id}`, payload);
      } else {
        await apiPost('/workers/', payload);
      }
      closeModal();
      loadWorkers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this worker? This cannot be undone.')) return;
    try {
      await apiDelete(`/workers/${id}`);
      loadWorkers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAttChange = (id, field, value) => {
    setAttMap(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const saveSingleAttendance = async (wid) => {
    const data = attMap[wid];
    try {
      await apiPost(`/workers/${wid}/attendance`, { date: attDate, ...data });
      alert('Attendance saved ✓');
    } catch (err) {
      alert(err.message);
    }
  };

  const saveAllAttendance = async () => {
    const activeWorkers = workers.filter(w => w.status === 'active');
    try {
      await Promise.all(activeWorkers.map(w => {
        const data = attMap[w.id];
        return apiPost(`/workers/${w.id}/attendance`, { date: attDate, ...data });
      }));
      alert('All attendance saved ✓');
    } catch (err) {
      alert(err.message);
    }
  };

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  const renderList = () => {
    if (loading) return <div className="loading-spinner"></div>;
    if (error) return <div className="empty-state"><div className="empty-icon">⚠️</div><div className="empty-title">Failed to load workers</div></div>;
    if (workers.length === 0) return (
      <div className="empty-state">
        <div className="empty-icon">👷</div>
        <div className="empty-title">No workers found</div>
        <div className="empty-sub">Add your first worker to get started</div>
      </div>
    );

    return (
      <div className="workers-grid">
        {workers.map(w => {
          const initials = w.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
          return (
            <div key={w.id} className="worker-card">
              <div className="worker-avatar-row">
                <div className="worker-avatar">{initials}</div>
                <div>
                  <div className="worker-name">{w.name}</div>
                  <div className="worker-role">{w.role || 'General Worker'}</div>
                  <div className="worker-wage">₹{w.daily_wage || 0}/day | ₹{w.weekly_wages || 0}/week</div>
                </div>
              </div>
              <div className="worker-meta">
                {w.phone && <div className="worker-meta-row">📞 {w.phone}</div>}
                {w.address && <div className="worker-meta-row">📍 {w.address}</div>}
                {w.join_date && <div className="worker-meta-row">🗓️ Since {w.join_date}</div>}
                <div className="worker-meta-row">
                  <span className={`${w.status === 'active' ? 'text-green' : 'text-red'} fw-600`}>
                    ● {capitalize(w.status)}
                  </span>
                </div>
              </div>
              <div className="worker-actions">
                <button className="btn-icon success" title="Edit" onClick={() => openModal(w)}>✏️</button>
                <button className="btn-icon danger" title="Delete" onClick={() => handleDelete(w.id)}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAttendance = () => {
    if (attLoading) return <div className="loading-spinner"></div>;
    const activeWorkers = workers.filter(w => w.status === 'active');
    
    if (activeWorkers.length === 0) return <div className="activity-empty">No active workers found</div>;

    return (
      <>
        <div className="table-wrapper">
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
              {activeWorkers.map(w => {
                const att = attMap[w.id] || { status: 'present', hours_worked: 8, notes: '' };
                return (
                  <tr key={w.id}>
                    <td><span className="td-name">{w.name}</span></td>
                    <td>{w.role || '—'}</td>
                    <td>
                      <select value={att.status || 'present'} onChange={e => handleAttChange(w.id, 'status', e.target.value)} style={{width: 'auto', padding: '0.3rem', fontSize: '0.8rem'}}>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="half_day">Half Day</option>
                        <option value="leave">Leave</option>
                      </select>
                    </td>
                    <td>
                      <input type="number" value={att.hours_worked ?? 8} onChange={e => handleAttChange(w.id, 'hours_worked', e.target.value)} 
                        min="0" max="24" step="0.5" style={{width:'70px', padding:'0.3rem 0.5rem', fontSize:'0.8rem'}} />
                    </td>
                    <td>
                      <input type="text" value={att.notes || ''} onChange={e => handleAttChange(w.id, 'notes', e.target.value)} 
                        placeholder="Optional notes..." style={{fontSize:'0.8rem', padding:'0.3rem 0.5rem'}} />
                    </td>
                    <td>
                      <button className="btn-icon success" onClick={() => saveSingleAttendance(w.id)} title="Save">💾</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{padding:'1rem 1.25rem', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end'}}>
          <button className="btn-primary" onClick={saveAllAttendance}>Save All Attendance</button>
        </div>
      </>
    );
  };

  const renderSalary = () => {
    if (salaryLoading) return <div className="loading-spinner"></div>;
    if (salaryData.length === 0) return <div className="activity-empty">No salary data for this month</div>;

    const total = salaryData.reduce((s, r) => s + (r.total_salary || 0), 0);

    return (
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Worker</th>
              <th>Role</th>
              <th>Daily Wage</th>
              <th>Days Present</th>
              <th>Total Salary</th>
            </tr>
          </thead>
          <tbody>
            {salaryData.map((r, i) => (
              <tr key={i}>
                <td><span className="td-name">{r.name}</span></td>
                <td>{r.role || '—'}</td>
                <td>₹{r.daily_wage || 0}</td>
                <td><span className="text-green fw-600">{r.present_days || 0}</span> / {r.days_worked || 0}</td>
                <td><span className="text-amber fw-600">₹{r.total_salary?.toFixed(2) || 0}</span></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="4" style={{fontWeight:600, color:'var(--text)', paddingTop:'0.75rem'}}>Total Payroll</td>
              <td style={{fontWeight:700, color:'var(--amber)', fontSize:'1rem', paddingTop:'0.75rem'}}>₹{total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <h2 className="page-heading">Workers</h2>
          <div className="page-subheading">Manage your farm workforce, attendance, and payroll.</div>
        </div>
        <button className="btn-primary" onClick={() => openModal()}>+ Add Worker</button>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>Worker List</button>
        <button className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>Attendance</button>
        <button className={`tab-btn ${activeTab === 'salary' ? 'active' : ''}`} onClick={() => setActiveTab('salary')}>Salary & Payroll</button>
      </div>

      {activeTab === 'list' && renderList()}

      {activeTab === 'attendance' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Dialy Attendance</div>
            <input type="date" className="input-sm" value={attDate} onChange={e => setAttDate(e.target.value)} />
          </div>
          {renderAttendance()}
        </div>
      )}

      {activeTab === 'salary' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Salary Report</div>
            <input type="month" className="input-sm" value={salaryMonth} onChange={e => setSalaryMonth(e.target.value)} />
          </div>
          {renderSalary()}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{formData.id ? 'Edit Worker' : 'Add Worker'}</div>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Ramesh Kumar" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Role</label>
                    <input type="text" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} placeholder="e.g. Harvester, Tractor Driver" />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+91..." />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Daily Wage (₹)</label>
                    <input type="number" step="0.01" required value={formData.daily_wage} onChange={e => setFormData({...formData, daily_wage: e.target.value})} placeholder="e.g. 500" />
                  </div>
                  <div className="form-group">
                    <label>Join Date</label>
                    <input type="date" value={formData.join_date} onChange={e => setFormData({...formData, join_date: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Home Address</label>
                  <textarea rows="2" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Complete address..."></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">Save Worker</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Workers;

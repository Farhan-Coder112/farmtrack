import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [categoryFilter, setCategoryFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: '', title: '', category: 'fertilizer', amount: '', date: new Date().toISOString().split('T')[0], payment_method: 'cash', description: '', worker_id: ''
  });

  useEffect(() => {
    loadData();
  }, [month, categoryFilter]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ month });
      if (categoryFilter) params.set('category', categoryFilter);

      const [expensesData, summaryData] = await Promise.all([
        apiGet(`/expenses/?${params}`),
        apiGet(`/expenses/summary?month=${month}`)
      ]);
      setExpenses(expensesData || []);
      setSummary(summaryData);
    } catch (err) {
      setError(err.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkers = async () => {
    try {
      const w = await apiGet('/workers/?status=active');
      setWorkers(w || []);
    } catch(err) {
      console.error(err);
    }
  };

  const openModal = async (expense = null) => {
    await loadWorkers();
    
    if (expense) {
      setFormData({
        id: expense.id,
        title: expense.title || '',
        category: expense.category || 'other',
        amount: expense.amount || '',
        date: expense.date || new Date().toISOString().split('T')[0],
        payment_method: expense.payment_method || 'cash',
        description: expense.description || '',
        worker_id: expense.worker_id || '' // Assuming we may track who was paid
      });
    } else {
      setFormData({
        id: '', title: '', category: 'fertilizer', amount: '', date: new Date().toISOString().split('T')[0], payment_method: 'cash', description: '', worker_id: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title) return alert('Title is required');
    if (!formData.amount || formData.amount <= 0) return alert('Enter a valid amount');

    const payload = { ...formData };
    payload.amount = parseFloat(payload.amount);

    try {
      if (payload.id) {
        await apiPut(`/expenses/${payload.id}`, payload);
      } else {
        await apiPost('/expenses/', payload);
      }
      closeModal();
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense? This cannot be undone.')) return;
    try {
      await apiDelete(`/expenses/${id}`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleWorkerSelect = (e) => {
    const wid = e.target.value;
    const worker = workers.find(x => x.id === parseInt(wid));
    let newFormData = { ...formData, worker_id: wid };
    if (worker) {
      newFormData.amount = (worker.weekly_wages || 0).toFixed(2);
      if (!newFormData.title || newFormData.title.includes('Weekly wages')) {
        newFormData.title = `Weekly wages - ${worker.name.split(' ')[0]}`;
      }
    }
    setFormData(newFormData);
  };

  const CAT_COLORS = {
    seeds: 'var(--green)', fertilizer: 'var(--blue)', pesticide: 'var(--red)',
    labor: 'var(--purple)', equipment: 'var(--cyan)', irrigation: '#0ea5e9',
    transport: 'var(--amber)', other: 'var(--text-3)',
  };

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <h2 className="page-heading">Financial</h2>
          <div className="page-subheading">Track your farm expenses and cash flow.</div>
        </div>
        <button className="btn-primary" onClick={() => openModal()}>+ Record Expense</button>
      </div>

      <div className="card expense-top">
        <div className="expense-summary-card">
          <div className="expense-month-selector">
            <span style={{fontSize: '0.8rem', color: 'var(--text-2)', display: 'block', marginBottom: '4px'}}>Period</span>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} />
          </div>
          <div className="expense-total">
            <span className="expense-total-label">Total Expenses</span>
            <span className="expense-total-amount">₹{summary?.total || 0}</span>
          </div>
          <div className="cat-breakdown">
            {summary?.by_category?.map((c, i) => (
              <div key={i} className="cat-chip">
                <span style={{width:'8px',height:'8px',borderRadius:'50%',background:CAT_COLORS[c.category] || 'var(--text-3)',display:'inline-block'}}></span>
                <span className="cat-chip-name">{c.category}</span>
                <span className="cat-chip-amount">₹{c.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <select className="input-sm" style={{width: '200px'}} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          <option value="seeds">Seeds</option>
          <option value="fertilizer">Fertilizer</option>
          <option value="pesticide">Pesticide</option>
          <option value="labor">Labor</option>
          <option value="equipment">Equipment</option>
          <option value="irrigation">Irrigation</option>
          <option value="transport">Transport</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-spinner"></div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <div className="empty-title">Failed to load expenses</div>
          </div>
        ) : expenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💰</div>
            <div className="empty-title">No expenses found</div>
            <div className="empty-sub">Record your first expense for this month</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Payment</th>
                  <th style={{textAlign: 'right'}}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td>
                      <span className="td-name">{e.title}</span>
                      {e.description && <div style={{fontSize:'0.75rem', color:'var(--text-3)', marginTop:'0.2rem'}}>{e.description}</div>}
                    </td>
                    <td>
                      <span className="cat-chip" style={{background:'var(--bg-3)', border:'1px solid var(--border)', borderRadius:'999px', padding:'0.2rem 0.6rem', fontSize:'0.75rem', display:'inline-flex', gap:'0.35rem', alignItems:'center'}}>
                        <span style={{width:'7px',height:'7px',borderRadius:'50%',background:CAT_COLORS[e.category] || 'var(--text-3)',display:'inline-block'}}></span>
                        {capitalize(e.category)}
                      </span>
                    </td>
                    <td>{e.date}</td>
                    <td style={{textTransform:'uppercase', fontSize:'0.75rem', color:'var(--text-2)'}}>{e.payment_method || 'cash'}</td>
                    <td style={{textAlign:'right', fontWeight:700, color:'var(--amber)'}}>₹{e.amount}</td>
                    <td>
                      <div style={{display:'flex', gap:'0.3rem', justifyContent:'flex-end'}}>
                        <button className="btn-icon success" onClick={() => openModal(e)} title="Edit">✏️</button>
                        <button className="btn-icon danger" onClick={() => handleDelete(e.id)} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="4" style={{fontWeight:600, color:'var(--text)', paddingTop:'0.75rem', borderTop:'1px solid var(--border)'}}>
                    Total ({expenses.length} records)
                  </td>
                  <td style={{textAlign:'right', fontWeight:700, color:'var(--amber)', fontSize:'1rem', paddingTop:'0.75rem', borderTop:'1px solid var(--border)'}}>
                    ₹{expenses.reduce((s, e) => s + (e.amount || 0), 0).toFixed(2)}
                  </td>
                  <td style={{borderTop:'1px solid var(--border)'}}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{formData.id ? 'Edit Expense' : 'Add Expense'}</div>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Title</label>
                  <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Tractor Fuel, Weekly Wages" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      <option value="seeds">Seeds & Plants</option>
                      <option value="fertilizer">Fertilizer</option>
                      <option value="pesticide">Pesticide</option>
                      <option value="labor">Labor & Wages</option>
                      <option value="equipment">Equipment & Tools</option>
                      <option value="irrigation">Irrigation</option>
                      <option value="transport">Transport</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Amount (₹)</label>
                    <input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} readOnly={formData.category === 'labor' && !!formData.worker_id} />
                  </div>
                </div>

                {formData.category === 'labor' && (
                  <div className="form-group">
                    <label>Worker (Auto-fill weekly wages)</label>
                    <select value={formData.worker_id} onChange={handleWorkerSelect}>
                      <option value="">Select worker...</option>
                      {workers.map(w => (
                        <option key={w.id} value={w.id}>{w.name} - Weekly: ₹{w.weekly_wages || 0}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Date</label>
                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})}>
                      <option value="cash">Cash</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="card">Card</option>
                      <option value="upi">UPI / Mobile</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Optional details..."></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Expenses;

import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

function Inventory() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filter, setFilter] = useState(null);
  const [lowStockFilter, setLowStockFilter] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: '', name: '', category: 'seeds', quantity: '', quantity_used: '0', unit: 'kg', min_quantity: '0', unit_price: '', supplier: '', location: '', expiry_date: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsData, summaryData] = await Promise.all([
        apiGet('/inventory/'),
        apiGet('/inventory/summary')
      ]);
      setItems(itemsData || []);
      setSummary(summaryData);
    } catch (err) {
      setError(err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setFormData({
        id: item.id,
        name: item.name || '',
        category: item.category || 'other',
        quantity: item.quantity || 0,
        quantity_used: item.quantity_used || 0,
        unit: item.unit || 'kg',
        min_quantity: item.min_quantity || 0,
        unit_price: item.unit_price || '',
        supplier: item.supplier || '',
        location: item.location || '',
        expiry_date: item.expiry_date || ''
      });
    } else {
      setFormData({
        id: '', name: '', category: 'seeds', quantity: '', quantity_used: '0', unit: 'kg', min_quantity: '0', unit_price: '', supplier: '', location: '', expiry_date: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) return alert('Item name is required');

    const payload = { ...formData };
    payload.quantity = parseFloat(payload.quantity) || 0;
    payload.quantity_used = parseFloat(payload.quantity_used) || 0;
    payload.min_quantity = parseFloat(payload.min_quantity) || 0;
    payload.unit_price = parseFloat(payload.unit_price) || 0;

    try {
      if (payload.id) {
        await apiPut(`/inventory/${payload.id}`, payload);
      } else {
        await apiPost('/inventory/', payload);
      }
      closeModal();
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this inventory item? This cannot be undone.')) return;
    try {
      await apiDelete(`/inventory/${id}`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredItems = items.filter(item => {
    if (lowStockFilter) {
      return (item.quantity - (item.quantity_used || 0)) <= item.min_quantity;
    } else if (filter) {
      return item.category === filter;
    }
    return true;
  });

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  const INV_CAT_EMOJI = { seeds: '🌾', fertilizer: '🧪', pesticide: '☠️', equipment: '🔧', fuel: '⛽', other: '📦' };

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <h2 className="page-heading">Inventory</h2>
          <div className="page-subheading">Manage supplies, equipment, and stock levels.</div>
        </div>
        <button className="btn-primary" onClick={() => openModal()}>+ Add Item</button>
      </div>

      <div className="filter-bar">
        <button className={`filter-btn ${!filter && !lowStockFilter ? 'active' : ''}`} onClick={() => {setFilter(null); setLowStockFilter(false);}}>All Stock</button>
        <button className={`filter-btn ${filter === 'seeds' ? 'active' : ''}`} onClick={() => {setFilter('seeds'); setLowStockFilter(false);}}>Seeds</button>
        <button className={`filter-btn ${filter === 'fertilizer' ? 'active' : ''}`} onClick={() => {setFilter('fertilizer'); setLowStockFilter(false);}}>Fertilizer</button>
        <button className={`filter-btn ${filter === 'pesticide' ? 'active' : ''}`} onClick={() => {setFilter('pesticide'); setLowStockFilter(false);}}>Pesticide</button>
        <button className={`filter-btn inv-low-btn ${lowStockFilter ? 'active' : ''}`} onClick={() => {setLowStockFilter(!lowStockFilter); setFilter(null);}}>⚠️ Low Stock</button>
      </div>

      {summary && (
        <div className="stats-grid">
          <div className="inv-stat-card">
            <div className="inv-stat-val text-blue">{summary.total_items || 0}</div>
            <div className="inv-stat-label">Total Items</div>
          </div>
          <div className="inv-stat-card">
            <div className="inv-stat-val text-red">{summary.low_stock_count || 0}</div>
            <div className="inv-stat-label">Low Stock</div>
          </div>
          <div className="inv-stat-card">
            <div className="inv-stat-val text-amber">₹{summary.total_value || 0}</div>
            <div className="inv-stat-label">Stock Value</div>
          </div>
          <div className="inv-stat-card">
            <div className="inv-stat-val text-purple">{(summary.by_category || []).length}</div>
            <div className="inv-stat-label">Categories</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner"></div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <div className="empty-title">Failed to load inventory</div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <div className="empty-title">No items found</div>
          <div className="empty-sub">Add items to track your farm supplies</div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Used</th>
                <th>Remaining</th>
                <th>Min. Level</th>
                <th>Unit Price</th>
                <th>Stock Value</th>
                <th>Supplier</th>
                <th>Expiry</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const remaining = (item.quantity || 0) - (item.quantity_used || 0);
                const isLow = remaining <= item.min_quantity;
                const stockValue = remaining * (item.unit_price || 0);
                const isExpired = item.expiry_date && new Date(item.expiry_date) < new Date();
                
                return (
                  <tr key={item.id}>
                    <td>
                      <span className="td-name">{item.name}</span>
                      {item.location && <div style={{fontSize: '0.73rem', color: 'var(--text-3)'}}>📍 {item.location}</div>}
                    </td>
                    <td>
                      <span style={{fontSize: '0.9rem'}}>{INV_CAT_EMOJI[item.category] || '📦'}</span>
                      <span style={{fontSize: '0.8rem', color: 'var(--text-2)', marginLeft: '0.25rem'}}>{capitalize(item.category)}</span>
                    </td>
                    <td>
                      <span className={isLow ? 'text-red fw-600' : 'text-green fw-600'}>{item.quantity}</span>
                      <span style={{color: 'var(--text-3)', fontSize: '0.75rem'}}> {item.unit}</span>
                      {isLow && <span className="low-stock-badge" style={{display: 'block', marginTop: '0.2rem'}}>⚠️ Low</span>}
                    </td>
                    <td style={{color: 'var(--text-2)'}}>
                      <span className="text-amber fw-600">{item.quantity_used || 0}</span>
                      <span style={{color: 'var(--text-3)', fontSize: '0.75rem'}}> {item.unit}</span>
                    </td>
                    <td>
                      <span className="text-blue fw-600">{remaining}</span>
                      <span style={{color: 'var(--text-3)', fontSize: '0.75rem'}}> {item.unit}</span>
                    </td>
                    <td style={{color: 'var(--text-3)'}}>{item.min_quantity} {item.unit}</td>
                    <td style={{color: 'var(--text-2)'}}>{item.unit_price ? `₹${item.unit_price}` : '—'}</td>
                    <td style={{color: 'var(--amber)', fontWeight: 600}}>{stockValue > 0 ? `₹${stockValue}` : '—'}</td>
                    <td style={{color: 'var(--text-2)'}}>{item.supplier || '—'}</td>
                    <td style={{color: isExpired ? 'var(--red)' : 'var(--text-2)'}}>{item.expiry_date || '—'}</td>
                    <td>
                      <div style={{display: 'flex', gap: '0.3rem', justifyContent: 'flex-end'}}>
                        <button className="btn-icon success" title="Edit" onClick={() => openModal(item)}>✏️</button>
                        <button className="btn-icon danger" title="Delete" onClick={() => handleDelete(item.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{formData.id ? 'Edit Item' : 'Add Item'}</div>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Item Name</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Urea 46%" />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      <option value="seeds">Seeds</option>
                      <option value="fertilizer">Fertilizer</option>
                      <option value="pesticide">Pesticide</option>
                      <option value="equipment">Equipment</option>
                      <option value="fuel">Fuel</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity Total</label>
                    <input type="number" step="0.01" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Quantity Used</label>
                    <input type="number" step="0.01" value={formData.quantity_used} onChange={e => setFormData({...formData, quantity_used: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Unit</label>
                    <input type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} placeholder="e.g. kg, L, bags" />
                  </div>
                  <div className="form-group">
                    <label>Min. Quantity Alert</label>
                    <input type="number" step="0.01" value={formData.min_quantity} onChange={e => setFormData({...formData, min_quantity: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Unit Price (₹)</label>
                    <input type="number" step="0.01" value={formData.unit_price} onChange={e => setFormData({...formData, unit_price: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Supplier</label>
                    <input type="text" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Storage Location</label>
                    <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input type="date" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;

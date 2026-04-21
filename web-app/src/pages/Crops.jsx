import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

function Crops() {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: '', name: '', variety: '', field_location: '', area_acres: '',
    plant_date: new Date().toISOString().split('T')[0], expected_harvest: '', status: 'growing', notes: ''
  });

  useEffect(() => {
    loadCrops();
  }, []);

  const loadCrops = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet('/crops/');
      setCrops(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load crops');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (crop = null) => {
    if (crop) {
      setFormData({
        id: crop.id,
        name: crop.name || '',
        variety: crop.variety || '',
        field_location: crop.field_location || '',
        area_acres: crop.area_acres || '',
        plant_date: crop.plant_date || '',
        expected_harvest: crop.expected_harvest || '',
        status: crop.status || 'growing',
        notes: crop.notes || ''
      });
    } else {
      setFormData({
        id: '', name: '', variety: '', field_location: '', area_acres: '',
        plant_date: new Date().toISOString().split('T')[0], expected_harvest: '', status: 'growing', notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) return alert('Crop name is required');

    const payload = { ...formData };
    payload.area_acres = parseFloat(payload.area_acres) || null;

    try {
      if (payload.id) {
        await apiPut(`/crops/${payload.id}`, payload);
      } else {
        await apiPost('/crops/', payload);
      }
      closeModal();
      loadCrops();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this crop? This cannot be undone.')) return;
    try {
      await apiDelete(`/crops/${id}`);
      loadCrops();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredCrops = filter ? crops.filter(c => c.status === filter) : crops;

  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <h2 className="page-heading">Crops</h2>
          <div className="page-subheading">Manage your crops and fields.</div>
        </div>
        <button className="btn-primary" onClick={() => openModal()}>+ Add Crop</button>
      </div>

      <div className="filter-bar">
        <button className={`filter-btn ${filter === null ? 'active' : ''}`} onClick={() => setFilter(null)}>All</button>
        <button className={`filter-btn ${filter === 'growing' ? 'active' : ''}`} onClick={() => setFilter('growing')}>Growing</button>
        <button className={`filter-btn ${filter === 'planned' ? 'active' : ''}`} onClick={() => setFilter('planned')}>Planned</button>
        <button className={`filter-btn ${filter === 'harvested' ? 'active' : ''}`} onClick={() => setFilter('harvested')}>Harvested</button>
      </div>

      {loading ? (
        <div className="loading-spinner"></div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <div className="empty-title">Failed to load crops</div>
        </div>
      ) : filteredCrops.length === 0 ? (
        <div className="empty-state" style={{ gridColumn: '1/-1' }}>
          <div className="empty-icon">🌱</div>
          <div className="empty-title">No crops found</div>
          <div className="empty-sub">Add your first crop to get started</div>
        </div>
      ) : (
        <div className="crop-grid">
          {filteredCrops.map(c => {
            const statusClass = { growing: 'badge-growing', planned: 'badge-planned', harvested: 'badge-harvested', failed: 'badge-failed' }[c.status] || 'badge-planned';
            return (
              <div key={c.id} className="crop-card">
                <div className="crop-card-header">
                  <div>
                    <div className="crop-name">{c.name}</div>
                    {c.variety && <div className="crop-variety">{c.variety}</div>}
                  </div>
                  <span className={`crop-status-badge ${statusClass}`}>{capitalize(c.status)}</span>
                </div>
                <div className="crop-meta">
                  {c.field_location && <div className="crop-meta-row"><span>📍</span> {c.field_location}</div>}
                  {c.area_acres && <div className="crop-meta-row"><span>📐</span> {c.area_acres} acres</div>}
                  {c.plant_date && <div className="crop-meta-row"><span>🗓️</span> Planted: {c.plant_date}</div>}
                  {c.expected_harvest && <div className="crop-meta-row"><span>🌾</span> Harvest: {c.expected_harvest}</div>}
                  {c.notes && <div className="crop-meta-row"><span>📝</span> {c.notes}</div>}
                </div>
                <div className="crop-actions">
                  <button className="btn-icon success" title="Edit" onClick={() => openModal(c)}>✏️</button>
                  <button className="btn-icon danger" title="Delete" onClick={() => handleDelete(c.id)}>🗑️</button>
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
              <div className="modal-title">{formData.id ? 'Edit Crop' : 'Add Crop'}</div>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Crop Name</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Wheat, Tomato" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Variety</label>
                    <input type="text" value={formData.variety} onChange={e => setFormData({...formData, variety: e.target.value})} placeholder="e.g. Sharbati" />
                  </div>
                  <div className="form-group">
                    <label>Area (Acres)</label>
                    <input type="number" step="0.1" value={formData.area_acres} onChange={e => setFormData({...formData, area_acres: e.target.value})} placeholder="e.g. 2.5" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Field Location</label>
                  <input type="text" value={formData.field_location} onChange={e => setFormData({...formData, field_location: e.target.value})} placeholder="e.g. North Plot B" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Planting Date</label>
                    <input type="date" value={formData.plant_date} onChange={e => setFormData({...formData, plant_date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Expected Harvest</label>
                    <input type="date" value={formData.expected_harvest} onChange={e => setFormData({...formData, expected_harvest: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="planned">Planned</option>
                    <option value="growing">Growing</option>
                    <option value="harvested">Harvested</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea rows="3" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Any additional details..."></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">Save Crop</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Crops;

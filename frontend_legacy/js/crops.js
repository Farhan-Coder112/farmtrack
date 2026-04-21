/* crops.js */

let allCrops = [];
let currentCropFilter = null;

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function fmtDate(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function today() {
  return new Date().toISOString().split('T')[0];
}

async function loadCrops() {
  const grid = document.getElementById('crops-grid');
  grid.innerHTML = '<div class="loading-spinner"></div>';
  try {
    allCrops = await apiGet('/crops/') || [];
    renderCrops(allCrops);
  } catch (e) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load crops</div></div>`;
  }
}

async function loadCompletedCrops() {
  const grid = document.getElementById('completed-crops-grid');
  grid.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const completedCrops = await apiGet('/crops/') || [];
    const filtered = completedCrops.filter(c => c.status === 'completed');
    
    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🌾</div>
          <div class="empty-title">No completed crops yet</div>
          <div class="empty-sub">Mark crops as completed to see them here</div>
        </div>`;
    } else {
      // Group crops by name and variety
      const grouped = {};
      filtered.forEach(crop => {
        const key = `${crop.name}|${crop.variety || ''}`;
        if (!grouped[key]) {
          grouped[key] = {
            name: crop.name,
            variety: crop.variety,
            total_quantity: 0,
            unit: crop.harvest_unit || 'kg',
            count: 0,
            field_locations: new Set(),
            crop_ids: []
          };
        }
        grouped[key].total_quantity += (crop.harvest_quantity || 0);
        grouped[key].count += 1;
        if (crop.field_location) grouped[key].field_locations.add(crop.field_location);
        grouped[key].crop_ids.push(crop.id);
      });
      
      // Convert grouped object to array and render
      const groupedArray = Object.values(grouped).map(g => ({
        ...g,
        field_locations: Array.from(g.field_locations).join(', ')
      }));
      
      grid.innerHTML = groupedArray.map(g => groupedCropCard(g)).join('');
    }
  } catch (e) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load completed crops</div></div>`;
  }
}

function filterCrops(status, btn) {
  currentCropFilter = status;
  document.querySelectorAll('#page-crops .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const filtered = status ? allCrops.filter(c => c.status === status) : allCrops;
  renderCrops(filtered);
}

function renderCrops(crops) {
  const grid = document.getElementById('crops-grid');
  if (!crops.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🌱</div>
        <div class="empty-title">No crops found</div>
        <div class="empty-sub">Add your first crop to get started</div>
      </div>`;
    return;
  }
  grid.innerHTML = crops.map(c => cropCard(c)).join('');
}

function cropCard(c) {
  const statusClass = { growing: 'badge-growing', planned: 'badge-planned', harvested: 'badge-harvested', completed: 'badge-completed', failed: 'badge-failed' }[c.status] || 'badge-planned';
  return `
    <div class="crop-card">
      <div class="crop-card-header">
        <div>
          <div class="crop-name">${c.name}</div>
          ${c.variety ? `<div class="crop-variety">${c.variety}</div>` : ''}
        </div>
        <span class="crop-status-badge ${statusClass}">${capitalize(c.status)}</span>
      </div>
      <div class="crop-meta">
        ${c.field_location ? `<div class="crop-meta-row"><span>📍</span> ${c.field_location}</div>` : ''}
        ${c.area_acres ? `<div class="crop-meta-row"><span>📐</span> ${c.area_acres} acres</div>` : ''}
        ${c.field_quantity && c.status === 'growing' ? `<div class="crop-meta-row"><span>📊</span> Field: ${c.field_quantity} ${c.field_unit || 'kg'}</div>` : ''}
        ${c.plant_date ? `<div class="crop-meta-row"><span>🗓️</span> Planted: ${fmtDate(c.plant_date)}</div>` : ''}
        ${c.expected_harvest ? `<div class="crop-meta-row"><span>🌾</span> Harvest: ${fmtDate(c.expected_harvest)}</div>` : ''}
        ${c.harvest_quantity && (c.status === 'completed' || c.status === 'harvested') ? `<div class="crop-meta-row"><span>📦</span> Stock Left: ${c.harvest_quantity} ${c.harvest_unit || 'kg'}</div>` : ''}
        ${c.notes ? `<div class="crop-meta-row"><span>📝</span> ${c.notes}</div>` : ''}
      </div>
      <div class="crop-actions">
        <button class="btn-icon success" title="Edit" onclick="editCrop(${c.id})">✏️</button>
        ${c.status === 'completed' ? `<button class="btn-icon primary" title="Sell Crop" onclick="sellCrop(${c.id}, '${c.name}')">💰</button>` : ''}
        <button class="btn-icon danger" title="Delete" onclick="deleteCrop(${c.id})">🗑️</button>
      </div>
    </div>`;
}

function groupedCropCard(g) {
  return `
    <div class="crop-card">
      <div class="crop-card-header">
        <div>
          <div class="crop-name">${g.name}</div>
          ${g.variety ? `<div class="crop-variety">${g.variety}</div>` : ''}
        </div>
        <span class="crop-status-badge badge-completed">Completed</span>
      </div>
      <div class="crop-meta">
        ${g.field_locations ? `<div class="crop-meta-row"><span>📍</span> ${g.field_locations}</div>` : ''}
        <div class="crop-meta-row"><span>📦</span> Stock: ${g.total_quantity} ${g.unit}</div>
        <div class="crop-meta-row"><span>🔢</span> ${g.count} crop(s)</div>
      </div>
      <div class="crop-actions">
        <button class="btn-icon primary" title="Sell Crop" onclick="sellCrop(${g.crop_ids[0]}, '${g.name}')">💰</button>
      </div>
    </div>`;
}

function openCropModal() {
  document.getElementById('crop-modal-title').textContent = 'Add Crop';
  document.getElementById('crop-id').value = '';
  document.getElementById('crop-name').value = '';
  document.getElementById('crop-variety').value = '';
  document.getElementById('crop-location').value = '';
  document.getElementById('crop-area').value = '';
  document.getElementById('crop-field-quantity').value = '';
  document.getElementById('crop-field-unit').value = 'kg';
  document.getElementById('crop-plant-date').value = today();
  document.getElementById('crop-harvest-date').value = '';
  document.getElementById('crop-status').value = 'growing';
  document.getElementById('crop-harvest-quantity').value = '';
  document.getElementById('crop-harvest-unit').value = 'kg';
  document.getElementById('crop-notes').value = '';
  updateHarvestQuantityVisibility();
  openModal('crop-modal');
}

function editCrop(id) {
  const c = allCrops.find(x => x.id === id);
  if (!c) return;
  document.getElementById('crop-modal-title').textContent = 'Edit Crop';
  document.getElementById('crop-id').value = c.id;
  document.getElementById('crop-name').value = c.name || '';
  document.getElementById('crop-variety').value = c.variety || '';
  document.getElementById('crop-location').value = c.field_location || '';
  document.getElementById('crop-area').value = c.area_acres || '';
  document.getElementById('crop-field-quantity').value = c.field_quantity || '';
  document.getElementById('crop-field-unit').value = c.field_unit || 'kg';
  document.getElementById('crop-plant-date').value = c.plant_date || '';
  document.getElementById('crop-harvest-date').value = c.expected_harvest || '';
  document.getElementById('crop-status').value = c.status || 'growing';
  document.getElementById('crop-harvest-quantity').value = c.harvest_quantity || '';
  document.getElementById('crop-harvest-unit').value = c.harvest_unit || 'kg';
  document.getElementById('crop-notes').value = c.notes || '';
  updateHarvestQuantityVisibility();
  openModal('crop-modal');
}

async function saveCrop() {
  const id = document.getElementById('crop-id').value;
  const name = document.getElementById('crop-name').value.trim();
  if (!name) { showToast('Crop name is required', 'error'); return; }

  const payload = {
    name,
    variety: document.getElementById('crop-variety').value.trim(),
    field_location: document.getElementById('crop-location').value.trim(),
    area_acres: parseFloat(document.getElementById('crop-area').value) || null,
    field_quantity: parseFloat(document.getElementById('crop-field-quantity').value) || 0,
    field_unit: document.getElementById('crop-field-unit').value,
    plant_date: document.getElementById('crop-plant-date').value,
    expected_harvest: document.getElementById('crop-harvest-date').value,
    status: document.getElementById('crop-status').value,
    harvest_quantity: parseFloat(document.getElementById('crop-harvest-quantity').value) || 0,
    harvest_unit: document.getElementById('crop-harvest-unit').value,
    notes: document.getElementById('crop-notes').value.trim(),
  };

  try {
    if (id) {
      await apiPut(`/crops/${id}`, payload);
      showToast('Crop updated ✓');
    } else {
      await apiPost('/crops/', payload);
      showToast('Crop added ✓');
    }
    closeModal('crop-modal');
    await loadCrops();
    if (currentCropFilter) filterCrops(currentCropFilter, null);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function deleteCrop(id) {
  if (!confirm('Are you sure you want to delete this crop?')) return;
  apiDelete(`/crops/${id}`).then(() => {
    showToast('Crop deleted');
    loadCrops();
  }).catch(e => showToast(e.message, 'error'));
}

function sellCrop(cropId, cropName) {
  // Store the crop name and id to be used after navigation
  window.pendingCropSale = { name: cropName, id: cropId };
  
  // Navigate to sales page
  navigate('sales');
}

function updateHarvestQuantityVisibility() {
  const status = document.getElementById('crop-status').value;
  const harvestRow = document.getElementById('harvest-quantity-row');
  if (status === 'completed' || status === 'harvested') {
    harvestRow.style.display = 'flex';
  } else {
    harvestRow.style.display = 'none';
  }
}

// Override generic openModal for crop-modal to reset form
const _origOpen = window.openModal;
document.addEventListener('DOMContentLoaded', () => {
  // Patch "Add Crop" button
  document.querySelector('[onclick="openModal(\'crop-modal\')"]')
    ?.setAttribute('onclick', 'openCropModal()');
  
  // Add event listener for status dropdown
  const statusSelect = document.getElementById('crop-status');
  if (statusSelect) {
    statusSelect.addEventListener('change', updateHarvestQuantityVisibility);
  }
});

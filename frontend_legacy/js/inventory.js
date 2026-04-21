/* inventory.js */

let allInventory = [];
let currentInvFilter = null;
let currentInvLowStock = false;

async function loadInventory() {
  const listEl = document.getElementById('inventory-list');
  const summaryEl = document.getElementById('inventory-summary');
  listEl.innerHTML = '<div class="loading-spinner"></div>';
  summaryEl.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const [items, summary] = await Promise.all([
      apiGet('/inventory/'),
      apiGet('/inventory/summary'),
    ]);
    allInventory = items || [];
    renderInventorySummary(summary);
    renderInventoryTable(allInventory);
  } catch (e) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load inventory</div></div>`;
    summaryEl.innerHTML = '';
  }
}

function renderInventorySummary(s) {
  const el = document.getElementById('inventory-summary');
  if (!s) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="inv-stat-card">
      <div class="inv-stat-val text-blue">${s.total_items || 0}</div>
      <div class="inv-stat-label">Total Items</div>
    </div>
    <div class="inv-stat-card">
      <div class="inv-stat-val text-red">${s.low_stock_count || 0}</div>
      <div class="inv-stat-label">Low Stock</div>
    </div>
    <div class="inv-stat-card">
      <div class="inv-stat-val text-amber">${fmtCurrency(s.total_value || 0)}</div>
      <div class="inv-stat-label">Stock Value</div>
    </div>
    <div class="inv-stat-card">
      <div class="inv-stat-val text-purple">${(s.by_category || []).length}</div>
      <div class="inv-stat-label">Categories</div>
    </div>`;
}

function filterInventory(category, btn) {
  currentInvFilter = category;
  currentInvLowStock = false;
  document.querySelectorAll('#page-inventory .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  applyInventoryFilter();
}

function filterInventoryLowStock(btn) {
  currentInvLowStock = !currentInvLowStock;
  currentInvFilter = null;
  document.querySelectorAll('#page-inventory .filter-btn').forEach(b => b.classList.remove('active'));
  if (currentInvLowStock) btn.classList.add('active');
  else {
    document.querySelector('#page-inventory .filter-btn[onclick*="null"]')?.classList.add('active');
  }
  applyInventoryFilter();
}

function applyInventoryFilter() {
  let items = allInventory;
  if (currentInvLowStock) {
    items = items.filter(i => (i.quantity - (i.quantity_used || 0)) <= i.min_quantity);
  } else if (currentInvFilter) {
    items = items.filter(i => i.category === currentInvFilter);
  }
  renderInventoryTable(items);
}

const INV_CAT_EMOJI = { seeds: '🌾', fertilizer: '🧪', pesticide: '☠️', equipment: '🔧', fuel: '⛽', other: '📦' };

function renderInventoryTable(items) {
  const listEl = document.getElementById('inventory-list');
  if (!items.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <div class="empty-title">No items found</div>
        <div class="empty-sub">Add items to track your farm supplies</div>
      </div>`;
    return;
  }

  listEl.innerHTML = `
    <div class="table-wrapper">
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
          ${items.map(item => {
            const isLow = (item.quantity - (item.quantity_used || 0)) <= item.min_quantity;
            const stockValue = ((item.quantity || 0) - (item.quantity_used || 0)) * (item.unit_price || 0);
            return `
              <tr>
                <td>
                  <span class="td-name">${item.name}</span>
                  ${item.location ? `<div style="font-size:0.73rem; color:var(--text-3);">📍 ${item.location}</div>` : ''}
                </td>
                <td>
                  <span style="font-size:0.9rem;">${INV_CAT_EMOJI[item.category] || '📦'}</span>
                  <span style="font-size:0.8rem; color:var(--text-2); margin-left:0.25rem;">${capitalize(item.category)}</span>
                </td>
                <td>
                  <span class="${isLow ? 'text-red fw-600' : 'text-green fw-600'}">${item.quantity}</span>
                  <span style="color:var(--text-3); font-size:0.75rem;"> ${item.unit}</span>
                  ${isLow ? `<span class="low-stock-badge" style="display:block; margin-top:0.2rem;">⚠️ Low</span>` : ''}
                </td>
                <td style="color:var(--text-2);">
                  <span class="text-amber fw-600">${item.quantity_used || 0}</span>
                  <span style="color:var(--text-3); font-size:0.75rem;"> ${item.unit}</span>
                </td>
                <td>
                  <span class="text-blue fw-600">${(item.quantity || 0) - (item.quantity_used || 0)}</span>
                  <span style="color:var(--text-3); font-size:0.75rem;"> ${item.unit}</span>
                </td>
                <td style="color:var(--text-3);">${item.min_quantity} ${item.unit}</td>
                <td style="color:var(--text-2);">${item.unit_price ? fmtCurrency(item.unit_price) : '—'}</td>
                <td style="color:var(--amber); font-weight:600;">${stockValue > 0 ? fmtCurrency(stockValue) : '—'}</td>
                <td style="color:var(--text-2);">${item.supplier || '—'}</td>
                <td style="color:${item.expiry_date && new Date(item.expiry_date) < new Date() ? 'var(--red)' : 'var(--text-2)'};">
                  ${item.expiry_date ? fmtDate(item.expiry_date) : '—'}
                </td>
                <td>
                  <div style="display:flex; gap:0.3rem; justify-content:flex-end;">
                    <button class="btn-icon success" onclick="editInventoryItem(${item.id})" title="Edit">✏️</button>
                    <button class="btn-icon danger" onclick="deleteInventoryItem(${item.id})" title="Delete">🗑️</button>
                  </div>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function openInventoryModal() {
  document.getElementById('inventory-modal-title').textContent = 'Add Inventory Item';
  document.getElementById('inv-id').value = '';
  document.getElementById('inv-name').value = '';
  document.getElementById('inv-category').value = 'seeds';
  document.getElementById('inv-quantity').value = '';
  document.getElementById('inv-quantity-used').value = '0';
  document.getElementById('inv-unit').value = 'kg';
  document.getElementById('inv-min-qty').value = '0';
  document.getElementById('inv-price').value = '';
  document.getElementById('inv-supplier').value = '';
  document.getElementById('inv-location').value = '';
  document.getElementById('inv-expiry').value = '';
  openModal('inventory-modal');
}

function editInventoryItem(id) {
  const item = allInventory.find(x => x.id === id);
  if (!item) return;
  document.getElementById('inventory-modal-title').textContent = 'Edit Item';
  document.getElementById('inv-id').value = item.id;
  document.getElementById('inv-name').value = item.name || '';
  document.getElementById('inv-category').value = item.category || 'other';
  document.getElementById('inv-quantity').value = item.quantity || 0;
  document.getElementById('inv-quantity-used').value = item.quantity_used || 0;
  document.getElementById('inv-unit').value = item.unit || 'kg';
  document.getElementById('inv-min-qty').value = item.min_quantity || 0;
  document.getElementById('inv-price').value = item.unit_price || '';
  document.getElementById('inv-supplier').value = item.supplier || '';
  document.getElementById('inv-location').value = item.location || '';
  document.getElementById('inv-expiry').value = item.expiry_date || '';
  openModal('inventory-modal');
}

async function saveInventoryItem() {
  const id = document.getElementById('inv-id').value;
  const name = document.getElementById('inv-name').value.trim();
  const category = document.getElementById('inv-category').value;

  if (!name) { showToast('Item name is required', 'error'); return; }
  if (!category) { showToast('Category is required', 'error'); return; }

  const payload = {
    name,
    category,
    quantity: parseFloat(document.getElementById('inv-quantity').value) || 0,
    quantity_used: parseFloat(document.getElementById('inv-quantity-used').value) || 0,
    unit: document.getElementById('inv-unit').value,
    min_quantity: parseFloat(document.getElementById('inv-min-qty').value) || 0,
    unit_price: parseFloat(document.getElementById('inv-price').value) || 0,
    supplier: document.getElementById('inv-supplier').value.trim(),
    location: document.getElementById('inv-location').value.trim(),
    expiry_date: document.getElementById('inv-expiry').value,
  };

  try {
    if (id) {
      await apiPut(`/inventory/${id}`, payload);
      showToast('Item updated ✓');
    } else {
      await apiPost('/inventory/', payload);
      showToast('Item added ✓');
    }
    closeModal('inventory-modal');
    loadInventory();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function deleteInventoryItem(id) {
  const ok = await confirmDialog('Delete this inventory item? This cannot be undone.');
  if (!ok) return;
  try {
    await apiDelete(`/inventory/${id}`);
    showToast('Item deleted');
    loadInventory();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('[onclick="openModal(\'inventory-modal\')"]')
    ?.setAttribute('onclick', 'openInventoryModal()');
});

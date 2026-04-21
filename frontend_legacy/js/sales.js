/* sales.js */

let allSales = [];
let completedCrops = [];

async function loadSales() {
  await loadSalesList();
  loadSalesSummary();
  loadCustomersForFilter();

  // Check if there's a pending crop sale from crops page
  if (window.pendingCropSale) {
    // Open modal with the crop name pre-filled
    await openSaleModal();
    document.getElementById('sale-crop-name').value = window.pendingCropSale.name;
    document.getElementById('sale-crop-id').value = window.pendingCropSale.id;
    // Clear the pending sale
    window.pendingCropSale = null;
  }
}

async function loadCompletedCropsForSale() {
  try {
    const crops = await apiGet('/crops/') || [];
    completedCrops = crops.filter(c => c.status === 'completed');
    
    // Group crops by name and variety
    const grouped = {};
    completedCrops.forEach(crop => {
      const key = `${crop.name}|${crop.variety || ''}`;
      if (!grouped[key]) {
        grouped[key] = {
          name: crop.name,
          variety: crop.variety,
          total_quantity: crop.harvest_quantity || 0,
          unit: crop.harvest_unit || 'kg',
          crop_ids: []
        };
      }
      grouped[key].total_quantity += (crop.harvest_quantity || 0);
      grouped[key].crop_ids.push(crop.id);
    });
    
    // Populate dropdown
    const select = document.getElementById('sale-crop-select');
    select.innerHTML = '<option value="">Select crop or type manually</option>';
    Object.values(grouped).forEach(g => {
      const label = g.variety ? `${g.name} (${g.variety}) - ${g.total_quantity} ${g.unit}` : `${g.name} - ${g.total_quantity} ${g.unit}`;
      select.innerHTML += `<option value="${g.name}" data-unit="${g.unit}" data-crop-id="${g.crop_ids[0]}">${label}</option>`;
    });
  } catch (e) {
    console.error('Failed to load completed crops:', e);
  }
}

function onCropSelect() {
  const select = document.getElementById('sale-crop-select');
  const selectedOption = select.options[select.selectedIndex];
  
  if (selectedOption.value) {
    // Auto-fill crop name
    document.getElementById('sale-crop-name').value = selectedOption.value;
    // Auto-fill unit
    document.getElementById('sale-unit').value = selectedOption.dataset.unit || 'kg';
    // Auto-fill crop ID
    document.getElementById('sale-crop-id').value = selectedOption.dataset.cropId || '';
  }
}

async function loadSalesList() {
  const grid = document.getElementById('sales-list');
  grid.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const sales = await apiGet('/sales/');
    allSales = sales || [];
    renderSales(allSales);
  } catch (e) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load sales</div></div>`;
  }
}

async function loadSalesSummary() {
  const summary = document.getElementById('sales-summary');
  try {
    const data = await apiGet('/sales/summary');
    summary.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-label">Total Revenue</div>
          <div class="stat-value">₹${data.total_revenue || 0}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-label">Total Sales</div>
          <div class="stat-value">${data.total_sales || 0}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-label">Paid Amount</div>
          <div class="stat-value">₹${data.paid_amount || 0}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⏳</div>
        <div class="stat-content">
          <div class="stat-label">Pending Amount</div>
          <div class="stat-value">₹${data.pending_amount || 0}</div>
        </div>
      </div>
    `;
  } catch (e) {
    summary.innerHTML = `<div class="empty-state">Failed to load summary</div>`;
  }
}

function renderSales(sales) {
  const grid = document.getElementById('sales-list');
  if (!sales.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💰</div>
        <div class="empty-title">No sales found</div>
        <div class="empty-sub">Record your first sale to get started</div>
      </div>`;
    return;
  }
  grid.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Customer</th>
            <th>Crop</th>
            <th>Quantity</th>
            <th>Stock Left</th>
            <th>Total</th>
            <th>Paid</th>
            <th>Remaining</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${sales.map(s => `
            <tr>
              <td>${s.sale_date}</td>
              <td><span class="td-name">${s.customer_name || 'Unknown'}</span></td>
              <td>${s.crop_name}</td>
              <td>${s.quantity} ${s.unit}</td>
              <td><span class="text-blue fw-600">${s.crop_stock || 0} ${s.crop_unit || s.unit}</span></td>
              <td><span class="text-amber fw-600">₹${s.total_price.toFixed(2)}</span></td>
              <td><span class="text-green fw-600">₹${(s.paid_amount || 0).toFixed(2)}</span></td>
              <td><span class="text-red fw-600">₹${(s.remaining_amount || 0).toFixed(2)}</span></td>
              <td>
                <span class="status-badge status-${s.payment_status}">${s.payment_status}</span>
              </td>
              <td>
                <button class="btn-sm btn-secondary" onclick="editSale(${s.id})">Edit</button>
                <button class="btn-sm btn-danger" onclick="deleteSale(${s.id})">Delete</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

async function loadCustomersForSale() {
  try {
    const customers = await apiGet('/customers/');
    const select = document.getElementById('sale-customer');
    select.innerHTML = '<option value="">Select customer</option>';
    customers.forEach(c => {
      select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
    return customers;
  } catch (e) {
    console.error('Failed to load customers:', e);
    return [];
  }
}

async function openSaleModal(sale = null) {
  const modal = document.getElementById('sale-modal');
  const title = document.getElementById('sale-modal-title');

  // Load customers and completed crops first, then open modal
  await Promise.all([loadCustomersForSale(), loadCompletedCropsForSale()]);
  
  if (sale) {
    title.textContent = 'Edit Sale';
    document.getElementById('sale-id').value = sale.id;
    document.getElementById('sale-customer').value = sale.customer_id;
    document.getElementById('sale-crop-name').value = sale.crop_name;
    document.getElementById('sale-quantity').value = sale.quantity;
    document.getElementById('sale-unit').value = sale.unit;
    document.getElementById('sale-price').value = sale.price_per_unit;
    document.getElementById('sale-total').value = sale.total_price;
    document.getElementById('sale-paid-amount').value = sale.paid_amount || 0;
    document.getElementById('sale-remaining-amount').value = sale.remaining_amount || 0;
    document.getElementById('sale-date').value = sale.sale_date;
    document.getElementById('sale-payment-status').value = sale.payment_status;
    document.getElementById('sale-payment-method').value = sale.payment_method;
    document.getElementById('sale-notes').value = sale.notes || '';
  } else {
    title.textContent = 'New Sale';
    document.getElementById('sale-id').value = '';
    document.getElementById('sale-customer').value = '';
    document.getElementById('sale-crop-name').value = '';
    document.getElementById('sale-quantity').value = '';
    document.getElementById('sale-unit').value = 'kg';
    document.getElementById('sale-price').value = '';
    document.getElementById('sale-total').value = '';
    document.getElementById('sale-paid-amount').value = '';
    document.getElementById('sale-remaining-amount').value = '';
    document.getElementById('sale-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('sale-payment-status').value = 'pending';
    document.getElementById('sale-payment-method').value = 'cash';
    document.getElementById('sale-notes').value = '';
  }
  
  openModal('sale-modal');
  
  // Add auto-calculation for total price
  document.getElementById('sale-quantity').addEventListener('input', calculateSaleTotal);
  document.getElementById('sale-price').addEventListener('input', calculateSaleTotal);
}

function calculateSaleTotal() {
  const quantity = parseFloat(document.getElementById('sale-quantity').value) || 0;
  const price = parseFloat(document.getElementById('sale-price').value) || 0;
  const total = quantity * price;
  document.getElementById('sale-total').value = total.toFixed(2);
  calculateRemainingAmount();
}

function calculateRemainingAmount() {
  const total = parseFloat(document.getElementById('sale-total').value) || 0;
  const paid = parseFloat(document.getElementById('sale-paid-amount').value) || 0;
  const remaining = total - paid;
  document.getElementById('sale-remaining-amount').value = remaining.toFixed(2);
  
  // Auto-update payment status
  const paymentStatus = document.getElementById('sale-payment-status');
  if (paid === 0) {
    paymentStatus.value = 'pending';
  } else if (paid >= total) {
    paymentStatus.value = 'paid';
  } else {
    paymentStatus.value = 'partial';
  }
}

async function saveSale() {
  const id = document.getElementById('sale-id').value;
  const cropId = document.getElementById('sale-crop-id').value;
  const data = {
    customer_id: document.getElementById('sale-customer').value,
    crop_id: cropId ? parseInt(cropId) : null,
    crop_name: document.getElementById('sale-crop-name').value.trim(),
    quantity: parseFloat(document.getElementById('sale-quantity').value) || 0,
    unit: document.getElementById('sale-unit').value,
    price_per_unit: parseFloat(document.getElementById('sale-price').value) || 0,
    total_price: parseFloat(document.getElementById('sale-total').value) || 0,
    paid_amount: parseFloat(document.getElementById('sale-paid-amount').value) || 0,
    remaining_amount: parseFloat(document.getElementById('sale-remaining-amount').value) || 0,
    sale_date: document.getElementById('sale-date').value,
    payment_status: document.getElementById('sale-payment-status').value,
    payment_method: document.getElementById('sale-payment-method').value,
    notes: document.getElementById('sale-notes').value.trim()
  };
  
  if (!data.customer_id || !data.crop_name || !data.quantity || !data.price_per_unit) {
    showToast('Please fill all required fields', 'error');
    return;
  }
  
  try {
    if (id) {
      await apiPut(`/sales/${id}`, data);
      showToast('Sale updated successfully');
    } else {
      await apiPost('/sales/', data);
      showToast('Sale recorded successfully');
    }
    closeModal('sale-modal');
    loadSales();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function editSale(id) {
  const sale = allSales.find(s => s.id === id);
  if (sale) {
    openSaleModal(sale);
  }
}

window.deleteSale = async function(id) {
  if (!confirm('Are you sure you want to delete this sale?')) return;

  try {
    await apiDelete(`/sales/${id}`);
    showToast('Sale deleted successfully');
    loadSales();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function loadCustomersForFilter() {
  try {
    const customers = await apiGet('/customers/');
    const select = document.getElementById('sales-customer-filter');
    select.innerHTML = '<option value="">All Customers</option>';
    customers.forEach(c => {
      select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
  } catch (e) {
    console.error('Failed to load customers for filter:', e);
  }
}

function filterSalesByCustomer() {
  const customerId = document.getElementById('sales-customer-filter').value;
  if (customerId) {
    const filtered = allSales.filter(s => s.customer_id == customerId);
    renderSales(filtered);
  } else {
    renderSales(allSales);
  }
}

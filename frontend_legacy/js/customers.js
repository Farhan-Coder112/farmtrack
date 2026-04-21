/* customers.js */

let allCustomers = [];

async function loadCustomers() {
  const grid = document.getElementById('customers-list');
  grid.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const customers = await apiGet('/customers/');
    allCustomers = customers || [];
    renderCustomers(allCustomers);
  } catch (e) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load customers</div></div>`;
  }
}

function renderCustomers(customers) {
  const grid = document.getElementById('customers-list');
  if (!customers.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <div class="empty-title">No customers found</div>
        <div class="empty-sub">Add your first customer to get started</div>
      </div>`;
    return;
  }
  grid.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Business</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${customers.map(c => `
            <tr>
              <td><span class="td-name">${c.name}</span></td>
              <td>${c.business_name || '—'}</td>
              <td>${c.phone || '—'}</td>
              <td>${c.email || '—'}</td>
              <td>
                <button class="btn-sm btn-primary" onclick="showCustomerSales(${c.id}, '${c.name.replace(/'/g, "\\'")}')">View Sales</button>
                <button class="btn-sm btn-warning" onclick="showCustomerRemainingAmount(${c.id}, '${c.name.replace(/'/g, "\\'")}')">Remaining Amount</button>
                <button class="btn-sm btn-secondary" onclick="editCustomer(${c.id})">Edit</button>
                <button class="btn-sm btn-danger" onclick="deleteCustomer(${c.id})">Delete</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

async function showCustomerSales(customerId, customerName) {
  try {
    const sales = await apiGet(`/sales/customer/${customerId}`);
    const modal = document.getElementById('customer-sales-modal');
    const title = document.getElementById('customer-sales-title');
    const salesList = document.getElementById('customer-sales-list');
    
    title.textContent = `Sales for ${customerName}`;
    
    if (!sales.length) {
      salesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💰</div>
          <div class="empty-title">No sales found</div>
          <div class="empty-sub">This customer has no sales yet</div>
        </div>`;
    } else {
      salesList.innerHTML = `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Crop</th>
                <th>Quantity</th>
                <th>Stock Left</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${sales.map(s => `
                <tr>
                  <td>${s.sale_date}</td>
                  <td>${s.crop_name}</td>
                  <td>${s.quantity} ${s.unit}</td>
                  <td><span class="text-blue fw-600">${s.crop_stock || 0} ${s.crop_unit || s.unit}</span></td>
                  <td><span class="text-amber fw-600">₹${s.total_price.toFixed(2)}</span></td>
                  <td><span class="text-green fw-600">₹${(s.paid_amount || 0).toFixed(2)}</span></td>
                  <td><span class="text-red fw-600">₹${(s.remaining_amount || 0).toFixed(2)}</span></td>
                  <td>
                    <span class="status-badge status-${s.payment_status}">${s.payment_status}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    }
    
    openModal('customer-sales-modal');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function showCustomerRemainingAmount(customerId, customerName) {
  try {
    const sales = await apiGet(`/sales/customer/${customerId}`);
    const modal = document.getElementById('customer-sales-modal');
    const title = document.getElementById('customer-sales-title');
    const salesList = document.getElementById('customer-sales-list');
    
    title.textContent = `Remaining Amount for ${customerName}`;
    
    if (!sales.length) {
      salesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💰</div>
          <div class="empty-title">No sales found</div>
          <div class="empty-sub">This customer has no sales yet</div>
        </div>`;
    } else {
      // Calculate totals
      const totalSales = sales.reduce((sum, s) => sum + (s.total_price || 0), 0);
      const totalPaid = sales.reduce((sum, s) => sum + (s.paid_amount || 0), 0);
      const totalRemaining = sales.reduce((sum, s) => sum + (s.remaining_amount || 0), 0);
      
      salesList.innerHTML = `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Crop</th>
                <th>Quantity</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${sales.map(s => `
                <tr>
                  <td>${s.sale_date}</td>
                  <td>${s.crop_name}</td>
                  <td>${s.quantity} ${s.unit}</td>
                  <td><span class="text-amber fw-600">₹${s.total_price.toFixed(2)}</span></td>
                  <td><span class="text-green fw-600">₹${(s.paid_amount || 0).toFixed(2)}</span></td>
                  <td><span class="text-red fw-600">₹${(s.remaining_amount || 0).toFixed(2)}</span></td>
                  <td>
                    <span class="status-badge status-${s.payment_status}">${s.payment_status}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="stats-grid" style="margin-top: 1.5rem">
          <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
              <div class="stat-label">Total Sales</div>
              <div class="stat-value">₹${totalSales.toFixed(2)}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
              <div class="stat-label">Total Paid</div>
              <div class="stat-value">₹${totalPaid.toFixed(2)}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">⏳</div>
            <div class="stat-content">
              <div class="stat-label">Total Remaining</div>
              <div class="stat-value">₹${totalRemaining.toFixed(2)}</div>
            </div>
          </div>
        </div>`;
    }
    
    openModal('customer-sales-modal');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function openCustomerModal(customer = null) {
  const modal = document.getElementById('customer-modal');
  const title = document.getElementById('customer-modal-title');
  
  if (customer) {
    title.textContent = 'Edit Customer';
    document.getElementById('customer-id').value = customer.id;
    document.getElementById('customer-name').value = customer.name;
    document.getElementById('customer-phone').value = customer.phone || '';
    document.getElementById('customer-email').value = customer.email || '';
    document.getElementById('customer-business').value = customer.business_name || '';
    document.getElementById('customer-address').value = customer.address || '';
    document.getElementById('customer-notes').value = customer.notes || '';
  } else {
    title.textContent = 'Add Customer';
    document.getElementById('customer-id').value = '';
    document.getElementById('customer-name').value = '';
    document.getElementById('customer-phone').value = '';
    document.getElementById('customer-email').value = '';
    document.getElementById('customer-business').value = '';
    document.getElementById('customer-address').value = '';
    document.getElementById('customer-notes').value = '';
  }
  
  openModal('customer-modal');
}

async function saveCustomer() {
  const id = document.getElementById('customer-id').value;
  const data = {
    name: document.getElementById('customer-name').value.trim(),
    phone: document.getElementById('customer-phone').value.trim(),
    email: document.getElementById('customer-email').value.trim(),
    business_name: document.getElementById('customer-business').value.trim(),
    address: document.getElementById('customer-address').value.trim(),
    notes: document.getElementById('customer-notes').value.trim()
  };
  
  if (!data.name) {
    showToast('Customer name is required', 'error');
    return;
  }
  
  try {
    if (id) {
      await apiPut(`/customers/${id}`, data);
      showToast('Customer updated successfully');
    } else {
      await apiPost('/customers/', data);
      showToast('Customer added successfully');
    }
    closeModal('customer-modal');
    loadCustomers();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function editCustomer(id) {
  const customer = allCustomers.find(c => c.id === id);
  if (customer) {
    openCustomerModal(customer);
  }
}

async function deleteCustomer(id) {
  if (!confirm('Are you sure you want to delete this customer?')) return;
  
  try {
    await apiDelete(`/customers/${id}`);
    showToast('Customer deleted successfully');
    loadCustomers();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

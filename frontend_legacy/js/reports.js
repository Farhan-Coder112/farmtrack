/* reports.js - Customer Reports with PDF Generation */

console.log('reports.js loaded');

let reportCustomers = [];
let selectedReportCustomer = null;

// Load customers for reports page
async function loadReports() {
  console.log('loadReports() called');
  try {
    reportCustomers = await apiGet('/customers/');
    console.log('reportCustomers loaded:', reportCustomers);
    if (!reportCustomers) reportCustomers = [];
    
    // Load customers into dropdown directly
    populateCustomerDropdown();
    
    // Clear selected customer
    const selectedCustomerDiv = document.getElementById('report-selected-customer');
    if (selectedCustomerDiv) {
      selectedCustomerDiv.classList.add('hidden');
    }
  } catch (e) {
    console.error('Failed to load customers for reports:', e);
  }
}

// Populate customer dropdown
function populateCustomerDropdown() {
  const select = document.getElementById('report-customer-filter');
  console.log('Select element:', select);
  console.log('reportCustomers:', reportCustomers);
  
  if (!select) {
    console.error('Select element not found');
    return;
  }
  
  select.innerHTML = '<option value="">All Customers</option>';
  if (reportCustomers && reportCustomers.length > 0) {
    reportCustomers.forEach(c => {
      select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
    console.log('Dropdown populated with', reportCustomers.length, 'customers');
  } else {
    console.log('No customers to populate');
  }
}

// Load report for selected customer
async function loadReportForCustomer() {
  const customerId = document.getElementById('report-customer-filter').value;
  
  if (!customerId) {
    document.getElementById('report-selected-customer').classList.add('hidden');
    selectedReportCustomer = null;
    return;
  }
  
  selectedReportCustomer = reportCustomers.find(c => c.id == customerId);
  if (!selectedReportCustomer) return;
  
  document.getElementById('report-customer-name').textContent = selectedReportCustomer.name;
  document.getElementById('report-selected-customer').classList.remove('hidden');
  
  // Load customer stats and sales
  await loadCustomerReportData(customerId);
}

// Load customer report data
async function loadCustomerReportData(customerId) {
  try {
    const sales = await apiGet(`/sales/customer/${customerId}`);
    
    // Calculate stats
    const totalSales = sales.reduce((sum, s) => sum + (s.total_price || 0), 0);
    const totalPaid = sales.reduce((sum, s) => sum + (s.paid_amount || 0), 0);
    const totalRemaining = sales.reduce((sum, s) => sum + (s.remaining_amount || 0), 0);
    
    // Render stats
    document.getElementById('report-customer-stats').innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-label">Total Sales</div>
          <div class="stat-value">₹${totalSales.toLocaleString('en-IN', {maximumFractionDigits: 2})}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-label">Total Paid</div>
          <div class="stat-value">₹${totalPaid.toLocaleString('en-IN', {maximumFractionDigits: 2})}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⏳</div>
        <div class="stat-content">
          <div class="stat-label">Total Remaining</div>
          <div class="stat-value">₹${totalRemaining.toLocaleString('en-IN', {maximumFractionDigits: 2})}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🧾</div>
        <div class="stat-content">
          <div class="stat-label">Total Transactions</div>
          <div class="stat-value">${sales.length}</div>
        </div>
      </div>
    `;
    
    // Render sales table
    if (!sales.length) {
      document.getElementById('report-customer-sales').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💰</div>
          <div class="empty-title">No sales found</div>
          <div class="empty-sub">This customer has no sales yet</div>
        </div>`;
    } else {
      document.getElementById('report-customer-sales').innerHTML = `
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
                <td><span class="status-badge status-${s.payment_status}">${s.payment_status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// Generate PDF Report
function generateCustomerReport() {
  if (!selectedReportCustomer) {
    showToast('Please select a customer first', 'error');
    return;
  }
  
  const customer = selectedReportCustomer;
  const statsHtml = document.getElementById('report-customer-stats').innerHTML;
  const salesHtml = document.getElementById('report-customer-sales').innerHTML;
  
  // Create print window
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Customer Report - ${customer.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: Arial, sans-serif; 
          padding: 40px; 
          line-height: 1.6;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #2ecc71;
        }
        .header h1 { 
          color: #2ecc71; 
          font-size: 28px;
          margin-bottom: 5px;
        }
        .header .subtitle {
          color: #666;
          font-size: 14px;
        }
        .customer-info {
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .customer-info h2 {
          color: #333;
          margin-bottom: 15px;
          font-size: 20px;
        }
        .info-row {
          display: flex;
          margin-bottom: 10px;
        }
        .info-label {
          font-weight: 600;
          width: 120px;
          color: #555;
        }
        .info-value {
          color: #333;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }
        .stat-box {
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }
        .stat-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #2ecc71;
        }
        .section-title {
          font-size: 18px;
          color: #333;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #ddd;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background: #f5f5f5;
          font-weight: 600;
          color: #555;
        }
        .text-green { color: #2ecc71; }
        .text-red { color: #e74c3c; }
        .text-amber { color: #f39c12; }
        .fw-600 { font-weight: 600; }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #999;
          padding-top: 20px;
          border-top: 1px solid #ddd;
        }
        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          text-transform: capitalize;
        }
        .status-paid { background: #d4edda; color: #155724; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-partial { background: #cce5ff; color: #004085; }
        @media print {
          body { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🌾 FarmTrack</h1>
        <div class="subtitle">Customer Sales Report</div>
      </div>
      
      <div class="customer-info">
        <h2>${customer.name}</h2>
        <div class="info-row">
          <div class="info-label">Phone:</div>
          <div class="info-value">${customer.phone || 'N/A'}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Email:</div>
          <div class="info-value">${customer.email || 'N/A'}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Business:</div>
          <div class="info-value">${customer.business_name || 'N/A'}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Address:</div>
          <div class="info-value">${customer.address || 'N/A'}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Report Date:</div>
          <div class="info-value">${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>
      
      <div class="stats-grid">
        ${document.querySelectorAll('#report-customer-stats .stat-card').length > 0 ? `
          <div class="stat-box">
            <div class="stat-label">Total Sales</div>
            <div class="stat-value">${document.querySelector('#report-customer-stats .stat-card:nth-child(1) .stat-value')?.textContent || '₹0'}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Total Paid</div>
            <div class="stat-value">${document.querySelector('#report-customer-stats .stat-card:nth-child(2) .stat-value')?.textContent || '₹0'}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Total Remaining</div>
            <div class="stat-value">${document.querySelector('#report-customer-stats .stat-card:nth-child(3) .stat-value')?.textContent || '₹0'}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Transactions</div>
            <div class="stat-value">${document.querySelector('#report-customer-stats .stat-card:nth-child(4) .stat-value')?.textContent || '0'}</div>
          </div>
        ` : ''}
      </div>
      
      <h3 class="section-title">Sales History</h3>
      ${salesHtml}
      
      <div class="footer">
        Generated by FarmTrack on ${new Date().toLocaleString('en-IN')}<br>
        This is a computer-generated report.
      </div>
      
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

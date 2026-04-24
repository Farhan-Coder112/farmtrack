import React, { useState, useEffect } from 'react';
import { apiGet } from '../utils/api';

function Reports() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerStats, setCustomerStats] = useState(null);
  const [customerSales, setCustomerSales] = useState([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await apiGet('/customers/');
      setCustomers(data || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const handleCustomerChange = async (e) => {
    const customerId = e.target.value;
    if (!customerId) {
      setSelectedCustomer(null);
      setCustomerStats(null);
      setCustomerSales([]);
      return;
    }

    const customer = customers.find(c => c.id == customerId);
    setSelectedCustomer(customer);
    await loadCustomerReportData(customerId);
  };

  const loadCustomerReportData = async (customerId) => {
    try {
      const sales = await apiGet(`/sales/customer/${customerId}`);
      
      const totalSales = sales.reduce((sum, s) => sum + (s.total_price || 0), 0);
      const totalPaid = sales.reduce((sum, s) => sum + (s.paid_amount || 0), 0);
      const totalRemaining = sales.reduce((sum, s) => sum + (s.remaining_amount || 0), 0);

      setCustomerStats({
        totalSales,
        totalPaid,
        totalRemaining,
        transactionCount: sales.length
      });
      setCustomerSales(sales);
    } catch (error) {
      console.error('Failed to load customer report data:', error);
    }
  };

  const generatePDF = () => {
    if (!selectedCustomer) return;
    alert('PDF generation would open here. Implement window.print() or a PDF library.');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-heading">Reports</h2>
          <p className="page-subheading">Generate PDF reports with customer search</p>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: '1rem' }}>
        <select 
          className="input-sm" 
          value={selectedCustomer?.id || ''}
          onChange={handleCustomerChange}
        >
          <option value="">All Customers</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {selectedCustomer && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title">{selectedCustomer.name}</h3>
            <button className="btn-primary" onClick={generatePDF}>📄 Generate PDF Report</button>
          </div>
          <div className="card-body" style={{ padding: '1.5rem' }}>
            {customerStats && (
              <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-content">
                    <div className="stat-label">Total Sales</div>
                    <div className="stat-value">₹{customerStats.totalSales.toFixed(2)}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">✅</div>
                  <div className="stat-content">
                    <div className="stat-label">Total Paid</div>
                    <div className="stat-value">₹{customerStats.totalPaid.toFixed(2)}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">⏳</div>
                  <div className="stat-content">
                    <div className="stat-label">Total Remaining</div>
                    <div className="stat-value">₹{customerStats.totalRemaining.toFixed(2)}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🧾</div>
                  <div className="stat-content">
                    <div className="stat-label">Transactions</div>
                    <div className="stat-value">{customerStats.transactionCount}</div>
                  </div>
                </div>
              </div>
            )}

            {customerSales.length > 0 ? (
              <div className="table-wrapper" style={{ marginTop: '1.5rem' }}>
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
                    {customerSales.map(s => (
                      <tr key={s.id}>
                        <td>{s.sale_date}</td>
                        <td>{s.crop_name}</td>
                        <td>{s.quantity} {s.unit}</td>
                        <td><span className="text-amber fw-600">₹{s.total_price.toFixed(2)}</span></td>
                        <td><span className="text-green fw-600">₹{(s.paid_amount || 0).toFixed(2)}</span></td>
                        <td><span className="text-red fw-600">₹{(s.remaining_amount || 0).toFixed(2)}</span></td>
                        <td><span className={`status-badge status-${s.payment_status}`}>{s.payment_status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{ marginTop: '1.5rem' }}>
                <div className="empty-icon">💰</div>
                <div className="empty-title">No sales found</div>
                <div className="empty-sub">This customer has no sales yet</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;

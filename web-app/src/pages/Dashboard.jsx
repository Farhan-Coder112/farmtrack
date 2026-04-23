import React, { useState, useEffect } from 'react';
import { apiGet } from '../utils/api';

function Dashboard({ navigate }) {
  const [stats, setStats] = useState({ crops: '—', workers: '—', expenses: '—', tasks: '—' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await apiGet('/dashboard/');
      if (data) {
        setStats({
          crops: data.crops?.growing ?? '—',
          workers: data.workers?.active ?? '—',
          expenses: data.expenses?.this_month ? `₹${data.expenses.this_month}` : '—',
          tasks: data.tasks?.pending ?? '—'
        });
      }
    } catch (e) {
      console.error("Dashboard error:", e);
    } finally {
      setLoading(false);
    }
  };

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <h2 className="page-heading">Farm Overview</h2>
          <p className="page-subheading">{dateStr}</p>
        </div>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card stat-green">
          <div className="stat-icon">🌱</div>
          <div className="stat-info">
            <div className="stat-value">{stats.crops}</div>
            <div className="stat-label">Growing Crops</div>
          </div>
        </div>
        <div className="stat-card stat-blue">
          <div className="stat-icon">👷</div>
          <div className="stat-info">
            <div className="stat-value">{stats.workers}</div>
            <div className="stat-label">Active Workers</div>
          </div>
        </div>
        <div className="stat-card stat-amber">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <div className="stat-value">{stats.expenses}</div>
            <div className="stat-label">This Month's Spend</div>
          </div>
        </div>
        <div className="stat-card stat-purple">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.tasks}</div>
            <div className="stat-label">Pending Tasks</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
          </div>
          <div className="activity-list" style={{padding: '1rem'}}>
             <button className="btn-primary" onClick={() => navigate('crops')} style={{width:'100%', marginBottom: '10px'}}>Manage Crops</button>
             <button className="btn-secondary" onClick={() => navigate('workers')} style={{width:'100%', marginBottom: '10px'}}>Manage Workers</button>
             <button className="btn-secondary" onClick={() => navigate('expenses')} style={{width:'100%'}}>View Expenses</button>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Getting Started</h3>
          </div>
          <div className="activity-list" style={{padding: '1rem', color: 'var(--text-2)'}}>
            <p>Welcome to the new React-powered Farm Management system.</p>
            <br />
            <p>Use the sidebar to navigate between your farm operations securely and fast.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

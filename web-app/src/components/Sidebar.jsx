import React from 'react';

function Sidebar({ activePage, navigate, onLogout, toggleSidebar }) {
  const userStr = localStorage.getItem('farm_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const initials = user?.name ? user.name[0].toUpperCase() : 'F';

  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">🌾</span>
          <span className="sidebar-logo-text">FarmTrack</span>
        </div>
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>
      <nav className="sidebar-nav">
        {[
          { id: 'dashboard', icon: '📊', label: 'Dashboard' },
          { id: 'crops', icon: '🌱', label: 'Crops' },
          { id: 'workers', icon: '👷', label: 'Workers' },
          { id: 'tasks', icon: '✅', label: 'Tasks' },
          { id: 'expenses', icon: '💰', label: 'Expenses' },
          { id: 'inventory', icon: '📦', label: 'Inventory' },
        ].map(item => (
          <a
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => navigate(item.id)}
            style={{cursor: 'pointer'}}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </a>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{initials}</div>
          <div className="user-details">
            <div className="user-name">{user?.name || 'Farmer'}</div>
            <div className="user-farm">{user?.farm_name || 'Loading...'}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout} title="Logout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;

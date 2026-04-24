import React, { useState, useEffect } from 'react';
import './index.css';
import { getToken } from './utils/api';
import AuthScreen from './pages/AuthScreen';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

import Crops from './pages/Crops';
import Workers from './pages/Workers';
import Tasks from './pages/Tasks';
import Expenses from './pages/Expenses';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    checkAuth();
    window.addEventListener('hashchange', checkAuth);
    return () => window.removeEventListener('hashchange', checkAuth);
  }, []);

  const checkAuth = () => {
    if (window.location.hash === '#login') {
      setIsAuthenticated(false);
    } else {
      setIsAuthenticated(!!getToken());
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    window.location.hash = '#dashboard';
  };

  const handleLogout = () => {
    localStorage.removeItem('farm_token');
    localStorage.removeItem('farm_user');
    setIsAuthenticated(false);
    window.location.hash = '#login';
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard navigate={setActivePage} />;
      case 'crops': return <Crops />;
      case 'workers': return <Workers />;
      case 'tasks': return <Tasks />;
      case 'expenses': return <Expenses />;
      case 'inventory': return <Inventory />;
      case 'reports': return <Reports />;
      default: return <Dashboard navigate={setActivePage} />;
    }
  };

  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div id="app" className={isSidebarOpen ? 'sidebar-open' : ''}>
      <Sidebar 
        activePage={activePage} 
        navigate={setActivePage} 
        onLogout={handleLogout} 
        toggleSidebar={toggleSidebar} 
      />
      <main className="main-content" id="main-content">
        <Topbar 
          toggleSidebar={toggleSidebar} 
          pageTitle={activePage.charAt(0).toUpperCase() + activePage.slice(1)} 
        />
        <div className="page-content">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;

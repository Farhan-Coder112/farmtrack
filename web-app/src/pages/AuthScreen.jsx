import React, { useState } from 'react';
import { apiPost } from '../utils/api';

function AuthScreen({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [farm, setFarm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        if (!email || !password) throw new Error('Email and password required');
        const res = await apiPost('/auth/login', { email, password });
        localStorage.setItem('farm_token', res.access_token);
        localStorage.setItem('farm_user', JSON.stringify(res.user));
        onLogin();
      } else {
        if (!email || !password || !name) throw new Error('Name, email, and password required');
        await apiPost('/auth/register', { name, email, password, farm_name: farm, phone });
        setIsLogin(true); // Switch to login after successful register
        alert('Account created! Please sign in.');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="auth-screen" style={{display: 'flex'}}>
      <div className="auth-bg">
        <div className="auth-bg-blob auth-bg-blob-1"></div>
        <div className="auth-bg-blob auth-bg-blob-2"></div>
        <div className="auth-bg-blob auth-bg-blob-3"></div>
      </div>
      <div className="auth-container">
        <div className="auth-logo">
          <span className="auth-logo-icon">🌾</span>
          <span className="auth-logo-text">FarmTrack</span>
        </div>
        <div className="auth-card" id="auth-card">
          <form onSubmit={handleSubmit}>
            <h1 className="auth-title">{isLogin ? 'Welcome back' : 'Create account'}</h1>
            <p className="auth-subtitle">{isLogin ? 'Sign in to your farm dashboard' : 'Start managing your farm today'}</p>
            
            {!isLogin && (
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
                </div>
              </div>
            )}
            
            <div className="form-group">
              <label>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="farmer@example.com" />
            </div>
            
            {!isLogin && (
              <div className="form-group">
                <label>Farm Name</label>
                <input type="text" value={farm} onChange={e => setFarm(e.target.value)} placeholder="Green Valley Farm" />
              </div>
            )}

            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isLogin ? "••••••••" : "Create a strong password"} />
            </div>
            
            {error && <div className="auth-error">{error}</div>}
            
            <button type="submit" className="btn-primary btn-full" disabled={loading}>
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
            
            <p className="auth-switch">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); setError(''); }}>
                {isLogin ? 'Create one' : 'Sign in'}
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AuthScreen;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import '../styles/App.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShow]     = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Username आणि Password दोन्ही भरा');
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      toast.success('✅ Login successful! Welcome back.');
      navigate('/');
    } catch (err) {
      toast.error('❌ ' + (err.response?.data || 'Login failed. Check credentials.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* Left Panel — Branding */}
      <div className="login-left">
        <div className="login-brand">
          <div style={{ fontSize: 56, marginBottom: 16 }}>🏢</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: '0 0 8px' }}>
            ERP Accounting &amp;<br />GST Management System
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.7, margin: '12px 0 32px' }}>
            Complete business solution for Indian SMEs —<br />
            Purchase, Sales, Inventory, GST Compliance &amp; Financial Reports
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['✅ GST / GSTR-3B','📊 P&L Reports','🛒 Purchase & Sales','📦 Inventory','📒 Ledger','⚖️ Trial Balance','📋 Balance Sheet','📂 Bulk Import'].map(f => (
              <span key={f} style={{
                background: 'rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.9)',
                padding: '5px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.2)',
              }}>{f}</span>
            ))}
          </div>
        </div>

        {/* Bottom branding — Left Panel */}
        <div style={{ marginTop: 'auto', paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 1.8 }}>
            <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>Prem Software India Solution</div>
            <div>Customized for: Sunita Enterprise</div>
            <div>Developed by: Narayan Shinde</div>
            <div>
              <a
                href="https://www.premsoftwareindiasolution.com"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#7dd3fc', textDecoration: 'none' }}
              >
                🌐 www.premsoftwareindiasolution.com
              </a>
            </div>
            <div style={{ marginTop: 4 }}>© 2026 All Rights Reserved</div>
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="login-right">
        <div className="login-card">

          {/* Card Header */}
          <div className="login-logo">
            <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #1a4f8a, #2563eb)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px', boxShadow: '0 4px 16px rgba(26,79,138,0.3)' }}>
              🔐
            </div>
            <h2 style={{ margin: '0 0 4px', color: '#1a2744', fontSize: 22, fontWeight: 800 }}>
              Welcome to Sunita Enterprise
            </h2>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>Sign in to your ERP account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', letterSpacing: 0.5 }}>USERNAME</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>👤</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  autoFocus
                  style={{ paddingLeft: 40 }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', letterSpacing: 0.5 }}>PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔒</span>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{ paddingLeft: 40, paddingRight: 44 }}
                />
                <span
                  onClick={() => setShow(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 16, userSelect: 'none' }}
                  title={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? '🙈' : '👁️'}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: 14,
                fontWeight: 700,
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1a4f8a, #2563eb)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: 0.5,
                boxShadow: loading ? 'none' : '0 4px 12px rgba(26,79,138,0.35)',
                transition: 'all .2s',
              }}
            >
              {loading ? '⏳ Signing in...' : '🚀 Sign In'}
            </button>
          </form>

          {/* Footer — Right Card */}
          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: '#cbd5e1', lineHeight: 1.8 }}>
            <div>ERP Accounting &amp; GST Management System</div>
            <div>A Product of <strong style={{ color: '#94a3b8' }}>Prem Software India Solution</strong> &nbsp;·&nbsp; © 2026</div>
            <div>Developed by: <strong style={{ color: '#94a3b8' }}>Narayan Shinde</strong></div>
            <div>
              <a
                href="https://www.premsoftwareindiasolution.com"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#7dd3fc', textDecoration: 'none' }}
              >
                🌐 www.premsoftwareindiasolution.com
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

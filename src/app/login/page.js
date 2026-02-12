'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, Eye, EyeOff, User, Shield } from 'lucide-react';

export default function LoginPage() {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Add validation
    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError('Please enter both username and password');
      setIsLoading(false);
      return;
    }

    // Check credentials
    if (credentials.username === 'Bunny' && credentials.password === 'R@dh@123#') {
      // Set session cookie (expires when browser closes)
      document.cookie = 'isLoggedIn=true; path=/; secure; samesite=strict';
      
      // Store in localStorage for page refresh persistence
      localStorage.setItem('isLoggedIn', 'true');
      
      // Add success animation before redirect
      setTimeout(() => {
        router.push('/');
      }, 300);
    } else {
      setError('Invalid username or password');
      // Shake animation for error
      const form = e.target;
      form.style.animation = 'shake 0.5s';
      setTimeout(() => {
        form.style.animation = '';
      }, 500);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <Mail className="icon-lg" />
          </div>
          <h1 className="login-title">Email Sender Login</h1>
          <p className="login-subtitle">Enter your credentials to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">
              <User className="icon-sm" style={{ marginRight: '0.5rem' }} />
              Username
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField('')}
                className={`form-input ${focusedField === 'username' ? 'input-focused' : ''}`}
                placeholder="Enter your username"
                required
                autoComplete="username"
              />
              <div className="input-icon">
                <Mail className="icon" />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock className="icon-sm" style={{ marginRight: '0.5rem' }} />
              Password
            </label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField('')}
                className={`form-input ${focusedField === 'password' ? 'input-focused' : ''}`}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
              <div className="input-icon">
                <Lock className="icon" />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
                tabIndex="-1"
              >
                {showPassword ? <EyeOff className="icon" /> : <Eye className="icon" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="login-btn"
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="icon" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <div className="footer-content">
            <Shield className="icon-sm security-icon" />
            <p>Secure login for Email Sender Application</p>
          </div>
          <div className="login-tips">
            <p className="tip-text">💡 Tip: Keep your credentials secure</p>
          </div>
        </div>
      </div>
    </div>
  );
}

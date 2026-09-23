import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import LoomiLogo from '../components/LoomiLogo';
import { api } from '../services/api';

export default function SignUp() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = formData.name.trim();
    const email = formData.email.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    if (!name || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both passwords match.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Frontend sends registration request to backend
      const res = await api.register({
        name,
        email,
        password,
        confirm_password: confirmPassword
      });

      // 7. Frontend redirects the trainer to Login
      navigate('/login', {
        replace: true,
        state: {
          registeredEmail: email,
          successMessage: 'Trainer account created successfully! Please sign in with your password.'
        }
      });
    } catch (err) {
      setError(err.message || 'Could not complete registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card" style={{ maxWidth: '440px' }}>
        {/* Brand Header */}
        <div className="auth-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ marginBottom: '16px' }}>
            <LoomiLogo to="/" size="lg" />
          </div>
          <h1 className="auth-title">Create Trainer Account</h1>
          <p className="auth-subtitle">Sign up to create and host interactive live quizzes</p>
        </div>

        {error && (
          <div className="auth-alert error" style={{ marginBottom: '16px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Email/Password Registration Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 1. Name */}
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <div className="input-with-icon">
              <User size={16} className="input-icon" />
              <input
                id="name"
                name="name"
                type="text"
                placeholder="e.g. Suhailah Desa"
                value={formData.name}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>
          </div>

          {/* 2. Email */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon" />
              <input
                id="email"
                name="email"
                type="email"
                placeholder="trainer@company.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* 3. Password */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                id="password"
                name="password"
                type="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                minLength={6}
                required
              />
            </div>
          </div>

          {/* 4. Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                minLength={6}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '6px', fontWeight: 700 }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Register Trainer Account'}
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="auth-footer" style={{ textAlign: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Already have a trainer account?{' '}
            <Link to="/login" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
              Sign in
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}

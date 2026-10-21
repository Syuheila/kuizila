import React, { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FolderOpen,
  Sparkles,
  BarChart3,
  LogOut,
  ExternalLink,
  Menu,
  X
} from 'lucide-react';
import LoomiLogo from './LoomiLogo';

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Quizzes', path: '/quizzes', icon: FolderOpen },
    { label: 'Create Quiz', path: '/creator', icon: Sparkles },
    { label: 'Results & Reports', path: '/reports', icon: BarChart3 }
  ];

  const currentNav = navItems.find((item) =>
    location.pathname === item.path ||
    (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
  );
  const pageTitle = currentNav ? currentNav.label : 'Trainer Dashboard';

  return (
    <div className="admin-shell">
      {mobileMenuOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Trainer Sidebar */}
      <aside className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <LoomiLogo to="/" size="md" />
          <button
            type="button"
            className="mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div
              className="logo-badge"
              style={{ width: '28px', height: '28px', fontSize: '0.75rem', background: '#0F172A' }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'T'}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || 'Trainer'}</div>
              <div className="sidebar-user-org">{user?.email || 'trainer@kuizila.com'}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="sidebar-item"
            style={{ color: 'var(--color-danger)', marginTop: '4px' }}
          >
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main">
        <header className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="mobile-hamburger-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="admin-header-title">{pageTitle}</h1>
          </div>

          <div className="admin-header-actions">
            <Link
              to="/join"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline btn-sm"
              title="Open Participant Fast Join Screen"
            >
              <span>Participant Join</span>
              <ExternalLink size={14} />
            </Link>

            <div className="admin-header-profile" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px', borderLeft: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-main)' }}>
                {user?.name || 'Trainer'}
              </span>
              <span className="badge-pill brand" style={{ fontSize: '0.7rem' }}>
                Trainer
              </span>
            </div>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}

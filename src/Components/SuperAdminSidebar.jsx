import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FiMenu, FiX, FiHome, FiUsers, FiBarChart2, FiSettings, FiMapPin, FiTool, FiActivity } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { FiLogOut } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useLanguage } from '../context/LanguageContext';

const menuItems = [
  { label: 'Dashboard',             icon: <FiHome />,    to: '/superadmin/dashboard' },
  { label: 'User & Role Management', icon: <FiUsers />,   to: '/superadmin/users' },
  { label: 'Branches',              icon: <FiMapPin />,  to: '/superadmin/branches' },
  { label: 'Laundry Services',      icon: <FiTool />,    to: '/superadmin/services' },
  { label: 'Audit Logs',            icon: <FiActivity />, to: '/superadmin/audit-logs' },
  { label: 'Reports',               icon: <FiBarChart2 />, to: '/superadmin/reports' },
  { label: 'Settings',              icon: <FiSettings />, to: '/superadmin/settings' },
];

const SuperAdminSidebar = () => {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(!open);
  const { t } = useLanguage();
  const navigate = useNavigate();

  const getTranslatedLabel = (label) => {
    const map = {
      'Dashboard':              t('sidebar.dashboard') || 'Dashboard',
      'User & Role Management': t('sidebar.userRoleManagement') || 'User & Role Management',
      'Branches':               t('sidebar.branches') || 'Branches',
      'Laundry Services':       t('sidebar.services') || 'Laundry Services',
      'Audit Logs':             t('sidebar.auditLogs') || 'Audit Logs',
      'Reports':                t('sidebar.reports') || 'Reports',
      'Settings':               t('sidebar.settings') || 'Settings',
    };
    return map[label] ?? label;
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    toast.success(t('nav.logoutSuccess') || 'Logged out successfully');
    navigate('/');
  };

  return (
    <>
      {/* Mobile toggle button */}
      {!open && (
        <button
          className="fixed top-3 ltr:left-3 rtl:right-3 z-[60] icon-button lg:!hidden"
          onClick={toggle}
          aria-label={t('common.toggleMenu') || 'Toggle menu'}
        >
          <FiMenu size={20} />
        </button>
      )}

      {/* Overlay for mobile */}
      {open && <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={toggle}></div>}

      <aside
        className={`admin-sidebar z-50 surface-card text-primary transition-transform duration-300 ease-in-out max-lg:fixed max-lg:inset-y-0 ltr:max-lg:left-0 rtl:max-lg:right-0 max-lg:transform ${open ? 'max-lg:translate-x-0' : 'ltr:max-lg:-translate-x-full rtl:max-lg:translate-x-full'
          }`}
      >
        <div className="h-full flex flex-col p-6 pt-8 relative">
          {/* Mobile close button */}
          <button
            type="button"
            className="absolute top-4 ltr:right-4 rtl:left-4 lg:!hidden icon-button-small"
            onClick={toggle}
            aria-label="Close menu"
          >
            <FiX size={18} />
          </button>

          {/* Logo */}
          <div className="mb-6 flex items-center justify-center p-4 transition-all duration-300">
            <div className="w-16 h-16 rounded-lg shadow-md bg-white flex items-center justify-center transition-all duration-300 hover:scale-105 p-1">
              <img src="/logo.png" alt="Tuhama Logo" className="w-full h-full object-contain" />
            </div>
          </div>

          <div className="text-center mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-500 bg-purple-500/10 px-2 py-1 rounded-full">
              Super Admin
            </span>
          </div>

          <nav className="flex-1 space-y-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-3xl px-4 py-3 text-sm transition-all duration-200 ${isActive
                    ? 'sidebar-nav-active bg-purple-500/10 text-purple-600 shadow-sm'
                    : 'text-secondary hover:bg-surface-alt hover:text-primary'
                  }`
                }
                onClick={() => setOpen(false)}
              >
                <span className="sidebar-nav-icon text-lg text-purple-500">{item.icon}</span>
                {getTranslatedLabel(item.label)}
              </NavLink>
            ))}
          </nav>

          <button
            onClick={handleLogout}
            className="mt-4 flex w-full items-center gap-3 rounded-3xl border border-red-200 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50"
          >
            <FiLogOut />
            {t('nav.logout') || 'Logout'}
          </button>
        </div>
      </aside>
    </>
  );
};

export default SuperAdminSidebar;

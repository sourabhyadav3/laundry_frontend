import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { FiMenu, FiX, FiHome, FiUsers, FiFileText, FiTool, FiTruck, FiCreditCard, FiUserCheck, FiBarChart2, FiSettings, FiMapPin, FiList, FiPlusCircle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { FiLogOut } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useLanguage } from '../context/LanguageContext';

const menuItems = [
  { label: 'Dashboard', icon: <FiHome />, to: '/admin/dashboard', permission: 'view_dashboard' },
  { label: 'Customers', icon: <FiUsers />, to: '/admin/customers', permission: 'view_customers' },
  { label: 'Change invoice status', icon: <FiList />, to: '/admin/orders', permission: 'view_orders' },
  { label: 'Invoices', icon: <FiFileText />, to: '/admin/invoices', permission: 'view_invoice_status' },
  { label: 'Branches', icon: <FiMapPin />, to: '/admin/branches', permission: 'manage_branches' },
  { label: 'Make Invoices', icon: <FiPlusCircle />, to: '/admin/make-invoice', permission: 'make_invoice' },
  { label: 'Laundry Services', icon: <FiTool />, to: '/admin/services', permission: 'view_services' },
  { label: 'Home Service', icon: <FiTruck />, to: '/admin/pickups', permission: 'view_pickups' },
  { label: 'Drivers', icon: <FiUsers />, to: '/admin/drivers', permission: 'view_drivers' },
  { label: 'Payments', icon: <FiCreditCard />, to: '/admin/payments', permission: 'view_payments' },
  { label: 'Staff Management', icon: <FiUserCheck />, to: '/admin/staff', permission: 'manage_staff' },
  { label: 'Reports', icon: <FiBarChart2 />, to: '/admin/reports', permission: 'view_reports' },
  { label: 'Settings', icon: <FiSettings />, to: '/admin/settings', permission: 'manage_settings' },
];



const runPermissionsMigration = () => {
  const migratedFlag = localStorage.getItem('spinclean_permissions_migrated_v5');
  if (migratedFlag) return;
  const saved = localStorage.getItem('spinclean_role_permissions_v3');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.keys(parsed).forEach(role => {
        const rolePerms = parsed[role] || [];
        if (rolePerms.includes('view_logistics')) {
          if (!rolePerms.includes('view_pickups')) rolePerms.push('view_pickups');
          if (!rolePerms.includes('view_deliveries')) rolePerms.push('view_deliveries');
          if (!rolePerms.includes('view_completed_jobs')) rolePerms.push('view_completed_jobs');
          if (!rolePerms.includes('view_drivers')) rolePerms.push('view_drivers');
        }
        if (rolePerms.includes('view_orders')) {
          if (!rolePerms.includes('view_order_tracking')) rolePerms.push('view_order_tracking');
        }
        if (rolePerms.includes('manage_settings')) {
          if (!rolePerms.includes('manage_branches')) rolePerms.push('manage_branches');
        }
        if ((role === 'Counter Staff' || role === 'Delivery Staff') && !rolePerms.includes('manage_settings')) {
          rolePerms.push('manage_settings');
        }
      });
      localStorage.setItem('spinclean_role_permissions_v3', JSON.stringify(parsed));
    } catch (e) {}
  }
  localStorage.setItem('spinclean_permissions_migrated_v5', 'true');
};
runPermissionsMigration();

const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(!open);
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [storedUser, setStoredUser] = useState(() => {
    return JSON.parse(localStorage.getItem('user') || '{}');
  });

  useEffect(() => {
    const syncSession = () => {
      setStoredUser(JSON.parse(localStorage.getItem('user') || '{}'));
    };
    window.addEventListener('storage', syncSession);
    return () => window.removeEventListener('storage', syncSession);
  }, []);

  const userRole = storedUser.role || 'Admin';

  const getPermissionsForRole = (role) => {
    const defaultPermissions = {
      'Admin': [
        'view_dashboard', 'view_customers', 'manage_customers', 'view_orders', 'manage_orders', 
        'view_invoice_status', 'change_invoice_status', 'make_invoice', 'view_invoice_details', 
        'view_services', 'manage_services', 'view_logistics', 'manage_logistics', 
        'view_payments', 'manage_payments', 'view_reports', 'manage_staff', 'assign_roles', 
        'manage_permissions', 'manage_settings', 'full_access', 'create_records', 
        'edit_records', 'delete_records', 'view_all_data', 'access_all_modules'
      ]
    };
    const saved = localStorage.getItem('spinclean_role_permissions_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed[role]) {
          return parsed[role];
        }
      } catch (e) {
        console.error("Failed to parse role permissions", e);
      }
    }
    return defaultPermissions[role] || [];
  };

  const allowedPermissions = getPermissionsForRole(userRole);

  const hasItemPermission = (item) => {
    if (userRole === 'Super Admin') return true;
    if (!item.permission) return true;
    return allowedPermissions.includes(item.permission);
  };

  const getTranslatedLabel = (label) => {
    switch (label) {
      case 'Dashboard': return t('sidebar.dashboard');
      case 'Customers': return t('sidebar.customers');
      case 'Orders': return t('sidebar.orders');
      case 'Change invoice status': return t('sidebar.orderList') || 'Change invoice status';
      case 'Invoices': return t('sidebar.invoices') || 'Invoices';
      case 'Branches': return t('sidebar.branches');
      case 'Laundry Services': return t('sidebar.services');
      case 'Home Service': return t('sidebar.pickups');
      case 'Drivers': return t('sidebar.drivers');
      case 'Payments': return t('sidebar.payments');
      case 'Staff Management': return t('sidebar.staff');
      case 'Reports': return t('sidebar.reports');
      case 'Settings': return t('sidebar.settings');
      case 'Make Invoice':
      case 'Make Invoices': return t('sidebar.makeInvoice');
      case 'LCD Display': return t('sidebar.lcdDisplay') || 'LCD Display';
      default: return label;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    toast.success(t('nav.logoutSuccess') || 'Logged out successfully');
    navigate('/');
  };

  return (
    <>
      {!open && (
        <button
          className="fixed top-[9px] ltr:left-3 rtl:right-3 z-[40] icon-button lg:!hidden shadow-sm"
          onClick={toggle}
          aria-label={t('common.toggleMenu') || 'Toggle menu'}
        >
          <FiMenu size={20} />
        </button>
      )}

      {open && <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={toggle}></div>}

      <aside
        className={`admin-sidebar z-50 surface-card text-primary transition-transform duration-300 ease-in-out max-lg:fixed max-lg:inset-y-0 ltr:max-lg:left-0 rtl:max-lg:right-0 max-lg:transform ${open ? 'max-lg:translate-x-0' : 'ltr:max-lg:-translate-x-full rtl:max-lg:translate-x-full'
          }`}
      >
        <div className="h-full flex flex-col p-4 pt-6 relative">
          <button
            type="button"
            className="absolute top-4 ltr:right-4 rtl:left-4 lg:!hidden icon-button-small"
            onClick={toggle}
            aria-label="Close menu"
          >
            <FiX size={18} />
          </button>

          <div className="mb-6 flex items-center justify-center p-2 transition-all duration-300">
            <div className="w-14 h-14 rounded-lg shadow-md bg-white flex items-center justify-center transition-all duration-300 hover:scale-105 p-1">
              <img src="/logo.png" alt="Tuhama Logo" className="w-full h-full object-contain" />
            </div>
          </div>

          <div className="text-center mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-500 bg-blue-500/10 px-2 py-1 rounded-full">
              {userRole}
            </span>
          </div>

          <nav className="flex-1 space-y-2">
            {menuItems
              .filter(hasItemPermission)
              .map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-3xl px-4 py-3 text-sm transition-all duration-200 ${isActive
                      ? 'sidebar-nav-active bg-blue-500/10 text-blue-600 shadow-sm'
                      : 'text-secondary hover:bg-surface-alt hover:text-primary'
                    }`
                  }
                  onClick={() => setOpen(false)}
                >
                  <span className="sidebar-nav-icon text-lg text-blue-500">{item.icon}</span>
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

export default Sidebar;

// import React from 'react';
// import { Outlet } from 'react-router-dom';
// import Sidebar from '../components/Sidebar';
// import Navbar from '../components/Navbar';
// import '../styles/admin.css';

// const AdminLayout = ({ children }) => {
//   return (
//     <div className="admin-layout">
//       <Sidebar />
//       <div className="admin-main">

//       </div>
//     </div>
//   );
// };

// export default AdminLayout;
import React, { useContext } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../Components/Sidebar';
import Navbar from '../Components/Navbar';
import { AdminStateContext } from '../context/AdminStateContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'react-toastify';
import '../styles/admin.css';
import { FiLock } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const AdminLayout = ({ children }) => {
  const adminState = useContext(AdminStateContext);
  const selectedBranch = adminState?.selectedBranch || 'All';
  const { language } = useLanguage();
  const location = useLocation();
  const path = location.pathname;

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
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
          const allowed = defaultPermissions[role] || [];
          return [...new Set([...allowed, ...parsed[role]])];
        }
      } catch (e) {
        console.error("Failed to parse role permissions", e);
      }
    }
    return defaultPermissions[role] || [];
  };

  const allowedPermissions = getPermissionsForRole(userRole);

  let requiredPermission = null;
  if (path.includes('/admin/dashboard')) requiredPermission = 'view_dashboard';
  else if (path.includes('/admin/customers')) requiredPermission = 'view_customers';
  else if (path.includes('/admin/orders')) requiredPermission = 'view_orders';
  else if (path.includes('/admin/invoices')) requiredPermission = 'view_invoice_status';
  else if (path.includes('/admin/branches')) requiredPermission = 'manage_settings';
  else if (path.includes('/admin/make-invoice')) requiredPermission = 'make_invoice';
  else if (path.includes('/admin/services')) requiredPermission = 'view_services';
  else if (path.includes('/admin/pickups') || path.includes('/admin/drivers')) requiredPermission = 'view_logistics';
  else if (path.includes('/admin/payments')) requiredPermission = 'view_payments';
  else if (path.includes('/admin/staff')) requiredPermission = 'manage_staff';
  else if (path.includes('/admin/reports')) requiredPermission = 'view_reports';
  else if (path.includes('/admin/settings')) requiredPermission = 'manage_settings';

  const hasAccess = !requiredPermission || allowedPermissions.includes(requiredPermission);

  const mainRef = React.useRef(null);

  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [path]);

  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main">
        <Navbar />
        <main 
            ref={mainRef}
            className="admin-content"
            onClickCapture={(e) => {
                if (selectedBranch === 'All' && location.pathname !== '/admin/dashboard' && location.pathname !== '/admin') {
                    e.stopPropagation();
                    e.preventDefault();
                    toast.warning(language === 'ar' ? "الرجاء تحديد فرع أولاً" : "Please select a branch first to perform actions");
                }
            }}
            onKeyDownCapture={(e) => {
                if (selectedBranch === 'All' && (e.key === 'Enter' || e.key === ' ') && location.pathname !== '/admin/dashboard' && location.pathname !== '/admin') {
                    e.stopPropagation();
                    e.preventDefault();
                    toast.warning(language === 'ar' ? "الرجاء تحديد فرع أولاً" : "Please select a branch first to perform actions");
                }
            }}
        >
          {/* Render nested routes */}
          {hasAccess ? (
            <>
              <Outlet />
              {children}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="mb-4 rounded-full bg-rose-500/10 p-6 text-rose-600">
                <FiLock size={48} />
              </div>
              <h2 className="text-2xl font-bold text-primary">Access Denied</h2>
              <p className="mt-2 max-w-md text-secondary">
                You do not have permission to access this page. Please contact your system administrator.
              </p>
              <Link
                to="/admin/dashboard"
                className="mt-6 rounded-2xl bg-blue-600 px-6 py-2.5 font-semibold text-white transition hover:bg-blue-700"
              >
                Go to Dashboard
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import DeliverySidebar from '../Components/DeliverySidebar';
import Navbar from '../Components/Navbar';
import '../styles/admin.css';
import { FiLock } from 'react-icons/fi';

const DeliveryLayout = () => {
  const location = useLocation();
  const path = location.pathname;

  // Get current user permissions
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = storedUser.role || '';

  const getPermissionsForRole = (role) => {
    const defaultPermissions = {
      'Admin': [
        'view_dashboard', 'view_customers', 'manage_customers', 'view_orders', 'manage_orders', 
        'view_invoice_status', 'change_invoice_status', 'make_invoice', 'view_invoice_details', 
        'view_services', 'manage_services', 'view_logistics', 'manage_logistics', 
        'view_payments', 'manage_payments', 'view_reports', 'manage_staff', 'assign_roles', 
        'manage_permissions', 'manage_settings', 'full_access', 'create_records', 
        'edit_records', 'delete_records', 'view_all_data', 'access_all_modules'
      ],
      'Counter Staff': [
        'view_dashboard', 'view_customers', 'manage_customers', 'view_orders', 'make_invoice',
        'view_invoice_status', 'change_invoice_status', 'view_invoice_details', 'view_payments',
        'manage_payments', 'view_services'
      ],
      'Delivery Staff': [
        'view_dashboard', 'view_logistics', 'view_invoice_status', 'change_invoice_status',
        'view_customers', 'manage_customers', 'make_invoice', 'view_orders'
      ],
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

  // Map path to permission
  let requiredPermission = null;
  if (path.includes('/delivery/dashboard')) requiredPermission = 'view_dashboard';
  else if (path.includes('/delivery/pickups')) requiredPermission = 'view_logistics';
  else if (path.includes('/delivery/deliveries')) requiredPermission = 'view_logistics';
  else if (path.includes('/delivery/completed')) requiredPermission = 'view_logistics';
  else if (path.includes('/delivery/make-invoice')) requiredPermission = 'make_invoice';
  else if (path.includes('/delivery/orders')) requiredPermission = 'view_orders';
  else if (path.includes('/delivery/customers')) requiredPermission = 'view_customers';
  else if (path.includes('/delivery/invoices')) requiredPermission = 'view_invoice_status';
  else if (path.includes('/delivery/drivers')) requiredPermission = 'view_logistics';
  else if (path.includes('/delivery/tracking')) requiredPermission = 'view_orders';
  else if (path.includes('/delivery/lcd-display')) requiredPermission = 'view_dashboard';

  const hasAccess = !requiredPermission || allowedPermissions.includes(requiredPermission);

  const mainRef = React.useRef(null);

  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [path]);

  return (
    <div className="admin-layout">
      <DeliverySidebar />
      <div className="admin-main">
        <Navbar />
        <main ref={mainRef} className="admin-content">
          {hasAccess ? (
            <Outlet />
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
                to="/delivery/dashboard"
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

export default DeliveryLayout;

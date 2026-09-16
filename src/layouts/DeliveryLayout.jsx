import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import DeliverySidebar from '../Components/DeliverySidebar';
import Navbar from '../Components/Navbar';
import '../styles/admin.css';
import { FiLock } from 'react-icons/fi';
import { hasUserPermission } from '../utils/permissionUtils';

const DeliveryLayout = () => {
  const location = useLocation();
  const path = location.pathname;

  // Get current user permissions
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

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
  else if (path.includes('/delivery/expenses')) requiredPermission = 'view_logistics';
  else if (path.includes('/delivery/drivers')) requiredPermission = 'view_logistics';
  else if (path.includes('/delivery/tracking')) requiredPermission = 'view_orders';
  else if (path.includes('/delivery/lcd-display')) requiredPermission = 'view_dashboard';

  const hasAccess = !requiredPermission || hasUserPermission(storedUser, requiredPermission);

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

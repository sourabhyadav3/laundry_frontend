import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'tailwindcss/tailwind.css';
import './styles/admin.css';

import Login from './Pages/Login/Login';
import DashboardOverview from './Pages/admin/DashboardOverview';
import Customers from './Pages/admin/Customers';
import AdminInvoices from './Pages/admin/Invoices';
import LaundryServices from './Pages/admin/Services';
import PickupDelivery from './Pages/admin/PickupDelivery';
import Drivers from './Pages/admin/Drivers';
import Payments from './Pages/admin/Payments';
import Branches from './Pages/admin/Branches';
import EditBranch from './Pages/admin/EditBranch';
import Staff from './Pages/admin/Staff';
import AddStaff from './Pages/admin/AddStaff';
import StaffDetails from './Pages/admin/StaffDetails';
import EditStaff from './Pages/admin/EditStaff';
import RolesPermissions from './Pages/admin/RolesPermissions';
import Reports from './Pages/admin/Reports';
import Settings from './Pages/admin/Settings';
import { SettingsProvider } from './context/SettingsContext';
import CounterDashboard from './Pages/counter/Dashboard';
import CounterCustomers from './Pages/counter/Customers';
import CounterMakeInvoice from './Pages/counter/MakeInvoice';
import CounterOrderList from './Pages/counter/OrderList';
import CounterInvoices from './Pages/counter/Invoices';
import CounterPayments from './Pages/counter/Payments';
import CounterOrderTracking from './Pages/counter/OrderTracking';
import CounterSettings from './Pages/counter/Settings';

import DeliveryDashboard from './Pages/delivery/Dashboard';
import AssignedPickups from './Pages/delivery/AssignedPickups';
import AssignedDeliveries from './Pages/delivery/AssignedDeliveries';
import CompletedJobs from './Pages/delivery/CompletedJobs';
import DeliverySettings from './Pages/delivery/Settings';

import { AdminStateProvider } from './context/AdminStateContext';
import AdminLayout from './layouts/AdminLayout';
import CounterLayout from './layouts/CounterLayout';
import DeliveryLayout from './layouts/DeliveryLayout';
import { useTheme } from './context/ThemeContext';
import MakeInvoice from './Pages/admin/MakeInvoice';
import LcdDisplay from './Pages/admin/LcdDisplay';

import SuperAdminLayout from './layouts/SuperAdminLayout';
import SuperAdminDashboard from './Pages/superadmin/DashboardOverview';
import SuperAdminUsers from './Pages/superadmin/Users';
import SuperAdminBranches from './Pages/superadmin/Branches';
import SuperAdminAddBranch from './Pages/superadmin/AddBranch';
import SuperAdminEditBranch from './Pages/superadmin/EditBranch';
import SuperAdminReports from './Pages/superadmin/Reports';
import SuperAdminSettings from './Pages/superadmin/Settings';
import SuperAdminAuditLogs from './Pages/superadmin/AuditLogs';

import PublicReceipt from './Pages/Public/PublicReceipt';

function App() {
  const { theme } = useTheme();

  return (
    <SettingsProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/receipt/:id" element={<PublicReceipt />} />

        <Route
          path="/counter/*"
          element={
            <AdminStateProvider>
              <CounterLayout />
            </AdminStateProvider>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<CounterDashboard />} />
          <Route path="customers" element={<CounterCustomers />} />
          <Route path="orders/new" element={<CounterMakeInvoice />} />
          <Route path="orders" element={<CounterOrderList />} />
          <Route path="invoices" element={<CounterInvoices />} />
          <Route path="payments" element={<CounterPayments />} />
          <Route path="pickups" element={<PickupDelivery />} />
          <Route path="tracking" element={<CounterOrderTracking />} />
          <Route path="settings" element={<CounterSettings />} />
        </Route>

        <Route
          path="/delivery/*"
          element={
            <AdminStateProvider>
              <DeliveryLayout />
            </AdminStateProvider>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DeliveryDashboard />} />
          <Route path="pickups" element={<AssignedPickups />} />
          <Route path="deliveries" element={<AssignedDeliveries />} />
          <Route path="completed" element={<CompletedJobs />} />
          <Route path="make-invoice" element={<CounterMakeInvoice />} />
          <Route path="orders" element={<CounterOrderList />} />
          <Route path="customers" element={<CounterCustomers />} />
          <Route path="invoices" element={<CounterInvoices />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="tracking" element={<CounterOrderTracking />} />
          <Route path="settings" element={<DeliverySettings />} />
        </Route>

        <Route
          path="/delivery/lcd-display"
          element={
            <AdminStateProvider>
              <LcdDisplay />
            </AdminStateProvider>
          }
        />

        <Route
          path="/counter/lcd-display"
          element={
            <AdminStateProvider>
              <LcdDisplay />
            </AdminStateProvider>
          }
        />

        <Route
          path="/admin/lcd-display"
          element={
            <AdminStateProvider>
              <LcdDisplay />
            </AdminStateProvider>
          }
        />

        <Route
          path="/admin/*"
          element={
            <AdminStateProvider>
              <AdminLayout />
            </AdminStateProvider>
          }
        >
          <Route index element={<DashboardOverview />} />
          <Route path="dashboard" element={<DashboardOverview />} />
          <Route path="customers" element={<Customers />} />
          <Route path="orders" element={<CounterOrderList />} />
          <Route path="invoices" element={<AdminInvoices />} />
          <Route path="make-invoice" element={<MakeInvoice />} />
          <Route path="services" element={<LaundryServices />} />
          <Route path="pickups" element={<PickupDelivery />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="payments" element={<Payments />} />
          <Route path="branches" element={<Branches />} />
          <Route path="branches/add" element={<Navigate to="/admin/branches" replace />} />
          <Route path="branches/:id/edit" element={<EditBranch />} />
          <Route path="staff" element={<Staff />} />
          <Route path="staff/add" element={<AddStaff />} />
          <Route path="staff/roles" element={<RolesPermissions />} />
          <Route path="staff/:id" element={<StaffDetails />} />
          <Route path="staff/:id/edit" element={<EditStaff />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route
          path="/superadmin/*"
          element={
            <AdminStateProvider>
              <SuperAdminLayout />
            </AdminStateProvider>
          }
        >
          <Route index element={<SuperAdminDashboard />} />
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="users" element={<SuperAdminUsers />} />
          <Route path="branches" element={<SuperAdminBranches />} />
          <Route path="branches/add" element={<SuperAdminAddBranch />} />
          <Route path="branches/:id/edit" element={<SuperAdminEditBranch />} />
          <Route path="services" element={<LaundryServices />} />
          <Route path="audit-logs" element={<SuperAdminAuditLogs />} />
          <Route path="reports" element={<SuperAdminReports />} />
          <Route path="settings" element={<SuperAdminSettings />} />
        </Route>
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={theme === 'dark' ? 'dark' : 'light'}
      />
    </SettingsProvider>
  );
}

export default App;

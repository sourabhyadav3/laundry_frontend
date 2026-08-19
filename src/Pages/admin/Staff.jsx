import React, { useContext, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FiSearch, FiPlus, FiEye, FiEdit2, FiTrash2, FiChevronDown, FiKey } from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import StatsCard from '../../Components/StatsCard';
import ReusableTable from '../../Components/ReusableTable';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import ExportMenu from '../../Components/ExportMenu';
import { exportStaffCSV, exportStaffPDF, formatDate } from '../../utils/exportUtils';

const statusColors = {
  Active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
  Inactive: 'bg-slate-500/10 text-slate-600 border-slate-500/15',
  Suspended: 'bg-rose-500/10 text-rose-600 border-rose-500/15',
};

const roleColors = {
  Admin: 'bg-purple-500/10 text-purple-600 border-purple-500/15',
  'Counter Staff': 'bg-blue-500/10 text-blue-600 border-blue-500/15',
  'Delivery Staff': 'bg-orange-500/10 text-orange-600 border-orange-500/15',
};

const Staff = () => {
  const navigate = useNavigate();
  const { staff, deleteStaff, updateStaff } = useContext(AdminStateContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Calculate summary stats
  const totalStaff = staff.length;
  const activeStaff = staff.filter((s) => s.status === 'Active').length;
  const counterStaff = staff.filter((s) => s.role === 'Counter Staff').length;
  const deliveryStaff = staff.filter((s) => s.role === 'Delivery Staff').length;
  const adminUsers = staff.filter((s) => s.role === 'Admin').length;

  const filteredStaff = useMemo(() => {
    return staff.filter((staffMember) => {
      const matchesSearch =
        staffMember.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staffMember.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staffMember.phone.includes(searchTerm);

      const matchesRole = roleFilter === 'All' || staffMember.role === roleFilter;
      const matchesStatus = statusFilter === 'All' || staffMember.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [staff, searchTerm, roleFilter, statusFilter]);

  const handleViewStaff = (staffMember) => {
    navigate(`/admin/staff/${staffMember.id}`);
  };

  const handleEditStaff = (staffMember) => {
    navigate(`/admin/staff/${staffMember.id}/edit`);
  };

  const handleResetPassword = (staffMember) => {
    setSelectedStaff(staffMember);
    setShowResetPasswordModal(true);
  };

  const handleDeleteClick = (staffMember) => {
    setStaffToDelete(staffMember);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (staffToDelete) {
      deleteStaff(staffToDelete.id || staffToDelete._id);
      setShowDeleteModal(false);
      setStaffToDelete(null);
    }
  };

  const handleResetPasswordSubmit = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    const success = await updateStaff(selectedStaff.id || selectedStaff._id, { password: newPassword });
    if (success) {
      setShowResetPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleAddStaff = () => {
    navigate('/admin/staff/add');
  };

  const handleManageRoles = () => {
    navigate('/admin/staff/roles');
  };

  const staffSummaryLines = [
    `Total Staff: ${totalStaff}`,
    `Active Staff: ${activeStaff}`,
    `Counter Staff: ${counterStaff}`,
    `Delivery Staff: ${deliveryStaff}`,
    `Admin Users: ${adminUsers}`,
    `Filtered Records: ${filteredStaff.length}`,
  ];

  const handleExportCSV = () => {
    if (!filteredStaff.length) {
      toast.warning('No staff records to export');
      return;
    }
    const ok = exportStaffCSV(
      filteredStaff,
      `staff-directory-${new Date().toISOString().slice(0, 10)}`
    );
    if (ok) toast.success('Staff list exported as CSV');
  };

  const handleExportPDF = () => {
    if (!filteredStaff.length) {
      toast.warning('No staff records to export');
      return;
    }
    const ok = exportStaffPDF(
      filteredStaff,
      staffSummaryLines,
      `staff-directory-${new Date().toISOString().slice(0, 10)}`
    );
    if (ok) toast.success('Staff list exported as PDF');
  };

  const tableColumns = [
    {
      header: 'Name',
      accessor: 'name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-sm font-semibold text-blue-600">
            {row.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          <div>
            <p className="font-semibold text-primary">{row.name}</p>
            <p className="text-xs text-secondary">@{row.username}</p>
          </div>
        </div>
      ),
    },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    {
      header: 'Role',
      accessor: 'role',
      cell: (row) => {
        const roleClass = `status-pill ${roleColors[row.role] || roleColors['Counter Staff']}`;
        return <span className={roleClass}>{row.role}</span>;
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => {
        const statusClass = `status-pill ${statusColors[row.status]}`;
        return <span className={statusClass}>{row.status}</span>;
      },
    },
    { header: 'Joining Date', accessor: 'joiningDate', format: (val) => formatDate(val) },
    {
      header: 'Actions',
      accessor: 'id',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <button className="icon-button-small" onClick={() => handleViewStaff(row)} aria-label="View">
            <FiEye size={16} />
          </button>
          <button className="icon-button-small" onClick={() => handleEditStaff(row)} aria-label="Edit">
            <FiEdit2 size={16} />
          </button>
          <button className="icon-button-small" onClick={() => handleResetPassword(row)} aria-label="Reset Password">
            <FiKey size={16} />
          </button>
          <button className="icon-button-small text-rose-600" onClick={() => handleDeleteClick(row)} aria-label="Delete">
            <FiTrash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <section className="surface-card rounded-3xl border border-border shadow-xl">
        <div className="dashboard-hero rounded-3xl p-8 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-secondary">Human Resources</p>
              <h1 className="mt-3 text-3xl font-semibold text-primary">Staff Management</h1>
              <p className="mt-2 max-w-2xl text-sm text-secondary">Manage employees, roles, and access permissions.</p>
            </div>
            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
              <button
                onClick={handleAddStaff}
                className="dashboard-hero-pill btn-solid-primary flex items-center justify-center gap-2"
              >
                <FiPlus size={18} />
                <span className="font-semibold">Add Staff</span>
              </button>
              <button
                onClick={handleManageRoles}
                className="dashboard-hero-pill flex items-center justify-center gap-2"
              >
                <FiKey size={18} />
                <span className="font-semibold">Manage Roles</span>
              </button>
              <ExportMenu
                label="Export"
                onExportCSV={handleExportCSV}
                onExportPDF={handleExportPDF}
                disabled={!filteredStaff.length}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        <StatsCard accent="blue" label="Total Staff" value={totalStaff} change="+2" changePositive />
        <StatsCard accent="emerald" label="Active Staff" value={activeStaff} change={`${Math.round((activeStaff / totalStaff) * 100)}%`} changePositive />
        <StatsCard accent="violet" label="Counter Staff" value={counterStaff} change="+1" changePositive />
        <StatsCard accent="cyan" label="Delivery Staff" value={deliveryStaff} change="+3" changePositive />
        <StatsCard accent="amber" label="Admin Users" value={adminUsers} change="0" changePositive={false} />
      </div>

      {/* Search and Filter */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-3xl border border-border bg-surface py-3 pl-12 pr-4 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          />
        </div>

        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full appearance-none rounded-3xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          >
            <option value="All">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Counter Staff">Counter Staff</option>
            <option value="Delivery Staff">Delivery Staff</option>
          </select>
          <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full appearance-none rounded-3xl border border-border bg-surface py-3 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
          </select>
          <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
        </div>
      </div>

      {/* Staff Table */}
      <section>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-primary">Staff Directory</h2>
            <p className="text-sm text-secondary">Total: {filteredStaff.length} employees</p>
          </div>
        </div>

        <div className="mt-5">
          <ReusableTable columns={tableColumns} data={filteredStaff} onRowClick={handleViewStaff} />
        </div>
      </section>

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedStaff && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="surface-card w-full max-w-md rounded-3xl border border-border p-8 shadow-2xl">
            <div className="flex items-center justify-between gap-4 pb-6">
              <h2 className="text-2xl font-semibold text-primary">Reset Password</h2>
              <button onClick={() => setShowResetPasswordModal(false)} className="text-secondary hover:text-primary">
                ✕
              </button>
            </div>

            <p className="mb-6 text-sm text-secondary">
              Enter a new password for <span className="font-semibold text-primary">{selectedStaff.name}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-secondary">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-2 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-secondary">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-2 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={handleResetPasswordSubmit}
                className="btn-solid-primary flex-1 rounded-3xl py-3 font-semibold transition"
              >
                Update Password
              </button>
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="flex-1 rounded-3xl border border-border bg-surface-alt py-3 font-semibold text-primary transition hover:bg-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && staffToDelete && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="surface-card w-full max-w-md rounded-3xl border border-border p-8 shadow-2xl">
            <div className="flex items-center justify-between gap-4 pb-6">
              <h2 className="text-2xl font-semibold text-primary">Remove Staff Member</h2>
              <button onClick={() => setShowDeleteModal(false)} className="text-secondary hover:text-primary">
                ✕
              </button>
            </div>

            <p className="mb-2 text-sm text-secondary">Are you sure you want to remove this staff member?</p>
            <p className="mb-6 text-base font-semibold text-primary">{staffToDelete.name}</p>

            <p className="mb-6 text-xs text-secondary">This action cannot be undone.</p>

            <div className="flex gap-4">
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 rounded-3xl border border-rose-500/50 bg-rose-500/10 py-3 font-semibold text-rose-600 transition hover:bg-rose-500/15"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-3xl border border-border bg-surface-alt py-3 font-semibold text-primary transition hover:bg-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Staff;

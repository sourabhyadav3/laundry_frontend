import React, { useContext, useState } from 'react';
import { FiArrowLeft, FiAlertCircle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AdminStateContext } from '../../context/AdminStateContext';

const AddStaff = () => {
  const navigate = useNavigate();
  const { staff, addStaff, branches } = useContext(AdminStateContext);
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = storedUser.role === 'Super Admin';
  const adminBranchId = storedUser.branchId || '';

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'Counter Staff',
    status: 'Active',
    assignedBranch: isSuperAdmin ? '' : adminBranchId,
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';

    if (!formData.phone.trim()) newErrors.phone = 'Phone Number is required';

    const duplicateEmail = staff.some(
      (s) => s.email.toLowerCase() === formData.email.trim().toLowerCase()
    );
    const duplicateUsername = staff.some(
      (s) => s.username.toLowerCase() === formData.username.trim().toLowerCase()
    );
    if (duplicateEmail) newErrors.email = 'Email already in use';
    if (duplicateUsername) newErrors.username = 'Username already taken';

    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.username.trim()) newErrors.username = 'Username is required';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';

    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    if (formData.role !== 'Admin' && !formData.assignedBranch) {
      newErrors.assignedBranch = 'Branch assignment is required for this role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      addStaff({
        name: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        username: formData.username.trim(),
        password: formData.password,
        role: formData.role,
        status: formData.status,
        assignedBranch: formData.assignedBranch,
      });
      toast.success(`${formData.fullName} has been added as ${formData.role}`);
      navigate('/admin/staff');
    }
  };

  const handleCancel = () => {
    navigate('/admin/staff');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleCancel}
          className="rounded-2xl border border-border bg-surface p-2 text-secondary transition hover:text-primary"
        >
          <FiArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-semibold text-primary">Add Staff Member</h1>
          <p className="mt-1 text-sm text-secondary">Create a new staff account</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Information */}
        <section className="surface-card rounded-3xl border border-border p-8 shadow-xl">
          <h2 className="mb-6 text-xl font-semibold text-primary">Personal Information</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-secondary">Full Name *</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter full name"
                className={`mt-2 w-full rounded-2xl border bg-surface px-4 py-3 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${
                  errors.fullName ? 'border-rose-500' : 'border-border'
                }`}
              />
              {errors.fullName && <p className="mt-1 text-xs text-rose-600">{errors.fullName}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-secondary">Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                className={`mt-2 w-full rounded-2xl border bg-surface px-4 py-3 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${
                  errors.email ? 'border-rose-500' : 'border-border'
                }`}
              />
              {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-secondary">Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="555-0000"
                className={`mt-2 w-full rounded-2xl border bg-surface px-4 py-3 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${
                  errors.phone ? 'border-rose-500' : 'border-border'
                }`}
              />
              {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-secondary">Address *</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter address"
                className={`mt-2 w-full rounded-2xl border bg-surface px-4 py-3 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${
                  errors.address ? 'border-rose-500' : 'border-border'
                }`}
              />
              {errors.address && <p className="mt-1 text-xs text-rose-600">{errors.address}</p>}
            </div>
          </div>
        </section>

        {/* Account Information */}
        <section className="surface-card rounded-3xl border border-border p-8 shadow-xl">
          <h2 className="mb-6 text-xl font-semibold text-primary">Account Information</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-secondary">Username *</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter username"
                className={`mt-2 w-full rounded-2xl border bg-surface px-4 py-3 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${
                  errors.username ? 'border-rose-500' : 'border-border'
                }`}
              />
              {errors.username && <p className="mt-1 text-xs text-rose-600">{errors.username}</p>}
            </div>

            <div></div>

            <div>
              <label className="block text-sm font-semibold text-secondary">Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                className={`mt-2 w-full rounded-2xl border bg-surface px-4 py-3 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${
                  errors.password ? 'border-rose-500' : 'border-border'
                }`}
              />
              {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password}</p>}
              <p className="mt-1 text-xs text-secondary">Minimum 8 characters</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-secondary">Confirm Password *</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                className={`mt-2 w-full rounded-2xl border bg-surface px-4 py-3 text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${
                  errors.confirmPassword ? 'border-rose-500' : 'border-border'
                }`}
              />
              {errors.confirmPassword && <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword}</p>}
            </div>
          </div>
        </section>

        {/* Role and Status */}
        <section className="surface-card rounded-3xl border border-border p-8 shadow-xl">
          <h2 className="mb-6 text-xl font-semibold text-primary">Role & Status</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-secondary">Role *</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              >
                <option value="Admin">Admin</option>
                <option value="Counter Staff">Counter Staff</option>
                <option value="Delivery Staff">Delivery Staff</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-secondary">Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {isSuperAdmin && formData.role !== 'Admin' && (
              <div>
                <label className="block text-sm font-semibold text-secondary">Assigned Branch *</label>
                <select
                  name="assignedBranch"
                  value={formData.assignedBranch}
                  onChange={handleChange}
                  className={`mt-2 w-full rounded-2xl border bg-surface px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${
                    errors.assignedBranch ? 'border-rose-500' : 'border-border'
                  }`}
                >
                  <option value="">Select Branch</option>
                  {branches?.map?.(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {errors.assignedBranch && <p className="mt-1 text-xs text-rose-600">{errors.assignedBranch}</p>}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
            <FiAlertCircle className="mt-0.5 flex-shrink-0 text-blue-600" />
            <p className="text-sm text-secondary">
              Staff members will be able to access the dashboard according to their role. You can manage permissions in Roles & Permissions.
            </p>
          </div>
        </section>

        {/* Form Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            className="flex-1 rounded-3xl border border-blue-500/50 bg-blue-500/10 py-4 font-semibold text-blue-600 transition hover:bg-blue-500/15"
          >
            Save Staff Member
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 rounded-3xl border border-border bg-surface-alt py-4 font-semibold text-primary transition hover:bg-surface"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddStaff;

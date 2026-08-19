import React, { useContext, useState } from 'react';
import { FiArrowLeft, FiEdit2, FiMail, FiPhone, FiMapPin, FiCalendar, FiBriefcase } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminStateContext } from '../../context/AdminStateContext';
import { formatDate } from '../../utils/exportUtils';

const roleColors = {
  Admin: 'bg-purple-500/10 text-purple-600 border-purple-500/15',
  'Counter Staff': 'bg-blue-500/10 text-blue-600 border-blue-500/15',
  'Delivery Staff': 'bg-orange-500/10 text-orange-600 border-orange-500/15',
};

const statusColors = {
  Active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
  Inactive: 'bg-slate-500/10 text-slate-600 border-slate-500/15',
  Suspended: 'bg-rose-500/10 text-rose-600 border-rose-500/15',
};

const StaffDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { staff } = useContext(AdminStateContext);
  const [activeTab, setActiveTab] = useState('details');

  const staffMember = staff.find((s) => String(s.id || s._id || '') === String(id));

  if (!staffMember) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-lg text-secondary">Staff member not found</p>
        <button
          onClick={() => navigate('/admin/staff')}
          className="rounded-2xl border border-border bg-surface px-6 py-2 font-semibold text-primary transition hover:bg-surface-alt"
        >
          Back to Staff
        </button>
      </div>
    );
  }

  const handleEdit = () => {
    navigate(`/admin/staff/${staffMember.id}/edit`);
  };

  const daysSinceJoining = Math.floor(
    (new Date() - new Date(staffMember.joiningDate)) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/staff')}
          className="rounded-2xl border border-border bg-surface p-2 text-secondary transition hover:text-primary"
        >
          <FiArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-semibold text-primary">Staff Details</h1>
          <p className="mt-1 text-sm text-secondary">View and manage staff member information</p>
        </div>
        <button
          onClick={handleEdit}
          className="ml-auto flex items-center gap-2 rounded-2xl border border-blue-500/50 bg-blue-500/10 px-4 py-2 font-semibold text-blue-600 transition hover:bg-blue-500/15"
        >
          <FiEdit2 size={18} />
          <span>Edit</span>
        </button>
      </div>

      {/* Profile Card */}
      <section className="surface-card rounded-3xl border border-border p-8 shadow-xl">
        <div className="flex flex-col items-start gap-8 md:flex-row md:items-center">
          <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-4xl font-bold text-white">
            {staffMember.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>

          <div className="flex-1">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-3xl font-semibold text-primary">{staffMember.name}</h2>
                <p className="mt-1 text-sm text-secondary">@{staffMember.username}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`status-pill ${roleColors[staffMember.role]}`}>{staffMember.role}</span>
                <span className={`status-pill ${statusColors[staffMember.status]}`}>{staffMember.status}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-3 font-semibold transition ${
            activeTab === 'details'
              ? 'border-b-2 border-blue-600 text-primary'
              : 'text-secondary hover:text-primary'
          }`}
        >
          Personal Details
        </button>
        <button
          onClick={() => setActiveTab('employment')}
          className={`px-4 py-3 font-semibold transition ${
            activeTab === 'employment'
              ? 'border-b-2 border-blue-600 text-primary'
              : 'text-secondary hover:text-primary'
          }`}
        >
          Employment Details
        </button>
        {/*
        <button
          onClick={() => setActiveTab('statistics')}
          className={`px-4 py-3 font-semibold transition ${
            activeTab === 'statistics'
              ? 'border-b-2 border-blue-600 text-primary'
              : 'text-secondary hover:text-primary'
          }`}
        >
          Statistics
        </button>
        */}
      </div>

      {/* Personal Details Tab */}
      {activeTab === 'details' && (
        <section className="surface-card rounded-3xl border border-border p-8 shadow-xl">
          <h3 className="mb-6 text-lg font-semibold text-primary">Contact Information</h3>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                <FiMail className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Email Address</p>
                <p className="mt-2 text-lg font-semibold text-primary">{staffMember.email}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                <FiPhone className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Phone Number</p>
                <p className="mt-2 text-lg font-semibold text-primary">{staffMember.phone}</p>
              </div>
            </div>

            <div className="flex gap-4 md:col-span-2">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                <FiMapPin className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Address</p>
                <p className="mt-2 text-lg font-semibold text-primary">{staffMember.address}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Employment Details Tab */}
      {activeTab === 'employment' && (
        <section className="surface-card rounded-3xl border border-border p-8 shadow-xl">
          <h3 className="mb-6 text-lg font-semibold text-primary">Employment Information</h3>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/10">
                <FiBriefcase className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Role</p>
                <p className={`status-pill mt-2 inline-block ${roleColors[staffMember.role]}`}>{staffMember.role}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                <FiCalendar className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Joining Date</p>
                <p className="mt-2 text-lg font-semibold text-primary">{formatDate(staffMember.joiningDate)}</p>
                <p className="mt-1 text-xs text-secondary">{daysSinceJoining} days ago</p>
              </div>
            </div>

            <div className="flex gap-4 md:col-span-2">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                <FiMapPin className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Assigned Branch(es)</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(() => {
                    let bList = [];
                    if (Array.isArray(staffMember.branches) && staffMember.branches.length > 0) {
                      bList = staffMember.branches.map(b => typeof b === 'object' ? b.name : b).filter(Boolean);
                    } else if (staffMember.branch) {
                      bList = String(staffMember.branch).split(',').map(s => s.trim()).filter(Boolean);
                    }
                    const uniqueBs = Array.from(new Set(bList));
                    if (uniqueBs.length === 0) return <span className="text-primary font-semibold">Unassigned</span>;
                    return uniqueBs.map((bName, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 rounded-xl border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                        {bName}
                      </span>
                    ));
                  })()}
                </div>
              </div>
            </div>

            <div className="flex gap-4 md:col-span-2">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-sky-500/10">
                <div className="text-sm font-bold text-sky-600">✓</div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Status</p>
                <p className={`status-pill mt-2 inline-block ${statusColors[staffMember.status]}`}>{staffMember.status}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Statistics Tab */}
      {/*
      {activeTab === 'statistics' && (
        <div className="grid gap-6 md:grid-cols-3">
          <section className="surface-card rounded-3xl border border-border p-8 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                <FiTrendingUp className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-secondary">Orders Handled</p>
                <p className="mt-1 text-3xl font-semibold text-primary">{staffMember.ordersHandled}</p>
              </div>
            </div>
          </section>

          <section className="surface-card rounded-3xl border border-border p-8 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                <FiTrendingUp className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-secondary">Deliveries Completed</p>
                <p className="mt-1 text-3xl font-semibold text-primary">{staffMember.deliveriesCompleted}</p>
              </div>
            </div>
          </section>

          <section className="surface-card rounded-3xl border border-border p-8 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-orange-500/10">
                <FiTrendingUp className="text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-secondary">Payments Collected</p>
                <p className="mt-1 text-3xl font-semibold text-primary">{formatCurrency(staffMember.paymentsCollected)}</p>
              </div>
            </div>
          </section>
        </div>
      )}
      */}

      {/* Recent Activity */}
      <section className="surface-card rounded-3xl border border-border p-8 shadow-xl">
        <h3 className="mb-6 text-lg font-semibold text-primary">Recent Activity</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
            <div className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-600"></div>
            <div className="flex-1">
              <p className="font-semibold text-primary">{staffMember.recentActivity}</p>
              <p className="text-xs text-secondary">Just now</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
            <div className="h-2 w-2 flex-shrink-0 rounded-full bg-slate-400"></div>
            <div className="flex-1">
              <p className="font-semibold text-primary">Account created</p>
              <p className="text-xs text-secondary">{formatDate(staffMember.joiningDate)}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StaffDetails;

import React, { useContext } from 'react';
import { FiUsers, FiMapPin, FiActivity, FiShield, FiDollarSign, FiUserCheck } from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import StatsCard from '../../Components/StatsCard';
import TypingText from '../../Components/TypingText';
import ReusableTable from '../../Components/ReusableTable';

const DashboardOverview = () => {
  const { staff, branches, orders, payments } = useContext(AdminStateContext);

  // KPI calculations
  const totalBranches   = branches?.length || 0;
  const activeBranches  = branches?.filter(b => b.status === 'Active').length || 0;

  const allUsers   = staff?.filter(s => ['Admin', 'Counter Staff', 'Delivery Staff'].includes(s.role)) || [];
  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter(u => u.status === 'Active').length;
  const totalAdmins = allUsers.filter(u => u.role === 'Admin').length;

  // Monthly revenue from payments
  const currentMonth = new Date().getMonth();
  const currentYear  = new Date().getFullYear();
  const monthlyRevenue = payments?.filter(p => {
    const d = new Date(p.date || p.createdAt || '');
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0;

  // Recent activity: last 5 actions from any staff or order timeline
  const getBranchName = (bId) => {
    if (!bId) return '—';
    const b = branches?.find(x => String(x.id || x._id) === String(bId));
    return b ? b.name : '—';
  };

  const dynamicActivities = [];

  (orders || []).forEach(o => {
    const branchName = getBranchName(o.branchId);

    // 1. Order Creation Event
    if (o.createdBy) {
      const userObj = staff?.find(s => s.name === o.createdBy);
      const role = userObj ? userObj.role : 'Staff';
      
      dynamicActivities.push({
        name: o.createdBy,
        role,
        activity: `Created Order #${o.number}`,
        branch: branchName,
        timestamp: new Date(o.date || o.createdAt || 0).getTime()
      });
    }

    // 2. Timeline Status Update Events
    if (o.timeline && Array.isArray(o.timeline)) {
      o.timeline.forEach(node => {
        if (node.updatedBy && node.updatedBy !== 'System') {
          const userObj = staff?.find(s => s.name === node.updatedBy);
          const role = userObj ? userObj.role : 'Staff';

          let nodeTimestamp = 0;
          try {
            nodeTimestamp = new Date(`${node.date}T${node.time || '00:00:00'}`).getTime();
          } catch(e) {}
          if (isNaN(nodeTimestamp) || nodeTimestamp === 0) {
            nodeTimestamp = new Date(o.date || o.createdAt || 0).getTime() + 1000;
          }

          dynamicActivities.push({
            name: node.updatedBy,
            role,
            activity: `Marked Order #${o.number} as ${node.status}`,
            branch: branchName,
            timestamp: nodeTimestamp
          });
        }
      });
    }
  });

  // Sort by timestamp descending
  dynamicActivities.sort((a, b) => b.timestamp - a.timestamp);

  // If no dynamic activities exist, fallback to staff recentActivity or mock
  if (dynamicActivities.length === 0) {
    const activeStaff = staff?.filter(s => s.status === 'Active') || [];
    activeStaff.forEach((s, idx) => {
      dynamicActivities.push({
        name: s.name,
        role: s.role,
        activity: s.recentActivity || (idx % 2 === 0 ? 'LoggedIn to dashboard' : 'Checked branch status'),
        branch: getBranchName(s.branch),
        timestamp: Date.now() - idx * 60000
      });
    });
  }

  const recentActivity = dynamicActivities.slice(0, 5);

  const activityColumns = [
    {
      header: 'User',
      accessor: 'name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-600">
            {row.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <p className="font-semibold text-primary text-sm">{row.name}</p>
            <p className="text-xs text-secondary">{row.role}</p>
          </div>
        </div>
      ),
    },
    { header: 'Branch',   accessor: 'branch' },
    { header: 'Activity', accessor: 'activity' },
  ];

  const branchColumns = [
    { header: 'Branch Name', accessor: 'name' },
    { header: 'Location',    accessor: 'address' },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <span className={`status-pill ${row.status === 'Active'
          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15'
          : 'bg-slate-500/10 text-slate-600 border-slate-500/15'}`}>
          {row.status}
        </span>
      ),
    },
    {
      header: 'Orders',
      accessor: 'id',
      cell: (row) => {
        const count = orders?.filter(o => o.branchId === row.id).length || 0;
        return <span className="font-semibold text-primary">{count}</span>;
      },
    },
  ];

  return (
    <div className="space-y-8 admin-dashboard-page">
      {/* Hero */}
      <section className="surface-card rounded-3xl border border-border shadow-xl">
        <div className="dashboard-hero rounded-3xl p-8 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-purple-500">Business Owner Portal</p>
              <h1 className="mt-3 text-3xl font-semibold text-primary">
                <TypingText text="Super Admin Dashboard" />
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-secondary">
                High-level overview of your laundry business — branches, users, and revenue at a glance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
        <StatsCard accent="blue"    icon={FiMapPin}      label="Total Branches"   value={totalBranches}  changePositive />
        <StatsCard accent="violet"  icon={FiUsers}       label="Total Users"      value={totalUsers}     changePositive />
        <StatsCard accent="cyan"    icon={FiShield}      label="Total Admins"     value={totalAdmins}    changePositive />
        <StatsCard accent="emerald" icon={FiUserCheck}   label="Active Users"     value={activeUsers}    changePositive />
        <StatsCard accent="amber"   icon={FiDollarSign}  label="Monthly Revenue"  value={`KWD ${monthlyRevenue.toFixed(2)}`} changePositive />
      </div>

      {/* Tables */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Recent Activity */}
        <section className="surface-card p-6 shadow-xl rounded-3xl border border-border">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
              <FiActivity className="text-purple-500" /> Recent Activity
            </h2>
            <p className="text-sm text-secondary">Latest actions performed by your users.</p>
          </div>
          <ReusableTable columns={activityColumns} data={recentActivity} />
        </section>

        {/* Branch Summary */}
        <section className="surface-card p-6 shadow-xl rounded-3xl border border-border">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
              <FiMapPin className="text-blue-500" /> Branch Summary
            </h2>
            <p className="text-sm text-secondary">
              {activeBranches} active out of {totalBranches} total branches.
            </p>
          </div>
          <ReusableTable columns={branchColumns} data={branches?.slice(0, 6) || []} />
        </section>
      </div>
    </div>
  );
};

export default DashboardOverview;

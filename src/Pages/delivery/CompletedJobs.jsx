import React, { useContext, useMemo } from 'react';
import { AdminStateContext } from '../../context/AdminStateContext';
import StatsCard from '../../Components/StatsCard';
import CompletedJobsTable from '../../Components/delivery/CompletedJobsTable';
import { FiCheckCircle, FiCalendar, FiTrendingUp } from 'react-icons/fi';
import { generateCompletedJobs } from '../../data/mockDataGenerators';

const DEFAULT_STAFF = 'Frank Brown';

const CompletedJobs = () => {
  const { pickups, deliveries } = useContext(AdminStateContext);
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const staffName = storedUser?.name || DEFAULT_STAFF;

  const jobs = useMemo(() => {
    const myPickups = pickups.filter((p) => p.assignedStaff === staffName);
    const myDeliveries = deliveries.filter((d) => d.assignedStaff === staffName);
    const list = generateCompletedJobs(myPickups, myDeliveries);
    return list.sort((a, b) => new Date(b.completionDate || b.createdAt || 0) - new Date(a.completionDate || a.createdAt || 0));
  }, [pickups, deliveries, staffName]);

  const thisMonth = new Date().getMonth();
  const completedThisMonth = jobs.filter(
    (j) => new Date(j.completionDate).getMonth() === thisMonth
  ).length;
  const successRate =
    jobs.length > 0
      ? Math.round((jobs.filter((j) => j.status === 'Delivered' || j.status === 'Completed').length / jobs.length) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <section className="surface-card overflow-hidden border border-border shadow-xl">
        <div className="dashboard-hero p-8 md:p-10">
          <p className="text-sm uppercase tracking-[0.3em] text-secondary">Delivery Staff</p>
          <h1 className="mt-3 text-3xl font-semibold text-primary">Completed Jobs</h1>
          <p className="mt-2 text-sm text-secondary">Review completed pickups and deliveries.</p>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        <StatsCard icon={FiCheckCircle} label="Total Completed Jobs" value={jobs.length} change="All time" changePositive />
        <StatsCard icon={FiCalendar} label="Completed This Month" value={completedThisMonth} change="Current month" changePositive />
        <StatsCard icon={FiTrendingUp} label="Success Rate" value={`${successRate}%`} change="Delivery quality" changePositive />
      </div>

      <section className="surface-card border border-border overflow-hidden">
        <CompletedJobsTable jobs={jobs} />
      </section>
    </div>
  );
};

export default CompletedJobs;

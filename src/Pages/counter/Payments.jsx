import React, { useContext, useMemo, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import StatsCard from '../../Components/StatsCard';
import PaymentTable from '../../Components/counter/PaymentTable';
import { formatCurrency } from '../../utils/exportUtils';
import { FiCreditCard, FiClock, FiPieChart, FiList } from 'react-icons/fi';

const Payments = () => {
  const { payments } = useContext(AdminStateContext);
  const [searchTerm, setSearchTerm] = useState('');
  const today = new Date().toDateString();

  const stats = useMemo(() => {
    let result = payments;
    const todayPayments = result.filter((p) => new Date(p.date).toDateString() === today);
    return {
      todayCollection: todayPayments.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0),
      pending: result.filter((p) => p.status === 'Pending').length,
      partial: result.filter((p) => p.status === 'Partial').length,
      totalTransactions: result.length,
    };
  }, [payments, today]);

  const filteredPayments = useMemo(
    () => {
      let result = payments;
      return result
        .filter(
          (p) =>
            (p.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(p.paymentId).includes(searchTerm)
        )
        .sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt) - new Date(a.createdAt);
          }
          const numA = Number(a.id);
          const numB = Number(b.id);
          if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
          return String(b.id || '').localeCompare(String(a.id || ''));
        });
    },
    [payments, searchTerm]
  );

  return (
    <div className="space-y-8">
      <section className="surface-card overflow-hidden border border-border shadow-xl">
        <div className="dashboard-hero p-8 md:p-10">
          <p className="text-sm uppercase tracking-[0.3em] text-secondary">Counter Staff</p>
          <h1 className="mt-3 text-3xl font-semibold text-primary">Payments</h1>
          <p className="mt-2 text-sm text-secondary">Track collections via Cash, UPI, and Card.</p>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          icon={FiCreditCard}
          label="Today's Collection"
          value={formatCurrency(stats.todayCollection)}
          change="Paid today"
          changePositive
        />
        <StatsCard icon={FiClock} label="Pending Payments" value={stats.pending} change="Awaiting" changePositive={false} />
        <StatsCard icon={FiPieChart} label="Partial Payments" value={stats.partial} change="In progress" changePositive={false} />
        <StatsCard icon={FiList} label="Total Transactions" value={stats.totalTransactions} change="All time" changePositive />
      </div>

      <div className="relative">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
        <input
          type="text"
          placeholder="Search payments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-3xl border border-border bg-surface py-3 pl-12 pr-4 text-primary"
        />
      </div>

      <section className="surface-card border border-border overflow-hidden">
        <PaymentTable payments={filteredPayments} />
      </section>
    </div>
  );
};

export default Payments;

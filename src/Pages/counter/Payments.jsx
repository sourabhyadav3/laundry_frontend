import React, { useContext, useMemo, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import StatsCard from '../../Components/StatsCard';
import PaymentTable from '../../Components/counter/PaymentTable';
import { formatCurrency } from '../../utils/exportUtils';
import { FiCreditCard, FiClock, FiPieChart, FiList } from 'react-icons/fi';

const Payments = () => {
  const { payments, selectedBranch, branches, orders } = useContext(AdminStateContext);
  const [searchTerm, setSearchTerm] = useState('');
  const today = new Date().toDateString();

  const branchPayments = useMemo(() => {
    if (!selectedBranch || selectedBranch === 'All') return payments;
    const selStr = String(selectedBranch).toLowerCase();
    const activeBranchObj = branches?.find(b => String(b.id || b._id).toLowerCase() === selStr || String(b.name || '').toLowerCase() === selStr);
    const bId = activeBranchObj ? String(activeBranchObj.id || activeBranchObj._id).toLowerCase() : selStr;
    const bName = activeBranchObj ? String(activeBranchObj.name || '').toLowerCase() : selStr;
    const bNameAr = activeBranchObj ? String(activeBranchObj.nameAr || activeBranchObj.arabicName || '').toLowerCase() : '';

    const isCarpetBranch = bName.includes('carpet') || bName.includes('rug') || bNameAr.includes('سجاد');
    const isShoeBranch = bName.includes('shoe') || bName.includes('footwear') || bNameAr.includes('أحذية') || bNameAr.includes('حذاء') || bNameAr.includes('جوتي');
    const isWorkshopBranch = bName.includes('workshop') || bNameAr.includes('ورشة');

    return payments.filter(p => {
      if (p.branchId && (String(p.branchId).toLowerCase() === bId || String(p.branchId).toLowerCase() === selStr)) return true;
      if (p.branch && (String(p.branch).toLowerCase() === bId || String(p.branch).toLowerCase() === bName)) return true;

      const associatedOrder = orders?.find(o => (o.id && (o.id === p.orderId || o.id === p.order)) || (o.number && o.number === p.orderNumber));
      if (associatedOrder) {
        if (associatedOrder.branchId && String(associatedOrder.branchId).toLowerCase() === bId) return true;
        if (associatedOrder.transferredTo && String(associatedOrder.transferredTo).toLowerCase() === bId) return true;
        if (associatedOrder.transferredBranchName && String(associatedOrder.transferredBranchName).toLowerCase() === bName) return true;
        if (Array.isArray(associatedOrder.sharedBranches) && associatedOrder.sharedBranches.some(b => String(b).toLowerCase() === bId)) return true;

        if (isCarpetBranch && Array.isArray(associatedOrder.itemDetails)) {
          if (associatedOrder.itemDetails.some(it => /carpet|سجاد|rug/i.test(it.name || '') || /carpet|سجاد|rug/i.test(it.nameAr || ''))) return true;
        }
        if (isShoeBranch && Array.isArray(associatedOrder.itemDetails)) {
          if (associatedOrder.itemDetails.some(it => /shoe|sneaker|boot|footwear|أحذية|حذاء|جوتي|شوز/i.test(it.name || '') || /أحذية|حذاء|جوتي|شوز|shoe/i.test(it.nameAr || ''))) return true;
        }
        if (isWorkshopBranch && (associatedOrder.status === 'Preparing in workshop' || associatedOrder.status === 'In Workshop' || (Array.isArray(associatedOrder.itemDetails) && associatedOrder.itemDetails.some(it => /carpet|curtain|blanket|heavy|سجاد|ستائر|بطانية|لحاف/i.test(it.name || ''))))) {
          return true;
        }
      }
      return false;
    });
  }, [payments, orders, selectedBranch, branches]);

  const stats = useMemo(() => {
    let result = branchPayments;
    const todayPayments = result.filter((p) => new Date(p.date).toDateString() === today);
    return {
      todayCollection: todayPayments.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0),
      pending: result.filter((p) => p.status === 'Pending').length,
      partial: result.filter((p) => p.status === 'Partial').length,
      totalTransactions: result.length,
    };
  }, [branchPayments, today]);

  const filteredPayments = useMemo(
    () => {
      let result = branchPayments;
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
    [branchPayments, searchTerm]
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

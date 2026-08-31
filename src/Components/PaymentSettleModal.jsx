import React, { useState, useMemo, useEffect } from 'react';
import Modal from './Modal';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, formatDate, generateSettlementReceiptPDF } from '../utils/exportUtils';
import { FiDollarSign, FiInfo, FiPrinter } from 'react-icons/fi';

const PaymentSettleModal = ({
  isOpen,
  onClose,
  customer,
  customerOrders = [],
  initialDue = 0,
  selectedBranch,
  branches = [],
  onSettleSuccess
}) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  // Filter pending/partial orders with actual unpaid balance (oldest first FIFO)
  const pendingOrders = useMemo(() => {
    return (customerOrders || [])
      .filter((o) => {
        const total = Number(o.totalAmount || 0);
        const paid = Number(o.amountPaid || 0);
        const due = Math.max(0, total - paid);
        return due > 0.001;
      })
      .sort((a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date));
  }, [customerOrders]);

  const totalCalculatedDue = useMemo(() => {
    if (pendingOrders.length > 0) {
      return pendingOrders.reduce((sum, o) => {
        const total = Number(o.totalAmount || 0);
        const paid = Number(o.amountPaid || 0);
        return sum + Math.max(0, total - paid);
      }, 0);
    }
    return Number(initialDue || 0);
  }, [pendingOrders, initialDue]);

  const [paymentAmount, setPaymentAmount] = useState(() => (totalCalculatedDue > 0 ? String(totalCalculatedDue.toFixed(3)) : '0.000'));
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const selectedBranchId = (selectedBranch && selectedBranch !== 'All') ? selectedBranch : (customer?.branchId || customer?.branch || '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPaymentAmount(totalCalculatedDue > 0 ? String(totalCalculatedDue.toFixed(3)) : '0.000');
      setPaymentMethod('Cash');
      setNote('');
    }
  }, [isOpen, totalCalculatedDue]);

  const numAmount = parseFloat(paymentAmount) || 0;

  // Real-time FIFO Waterfall Simulation Preview (Processes all pending invoices)
  const allocationPreview = useMemo(() => {
    let unallocated = Math.max(0, numAmount);
    const settledList = [];

    for (const ord of pendingOrders) {
      const paidAlready = Number(ord.amountPaid || 0);
      const total = Number(ord.totalAmount || 0);
      const dueBefore = Math.max(0, total - paidAlready);
      if (dueBefore <= 0) continue;

      let applied = 0;
      if (unallocated > 0) {
        applied = Math.min(unallocated, dueBefore);
        unallocated -= applied;
      }

      const newPaid = paidAlready + applied;
      const remainingOnOrder = Math.max(0, total - newPaid);
      const willBeFullPaid = applied > 0 && remainingOnOrder <= 0.001;

      settledList.push({
        orderNumber: ord.number || ord.orderNumber || ord.id,
        orderTotal: total,
        paidAlready,
        dueBefore,
        applied,
        remainingOnOrder,
        willBeFullPaid,
        date: ord.createdAt || ord.date,
      });
    }

    const excessCredit = unallocated > 0 ? unallocated : 0;
    const remainingTotalDue = Math.max(0, totalCalculatedDue - (numAmount - excessCredit));

    return {
      settledList,
      excessCredit,
      remainingTotalDue,
      fullySettledCount: settledList.filter((s) => s.willBeFullPaid).length,
      partiallySettledCount: settledList.filter((s) => s.applied > 0 && !s.willBeFullPaid).length,
    };
  }, [numAmount, pendingOrders, totalCalculatedDue]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (numAmount <= 0) return;

    setLoading(true);
    try {
      const res = await onSettleSuccess(customer.id || customer._id, {
        amount: numAmount,
        method: paymentMethod,
        branchId: selectedBranchId,
        note,
      });

      if (res) {
        // Automatically generate and open thermal print receipt
        generateSettlementReceiptPDF(customer, res, {
          branchName: selectedBranchId,
          method: paymentMethod,
        });
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !customer) return null;

  const validCustNo =
    customer.customerNo && customer.customerNo !== 'Auto-generated'
      ? customer.customerNo
      : customer.displayId || customer.id || 'N/A';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'تسديد رصيد العميل / دفع الفواتير' : 'Pay Outstanding Balance / Settle Customer Due'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Customer Header Card */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-surface to-emerald-500/10 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-md">
              {(customer.name || 'C').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-primary">
                  {customer.englishName || customer.name}
                </h3>
                {customer.arabicName && (
                  <span className="text-xs text-secondary font-semibold" style={{ direction: 'rtl' }}>
                    ({customer.arabicName})
                  </span>
                )}
                {(customer.isSubscriber || Number(customer.insuranceAmount || 0) >= 20) && (
                  <span className="text-amber-500 text-sm" title="VIP Subscriber">⭐</span>
                )}
              </div>
              <p className="text-xs text-secondary mt-0.5 flex items-center gap-3">
                <span><b>ID:</b> {validCustNo}</span>
                <span>•</span>
                <span><b>Phone:</b> {customer.phone || customer.phones?.[0] || 'N/A'}</span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
              {isAr ? 'إجمالي الرصيد المستحق' : 'Total Outstanding Due'}
            </span>
            <p className="text-2xl font-black font-mono text-rose-500">
              {formatCurrency(totalCalculatedDue)}
            </p>
          </div>
        </div>

        {/* Amount Input & Preset Pills */}
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <FiDollarSign className="text-emerald-500" />
              <span>{isAr ? 'المبلغ المراد دفعه (د.ك):' : 'Payment Amount (KWD):'}</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-secondary font-bold uppercase">{isAr ? 'مبالغ سريعة:' : 'Quick Set:'}</span>
              <button
                type="button"
                onClick={() => setPaymentAmount(String(totalCalculatedDue.toFixed(3)))}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600/15 text-emerald-600 hover:bg-emerald-600 hover:text-white transition"
              >
                {isAr ? 'كامل المبلغ' : 'Full Due'} ({formatCurrency(totalCalculatedDue)})
              </button>
              {[5, 10, 20, 50].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setPaymentAmount(String(amt))}
                  className={`px-2 py-1 text-xs font-semibold rounded-lg border transition ${
                    numAmount === amt
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-border bg-surface text-secondary hover:text-primary'
                  }`}
                >
                  {amt} KD
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <input
              type="number"
              step="0.005"
              min="0.005"
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.000"
              className="w-full text-2xl font-black font-mono px-4 py-3 rounded-xl border border-border bg-surface-alt text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-secondary text-sm">
              KWD
            </span>
          </div>
        </div>

        {/* Customer Invoices & Live Allocation Breakdown List (Always Visible) */}
        <div className="rounded-2xl border border-border bg-surface-alt/40 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <FiInfo className="text-blue-500 text-sm" />
              <span>
                {isAr ? 'قائمة فواتير العميل المستحقة:' : 'Customer Invoices & Settlement Breakdown:'}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-mono">
                {pendingOrders.length} {isAr ? 'فاتورة' : 'Invoices'}
              </span>
            </span>
            <div className="text-xs font-semibold text-secondary">
              {numAmount > 0 ? (
                <>
                  {allocationPreview.fullySettledCount > 0 && (
                    <span className="text-emerald-600 font-bold mr-2">
                      ✓ {allocationPreview.fullySettledCount} {isAr ? 'ستسدد بالكامل' : 'Fully Settled'}
                    </span>
                  )}
                  {allocationPreview.excessCredit > 0 && (
                    <span className="text-blue-600 font-bold">
                      + {formatCurrency(allocationPreview.excessCredit)} {isAr ? 'رصيد إضافي بالمحفظة' : 'Wallet Advance'}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-rose-500 font-mono font-bold">
                  {isAr ? 'إجمالي المستحق:' : 'Total Due:'} {formatCurrency(totalCalculatedDue)}
                </span>
              )}
            </div>
          </div>

          {/* Pending Invoices List */}
          {allocationPreview.settledList.length > 0 ? (
            <div className="max-h-52 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {allocationPreview.settledList.map((item, idx) => (
                <div
                  key={item.orderNumber || idx}
                  className={`flex flex-wrap items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                    item.applied > 0
                      ? item.willBeFullPaid
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-primary shadow-xs'
                        : 'bg-amber-500/10 border-amber-500/40 text-primary'
                      : 'bg-surface border-border/80 text-primary hover:border-blue-500/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${item.applied > 0 ? (item.willBeFullPaid ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-rose-500'}`} />
                    <div>
                      <span className="font-mono font-bold text-sm text-primary">{item.orderNumber}</span>
                      <span className="text-[10px] text-secondary ml-2 font-medium">({formatDate(item.date)})</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                    <div className="text-right">
                      <span className="text-[10px] text-secondary block">{isAr ? 'المجموع' : 'Total'}</span>
                      <span className="text-primary font-semibold">{formatCurrency(item.orderTotal)}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-secondary block">{isAr ? 'المستحق' : 'Due'}</span>
                      <span className="text-rose-500 font-bold">{formatCurrency(item.dueBefore)}</span>
                    </div>

                    {item.applied > 0 ? (
                      <div className="text-right">
                        <span className="text-[10px] text-emerald-600 font-bold block">{isAr ? 'المدفوع الآن' : 'Applied'}</span>
                        <span className="text-emerald-600 font-black">+{formatCurrency(item.applied)}</span>
                      </div>
                    ) : null}

                    <div className="min-w-[85px] text-right">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-1 rounded-lg ${
                          item.applied > 0
                            ? item.willBeFullPaid
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-amber-500 text-white'
                            : 'bg-rose-500/15 text-rose-600 border border-rose-500/30'
                        }`}
                      >
                        {item.applied > 0
                          ? item.willBeFullPaid
                            ? (isAr ? '✓ مسدد بالكامل' : '✓ Full Paid')
                            : `${isAr ? 'متبقي:' : 'Due:'} ${formatCurrency(item.remainingOnOrder)}`
                          : (isAr ? 'معلق / غير مسدد' : 'Pending')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-secondary italic">
              {isAr ? 'لا توجد فواتير معلقة لهذا العميل حالياً' : 'No pending unpaid invoices found for this customer.'}
            </div>
          )}

          {/* Excess Credit / Remaining Balance Summary Bar */}
          <div className="flex flex-wrap items-center justify-between pt-2.5 border-t border-border/60 text-xs">
            <span className="text-secondary">
              {isAr ? 'المتبقي بعد السداد:' : 'Remaining Balance After Payment:'}
              <b className={`ml-1 font-mono text-sm ${allocationPreview.remainingTotalDue > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                {formatCurrency(allocationPreview.remainingTotalDue)}
              </b>
            </span>
            {allocationPreview.excessCredit > 0 && (
              <span className="text-emerald-600 font-bold bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                ⭐ +{formatCurrency(allocationPreview.excessCredit)} {isAr ? 'سيضاف لرصيد المحفظة المسبق' : 'Will be added to Customer Wallet'}
              </span>
            )}
          </div>
        </div>

        {/* Payment Method & Branch Selection */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Payment Method */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-secondary">
              {isAr ? 'طريقة الدفع:' : 'Payment Method:'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Cash', label: isAr ? 'نقدي' : 'Cash', icon: '💵' },
                { id: 'K-Net', label: isAr ? 'كي نت' : 'K-Net', icon: '💳' },
                { id: 'Card', label: isAr ? 'بطاقة' : 'Card', icon: '💳' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-bold transition ${
                    paymentMethod === m.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'border-border bg-surface text-secondary hover:text-primary hover:border-blue-500'
                  }`}
                >
                  <span className="text-base select-none">{m.icon}</span>
                  <span className="mt-0.5">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-secondary">
              {isAr ? 'ملاحظات (اختياري):' : 'Payment Notes (Optional):'}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isAr ? 'مثال: تسديد دفعة كاش' : 'e.g. Bulk settlement at counter'}
              className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-border bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 h-[42px]"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold rounded-xl border border-border bg-surface text-secondary hover:text-primary hover:bg-surface-alt transition"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={loading || numAmount <= 0}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-lg shadow-emerald-600/20 transition cursor-pointer"
          >
            {loading ? (
              <span>{isAr ? 'جاري المعالجة...' : 'Processing...'}</span>
            ) : (
              <>
                <FiPrinter className="text-base" />
                <span>{isAr ? 'تأكيد الدفع وطباعة السند' : 'Confirm Payment & Print Receipt'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PaymentSettleModal;

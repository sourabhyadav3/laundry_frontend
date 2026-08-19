import React, { useContext, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  FiPlus,
  FiSearch,
  FiTrash2,
  FiDollarSign,
  FiTrendingDown,
  FiCalendar,
  FiDownload,
  FiTag,
  FiClock,
  FiX,
  FiPrinter
} from 'react-icons/fi';
import { AdminStateContext } from '../../context/AdminStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, formatDate, exportToCSV, generateExpenseReceiptPDF, generateDailyExpensesSummaryPDF } from '../../utils/exportUtils';
import ReusableTable from '../../Components/ReusableTable';
import StatsCard from '../../Components/StatsCard';
import { toast } from 'react-toastify';

const EXPENSE_CATEGORIES = [
  'Laundry Supplies & Detergents',
  'Packaging & Bags',
  'Fuel & Petrol',
  'Shop Maintenance & Repairs',
  'Tea & Refreshments',
  'Utilities & Bills',
  'Staff Petty Cash',
  'Other Expense'
];

const categoryColors = {
  'Laundry Supplies & Detergents': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Packaging & Bags': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Fuel & Petrol': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Shop Maintenance & Repairs': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'Tea & Refreshments': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'Utilities & Bills': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  'Staff Petty Cash': 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  'Other Expense': 'bg-slate-500/10 text-slate-600 border-slate-500/20'
};

const Expenses = () => {
  const { language } = useLanguage();
  const { expenses = [], addExpense, deleteExpense, selectedBranch, branches = [] } = useContext(AdminStateContext);

  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (e) {
      return {};
    }
  }, []);
  const isSuperAdmin = storedUser?.role === 'Super Admin' || selectedBranch === 'All';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedShift, setSelectedShift] = useState('All');
  const [dateFilter, setDateFilter] = useState('All'); // 'All', 'Today', 'Month'
  const [branchFilter, setBranchFilter] = useState('All');

  // Branch name helper
  const getBranchName = useCallback((branchId) => {
    if (!branchId) return language === 'ar' ? 'الفرع الرئيسي' : 'Main Branch';
    const b = branches.find(item => String(item._id || item.id) === String(branchId));
    return b ? (b.name || b.branchName || (language === 'ar' ? 'الفرع الرئيسي' : 'Main Branch')) : (language === 'ar' ? 'الفرع الرئيسي' : 'Main Branch');
  }, [branches, language]);

  // Add Expense Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Laundry Supplies & Detergents',
    paymentMethod: 'Cash',
    shift: 'General',
    branchId: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter(e => {
      // Branch check
      if (selectedBranch && selectedBranch !== 'All' && String(e.branchId) !== String(selectedBranch)) {
        return false;
      }
      if (isSuperAdmin && branchFilter !== 'All' && String(e.branchId) !== String(branchFilter)) {
        return false;
      }
      // Category check
      if (selectedCategory !== 'All' && e.category !== selectedCategory) {
        return false;
      }
      // Shift check
      if (selectedShift !== 'All' && e.shift !== selectedShift) {
        return false;
      }
      // Date filter
      if (dateFilter === 'Today' && e.date !== todayStr) {
        return false;
      }
      if (dateFilter === 'Month' && (!e.date || !e.date.startsWith(currentMonthStr))) {
        return false;
      }
      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const bName = getBranchName(e.branchId).toLowerCase();
        const matchesTitle = (e.title || '').toLowerCase().includes(q);
        const matchesNotes = (e.notes || '').toLowerCase().includes(q);
        const matchesStaff = (e.createdBy || '').toLowerCase().includes(q);
        const matchesBranch = bName.includes(q);
        if (!matchesTitle && !matchesNotes && !matchesStaff && !matchesBranch) return false;
      }
      return true;
    });
  }, [expenses, selectedBranch, branchFilter, isSuperAdmin, selectedCategory, selectedShift, dateFilter, searchTerm, todayStr, currentMonthStr, getBranchName]);

  // Metrics
  const metrics = useMemo(() => {
    const todayExpenses = expenses.filter(e => e.date === todayStr);
    const monthExpenses = expenses.filter(e => e.date && e.date.startsWith(currentMonthStr));

    const totalToday = todayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const todayCash = todayExpenses.filter(e => /cash|نقدي/i.test(e.paymentMethod || '')).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalMonth = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalFiltered = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    return {
      totalToday,
      todayCash,
      totalMonth,
      totalFiltered,
      countToday: todayExpenses.length
    };
  }, [expenses, filteredExpenses, todayStr, currentMonthStr]);

  const handleOpenModal = () => {
    const hour = new Date().getHours();
    setFormData({
      title: '',
      amount: '',
      category: 'Laundry Supplies & Detergents',
      paymentMethod: 'Cash',
      shift: hour < 15 ? 'Morning' : 'Evening',
      branchId: selectedBranch !== 'All' ? selectedBranch : (branches[0]?._id || branches[0]?.id || ''),
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.warning(language === 'ar' ? 'يرجى إدخال وصف المصروف' : 'Please enter expense description');
      return;
    }
    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.warning(language === 'ar' ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount');
      return;
    }

    try {
      setIsSubmitting(true);
      await addExpense({
        ...formData,
        amount: numAmount,
        branchId: formData.branchId || (selectedBranch !== 'All' ? selectedBranch : undefined)
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا المصروف؟' : 'Are you sure you want to delete this expense?')) {
      await deleteExpense(id);
    }
  };

  const columns = [
    {
      header: language === 'ar' ? 'التاريخ والوقت' : 'Date & Time',
      accessor: 'date',
      cell: (row) => (
        <div className="text-xs">
          <div className="font-semibold text-primary">{formatDate(row.date)}</div>
          <div className="text-[10px] text-secondary flex items-center gap-1 mt-0.5">
            <FiClock size={10} />
            <span>{row.time || '—'}</span>
            <span className="inline-block px-1 rounded bg-surface-alt font-medium">{row.shift}</span>
          </div>
        </div>
      )
    },
    ...(isSuperAdmin ? [
      {
        header: language === 'ar' ? 'الفرع' : 'Branch',
        accessor: 'branchId',
        cell: (row) => (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border bg-purple-500/10 text-purple-600 border-purple-500/20 whitespace-nowrap">
            📍 {getBranchName(row.branchId)}
          </span>
        )
      }
    ] : []),
    {
      header: language === 'ar' ? 'وصف المصروف' : 'Expense Title',
      accessor: 'title',
      cell: (row) => (
        <div>
          <div className="text-xs font-bold text-primary">{row.title}</div>
          {row.notes && <div className="text-[10.5px] text-secondary mt-0.5 line-clamp-1">{row.notes}</div>}
        </div>
      )
    },
    {
      header: language === 'ar' ? 'التصنيف' : 'Category',
      accessor: 'category',
      cell: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border ${categoryColors[row.category] || categoryColors['Other Expense']}`}>
          {row.category}
        </span>
      )
    },
    {
      header: language === 'ar' ? 'طريقة الدفع' : 'Payment Method',
      accessor: 'paymentMethod',
      cell: (row) => (
        <span className="text-xs font-medium text-secondary">
          {row.paymentMethod === 'Cash' ? '💵 Cash / نقدي' : row.paymentMethod}
        </span>
      )
    },
    {
      header: language === 'ar' ? 'المبلغ' : 'Amount',
      accessor: 'amount',
      cell: (row) => (
        <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
          - {formatCurrency(row.amount)}
        </span>
      )
    },
    {
      header: language === 'ar' ? 'المسجل' : 'Logged By',
      accessor: 'createdBy',
      cell: (row) => (
        <span className="text-xs text-primary font-medium">{row.createdBy || 'Staff'}</span>
      )
    },
    {
      header: language === 'ar' ? 'إجراءات' : 'Actions',
      accessor: 'actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              generateExpenseReceiptPDF(row, { branchName: getBranchName(row.branchId) });
            }}
            className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-500/15 border border-blue-500/20 transition-all active:scale-95 shadow-sm"
            title={language === 'ar' ? 'طباعة سند الصرف' : 'Print Expense Voucher'}
          >
            <FiPrinter size={15} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.id || row._id);
            }}
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-all active:scale-95"
            title="Delete Expense"
          >
            <FiTrash2 size={15} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">💸</span>
            <h1 className="text-xl sm:text-2xl font-bold text-primary">
              {language === 'ar' ? 'سجل المصروفات اليومية' : 'Daily Expenses & Cash Outflow'}
            </h1>
          </div>
          <p className="text-xs text-secondary mt-1 max-w-xl">
            {language === 'ar'
              ? 'تسجيل ومتابعة مصاريف المغسلة والمشتريات النقدية للإغلاق اليومي للورديات'
              : 'Log and track laundry supplies, petty cash expenses, and shift cash outflows.'}
          </p>
        </div>

        <div className="w-full sm:w-auto flex items-center justify-end">
          <button
            type="button"
            onClick={handleOpenModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <FiPlus size={16} />
            <span>{language === 'ar' ? 'تسجيل مصروف جديد' : '➕ Log Expense'}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          label={language === 'ar' ? 'مصروفات اليوم' : "Today's Total Expenses"}
          value={formatCurrency(metrics.totalToday)}
          icon={FiTrendingDown}
          accent="rose"
          change={`${metrics.countToday} ${language === 'ar' ? 'عمليات اليوم' : 'items today'}`}
          changePositive={false}
        />
        <StatsCard
          label={language === 'ar' ? 'المصروف نقداً من الدرج' : 'Cash Outflow from Drawer'}
          value={formatCurrency(metrics.todayCash)}
          icon={FiDollarSign}
          accent="amber"
          change={language === 'ar' ? 'يخصم من إيداع البنك' : 'Deducted from Bank Deposit'}
          changePositive={false}
        />
        <StatsCard
          label={language === 'ar' ? 'إجمالي مصروفات الشهر' : 'Monthly Total Expenses'}
          value={formatCurrency(metrics.totalMonth)}
          icon={FiCalendar}
          accent="violet"
          change={language === 'ar' ? 'الشهر الحالي' : 'Current Month'}
          changePositive={false}
        />
        <StatsCard
          label={language === 'ar' ? 'المجموع المعروض' : 'Filtered Total'}
          value={formatCurrency(metrics.totalFiltered)}
          icon={FiTag}
          accent="blue"
          change={`${filteredExpenses.length} ${language === 'ar' ? 'سجل' : 'records'}`}
          changePositive={true}
        />
      </div>

      {/* Filters Bar */}
      <div className="surface-card border border-border rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1">
          {/* Search */}
          <div className="relative w-full sm:w-auto sm:min-w-[220px] flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={15} />
            <input
              type="text"
              placeholder={language === 'ar' ? 'بحث في المصروفات...' : 'Search expenses...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-border bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-rose-400/40"
            />
          </div>

          <div className={`grid grid-cols-1 ${isSuperAdmin ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'} gap-2 w-full md:w-auto`}>
            {/* Branch Filter (For Super Admin) */}
            {isSuperAdmin && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full text-xs rounded-xl border border-purple-500/30 bg-surface px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-purple-400/40 font-semibold"
              >
                <option value="All">{language === 'ar' ? 'جميع الفروع' : 'All Branches'}</option>
                {branches.map(b => (
                  <option key={b._id || b.id} value={b._id || b.id}>{b.name || b.branchName}</option>
                ))}
              </select>
            )}

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full text-xs rounded-xl border border-border bg-surface px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-rose-400/40"
            >
              <option value="All">{language === 'ar' ? 'جميع الفترات' : 'All Dates'}</option>
              <option value="Today">{language === 'ar' ? 'اليوم فقط' : 'Today Only'}</option>
              <option value="Month">{language === 'ar' ? 'هذا الشهر' : 'This Month'}</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs rounded-xl border border-border bg-surface px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-rose-400/40"
            >
              <option value="All">{language === 'ar' ? 'جميع التصنيفات' : 'All Categories'}</option>
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Shift Filter */}
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="w-full text-xs rounded-xl border border-border bg-surface px-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-rose-400/40"
            >
              <option value="All">{language === 'ar' ? 'جميع الورديات' : 'All Shifts'}</option>
              <option value="Morning">{language === 'ar' ? 'الوردية الصباحية' : 'Morning Shift'}</option>
              <option value="Evening">{language === 'ar' ? 'الوردية المسائية' : 'Evening Shift'}</option>
            </select>
          </div>
        </div>

        {/* Export & Print Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              const activeBranchName = isSuperAdmin
                ? (branchFilter !== 'All' ? getBranchName(branchFilter) : 'All Branches / جميع الفروع')
                : getBranchName(selectedBranch);
              const pLabel = dateFilter === 'Today' ? todayStr : (dateFilter === 'Month' ? currentMonthStr : 'All Dates / كل الفترات');
              generateDailyExpensesSummaryPDF(filteredExpenses, {
                branchName: activeBranchName,
                periodLabel: pLabel
              });
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all active:scale-95 shadow-sm"
            title={language === 'ar' ? 'طباعة كشف المصروفات' : 'Print Expenses Statement'}
          >
            <FiPrinter size={13} />
            <span>{language === 'ar' ? 'طباعة الكشف' : 'Print Statement'}</span>
          </button>

          <button
            type="button"
            onClick={() => exportToCSV(filteredExpenses, 'expenses-report.csv')}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-border bg-surface hover:bg-surface-alt text-primary transition-all active:scale-95"
          >
            <FiDownload size={13} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="surface-card border border-border rounded-2xl p-3 sm:p-5 shadow-xl overflow-hidden">
        <div className="overflow-x-auto w-full">
          <ReusableTable
            columns={columns}
            data={filteredExpenses}
            emptyMessage={language === 'ar' ? 'لا توجد مصروفات مسجلة' : 'No expenses recorded yet.'}
          />
        </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn">
          <div className="surface-card border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 text-secondary hover:text-primary transition-all p-1 rounded-lg hover:bg-surface-alt"
            >
              <FiX size={20} />
            </button>

            <div className="flex items-center gap-2.5 mb-4 sm:mb-5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold text-base sm:text-lg shrink-0">
                💸
              </div>
              <div className="pr-6">
                <h3 className="text-base sm:text-lg font-bold text-primary">
                  {language === 'ar' ? 'تسجيل مصروف جديد' : 'Log New Expense'}
                </h3>
                <p className="text-[11px] sm:text-xs text-secondary mt-0.5">
                  {language === 'ar' ? 'أدخل تفاصيل المصروف وسيتم خصمه من الإغلاق النقدي' : 'Record an outflow from cash drawer or card'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {/* Target Branch Selector for Super Admin */}
              {isSuperAdmin && branches.length > 0 && (
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-purple-600 uppercase mb-1">
                    {language === 'ar' ? 'الفرع المستهدف *' : 'Target Branch *'}
                  </label>
                  <select
                    value={formData.branchId || (branches[0]?._id || branches[0]?.id || '')}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-3 py-2 sm:py-2.5 text-xs rounded-xl border border-purple-500/30 bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-purple-400/40 font-semibold"
                  >
                    {branches.map(b => (
                      <option key={b._id || b.id} value={b._id || b.id}>{b.name || b.branchName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-secondary uppercase mb-1">
                  {language === 'ar' ? 'وصف المصروف *' : 'Expense Title / Description *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'ar' ? 'مثال: شراء صابون تايد أو بنزين' : 'e.g. Detergent purchase, petrol, bags'}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 sm:py-2.5 text-xs rounded-xl border border-border bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-secondary uppercase mb-1">
                    {language === 'ar' ? 'المبلغ (د.ك) *' : 'Amount (KWD) *'}
                  </label>
                  <input
                    type="number"
                    step="0.005"
                    min="0.005"
                    required
                    placeholder="0.000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3.5 py-2 sm:py-2.5 text-xs rounded-xl border border-border bg-surface text-primary font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-secondary uppercase mb-1">
                    {language === 'ar' ? 'طريقة الدفع' : 'Payment Source'}
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 sm:py-2.5 text-xs rounded-xl border border-border bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-rose-400/40 font-semibold"
                  >
                    <option value="Cash">💵 Cash from Drawer / نقدي</option>
                    <option value="K-Net / Card">💳 K-Net / Card / بطاقة</option>
                    <option value="Bank Transfer">🏦 Bank Transfer / تحويل بنكي</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-secondary uppercase mb-1">
                    {language === 'ar' ? 'التصنيف' : 'Category'}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 sm:py-2.5 text-xs rounded-xl border border-border bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-secondary uppercase mb-1">
                    {language === 'ar' ? 'الوردية' : 'Shift'}
                  </label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full px-3 py-2 sm:py-2.5 text-xs rounded-xl border border-border bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                  >
                    <option value="Morning">Morning Shift / صباحية</option>
                    <option value="Evening">Evening Shift / مسائية</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-secondary uppercase mb-1">
                  {language === 'ar' ? 'ملاحظات إضافية' : 'Notes / Remarks'}
                </label>
                <textarea
                  rows={2}
                  placeholder={language === 'ar' ? 'رقم الفاتورة أو تفاصيل إضافية...' : 'Optional invoice number, receipt notes...'}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-3 border-t border-border/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl text-xs font-bold border border-border bg-surface hover:bg-surface-alt text-primary transition-all text-center"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md transition-all disabled:opacity-50 text-center"
                >
                  {isSubmitting
                    ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                    : (language === 'ar' ? 'حفظ المصروف' : 'Record Expense')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Expenses;

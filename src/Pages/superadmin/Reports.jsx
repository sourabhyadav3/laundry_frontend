import React, { useContext, useMemo, useState } from 'react';
import {
  FiDownload,
  FiTrendingUp,
  FiShoppingBag,
  FiCheckCircle,
  FiClock,
  FiUsers,
  FiDollarSign,
  FiChevronDown,
  FiSearch,
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';
import { AdminStateContext } from '../../context/AdminStateContext';
import StatsCard from '../../Components/StatsCard';
import ReportTable from '../../Components/ReportTable';
// import {
//   RevenueTrendChart,
//   OrdersTrendChart,
//   ServiceRevenueDistributionChart,
//   PaymentMethodDistributionChart,
//   OrderStatusDistributionChart,
// } from '../../Components/ReportCharts';
import {
  DATE_PRESETS,
  getDateRange,
} from '../../utils/reportAnalytics';
import { ORDER_STATUSES } from '../../constants/statusStyles';
import { exportToPDF, exportToCSV, formatCurrency, formatDate } from '../../utils/exportUtils';

const REPORT_EXPORT_COLUMNS = [
  { key: 'number', label: 'Order #' },
  { key: 'customerName', label: 'Customer' },
  { key: 'serviceType', label: 'Service' },
  { key: 'status', label: 'Status' },
  { key: 'totalAmount', label: 'Amount', format: (v) => formatCurrency(v) },
  { key: 'date', label: 'Date', format: (v) => formatDate(v) },
];

const TOP_CUSTOMER_COLUMNS = [
  { key: 'customerName', label: 'Customer Name' },
  { key: 'totalOrders', label: 'Total Orders' },
  { key: 'totalRevenue', label: 'Total Revenue', format: (v) => formatCurrency(v) },
  { key: 'lastOrderDate', label: 'Last Order Date', format: (v) => formatDate(v) },
];

const STAFF_PERF_COLUMNS = [
  { key: 'staffName', label: 'Staff Name' },
  { key: 'role', label: 'Role' },
  { key: 'ordersHandled', label: 'Orders Handled' },
  { key: 'deliveriesCompleted', label: 'Deliveries Completed' },
  { key: 'revenueGenerated', label: 'Revenue Generated', format: (v) => formatCurrency(v) },
];

const MetricBlock = ({ label, value }) => (
  <div className="metric-block rounded-2xl border border-border bg-surface-alt p-4">
    <p className="text-xs uppercase tracking-[0.3em] text-secondary">{label}</p>
    <p className="mt-2 text-xl font-semibold text-primary">{value}</p>
  </div>
);

const CATEGORIES = [
  { id: 'sales', label: 'Sales & Revenue', icon: '💰', labelAr: 'المبيعات والأرباح' },
  { id: 'customers', label: 'Customers & Debts', icon: '👥', labelAr: 'العملاء والديون' },
  { id: 'logistics', label: 'Logistics', icon: '🚚', labelAr: 'العمليات والتوصيل' },
  { id: 'staff', label: 'Staff & Drivers', icon: '👤', labelAr: 'الموظفين والسائقين' },
  { id: 'services', label: 'Laundry Services', icon: '🧺', labelAr: 'خدمات الغسيل' }
];

const REPORT_TYPES = {
  sales: [
    { id: 'total_sales', label: 'Total Sales Revenue', labelAr: 'إجمالي المبيعات' },
    { id: 'sales_detail', label: 'Sales Detail (Item-wise)', labelAr: 'تفاصيل المبيعات' },
    { id: 'branch_sales', label: 'Sales by Branch', labelAr: 'المبيعات حسب الفرع' },
    { id: 'payment_methods', label: 'Payment Methods Distribution', labelAr: 'توزيع طرق الدفع' }
  ],
  customers: [
    { id: 'customer_list', label: 'Customer Directory', labelAr: 'قائمة العملاء' },
    { id: 'top_customers', label: 'Top Purchasing Customers', labelAr: 'العملاء الأكثر شراءً' },
    { id: 'customer_debts', label: 'Outstanding Customer Debts', labelAr: 'مديونيات العملاء' }
  ],
  logistics: [
    { id: 'completed_jobs', label: 'Completed Deliveries / Pickups', labelAr: 'المهام اللوجستية المكتملة' },
    { id: 'pending_jobs', label: 'Pending / Out for Delivery', labelAr: 'المهام اللوجستية المعلقة' }
  ],
  staff: [
    { id: 'user_sales', label: 'User Sales Summary', labelAr: 'مبيعات الموظفين' },
    { id: 'driver_income', label: 'Drivers Income & Deliveries', labelAr: 'دخل وأداء السائقين' }
  ],
  services: [
    { id: 'service_revenue', label: 'Laundry Service Revenue', labelAr: 'الإيرادات حسب الخدمة' },
    { id: 'garment_stats', label: 'Garment Type Stats', labelAr: 'إحصائيات أصناف الملابس' }
  ]
};

const Reports = () => {
  const { language } = useLanguage();
  const { customers, staff, drivers, catalog, branches } = useContext(AdminStateContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const branchId = searchParams.get('branchId') || 'all';

  const currentBranchName = useMemo(() => {
    if (!branchId || branchId === 'all') return language === 'ar' ? 'جميع الفروع' : 'All Branches';
    const b = branches.find(x => String(x.id || x._id) === String(branchId));
    return b ? b.name : (language === 'ar' ? 'الفرع المحدد' : 'Selected Branch');
  }, [branches, branchId, language]);

  const [datePreset, setDatePreset] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Step-by-Step Filter Wizard state
  const [stepCategory, setStepCategory] = useState('');
  const [stepReportType, setStepReportType] = useState('');
  const [stepParameter, setStepParameter] = useState('All');
  
  // Custom generated report data
  const [customReport, setCustomReport] = useState(null);
  const [customSearch, setCustomSearch] = useState('');
  
  const [dashboardData, setDashboardData] = useState({
    summary: { totalRevenue: 0, totalOrders: 0, completedOrders: 0, pendingOrders: 0, activeCustomers: 0, averageOrderValue: 0 },
    periodOrders: [],
    serviceRevenue: { washing: 0, dryCleaning: 0, ironing: 0, premium: 0 },
    paymentDistribution: { Cash: 0, Card: 0, Link: 0, Wamd: 0 },
    periodPayments: []
  });
  const [, setLoadingDashboard] = useState(false);

  const getDynamicParameters = () => {
    if (!stepReportType) return [];
    
    switch (stepReportType) {
      case 'user_sales':
        return [
          { value: 'All', label: language === 'ar' ? 'جميع الموظفين' : 'All Staff' },
          ...staff.map(s => ({ value: s.name, label: s.name }))
        ];
      case 'driver_income':
        return [
          { value: 'All', label: language === 'ar' ? 'جميع السائقين' : 'All Drivers' },
          ...(drivers || []).map(d => ({ value: d.driverName, label: d.driverName }))
        ];
      case 'sales_detail':
      case 'garment_stats':
        return [
          { value: 'Express', label: language === 'ar' ? 'مستعجل' : 'Express' },
          { value: 'Normal', label: language === 'ar' ? 'عادي' : 'Normal' },
          { value: 'All', label: language === 'ar' ? 'جميع الأصناف' : 'All Garments' },
          ...(catalog || []).map(g => ({ value: g.name, label: g.name }))
        ];
      case 'branch_sales':
        return [
          { value: 'All', label: language === 'ar' ? 'جميع الفروع' : 'All Branches' },
          { value: 'Ragheey', label: 'Ragheey' },
          { value: 'Mishrif', label: 'Mishrif' },
          { value: 'Andalus', label: 'Andalus' },
          { value: 'Ardiya', label: 'Ardiya' },
          { value: 'Khaitan', label: 'Khaitan' },
          { value: 'Qurain', label: 'Qurain' },
          { value: 'Jahra', label: 'Jahra' },
          { value: 'Rigai', label: 'Rigai' }
        ];
      case 'customer_list':
      case 'top_customers':
      case 'customer_debts':
        return [
          { value: 'All', label: language === 'ar' ? 'جميع العملاء' : 'All Customers' },
          ...customers.map(c => ({ value: c.id, label: c.name }))
        ];
      default:
        return [
          { value: 'All', label: language === 'ar' ? 'كل البيانات (لا يوجد فلتر)' : 'All Data (No Filter)' }
        ];
    }
  };

  const handleGenerateReport = async () => {
    if (!stepCategory || !stepReportType) {
      toast.warning(language === 'ar' ? 'يرجى اختيار الفئة ونوع التقرير' : 'Please select a Category and Report Type');
      return;
    }

    const categoryObj = CATEGORIES.find(c => c.id === stepCategory);
    const reportTypeObj = REPORT_TYPES[stepCategory]?.find(r => r.id === stepReportType);
    const titleEn = `${categoryObj.label} - ${reportTypeObj.label}`;
    const titleAr = `${categoryObj.labelAr} - ${reportTypeObj.labelAr}`;
    const title = language === 'ar' ? titleAr : titleEn;

    let columns = [];
    
    switch (stepReportType) {
      case 'total_sales':
        columns = [
          { header: language === 'ar' ? 'التاريخ' : 'Date', accessor: 'date', format: (val) => formatDate(val) },
          { header: language === 'ar' ? 'عدد الطلبات' : 'Order Count', accessor: 'count' },
          { header: language === 'ar' ? 'المجموع الفرعي' : 'Subtotal', accessor: 'subtotal', format: (val) => formatCurrency(val) },
          { header: language === 'ar' ? 'الخصم' : 'Discount', accessor: 'discount', format: (val) => formatCurrency(val) },
          { header: language === 'ar' ? 'الضريبة' : 'Tax', accessor: 'tax', format: (val) => formatCurrency(val) },
          { header: language === 'ar' ? 'الإجمالي الصافي' : 'Net Total', accessor: 'total', format: (val) => formatCurrency(val) },
        ];
        break;
      case 'sales_detail':
        columns = [
          { header: language === 'ar' ? 'رقم الفاتورة' : 'Order #', accessor: 'orderNo' },
          { header: language === 'ar' ? 'العميل' : 'Customer', accessor: 'customerName' },
          { header: language === 'ar' ? 'التاريخ' : 'Date', accessor: 'date', format: (val) => formatDate(val) },
          { header: language === 'ar' ? 'الصنف' : 'Item Name', accessor: 'itemName' },
          { header: language === 'ar' ? 'الخدمة' : 'Service Type', accessor: 'service' },
          { header: language === 'ar' ? 'الكمية' : 'Qty', accessor: 'qty' },
          { header: language === 'ar' ? 'سعر الوحدة' : 'Unit Price', accessor: 'price', format: (val) => formatCurrency(val) },
          { header: language === 'ar' ? 'الإجمالي' : 'Total', accessor: 'total', format: (val) => formatCurrency(val) },
        ];
        break;
      case 'branch_sales':
        columns = [
          { header: language === 'ar' ? 'الفرع' : 'Branch Name', accessor: 'branch' },
          { header: language === 'ar' ? 'عدد الطلبات' : 'Order Count', accessor: 'count' },
          { header: language === 'ar' ? 'مجموع المبيعات' : 'Sales Revenue', accessor: 'revenue', format: (val) => formatCurrency(val) },
          { header: language === 'ar' ? 'متوسط قيمة الطلب' : 'Avg Order Value', accessor: 'avgValue', format: (val) => formatCurrency(val) },
        ];
        break;
      case 'payment_methods':
        columns = [
          { header: language === 'ar' ? 'طريقة الدفع' : 'Payment Method', accessor: 'method' },
          { header: language === 'ar' ? 'عدد العمليات' : 'Transactions', accessor: 'count' },
          { header: language === 'ar' ? 'المبلغ المحصل' : 'Collected Amount', accessor: 'collected', format: (val) => formatCurrency(val) },
        ];
        break;
      case 'customer_list':
        columns = [
          { header: language === 'ar' ? 'رقم العميل' : 'Customer ID', accessor: 'customerId' },
          { header: language === 'ar' ? 'الاسم' : 'Name', accessor: 'name' },
          { header: language === 'ar' ? 'الهاتف' : 'Phone', accessor: 'phone' },
          { header: language === 'ar' ? 'تاريخ التسجيل' : 'Registered', accessor: 'registered', format: (val) => formatDate(val) },
          { header: language === 'ar' ? 'الخصم الدائم' : 'Discount', accessor: 'discount', format: (val) => val ? `${val}%` : '0%' },
          { header: language === 'ar' ? 'عدد الطلبات' : 'Total Orders', accessor: 'ordersCount' },
          { header: language === 'ar' ? 'الرصيد المستحق' : 'Due Balance', accessor: 'balance', format: (val) => formatCurrency(val) },
        ];
        break;
      case 'top_customers':
        columns = [
          { header: language === 'ar' ? 'اسم العميل' : 'Customer Name', accessor: 'name' },
          { header: language === 'ar' ? 'عدد الطلبات في الفترة' : 'Orders Count', accessor: 'ordersCount' },
          { header: language === 'ar' ? 'إجمالي المبيعات' : 'Total Spent', accessor: 'spent', format: (val) => formatCurrency(val) },
          { header: language === 'ar' ? 'آخر تاريخ طلب' : 'Last Order Date', accessor: 'lastDate', format: (val) => formatDate(val) },
        ];
        break;
      case 'customer_debts':
        columns = [
          { header: language === 'ar' ? 'الاسم' : 'Customer Name', accessor: 'name' },
          { header: language === 'ar' ? 'الهاتف' : 'Phone', accessor: 'phone' },
          { header: language === 'ar' ? 'تاريخ التسجيل' : 'Registered', accessor: 'registered', format: (val) => formatDate(val) },
          { header: language === 'ar' ? 'الرصيد المستحق' : 'Due Balance', accessor: 'balance', format: (val) => formatCurrency(val) },
        ];
        break;
      case 'completed_jobs':
      case 'pending_jobs':
        columns = [
          { header: language === 'ar' ? 'رقم الطلب' : 'Request ID', accessor: 'reqId' },
          { header: language === 'ar' ? 'النوع' : 'Type', accessor: 'type' },
          { header: language === 'ar' ? 'العميل' : 'Customer', accessor: 'customer' },
          { header: language === 'ar' ? 'التاريخ' : 'Date', accessor: 'date', format: (val) => formatDate(val) },
          { header: language === 'ar' ? 'المندوب' : 'Driver', accessor: 'driver' },
          { header: language === 'ar' ? 'الحالة' : 'Status', accessor: 'status' },
        ];
        break;
      case 'user_sales':
        columns = [
          { header: language === 'ar' ? 'الموظف' : 'Employee Name', accessor: 'name' },
          { header: language === 'ar' ? 'عدد الفواتير' : 'Invoices Count', accessor: 'count' },
          { header: language === 'ar' ? 'إجمالي المبيعات' : 'Sales Generated', accessor: 'sales', format: (val) => formatCurrency(val) },
        ];
        break;
      case 'driver_income':
        columns = [
          { header: language === 'ar' ? 'السائق' : 'Driver Name', accessor: 'name' },
          { header: language === 'ar' ? 'المناطق المغطاة' : 'Assigned Areas', accessor: 'areas' },
          { 
            header: language === 'ar' ? 'الحالة الحالية' : 'Current Status', 
            accessor: 'status',
            format: (status) => {
              const colors = {
                'Available': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15',
                'Assigned': 'bg-amber-500/10 text-amber-600 border-amber-500/15',
                'On Delivery': 'bg-blue-500/10 text-blue-600 border-blue-500/15',
                'Off Duty': 'bg-rose-500/10 text-rose-600 border-rose-500/15'
              };
              return (
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${colors[status] || colors.Available}`}>
                  {status}
                </span>
              );
            }
          },
          { header: language === 'ar' ? 'عمليات بيك اب نشطة' : 'Active Pickups', accessor: 'activePickups' },
          { header: language === 'ar' ? 'عمليات توصيل نشطة' : 'Active Deliveries', accessor: 'activeDeliveries' },
        ];
        break;
      case 'service_revenue':
        columns = [
          { header: language === 'ar' ? 'الخدمة' : 'Service Type', accessor: 'service' },
          { header: language === 'ar' ? 'عدد الطلبات' : 'Order Count', accessor: 'count' },
          { header: language === 'ar' ? 'مجموع الإيرادات' : 'Revenue', accessor: 'revenue', format: (val) => formatCurrency(val) },
        ];
        break;
      case 'garment_stats':
        columns = [
          { header: language === 'ar' ? 'الصنف' : 'Garment Name', accessor: 'name' },
          { header: language === 'ar' ? 'الكمية الإجمالية' : 'Units Sold', accessor: 'qty' },
          { header: language === 'ar' ? 'إجمالي المبيعات' : 'Revenue', accessor: 'revenue', format: (val) => formatCurrency(val) },
        ];
        break;

      default: break;
    }

    try {
      const { start, end } = getDateRange(datePreset, customStart, customEnd);
      let sStr = '';
      let eStr = '';
      if(start) sStr = start.toISOString().slice(0, 10);
      if(end) eStr = end.toISOString().slice(0, 10);
      
      const res = await api.get('/reports/generate', {
         params: { reportType: stepReportType, category: stepCategory, parameter: stepParameter, start: sStr, end: eStr, branchId }
      });
      setCustomReport({ title, columns, data: res.data.data });
      toast.success(language === 'ar' ? 'تم إنشاء التقرير بنجاح' : 'Report generated successfully');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate report');
    }
  };

  // const range = useMemo(
  //   () => getDateRange(datePreset, customStart, customEnd),
  //   [datePreset, customStart, customEnd]
  // );

  const metrics = {
    ...dashboardData,
    summary: {
      ...dashboardData.summary,
      growth: dashboardData.summary?.growth || {
        revenue: { text: '0%', positive: true },
        orders: { text: '0%', positive: true },
        completed: { text: '0%', positive: true },
        pending: { text: '0%', positive: true },
        customers: { text: '0%', positive: true },
        avgOrder: { text: '0%', positive: true },
      }
    },
    daily: dashboardData.daily || {
      revenueToday: 0,
      ordersToday: 0,
      paymentsReceived: 0
    },
    monthly: dashboardData.monthly || {
      monthlyRevenue: 0,
      revenueGrowth: { text: '0%' },
      revenueComparison: 0
    },
    orders: dashboardData.orders || {
      totalOrders: 0,
      pendingOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0
    },
    paymentMethodBreakdown: dashboardData.paymentMethodBreakdown || [],
    orderStatusBreakdown: dashboardData.orderStatusBreakdown || [],
    payments: dashboardData.payments || {
      paidAmount: 0,
      pendingAmount: 0,
      partialAmount: 0,
      dueCustomers: 0
    },
    logistics: dashboardData.logistics || {
      totalPickups: 0,
      completedPickups: 0,
      totalDeliveries: 0,
      failedDeliveries: 0
    },
    topCustomers: dashboardData.topCustomers || [],
    staffPerformance: dashboardData.staffPerformance || []
  };
  const { summary } = metrics;
  
  React.useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoadingDashboard(true);
        const { start, end } = getDateRange(datePreset, customStart, customEnd);
        let sStr = '';
        let eStr = '';
        if(start) sStr = start.toISOString().slice(0, 10);
        if(end) eStr = end.toISOString().slice(0, 10);
        
        const res = await api.get('/reports/dashboard', { params: { start: sStr, end: eStr, branchId } });
        setDashboardData(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingDashboard(false);
      }
    };
    fetchDashboard();
  }, [datePreset, customStart, customEnd, branchId]);

  const summaryLines = [
    `Period: ${DATE_PRESETS.find((p) => p.id === datePreset)?.label || datePreset}`,
    `Total Revenue: ${formatCurrency(summary.totalRevenue)}`,
    `Total Orders: ${summary.totalOrders}`,
    `Completed: ${summary.completedOrders} | Pending: ${summary.pendingOrders}`,
    `Active Customers: ${summary.activeCustomers}`,
    `Avg Order Value: ${formatCurrency(summary.averageOrderValue)}`,
  ];

  const handleExportPDF = () => {
    const ok = exportToPDF({
      title: 'Tuhama — Business Reports',
      subtitle: 'Reports & Analytics',
      columns: REPORT_EXPORT_COLUMNS,
      data: metrics.periodOrders,
      filename: `business-report-${new Date().toISOString().slice(0, 10)}`,
      summaryLines,
    });
    if (ok) toast.success('Report exported as PDF');
    else toast.warning('No data to export');
  };

  return (
    <div id="reports-print-area" className="space-y-8">
      <section className="surface-card overflow-hidden border border-border shadow-xl print:shadow-none">
        <div className="dashboard-hero p-8 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-secondary">Admin Dashboard</p>
              <h1 className="mt-3 text-3xl font-semibold text-primary">
                Reports & Analytics ({currentBranchName})
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-secondary">
                Monitor business performance and business growth.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 print:hidden">
              <div className="relative">
                <select
                  value={branchId}
                  onChange={(e) => setSearchParams({ branchId: e.target.value })}
                  className="appearance-none rounded-2xl border border-border bg-surface-alt px-5 py-3 pr-10 text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 cursor-pointer shadow-sm hover:scale-[1.02] transition-all uppercase tracking-wider"
                >
                  <option value="all">{language === 'ar' ? 'جميع الفروع' : 'All Branches'}</option>
                  {branches.map((b) => {
                    const bId = b.id || b._id;
                    return (
                      <option key={bId} value={bId}>
                        {b.name}
                      </option>
                    );
                  })}
                </select>
                <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
              </div>
              <button type="button" onClick={handleExportPDF} className="dashboard-hero-pill flex items-center gap-2 hover:bg-blue-500/10">
                <FiDownload size={18} />
                <span className="font-semibold">Export PDF</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="surface-card border border-border p-4 shadow-xl print:hidden">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Date filters</p>
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setDatePreset(p.id)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${datePreset === p.id
                  ? 'bg-blue-500/15 text-blue-600'
                  : 'border border-border bg-surface-alt text-secondary hover:text-primary'
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {datePreset === 'custom' && (
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-2xl border border-border bg-surface px-4 py-2 text-primary"
            />
            <span className="self-center text-secondary">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-2xl border border-border bg-surface px-4 py-2 text-primary"
            />
          </div>
        )}
      </section>

      {/* Step-by-Step Filtering Wizard */}
      <section className="surface-card border border-border p-6 shadow-xl space-y-6 print:hidden">
        <div>
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            📊 {language === 'ar' ? 'معالج التقارير خطوة بخطوة' : 'Step-by-Step Custom Report Wizard'}
          </h2>
          <p className="text-xs text-secondary mt-1">
            {language === 'ar' ? 'حدد الخيارات بالتتابع لتوليد تقارير مخصصة وفلترة البيانات' : 'Select options sequentially to generate specific, customized report summaries.'}
          </p>
        </div>

        {/* Step 1: Main Category */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
            Step 1: {language === 'ar' ? 'اختر فئة التقرير' : 'Select Category'}
          </label>
          <div className="flex flex-wrap gap-2.5">
            {CATEGORIES.map((cat) => {
              const isActive = stepCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setStepCategory(cat.id);
                    setStepReportType('');
                    setStepParameter('All');
                  }}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-center transition-all hover:scale-[1.02] active:scale-[0.98] ${
                    isActive
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-semibold shadow-sm'
                      : 'border-border bg-surface text-secondary hover:bg-surface-alt'
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {language === 'ar' ? cat.labelAr : cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Step 2: Report Type */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
              Step 2: {language === 'ar' ? 'نوع التقرير' : 'Select Report Type'}
            </label>
            <div className="relative">
              <select
                disabled={!stepCategory}
                value={stepReportType}
                onChange={(e) => {
                  setStepReportType(e.target.value);
                  setStepParameter('All');
                }}
                className="w-full appearance-none rounded-2xl border border-border bg-surface py-3 px-4 pr-10 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {stepCategory
                    ? (language === 'ar' ? '-- اختر نوع التقرير --' : '-- Choose Report Type --')
                    : (language === 'ar' ? '🔒 اختر الفئة أولاً' : '🔒 Select Category First')}
                </option>
                {stepCategory &&
                  (REPORT_TYPES[stepCategory] || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {language === 'ar' ? t.labelAr : t.label}
                    </option>
                  ))}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
            </div>
          </div>

          {/* Step 3: Specific Parameter */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-secondary">
              Step 3: {language === 'ar' ? 'حدد الفلتر الإضافي' : 'Refine Parameter'}
            </label>
            <div className="relative">
              <select
                disabled={!stepReportType}
                value={stepParameter}
                onChange={(e) => setStepParameter(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-border bg-surface py-3 px-4 pr-10 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!stepReportType ? (
                  <option value="All">
                    {language === 'ar' ? '🔒 اختر نوع التقرير أولاً' : '🔒 Select Report Type First'}
                  </option>
                ) : (
                  getDynamicParameters().map((p, idx) => (
                    <option key={`${p.value}-${idx}`} value={p.value}>
                      {p.label}
                    </option>
                  ))
                )}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary" />
            </div>
          </div>
        </div>

        {/* Wizard Controls */}
        <div className="border-t border-border/80 pt-4 flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => {
              setStepCategory('');
              setStepReportType('');
              setStepParameter('All');
              setCustomReport(null);
              setCustomSearch('');
            }}
            className="px-5 py-2.5 rounded-2xl text-xs font-bold border border-border bg-surface hover:bg-surface-alt text-primary transition-all uppercase tracking-wider"
          >
            {language === 'ar' ? 'إعادة تعيين' : 'Reset Wizard'}
          </button>
          <button
            type="button"
            disabled={!stepReportType}
            onClick={handleGenerateReport}
            className="px-6 py-2.5 rounded-2xl text-xs font-bold text-white transition-all bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            {language === 'ar' ? 'عرض التقرير 🔍' : 'View Custom Report 🔍'}
          </button>
        </div>
      </section>

      {/* Dedicated Results Section */}
      {customReport && (() => {
        const filteredData = customReport.data.filter(row => {
          if (!customSearch) return true;
          return Object.values(row).some(val => 
            String(val).toLowerCase().includes(customSearch.toLowerCase())
          );
        });

        const handleExportCustomCSV = () => {
          exportToCSV(filteredData, `${stepReportType}-report.csv`, customReport.columns.map(c => ({ key: c.accessor, label: c.header })));
          toast.success(language === 'ar' ? 'تم التصدير كملف CSV' : 'Exported report as CSV');
        };

        const handleExportCustomPDF = () => {
          exportToPDF({
            title: customReport.title,
            subtitle: `Generated: ${formatDate(new Date())}`,
            columns: customReport.columns.map(c => ({ key: c.accessor, label: c.header })),
            data: filteredData,
            filename: `${stepReportType}-report.pdf`,
            summaryLines: [
              `Date Range Preset: ${DATE_PRESETS.find(p => p.id === datePreset)?.label || datePreset}`,
              `Total Records: ${filteredData.length}`
            ]
          });
          toast.success(language === 'ar' ? 'تم التصدير كملف PDF' : 'Exported report as PDF');
        };

        return (
          <section className="surface-card border border-border rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-3">
              <div>
                <h2 className="text-xl font-bold text-primary">{customReport.title}</h2>
                <p className="text-xs text-secondary mt-1">
                  {language === 'ar' ? `تم العثور على ${filteredData.length} سجل` : `Found ${filteredData.length} matching records`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleExportCustomPDF}
                  className="dashboard-hero-pill flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-4 border border-blue-500/30 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
                >
                  <FiDownload size={14} />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCustomCSV}
                  className="dashboard-hero-pill flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-4 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                >
                  <FiDownload size={14} />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* Results Table search */}
            <div className="relative max-w-sm">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
              <input
                type="text"
                placeholder={language === 'ar' ? 'ابحث في النتائج...' : 'Filter custom results...'}
                value={customSearch}
                onChange={(e) => setCustomSearch(e.target.value)}
                className="w-full text-xs rounded-xl border border-border bg-surface pl-9 pr-3 py-2 text-primary focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              />
            </div>

            {/* Rendered Custom Results Table */}
            <div className="overflow-x-auto border border-border/50 rounded-xl">
              <table className="w-full border-collapse text-xs text-left">
                <thead>
                  <tr className="bg-surface-alt/75 text-secondary border-b border-border font-bold">
                    {customReport.columns.map((c) => (
                      <th key={c.accessor} className="p-3">{c.header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={customReport.columns.length} className="p-8 text-center text-secondary font-medium">
                        {language === 'ar' ? 'لا توجد بيانات مطابقة للفلترة' : 'No records matching current filters'}
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((row, rIdx) => (
                      <tr key={row.id || rIdx} className="border-b border-border/30 hover:bg-surface-alt/20 transition-colors">
                        {customReport.columns.map((c) => {
                          const rawVal = row[c.accessor];
                          const formattedVal = c.format ? c.format(rawVal, row) : rawVal;
                          return (
                            <td key={c.accessor} className="p-3 font-medium text-primary">
                              {formattedVal ?? 'N/A'}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        );
      })()}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <StatsCard accent="emerald" icon={FiDollarSign} label="Total Revenue" value={formatCurrency(summary.totalRevenue)} change={summary.growth.revenue.text} changePositive={summary.growth.revenue.positive} />
        <StatsCard accent="blue" icon={FiShoppingBag} label="Total Orders" value={summary.totalOrders} change={summary.growth.orders.text} changePositive={summary.growth.orders.positive} />
        <StatsCard accent="cyan" icon={FiCheckCircle} label="Completed Orders" value={summary.completedOrders} change={summary.growth.completed.text} changePositive={summary.growth.completed.positive} />
        <StatsCard accent="amber" icon={FiClock} label="Pending Orders" value={summary.pendingOrders} change={summary.growth.pending.text} changePositive={!summary.growth.pending.positive} />
        <StatsCard accent="violet" icon={FiUsers} label="Active Customers" value={summary.activeCustomers} change={summary.growth.customers.text} changePositive={summary.growth.customers.positive} />
        <StatsCard accent="rose" icon={FiTrendingUp} label="Average Order Value" value={formatCurrency(summary.averageOrderValue)} change={summary.growth.avgOrder.text} changePositive={summary.growth.avgOrder.positive} />
      </div>

      {/* Commented out as requested - can be restored later if client asks
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <RevenueTrendChart orders={metrics.periodOrders} range={range} />
        <OrdersTrendChart orders={metrics.periodOrders} range={range} />
        <ServiceRevenueDistributionChart serviceRevenue={metrics.serviceRevenue} />
        <PaymentMethodDistributionChart breakdown={metrics.paymentMethodBreakdown} />
        <OrderStatusDistributionChart breakdown={metrics.orderStatusBreakdown} />
      </div>
      */}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="report-section-card surface-card border border-border p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-primary">Daily Sales Report</h3>
          <p className="mt-1 text-sm text-secondary">Today&apos;s snapshot</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MetricBlock label="Revenue Today" value={formatCurrency(metrics.daily.revenueToday)} />
            <MetricBlock label="Orders Today" value={metrics.daily.ordersToday} />
            <MetricBlock label="Payments Received" value={formatCurrency(metrics.daily.paymentsReceived)} />
          </div>
        </section>

        <section className="report-section-card surface-card border border-border p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-primary">Monthly Revenue Report</h3>
          <p className="mt-1 text-sm text-secondary">Selected period performance</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MetricBlock label="Monthly Revenue" value={formatCurrency(metrics.monthly.monthlyRevenue)} />
            <MetricBlock label="Revenue Growth" value={metrics.monthly.revenueGrowth.text} />
            <MetricBlock label="Previous Period" value={formatCurrency(metrics.monthly.revenueComparison)} />
          </div>
        </section>

        <section className="report-section-card surface-card border border-border p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-primary">Order Performance Report</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricBlock label="Total Orders" value={metrics.orders.totalOrders} />
            <MetricBlock label="Pending Orders" value={metrics.orders.pendingOrders} />
            <MetricBlock label="Delivered Orders" value={metrics.orders.deliveredOrders} />
            <MetricBlock label="Cancelled Orders" value={metrics.orders.cancelledOrders} />
          </div>
        </section>

        {/* Commented out as requested - can be restored later if client asks
        <section className="report-section-card surface-card border border-border p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-primary">Service-wise Revenue Report</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricBlock label="Washing Revenue" value={formatCurrency(metrics.serviceRevenue.washing)} />
            <MetricBlock label="Ironing Revenue" value={formatCurrency(metrics.serviceRevenue.ironing)} />
            <MetricBlock label="Dry Cleaning Revenue" value={formatCurrency(metrics.serviceRevenue.dryCleaning)} />
            <MetricBlock label="Premium Service Revenue" value={formatCurrency(metrics.serviceRevenue.premium)} />
          </div>
        </section>
        */}

        <section className="report-section-card surface-card border border-border p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-primary">Payment Analytics</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricBlock label="Paid Amount" value={formatCurrency(metrics.payments.paidAmount)} />
            <MetricBlock label="Pending Amount" value={formatCurrency(metrics.payments.pendingAmount)} />
            <MetricBlock label="Partial Payments" value={formatCurrency(metrics.payments.partialAmount)} />
            <MetricBlock label="Due Customers" value={metrics.payments.dueCustomers} />
          </div>
        </section>

        <section className="report-section-card surface-card border border-border p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-primary">Home Service Analytics</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricBlock label="Total Pickups" value={metrics.logistics.totalPickups} />
            <MetricBlock label="Completed Pickups" value={metrics.logistics.completedPickups} />
            <MetricBlock label="Total Deliveries" value={metrics.logistics.totalDeliveries} />
            <MetricBlock label="Failed Deliveries" value={metrics.logistics.failedDeliveries} />
          </div>
        </section>
      </div>

      <ReportTable
        title="Top Customers Report"
        subtitle="Highest value customers in selected period"
        columns={TOP_CUSTOMER_COLUMNS}
        data={metrics.topCustomers}
        searchKeys={['customerName']}
        exportFilename="top-customers-report"
      />

      <ReportTable
        title="Staff Performance"
        subtitle="Team productivity metrics"
        columns={STAFF_PERF_COLUMNS}
        data={metrics.staffPerformance}
        searchKeys={['staffName', 'role']}
        filterOptions={{ key: 'role', values: ['Admin', 'Counter Staff', 'Delivery Staff'] }}
        exportFilename="staff-performance-report"
      />

      <ReportTable
        title="Period Orders"
        subtitle="Detailed order listing for export and review"
        columns={REPORT_EXPORT_COLUMNS}
        data={metrics.periodOrders}
        searchKeys={['number', 'customerName', 'serviceType']}
        filterOptions={{
          key: 'status',
          values: ORDER_STATUSES,
        }}
        exportFilename="period-orders-report"
      />
    </div>
  );
};

export default Reports;

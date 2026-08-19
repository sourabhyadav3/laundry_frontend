import React, { useContext, useMemo, useState, useEffect, useCallback } from 'react';
import {
  FiDownload,
  FiSearch,
  FiRefreshCw,
  FiCpu,
  FiShoppingBag,
  FiTruck,
  FiCreditCard,
  FiClock,
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';
import { AdminStateContext } from '../../context/AdminStateContext';
import { exportToPDF, exportToCSV } from '../../utils/exportUtils';
import { translateNotification } from '../../utils/notificationTranslator';

const formatDateTimeCustom = (value) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, '0');
  return `${day}/${month}/${year} ${hoursStr}:${minutes} ${ampm}`;
};

const AuditLogs = () => {
  const { language } = useLanguage();
  const { notifications, setNotifications, branches } = useContext(AdminStateContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
      toast.error(language === 'ar' ? 'فشل في جلب سجلات التدقيق' : 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [language, setNotifications]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    return notifications.filter((log) => {
      const matchesSearch =
        (log.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.text || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'All' || log.type === typeFilter;

      let matchesBranch = true;
      if (branchFilter !== 'All') {
        if (branchFilter === 'system') {
          matchesBranch = !log.branchId;
        } else {
          matchesBranch = log.branchId === branchFilter;
        }
      }

      return matchesSearch && matchesType && matchesBranch;
    });
  }, [notifications, searchTerm, typeFilter, branchFilter]);

  const handleExportCSV = () => {
    const columns = [
      { key: 'time', label: 'Timestamp', format: (val) => formatDateTimeCustom(val) },
      { key: 'title', label: 'Event' },
      { key: 'text', label: 'Details' },
      { key: 'type', label: 'Category' },
      { key: 'branchName', label: 'Branch' },
    ];

    const dataToExport = filteredLogs.map((log) => {
      const branch = branches.find((b) => b.id === log.branchId || b._id === log.branchId);
      const { title, text } = translateNotification(log.title, log.text, language);
      return {
        ...log,
        title,
        text,
        branchName: branch ? branch.name : 'System/Global',
      };
    });

    exportToCSV(dataToExport, 'system_audit_logs', columns);
    toast.success(language === 'ar' ? 'تم التصدير بنجاح' : 'Export completed successfully');
  };

  const handleExportPDF = () => {
    const columns = [
      { key: 'time', label: 'Timestamp', format: (val) => formatDateTimeCustom(val) },
      { key: 'title', label: 'Event' },
      { key: 'text', label: 'Details' },
      { key: 'type', label: 'Category' },
      { key: 'branchName', label: 'Branch' },
    ];

    const dataToExport = filteredLogs.map((log) => {
      const branch = branches.find((b) => b.id === log.branchId || b._id === log.branchId);
      const { title, text } = translateNotification(log.title, log.text, language);
      return {
        ...log,
        title,
        text,
        branchName: branch ? branch.name : 'System/Global',
      };
    });

    exportToPDF({
      title: language === 'ar' ? 'سجلات تدقيق النظام' : 'System Audit Logs',
      subtitle: `Generated: ${formatDateTimeCustom(new Date())}`,
      columns,
      data: dataToExport,
      filename: 'system_audit_logs.pdf',
    });
    toast.success(language === 'ar' ? 'تم تحميل ملف PDF بنجاح' : 'PDF downloaded successfully');
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'order':
        return <FiShoppingBag className="text-blue-500" size={18} />;
      case 'delivery':
        return <FiTruck className="text-yellow-500" size={18} />;
      case 'payment':
        return <FiCreditCard className="text-green-500" size={18} />;
      default:
        return <FiCpu className="text-purple-500" size={18} />;
    }
  };

  const getLogTypeBadge = (type) => {
    const labels = {
      order: language === 'ar' ? 'طلب' : 'Order',
      delivery: language === 'ar' ? 'توصيل' : 'Delivery',
      payment: language === 'ar' ? 'دفع' : 'Payment',
      system: language === 'ar' ? 'نظام' : 'System',
      general: language === 'ar' ? 'عام' : 'General',
    };
    const classes = {
      order: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      delivery: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      payment: 'bg-green-500/10 text-green-500 border-green-500/20',
      system: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      general: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${classes[type] || classes.general}`}>
        {labels[type] || type}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header section */}
      <section className="surface-card overflow-hidden border border-border shadow-xl">
        <div className="dashboard-hero p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-secondary">
                {language === 'ar' ? 'التحليلات والمراقبة' : 'Analytics & Monitoring'}
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-primary">
                {language === 'ar' ? 'سجلات تدقيق النظام' : 'System Audit Logs'}
              </h1>
              <p className="mt-2 text-sm text-secondary">
                {language === 'ar'
                  ? 'عرض وتتبع جميع الأنشطة والعمليات والطلبات عبر جميع فروع المغسلة.'
                  : 'View and track all activities, transactions, and events across all laundry branches.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={fetchLogs}
                disabled={loading}
                className="flex items-center justify-center p-3 rounded-full border border-border bg-surface hover:bg-surface-alt text-primary transition active:scale-95 disabled:opacity-50"
                title={language === 'ar' ? 'تحديث السجلات' : 'Refresh Logs'}
              >
                <FiRefreshCw className={`text-secondary ${loading ? 'animate-spin' : ''}`} size={18} />
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center justify-center gap-2 rounded-3xl border border-border bg-surface hover:bg-surface-alt px-5 py-3 font-semibold text-primary transition"
              >
                <FiDownload size={16} />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                className="flex items-center justify-center gap-2 rounded-3xl bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 font-semibold transition shadow-sm"
              >
                <FiDownload size={16} />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Filter panel */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'بحث في السجلات...' : 'Search logs...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-3xl border border-border bg-surface py-3 pl-12 pr-4 text-primary placeholder-muted outline-none focus:border-purple-500/50 transition"
          />
        </div>

        {/* Category filter */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full appearance-none rounded-3xl border border-border bg-surface px-5 py-3 text-primary outline-none focus:border-purple-500/50 transition cursor-pointer"
          >
            <option value="All">{language === 'ar' ? 'جميع الفئات' : 'All Categories'}</option>
            <option value="order">{language === 'ar' ? 'الطلبات' : 'Orders'}</option>
            <option value="delivery">{language === 'ar' ? 'عمليات التوصيل' : 'Deliveries'}</option>
            <option value="payment">{language === 'ar' ? 'المدفوعات' : 'Payments'}</option>
            <option value="system">{language === 'ar' ? 'النظام' : 'System Logs'}</option>
          </select>
        </div>

        {/* Branch filter */}
        <div className="relative">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="w-full appearance-none rounded-3xl border border-border bg-surface px-5 py-3 text-primary outline-none focus:border-purple-500/50 transition cursor-pointer"
          >
            <option value="All">{language === 'ar' ? 'جميع الفروع' : 'All Branches'}</option>
            <option value="system">{language === 'ar' ? 'النظام / عام' : 'System / Global Only'}</option>
            {branches.map((b) => (
              <option key={b.id || b._id} value={b.id || b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Logs Table */}
      <section className="surface-card border border-border overflow-hidden rounded-3xl bg-surface shadow-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-surface-alt">
              <tr className="border-b border-border">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  {language === 'ar' ? 'الوقت' : 'Timestamp'}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  {language === 'ar' ? 'الفئة' : 'Category'}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  {language === 'ar' ? 'الفرع' : 'Branch'}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  {language === 'ar' ? 'الحدث' : 'Event'}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  {language === 'ar' ? 'التفاصيل' : 'Details'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-secondary">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <FiRefreshCw className="animate-spin text-purple-600" size={24} />
                      <span>{language === 'ar' ? 'جاري تحميل السجلات...' : 'Loading system logs...'}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-muted">
                    {language === 'ar' ? 'لم يتم العثور على سجلات تطابق الفلاتر المحددة.' : 'No audit logs found matching the selected filters.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const branchObj = branches.find(
                    (b) => b.id === log.branchId || b._id === log.branchId
                  );
                  const { title: translatedTitle, text: translatedText } = translateNotification(log.title, log.text, language);
                  return (
                    <tr key={log.id || log._id} className="transition hover:bg-surface-alt/50">
                      <td className="px-6 py-4 text-sm font-medium text-secondary whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          <FiClock className="text-muted" size={14} />
                          {formatDateTimeCustom(log.time)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getLogTypeBadge(log.type)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold whitespace-nowrap">
                        {branchObj ? (
                          <span className="text-purple-600 bg-purple-500/10 px-2.5 py-1 rounded-full text-xs">
                            {branchObj.name}
                          </span>
                        ) : (
                          <span className="text-gray-500 bg-gray-500/10 px-2.5 py-1 rounded-full text-xs">
                            {language === 'ar' ? 'النظام' : 'System'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-primary whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          {getLogIcon(log.type)}
                          {translatedTitle}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary">
                        {translatedText}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AuditLogs;

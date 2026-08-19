import React, { useContext } from 'react';
import { AdminStateContext } from '../context/AdminStateContext';
import { getDateRange, categorizeServiceRevenue } from '../utils/reportAnalytics';
import { useLanguage } from '../context/LanguageContext';
import {
  RevenueTrendChart,
  OrdersTrendChart as ReportOrdersTrendChart,
  ServiceRevenueDistributionChart,
} from './ReportCharts';

export const DailyRevenueGraph = () => {
  const { orders } = useContext(AdminStateContext);
  const { t } = useLanguage();
  const range = getDateRange('week'); // Last 7 Days
  return (
    <RevenueTrendChart
      orders={orders}
      range={range}
      title={t('admin.dailyRevenue') || "Daily Revenue"}
      subtitle={t('admin.last7Days') || "Last 7 Days"}
    />
  );
};

export const MonthlyRevenueChart = () => {
  const { orders } = useContext(AdminStateContext);
  const { t } = useLanguage();
  const range = getDateRange('month'); // Last 30 Days
  return (
    <RevenueTrendChart
      orders={orders}
      range={range}
      title={t('admin.monthlyRevenue') || "Monthly Revenue"}
      subtitle={t('admin.last30Days') || "Last 30 Days"}
    />
  );
};

export const OrdersTrendChart = () => {
  const { orders } = useContext(AdminStateContext);
  const { t } = useLanguage();
  const range = getDateRange('week'); // Last 7 Days
  return (
    <ReportOrdersTrendChart
      orders={orders}
      range={range}
      title={t('admin.ordersTrend') || "Orders Trend"}
      subtitle={t('admin.weeklyVolume') || "Weekly Volume"}
    />
  );
};

export const ServiceWiseRevenuePieChart = () => {
  const { orders } = useContext(AdminStateContext);
  const { t } = useLanguage();
  const serviceRevenue = categorizeServiceRevenue(orders);
  return (
    <ServiceRevenueDistributionChart
      serviceRevenue={serviceRevenue}
      title={t('admin.serviceRevenue') || "Service Revenue"}
      subtitle={t('admin.byCategory') || "By Category"}
    />
  );
};

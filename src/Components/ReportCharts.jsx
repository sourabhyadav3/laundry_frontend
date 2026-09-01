import React from 'react';
import { formatCurrency } from '../utils/exportUtils';

const getTrendData = (orders, range, valueExtractor) => {
  const { start, end } = range || {};
  if (!start || !end || !orders || !orders.length) {
    return { bars: [0, 0, 0, 0, 0, 0, 0], labels: ['-', '-', '-', '-', '-', '-', '-'], values: [0, 0, 0, 0, 0, 0, 0] };
  }

  const startTime = start.getTime();
  const endTime = end.getTime();
  const interval = (endTime - startTime) / 7;

  const buckets = Array(7).fill(0);
  const labels = Array(7).fill('');

  const formatDateLabel = (d) => {
    let timezone = undefined;
    try {
      const stored = localStorage.getItem('spinclean-settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.system?.timezone) {
          timezone = parsed.system.timezone;
        }
      }
    } catch {}
    return d.toLocaleDateString(undefined, { timeZone: timezone, month: 'short', day: 'numeric' });
  };

  for (let i = 0; i < 7; i++) {
    const bucketStart = startTime + i * interval;
    const bucketEnd = startTime + (i + 1) * interval;
    
    // Middle point label
    labels[i] = formatDateLabel(new Date(bucketStart + interval / 2));

    const bucketOrders = orders.filter((o) => {
      const oTime = new Date(o.date).getTime();
      return oTime >= bucketStart && oTime <= bucketEnd;
    });

    buckets[i] = bucketOrders.reduce((sum, o) => sum + valueExtractor(o), 0);
  }

  const maxVal = Math.max(...buckets);
  const bars = buckets.map((v) => {
    if (maxVal === 0) return 0;
    return Math.round((v / maxVal) * 80);
  });

  return { bars, labels, values: buckets };
};

export const BarChartPlaceholder = ({ title, subtitle, bars, labels, values, barClassName = 'chart-bar bg-blue-500/40', formatValue }) => (
  <div className="chart-card surface-card flex h-80 flex-col p-6 shadow-xl rounded-3xl border border-border">
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-secondary">{subtitle}</p>
      <h3 className="mt-2 text-lg font-semibold text-primary">{title}</h3>
    </div>
    <div className="mt-6 flex flex-1 items-end gap-2 min-h-0">
      {bars.map((h, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1 h-full justify-end min-w-0">
          <div className="w-full relative group/bar flex items-end justify-center" style={{ height: `${h}%` }}>
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-slate-800/90 text-white px-2 py-1 text-[10px] font-semibold opacity-0 transition-opacity duration-200 group-hover/bar:opacity-100 whitespace-nowrap z-10 shadow-md">
              {formatValue ? formatValue(values[i]) : values[i]}
            </span>
            <div 
              className={`w-full h-full rounded-t-lg transition-all duration-300 hover:brightness-95 ${barClassName}`} 
            />
          </div>
          <span className="text-[9px] text-secondary truncate w-full text-center mt-1 select-none">{labels[i]}</span>
        </div>
      ))}
    </div>
  </div>
);

export const DonutPlaceholder = ({ title, subtitle, segments }) => {
  const total = segments.reduce((sum, s) => sum + (s.value || 0), 0);
  
  // Calculate percentage and start angle
  let accumulatedPct = 0;
  const segmentsWithPct = segments.map(s => {
    const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
    const start = accumulatedPct;
    accumulatedPct += pct;
    return { ...s, pct, start };
  });

  return (
    <div className="chart-card surface-card flex h-80 flex-col p-6 shadow-xl rounded-3xl border border-border">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">{subtitle}</p>
        <h3 className="mt-2 text-lg font-semibold text-primary">{title}</h3>
      </div>
      <div className="mt-6 flex flex-1 items-center gap-6 min-h-0">
        <div
          className="relative h-28 w-28 shrink-0 rounded-full shadow-inner flex items-center justify-center bg-slate-100"
          style={{
            background: total > 0 ? `conic-gradient(${segmentsWithPct
              .map((s) => `${s.color} ${s.start}% ${s.start + s.pct}%`)
              .join(', ')})` : '#e2e8f0',
          }}
        >
          <div className="absolute inset-4 rounded-full bg-surface" />
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-xs text-secondary font-medium">Total</span>
            <span className="text-sm font-bold text-primary">{total}</span>
          </div>
        </div>
        <ul className="space-y-2 text-xs flex-1 overflow-y-auto max-h-40 scrollbar-thin">
          {segmentsWithPct.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-primary font-medium">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="truncate max-w-[80px] text-secondary">{s.label}</span>
              <span className="text-primary ml-auto font-semibold">{s.pct}% ({s.value})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export const RevenueTrendChart = ({ orders, range, title = "Revenue Trend", subtitle = "Analytics" }) => {
  const { bars, labels, values } = getTrendData(orders, range, (o) => o.totalAmount || o.amount || 0);
  return (
    <BarChartPlaceholder
      title={title}
      subtitle={subtitle}
      bars={bars}
      labels={labels}
      values={values}
      barClassName="chart-bar chart-bar-alt bg-emerald-500/45"
      formatValue={(v) => formatCurrency(v)}
    />
  );
};

export const OrdersTrendChart = ({ orders, range, title = "Orders Trend", subtitle = "Analytics" }) => {
  const { bars, labels, values } = getTrendData(orders, range, () => 1);
  return (
    <BarChartPlaceholder
      title={title}
      subtitle={subtitle}
      bars={bars}
      labels={labels}
      values={values}
      barClassName="chart-bar chart-bar-violet bg-indigo-500/45"
      formatValue={(v) => `${v} orders`}
    />
  );
};

export const ServiceRevenueDistributionChart = ({ serviceRevenue, title = "Service Distribution", subtitle = "By category revenue" }) => {
  const SERVICE_COLORS = {
    'Normal Ironing': '#3b82f6',
    'Wash & Iron': '#10b981',
    'Express Ironing': '#f59e0b',
    'Express Wash & Iron': '#ec4899',
    'Iron Only': '#3b82f6',
    'Dry Cleaning': '#8b5cf6',
  };

  const DEFAULT_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#6366f1'];

  let segments = [];
  if (Array.isArray(serviceRevenue)) {
    segments = serviceRevenue.map((item, idx) => ({
      label: item.name || item.service || item.label || `Service ${idx + 1}`,
      value: Math.round(item.revenue !== undefined ? item.revenue : (item.value || item.count || 0)),
      color: SERVICE_COLORS[item.name || item.service] || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length]
    }));
  } else if (typeof serviceRevenue === 'object' && serviceRevenue !== null) {
    const keys = Object.keys(serviceRevenue);
    segments = keys.map((key, idx) => {
      let label = key;
      if (key === 'washing') label = 'Wash & Iron';
      if (key === 'ironing') label = 'Normal Ironing';
      if (key === 'dryCleaning') label = 'Dry Clean';
      if (key === 'premium') label = 'Express Wash & Iron';
      return {
        label,
        value: Math.round(serviceRevenue[key] || 0),
        color: SERVICE_COLORS[label] || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length]
      };
    });
  }

  if (!segments.length) {
    segments = [
      { label: 'Normal Ironing', value: 0, color: '#3b82f6' },
      { label: 'Wash & Iron', value: 0, color: '#10b981' },
      { label: 'Express Ironing', value: 0, color: '#f59e0b' },
      { label: 'Express Wash & Iron', value: 0, color: '#ec4899' },
    ];
  }

  return (
    <DonutPlaceholder
      title={title}
      subtitle={subtitle}
      segments={segments}
    />
  );
};

export const PaymentMethodDistributionChart = ({ breakdown, title = "Payment Distribution", subtitle = "Collections" }) => {
  const METHOD_COLORS = {
    Cash: '#22c55e',      // Green
    'K-Net': '#3b82f6',   // Blue
    Card: '#3b82f6',      // Blue
    Bukey: '#f59e0b',     // Amber / Gold
    Credit: '#ef4444',    // Red / Rose
    Link: '#06b6d4',      // Cyan
    Wamd: '#8b5cf6',      // Purple
  };

  const DEFAULT_PALETTE = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];

  let segments = [];
  if (Array.isArray(breakdown)) {
    segments = breakdown.map((item, idx) => ({
      label: item.method || item.name || item.label || `Method ${idx + 1}`,
      value: Math.round(item.amount !== undefined ? item.amount : (item.value || item.count || 0)),
      color: METHOD_COLORS[item.method || item.name] || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length]
    }));
  } else if (typeof breakdown === 'object' && breakdown !== null) {
    const keys = Object.keys(breakdown);
    segments = keys.map((key, idx) => {
      let label = key;
      if (key === 'Card') label = 'K-Net';
      return {
        label,
        value: Math.round(breakdown[key] || 0),
        color: METHOD_COLORS[label] || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length]
      };
    });
  }

  if (!segments.length) {
    segments = [
      { label: 'Cash', value: 0, color: '#22c55e' },
      { label: 'K-Net', value: 0, color: '#3b82f6' },
      { label: 'Bukey', value: 0, color: '#f59e0b' },
      { label: 'Credit', value: 0, color: '#ef4444' },
    ];
  }

  return (
    <DonutPlaceholder
      title={title}
      subtitle={subtitle}
      segments={segments}
    />
  );
};

export const OrderStatusDistributionChart = ({ breakdown, title = "Order Distribution", subtitle = "Operations" }) => {
  const STATUS_COLORS = {
    Waiting: '#64748b',
    'Preparing in shop': '#8b5cf6',
    'Preparing in workshop': '#6366f1',
    Hold: '#f59e0b',
    Ready: '#10b981',
    'Ready for delivery': '#14b8a6',
    'Ready for shop': '#84cc16',
    'With Driver': '#3b82f6',
    Delivered: '#059669',
    Return: '#f97316',
    Store: '#475569',
  };

  const DEFAULT_PALETTE = ['#64748b', '#8b5cf6', '#6366f1', '#f59e0b', '#10b981', '#14b8a6', '#84cc16', '#3b82f6', '#059669', '#f97316', '#475569'];

  const data = breakdown || {};
  let segments = [];

  if (Array.isArray(data)) {
    segments = data
      .filter((item) => (item.count || item.value || 0) > 0)
      .map((item, idx) => ({
        label: item.status || item.name || item.label || `Status ${idx + 1}`,
        value: Number(item.count || item.value || 0),
        color: STATUS_COLORS[item.status || item.name] || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length],
      }));
  } else if (typeof data === 'object' && data !== null) {
    segments = Object.entries(data)
      .filter(([_, count]) => Number(count) > 0)
      .map(([status, count], idx) => ({
        label: status,
        value: Number(count),
        color: STATUS_COLORS[status] || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length],
      }));
  }

  if (!segments.length) {
    segments = [
      { label: 'Waiting', value: 0, color: '#64748b' },
      { label: 'Preparing', value: 0, color: '#6366f1' },
      { label: 'Ready', value: 0, color: '#10b981' },
      { label: 'Delivered', value: 0, color: '#059669' },
    ];
  }

  return (
    <DonutPlaceholder
      title={title}
      subtitle={subtitle}
      segments={segments}
    />
  );
};

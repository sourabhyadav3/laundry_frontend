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
  const { washing = 0, ironing = 0, dryCleaning = 0, premium = 0 } = serviceRevenue || {};
  return (
    <DonutPlaceholder
      title={title}
      subtitle={subtitle}
      segments={[
        { label: 'Washing', value: Math.round(washing), color: '#0ea5e9' },
        { label: 'Dry Clean', value: Math.round(dryCleaning), color: '#8b5cf6' },
        { label: 'Ironing', value: Math.round(ironing), color: '#f59e0b' },
        { label: 'Premium', value: Math.round(premium), color: '#10b981' },
      ]}
    />
  );
};

export const PaymentMethodDistributionChart = ({ breakdown, title = "Payment Distribution", subtitle = "Collections" }) => {
  const { Cash = 0, Card = 0, Link = 0, Wamd = 0 } = breakdown || {};
  return (
    <DonutPlaceholder
      title={title}
      subtitle={subtitle}
      segments={[
        { label: 'Cash', value: Math.round(Cash), color: '#22c55e' },
        { label: 'Card', value: Math.round(Card), color: '#a855f7' },
        { label: 'Link', value: Math.round(Link), color: '#0ea5e9' },
        { label: 'Wamd', value: Math.round(Wamd), color: '#f59e0b' },
      ]}
    />
  );
};

export const OrderStatusDistributionChart = ({ breakdown, title = "Order Distribution", subtitle = "Operations" }) => {
  const data = breakdown || {};
  const delivered = data.Delivered || 0;
  const ready =
    (data.Ready || 0) +
    (data['Ready for delivery'] || 0) +
    (data['Ready for shop'] || 0);
  const waiting = (data.Waiting || 0) + (data.Received || 0);
  const preparing =
    (data['Preparing in shop'] || 0) +
    (data['Preparing in workshop'] || 0) +
    (data.Washing || 0) +
    (data.Drying || 0) +
    (data.Ironing || 0) +
    (data['In Workshop'] || 0) +
    (data['In Shop'] || 0);
  const other = Object.entries(data).reduce((sum, [key, val]) => {
    if (['Delivered', 'Ready', 'Ready for delivery', 'Ready for shop', 'Waiting', 'Received', 'Preparing in shop', 'Preparing in workshop', 'Washing', 'Drying', 'Ironing', 'In Workshop', 'In Shop'].includes(key)) {
      return sum;
    }
    return sum + (val || 0);
  }, 0);

  return (
    <DonutPlaceholder
      title={title}
      subtitle={subtitle}
      segments={[
        { label: 'Delivered', value: delivered, color: '#10b981' },
        { label: 'Preparing', value: preparing, color: '#0ea5e9' },
        { label: 'Ready', value: ready, color: '#f59e0b' },
        { label: 'Waiting', value: waiting, color: '#64748b' },
        ...(other > 0 ? [{ label: 'Other', value: other, color: '#8b5cf6' }] : []),
      ]}
    />
  );
};

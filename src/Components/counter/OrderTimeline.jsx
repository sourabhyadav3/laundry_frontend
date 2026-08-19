import React from 'react';
import { ORDER_STATUSES, normalizeOrderStatus, getOrderStatusStyle } from '../../constants/statusStyles';

const OrderTimeline = ({ currentStatus, timeline = [] }) => {
  const normalizedStatus = normalizeOrderStatus(currentStatus);
  const currentIndex = ORDER_STATUSES.indexOf(normalizedStatus);

  // Parse or reverse the timeline for descending layout (most recent at top)
  const reversedTimeline = timeline && timeline.length > 0 ? [...timeline].reverse() : [];

  return (
    <div className="space-y-6">
      {/* Horizontal workflow steps */}
      <div className="flex flex-wrap items-center gap-2">
        {ORDER_STATUSES.map((status, index) => {
          const isComplete = index <= currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <React.Fragment key={status}>
              <div
                className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold ${
                  isCurrent
                    ? getOrderStatusStyle(status)
                    : isComplete
                    ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600'
                    : 'border-border bg-surface-alt text-secondary'
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] ${
                    isComplete ? 'bg-blue-500 text-white' : 'bg-surface text-secondary'
                  }`}
                >
                  {index + 1}
                </span>
                {status}
              </div>
              {index < ORDER_STATUSES.length - 1 && (
                <span className={`hidden sm:inline text-secondary ${isComplete ? 'text-blue-500' : ''}`}>→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Vertical detailed timeline feed */}
      <div className="relative mt-8">
        <div className="absolute left-5 top-1 bottom-1 w-0.5 bg-border" />
        <div className="space-y-6">
          {reversedTimeline.length > 0 ? (
            reversedTimeline.map((entry, idx) => {
              const isLatest = idx === 0;
              return (
                <div key={idx} className="relative flex gap-4 pl-12">
                  <span
                    className={`absolute left-2.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold ${
                      isLatest
                        ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                        : 'border-blue-500 bg-blue-500 text-white'
                    }`}
                  >
                    ✓
                  </span>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`font-semibold text-sm ${isLatest ? 'text-emerald-500' : 'text-primary'}`}>
                        {entry.status}
                      </p>
                      {isLatest && (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Latest Stage
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-secondary font-medium">
                      {entry.date} · {entry.time}
                    </p>
                    <p className="text-xs text-muted">
                      Updated by: <span className="font-semibold text-secondary">{entry.updatedBy}</span>
                    </p>
                    {entry.comment && (
                      <p className="text-xs text-amber-600 mt-1">Hold note: {entry.comment}</p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            // Fallback list of stages if timeline array doesn't exist
            ORDER_STATUSES.map((status, index) => {
              const isComplete = index <= currentIndex;
              const isCurrent = index === currentIndex;
              return (
                <div key={status} className="relative flex gap-4 pl-12">
                  <span
                    className={`absolute left-2.5 top-1 h-3.5 w-3.5 rounded-full border-2 ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-500'
                        : isComplete
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-border bg-surface'
                    }`}
                  />
                  <div>
                    <p className={`font-semibold text-sm ${isCurrent ? 'text-emerald-500' : 'text-primary'}`}>{status}</p>
                    <p className="text-xs text-secondary mt-0.5">
                      {isComplete ? (isCurrent ? 'Current stage' : 'Completed') : 'Pending'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderTimeline;

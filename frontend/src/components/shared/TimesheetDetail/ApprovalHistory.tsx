import React, { useEffect, useMemo, useState } from 'react';
import { TimesheetService } from '../../../services/timesheets';

type ApprovalEvent = {
  actor?: string | { id?: number; name?: string; role?: string };
  action?: string;
  comment?: string | null;
  timestamp?: string;
};

export interface ApprovalHistoryProps {
  timesheetId: number;
}

export const ApprovalHistory: React.FC<ApprovalHistoryProps> = ({ timesheetId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<readonly ApprovalEvent[]>([]);

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setError(null);
    TimesheetService.getApprovalHistory(timesheetId)
      .then((list) => {
        if (canceled) return;
        setEvents(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (canceled) return;
        setError(err instanceof Error ? err.message : 'Failed to load approval history');
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [timesheetId]);

  const items = useMemo(() => {
    return events.map((e, idx) => {
      const actor = typeof e.actor === 'string' ? e.actor : e.actor?.name || 'Unknown';
      const action = e.action || 'UNKNOWN';
      const date = e.timestamp ? new Date(e.timestamp) : null;
      const stamp = date ? date.toLocaleString() : '';
      return { id: idx, actor, action, stamp, comment: e.comment ?? '' };
    });
  }, [events]);

  return (
    <section aria-label="Approval History" data-testid="approval-history">
      <h3 className="text-base font-semibold">Approval History</h3>
      {loading && (
        <p role="status" aria-live="polite" data-testid="history-loading">Loading approval history…</p>
      )}
      {error && !loading && (
        <p role="alert" className="text-destructive" data-testid="history-error">{error}</p>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="text-muted-foreground" data-testid="history-empty">No approval events found.</p>
      )}
      {!loading && !error && items.length > 0 && (
        <ul className="mt-2 space-y-2" data-testid="history-list">
          {items.map((item) => (
            <li key={item.id} className="rounded border p-2" data-testid={`history-item-${item.id}`}>
              <div className="flex items-center justify-between">
                <strong data-testid="history-actor">{item.actor}</strong>
                <span className="text-xs text-muted-foreground" data-testid="history-timestamp">{item.stamp}</span>
              </div>
              <div className="text-sm" data-testid="history-action">{item.action}</div>
              {item.comment && <div className="text-xs text-muted-foreground" data-testid="history-comment">{item.comment}</div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default ApprovalHistory;


import { useState } from 'react';
import { useAuditLogsQuery } from '../store/api';

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useAuditLogsQuery({ page, limit: 40 });

  return (
    <div>
      <h1 className="font-display text-3xl text-forest">Audit logs</h1>
      <p className="mt-1 text-sm text-muted">Recent admin actions across the system.</p>

      {isLoading && <p className="mt-6">Loading…</p>}
      {isError && (
        <p className="mt-6 text-spice-red">
          Could not load audit logs (requires admins:manage permission).
        </p>
      )}
      {!isLoading && !isError && !(data?.items ?? []).length && (
        <p className="mt-6 text-muted">No audit entries yet.</p>
      )}

      <div className="card mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-cream text-muted">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">Actor</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((log) => (
              <tr key={log.id} className="border-t border-border align-top">
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-medium text-forest">{log.action}</td>
                <td className="px-4 py-3">
                  {log.resourceType}
                  {log.resourceId ? ` · ${log.resourceId}` : ''}
                  {log.meta != null && (
                    <pre className="mt-1 max-w-md overflow-x-auto text-xs text-muted">
                      {JSON.stringify(log.meta)}
                    </pre>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{log.actorId ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            className="rounded-full border border-border px-3 py-1 disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span>
            Page {data.page} of {data.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= data.totalPages}
            className="rounded-full border border-border px-3 py-1 disabled:opacity-40"
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

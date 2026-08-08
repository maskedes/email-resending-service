interface Email {
  id: string;
  from_email: string;
  to_email: string;
  subject: string;
  status: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  sent: 'bg-success-soft text-success',
  delivered: 'bg-success-soft text-success',
  failed: 'bg-danger-soft text-danger',
  queued: 'bg-warning-soft text-warning',
};

export default function EmailTable({ emails }: { emails: Email[] }) {
  return (
    <section className="border border-canvas-border bg-canvas-raised p-6">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" className="text-xl shrink-0" aria-hidden="true">
          <path d="M0 0h24v24H0z" fill="none" />
          <path fill="currentColor" d="M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h16q.825 0 1.413.588T22 6v12q0 .825-.587 1.413T20 20zm8-7l8-5V6l-8 5l-8-5v2z" />
        </svg>
        Recent Emails
      </h2>

      {emails.length === 0 ? (
        <p className="py-8 text-center text-slate-500">No emails sent yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-canvas-border text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {emails.slice(0, 20).map((e) => (
                <tr key={e.id} className="border-b border-canvas-border/60 hover:bg-brand/5">
                  <td className="px-4 py-3 text-slate-300">{e.from_email}</td>
                  <td className="px-4 py-3 text-slate-300">{e.to_email}</td>
                  <td className="px-4 py-3 text-white">{e.subject}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold ${
                        STATUS_STYLES[e.status] || 'bg-slate-500/15 text-slate-400'
                      }`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {new Date(e.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

import React, { useState } from 'react';

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// Credential type → D5 field label + domain section
const CRED_META = {
  cpr:              { label: 'CPR / First Aid',          domain: 'D5', color: '#0369a1', bg: '#e0f2fe' },
  training:         { label: 'Annual Training Hours',    domain: 'D5', color: '#7c3aed', bg: '#ede9fe' },
  tb:               { label: 'TB Screening',             domain: 'D5', color: '#0f766e', bg: '#ccfbf1' },
  physical:         { label: 'Physical Exam',            domain: 'D5', color: '#b45309', bg: '#fef3c7' },
  mandatedReporter: { label: 'Mandated Reporter',        domain: 'D5', color: '#be185d', bg: '#fce7f3' },
  bgCheck:          { label: 'Background Check',         domain: 'D3', color: '#1d4ed8', bg: '#dbeafe' },
  orientation:      { label: 'New Hire Orientation',     domain: 'D5', color: '#15803d', bg: '#dcfce7' },
};

function credMeta(type) {
  return CRED_META[type] || { label: type, domain: 'D5', color: '#64748b', bg: '#f1f5f9' };
}

// ── Single pending item card ──────────────────────────────────────────────────
function PendingCard({ item, onApprove, onReject }) {
  const [expanded, setExpanded] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const meta = credMeta(item.credentialType);

  const fields = item.fields || {};
  const fieldEntries = Object.entries(fields).filter(([, v]) => v !== '' && v != null);

  function handleReject() {
    if (showRejectInput) {
      onReject(item.id, rejectNote);
    } else {
      setShowRejectInput(true);
      setExpanded(true);
    }
  }

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 10,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      {/* Card header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
          cursor: 'pointer', userSelect: 'none',
        }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Credential type badge */}
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
          background: meta.bg, color: meta.color, whiteSpace: 'nowrap',
          letterSpacing: '0.02em',
        }}>
          {meta.domain} · {meta.label}
        </span>

        {/* Staff name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b', lineHeight: 1.2 }}>
            {item.staffName || 'Unknown staff member'}
          </div>
          {item.staffRole && (
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>{item.staffRole}</div>
          )}
        </div>

        {/* Submitted time */}
        <div style={{ fontSize: 11.5, color: '#94a3b8', whiteSpace: 'nowrap' }}>
          {timeAgo(item.submittedAt)}
        </div>

        {/* Chevron */}
        <span style={{
          fontSize: 11, color: '#94a3b8', transition: 'transform 0.15s',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>▼</span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 14px 14px' }}>

          {/* Submitted fields */}
          {fieldEntries.length > 0 ? (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Submitted data
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                {fieldEntries.map(([key, val]) => (
                  <div key={key} style={{
                    background: '#f8fafc', borderRadius: 6, padding: '8px 10px',
                    border: '1px solid #e2e8f0',
                  }}>
                    <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600, textTransform: 'capitalize', marginBottom: 2 }}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                    </div>
                    <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
                      {/* Show dates nicely */}
                      {/date|expiry|expiration/i.test(key) ? formatDate(val) : String(val)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginBottom: 14 }}>
              No field data submitted.
            </div>
          )}

          {/* Staff note (if any) */}
          {item.staffNote && (
            <div style={{
              background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6,
              padding: '8px 10px', marginBottom: 14, fontSize: 12.5, color: '#78350f',
            }}>
              <span style={{ fontWeight: 700 }}>Staff note: </span>{item.staffNote}
            </div>
          )}

          {/* Reject reason input */}
          {showRejectInput && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
                Reason for rejection (optional — sent to staff)
              </label>
              <textarea
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="e.g. Certificate date appears incorrect — please re-upload with a legible copy."
                rows={2}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: '1px solid #fca5a5', borderRadius: 6, padding: '7px 10px',
                  fontSize: 12.5, color: '#1e293b', resize: 'vertical',
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={e => { e.stopPropagation(); onApprove(item.id); }}
              style={{
                background: '#15803d', color: '#fff', border: 'none',
                borderRadius: 6, padding: '7px 16px', fontSize: 12.5, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              ✓ Approve
            </button>
            <button
              onClick={e => { e.stopPropagation(); handleReject(); }}
              style={{
                background: showRejectInput ? '#b91c1c' : '#fff',
                color: showRejectInput ? '#fff' : '#b91c1c',
                border: '1px solid #fca5a5',
                borderRadius: 6, padding: '7px 16px', fontSize: 12.5, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {showRejectInput ? '✗ Confirm rejection' : '✗ Reject'}
            </button>
            {showRejectInput && (
              <button
                onClick={e => { e.stopPropagation(); setShowRejectInput(false); setRejectNote(''); }}
                style={{
                  background: 'none', color: '#94a3b8', border: '1px solid #e2e8f0',
                  borderRadius: 6, padding: '7px 12px', fontSize: 12.5, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Staff roster row ──────────────────────────────────────────────────────────
function StaffRow({ member, isOdd }) {
  const statusColor = member.status === 'Active' ? '#15803d'
    : member.status === 'On leave' ? '#b45309' : '#64748b';
  const statusBg   = member.status === 'Active' ? '#dcfce7'
    : member.status === 'On leave' ? '#fef3c7' : '#f1f5f9';

  return (
    <tr style={{ background: isOdd ? '#f8fafc' : '#fff' }}>
      <td style={tdStyle}>
        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>{member.name}</div>
        <div style={{ fontSize: 11.5, color: '#64748b' }}>{member.role}</div>
      </td>
      <td style={tdStyle}>
        <CredPill val={member.cpr} type="cpr" />
      </td>
      <td style={tdStyle}>
        <CredPill val={member.bg} type="bgCheck" />
      </td>
      <td style={tdStyle}>
        <TrainingBar val={member.training} />
      </td>
      <td style={tdStyle}>
        <CredPill val={member.mandated} type="mandatedReporter" />
      </td>
      <td style={tdStyle}>
        <CredPill val={member.physical} type="physical" />
      </td>
      <td style={{ ...tdStyle, textAlign: 'center' }}>
        <span style={{
          display: 'inline-block', fontSize: 11, fontWeight: 700,
          padding: '2px 8px', borderRadius: 20, background: statusBg, color: statusColor,
        }}>{member.status || 'Active'}</span>
      </td>
    </tr>
  );
}

function CredPill({ val }) {
  const v = (val || '').toLowerCase();
  const isYes    = v === 'yes' || v === 'current' || v === 'valid' || v === 'complete' || v === 'completed';
  const isNo     = v === 'no' || v === 'expired' || v === 'missing' || v === 'overdue';
  const isPending = v === 'pending' || v === 'in progress';

  const color = isYes ? '#15803d' : isNo ? '#b91c1c' : isPending ? '#b45309' : '#64748b';
  const bg    = isYes ? '#dcfce7' : isNo ? '#fee2e2' : isPending ? '#fef3c7' : '#f1f5f9';
  const label = isYes ? '✓' : isNo ? '✗' : isPending ? '…' : val || '—';

  return (
    <span style={{
      display: 'inline-block', fontSize: 11.5, fontWeight: 700,
      padding: '2px 8px', borderRadius: 12, background: bg, color, minWidth: 26, textAlign: 'center',
    }}>
      {label}
    </span>
  );
}

function TrainingBar({ val }) {
  const num = parseFloat(val) || 0;
  const pct = Math.min((num / 20) * 100, 100); // assume 20hrs target for bar
  const color = pct >= 100 ? '#15803d' : pct >= 50 ? '#b45309' : '#b91c1c';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: '#e2e8f0', borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11.5, color: '#64748b', whiteSpace: 'nowrap' }}>{num}h</span>
    </div>
  );
}

const tdStyle = {
  padding: '10px 12px', fontSize: 13, color: '#334155',
  borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle',
};

const thStyle = {
  padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#94a3b8',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  borderBottom: '2px solid #e2e8f0', background: '#f8fafc',
  textAlign: 'left', whiteSpace: 'nowrap',
};

// ── Main StaffTab ─────────────────────────────────────────────────────────────
export default function StaffTab({ center, pendingUpdates = [], onApproveUpdate, onRejectUpdate }) {
  const [activeSection, setActiveSection] = useState(
    pendingUpdates.length > 0 ? 'pending' : 'roster'
  );
  const [toastMsg, setToastMsg] = useState(null);

  const staff = center._staff || center.staff || [];

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  function handleApprove(id) {
    onApproveUpdate && onApproveUpdate(id);
    showToast('Credential approved and applied to compliance record.');
  }

  function handleReject(id, note) {
    onRejectUpdate && onRejectUpdate(id, note);
    showToast('Submission rejected' + (note ? ' — reason sent to staff.' : '.'));
  }

  // Group pending by staff name
  const pendingByStaff = {};
  pendingUpdates.forEach(item => {
    const key = item.staffName || 'Unknown';
    if (!pendingByStaff[key]) pendingByStaff[key] = [];
    pendingByStaff[key].push(item);
  });

  const sortedPendingGroups = Object.entries(pendingByStaff).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  const typeBreakdown = {};
  pendingUpdates.forEach(p => {
    typeBreakdown[p.credentialType] = (typeBreakdown[p.credentialType] || 0) + 1;
  });

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1040, margin: '0 auto' }}>

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: '#1e293b', color: '#fff', borderRadius: 8,
          padding: '10px 18px', fontSize: 13.5, fontWeight: 500,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: '#4ade80' }}>✓</span> {toastMsg}
        </div>
      )}

      {/* Section switcher */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[
          { id: 'pending', label: 'Pending Approvals' },
          { id: 'roster',  label: 'Staff Roster' },
        ].map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              padding: '7px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600,
              border: activeSection === s.id ? '1.5px solid #334155' : '1.5px solid #e2e8f0',
              background: activeSection === s.id ? '#1e293b' : '#fff',
              color: activeSection === s.id ? '#fff' : '#64748b',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {s.label}
            {s.id === 'pending' && pendingUpdates.length > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: '#b45309', color: '#fff', fontSize: 10, fontWeight: 700,
                minWidth: 18, height: 18, borderRadius: 9, padding: '0 4px',
              }}>
                {pendingUpdates.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── PENDING APPROVALS ─────────────────────────────────────────────── */}
      {activeSection === 'pending' && (
        <>
          {pendingUpdates.length === 0 ? (
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
              padding: '28px 24px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#15803d', marginBottom: 4 }}>
                No pending approvals
              </div>
              <div style={{ fontSize: 13, color: '#166534' }}>
                All staff credential submissions have been reviewed.
              </div>
            </div>
          ) : (
            <>
              {/* Summary banner */}
              <div style={{
                background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
                padding: '14px 18px', marginBottom: 20,
                display: 'flex', alignItems: 'flex-start', gap: 14,
                flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#78350f', marginBottom: 4 }}>
                    {pendingUpdates.length} credential submission{pendingUpdates.length !== 1 ? 's' : ''} awaiting your review
                  </div>
                  <div style={{ fontSize: 12.5, color: '#92400e' }}>
                    Submissions won't affect the compliance score until you approve them.
                    Review each item carefully before approving.
                  </div>
                </div>
                {/* Type breakdown pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(typeBreakdown).map(([type, count]) => {
                    const m = credMeta(type);
                    return (
                      <span key={type} style={{
                        fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                        background: m.bg, color: m.color,
                      }}>
                        {count} × {m.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Grouped by staff */}
              {sortedPendingGroups.map(([staffName, items]) => (
                <div key={staffName} style={{ marginBottom: 24 }}>
                  {/* Staff name header */}
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: '#64748b',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    padding: '0 2px', marginBottom: 8,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span>{staffName}</span>
                    {items[0]?.staffRole && (
                      <span style={{ fontWeight: 400, textTransform: 'none', color: '#94a3b8', letterSpacing: 0 }}>
                        · {items[0].staffRole}
                      </span>
                    )}
                    <span style={{
                      background: '#f1f5f9', color: '#475569', fontSize: 11, fontWeight: 600,
                      padding: '1px 8px', borderRadius: 10,
                    }}>
                      {items.length} pending
                    </span>
                  </div>

                  {items.map(item => (
                    <PendingCard
                      key={item.id}
                      item={item}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  ))}
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* ── STAFF ROSTER ──────────────────────────────────────────────────── */}
      {activeSection === 'roster' && (
        <>
          {staff.length === 0 ? (
            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
              padding: '28px 24px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                No staff data available
              </div>
              <div style={{ fontSize: 13, color: '#cbd5e1' }}>
                Staff records will appear here once populated via 1Core.
              </div>
            </div>
          ) : (
            <>
              {/* KPI strip */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 10, marginBottom: 20,
              }}>
                {[
                  {
                    label: 'Total staff',
                    value: staff.length,
                    color: '#1e293b', bg: '#f8fafc',
                  },
                  {
                    label: 'CPR current',
                    value: staff.filter(s => /yes|current|valid/i.test(s.cpr || '')).length,
                    total: staff.length,
                    color: '#15803d', bg: '#f0fdf4',
                  },
                  {
                    label: 'BG checks clear',
                    value: staff.filter(s => /yes|clear|complete/i.test(s.bg || '')).length,
                    total: staff.length,
                    color: '#1d4ed8', bg: '#eff6ff',
                  },
                  {
                    label: 'Mandated reporter',
                    value: staff.filter(s => /yes|complete/i.test(s.mandated || '')).length,
                    total: staff.length,
                    color: '#be185d', bg: '#fdf2f8',
                  },
                ].map(k => (
                  <div key={k.label} style={{
                    background: k.bg, border: '1px solid #e2e8f0', borderRadius: 8,
                    padding: '12px 14px',
                  }}>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 4 }}>{k.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: k.color, lineHeight: 1 }}>
                      {k.value}
                      {k.total !== undefined && (
                        <span style={{ fontSize: 13, fontWeight: 400, color: '#94a3b8' }}>/{k.total}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
                overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Staff member</th>
                        <th style={thStyle}>CPR / First Aid</th>
                        <th style={thStyle}>Background check</th>
                        <th style={{ ...thStyle, minWidth: 120 }}>Training hrs</th>
                        <th style={thStyle}>Mandated reporter</th>
                        <th style={thStyle}>Physical exam</th>
                        <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((member, i) => (
                        <StaffRow key={member.name || i} member={member} isOdd={i % 2 === 1} />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer note */}
                <div style={{
                  padding: '8px 14px', background: '#f8fafc',
                  borderTop: '1px solid #e2e8f0', fontSize: 11.5, color: '#94a3b8',
                }}>
                  Credential data sourced from 1Core staff records · Pending staff submissions shown in Pending Approvals tab
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

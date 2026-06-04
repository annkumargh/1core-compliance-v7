import React, { useState, useEffect, useCallback } from 'react';
import { getChangeLog, getFieldAsOf } from '../../changeLog';

const DOMAINS = ['All','D1','D2','D3','D4','D5','D6','D7'];
const DOMAIN_LABELS = {
  D1:'Licensing & Admin', D2:'Physical Environment', D3:'Personnel',
  D4:'Ratios & Supervision', D5:'Staff Health & Training',
  D6:"Children's Records & Health", D7:'Emergency Preparedness',
};
const ROLES = ['All','Center Director','Business Owner','Inspector','Super Admin','Staff'];

function fmt(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
    + ' ' + d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', hour12:true });
}

function fmtDate(isoStr) {
  if (!isoStr) return '';
  return isoStr.slice(0,10);
}

function ValueChip({ val, kind }) {
  if (val === '' || val === null || val === undefined)
    return <span style={{ color:'#94a3b8', fontStyle:'italic', fontSize:12 }}>empty</span>;
  const color = kind === 'old'
    ? { bg:'#fef2f2', border:'#fca5a5', text:'#991b1b' }
    : { bg:'#f0fdf4', border:'#86efac', text:'#166534' };
  return (
    <span style={{
      display:'inline-block', padding:'1px 8px', borderRadius:10,
      fontSize:12, fontWeight:500,
      background:color.bg, border:`1px solid ${color.border}`, color:color.text,
      maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
    }} title={val}>
      {val}
    </span>
  );
}

function DomainBadge({ domain }) {
  const colors = {
    D1:'#dbeafe:#1e40af', D2:'#fef9c3:#92400e', D3:'#f3e8ff:#6b21a8',
    D4:'#dcfce7:#166534', D5:'#ffe4e6:#9f1239', D6:'#e0f2fe:#075985', D7:'#fce7f3:#9d174d',
  };
  const [bg, text] = (colors[domain] || '#f1f5f9:#475569').split(':');
  return (
    <span style={{
      display:'inline-block', padding:'1px 7px', borderRadius:8,
      fontSize:11, fontWeight:700, background:bg, color:text,
    }}>
      {domain}
    </span>
  );
}

// ─── "As of Date" panel ──────────────────────────────────────────────────────

function AsOfPanel({ centerId }) {
  const [date, setDate]       = useState('');
  const [field, setField]     = useState('');
  const [result, setResult]   = useState(null);
  const [queried, setQueried] = useState(false);

  const query = () => {
    if (!date || !field.trim()) return;
    const val = getFieldAsOf(centerId, field.trim(), date);
    setResult(val);
    setQueried(true);
  };

  return (
    <div style={{
      background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10,
      padding:'16px 20px', marginBottom:20,
    }}>
      <div style={{ fontWeight:700, fontSize:13, color:'#1e293b', marginBottom:10 }}>
        🔍 Field value as of a specific date
      </div>
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div>
          <label style={{ display:'block', fontSize:11, color:'#64748b', marginBottom:3 }}>Field key</label>
          <input
            value={field}
            onChange={e => { setField(e.target.value); setQueried(false); }}
            placeholder="e.g. licenseExpiry"
            style={{
              padding:'6px 10px', borderRadius:6, border:'1px solid #cbd5e1',
              fontSize:13, width:180, fontFamily:'inherit',
            }}
          />
        </div>
        <div>
          <label style={{ display:'block', fontSize:11, color:'#64748b', marginBottom:3 }}>As of date</label>
          <input
            type="date"
            value={date}
            max={new Date().toISOString().slice(0,10)}
            onChange={e => { setDate(e.target.value); setQueried(false); }}
            style={{
              padding:'6px 10px', borderRadius:6, border:'1px solid #cbd5e1',
              fontSize:13, fontFamily:'inherit',
            }}
          />
        </div>
        <button
          onClick={query}
          disabled={!date || !field.trim()}
          style={{
            padding:'7px 16px', borderRadius:6, fontSize:13, fontWeight:600,
            background: (!date || !field.trim()) ? '#e2e8f0' : '#1e3a5f',
            color: (!date || !field.trim()) ? '#94a3b8' : '#fff',
            border:'none', cursor: (!date || !field.trim()) ? 'default' : 'pointer',
            fontFamily:'inherit',
          }}
        >
          Look up
        </button>
      </div>
      {queried && (
        <div style={{ marginTop:12, fontSize:13 }}>
          {result === null
            ? <span style={{ color:'#94a3b8' }}>No record found for <strong>{field}</strong> on or before {date}.</span>
            : (
              <span>
                <strong>{field}</strong> as of {date} was{' '}
                <ValueChip val={result} kind="new" />
              </span>
            )
          }
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ChangeLogTab({ center, userRole = 'director' }) {
  const centerId = center?.id || center?.centerKey || 'default';

  const [entries,    setEntries]    = useState([]);
  const [domain,     setDomain]     = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [search,     setSearch]     = useState('');
  const [fromDate,   setFromDate]   = useState('');
  const [toDate,     setToDate]     = useState('');
  const [page,       setPage]       = useState(1);
  const PAGE_SIZE = 25;

  const loadEntries = useCallback(() => {
    const filters = {};
    if (domain    !== 'All') filters.domain   = domain;
    if (roleFilter !== 'All') filters.role    = roleFilter;
    if (fromDate)             filters.fromDate = fromDate;
    if (toDate)               filters.toDate   = toDate;
    setEntries(getChangeLog(centerId, filters));
    setPage(1);
  }, [centerId, domain, roleFilter, fromDate, toDate]);

  // Reload whenever filters or centerId change
  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Poll for new entries every 5s (other tabs may have written)
  useEffect(() => {
    const id = setInterval(loadEntries, 5000);
    return () => clearInterval(id);
  }, [loadEntries]);

  const filtered = search.trim()
    ? entries.filter(e =>
        e.fieldLabel.toLowerCase().includes(search.toLowerCase()) ||
        e.fieldKey.toLowerCase().includes(search.toLowerCase()) ||
        e.newValue.toLowerCase().includes(search.toLowerCase()) ||
        e.oldValue.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible    = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const resetFilters = () => {
    setDomain('All'); setRoleFilter('All');
    setSearch(''); setFromDate(''); setToDate('');
  };

  const hasFilters = domain !== 'All' || roleFilter !== 'All' || search || fromDate || toDate;

  return (
    <div style={{ padding:'20px 24px', maxWidth:1100 }}>

      {/* ── Header ── */}
      <div style={{ marginBottom:20 }}>
        <h3 style={{ margin:0, fontSize:17, fontWeight:700, color:'#1e293b' }}>
          Field Change Log
        </h3>
        <p style={{ margin:'4px 0 0', fontSize:13, color:'#64748b' }}>
          Every field edit for <strong>{center?.name}</strong> — who changed what, when, and from which value.
          {' '}{entries.length > 0 && <span style={{ color:'#475569' }}>{entries.length} total entries.</span>}
        </p>
      </div>

      {/* ── As-of query panel ── */}
      <AsOfPanel centerId={centerId} />

      {/* ── Filters ── */}
      <div style={{
        display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end',
        background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10,
        padding:'14px 18px', marginBottom:16,
      }}>
        {/* Domain */}
        <div>
          <label style={{ display:'block', fontSize:11, color:'#64748b', marginBottom:3 }}>Domain</label>
          <select value={domain} onChange={e => setDomain(e.target.value)}
            style={{ padding:'6px 10px', borderRadius:6, border:'1px solid #cbd5e1', fontSize:13, fontFamily:'inherit' }}>
            {DOMAINS.map(d => <option key={d} value={d}>{d === 'All' ? 'All domains' : `${d} — ${DOMAIN_LABELS[d]}`}</option>)}
          </select>
        </div>

        {/* Role */}
        <div>
          <label style={{ display:'block', fontSize:11, color:'#64748b', marginBottom:3 }}>Changed by</label>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            style={{ padding:'6px 10px', borderRadius:6, border:'1px solid #cbd5e1', fontSize:13, fontFamily:'inherit' }}>
            {ROLES.map(r => <option key={r} value={r}>{r === 'All' ? 'All roles' : r}</option>)}
          </select>
        </div>

        {/* From date */}
        <div>
          <label style={{ display:'block', fontSize:11, color:'#64748b', marginBottom:3 }}>From</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            style={{ padding:'6px 10px', borderRadius:6, border:'1px solid #cbd5e1', fontSize:13, fontFamily:'inherit' }} />
        </div>

        {/* To date */}
        <div>
          <label style={{ display:'block', fontSize:11, color:'#64748b', marginBottom:3 }}>To</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            style={{ padding:'6px 10px', borderRadius:6, border:'1px solid #cbd5e1', fontSize:13, fontFamily:'inherit' }} />
        </div>

        {/* Search */}
        <div style={{ flex:1, minWidth:180 }}>
          <label style={{ display:'block', fontSize:11, color:'#64748b', marginBottom:3 }}>Search field / value</label>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Field name or value…"
            style={{
              width:'100%', padding:'6px 10px', borderRadius:6,
              border:'1px solid #cbd5e1', fontSize:13, fontFamily:'inherit', boxSizing:'border-box',
            }}
          />
        </div>

        {/* Clear */}
        {hasFilters && (
          <button onClick={resetFilters} style={{
            padding:'7px 14px', borderRadius:6, fontSize:12, fontWeight:600,
            background:'#fff', border:'1px solid #cbd5e1', color:'#64748b',
            cursor:'pointer', fontFamily:'inherit',
          }}>
            Clear filters
          </button>
        )}
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign:'center', padding:'48px 24px',
          background:'#f8fafc', borderRadius:10, border:'1px solid #e2e8f0',
        }}>
          <div style={{ fontSize:32, marginBottom:10 }}>📋</div>
          <div style={{ fontWeight:600, color:'#475569', marginBottom:6 }}>No changes recorded yet</div>
          <div style={{ fontSize:13, color:'#94a3b8' }}>
            {hasFilters
              ? 'No entries match the current filters. Try clearing them.'
              : 'Changes will appear here as fields are edited in Data Entry.'}
          </div>
        </div>
      ) : (
        <>
          <div style={{ overflowX:'auto', borderRadius:10, border:'1px solid #e2e8f0' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#f1f5f9' }}>
                  {['Timestamp','Domain','Field','Changed by','Previous value','New value'].map(h => (
                    <th key={h} style={{
                      textAlign:'left', padding:'10px 14px',
                      fontWeight:700, fontSize:12, color:'#475569',
                      borderBottom:'1px solid #e2e8f0', whiteSpace:'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((e, i) => (
                  <tr key={i} style={{
                    background: i % 2 === 0 ? '#fff' : '#fafafa',
                    borderBottom:'1px solid #f1f5f9',
                  }}>
                    <td style={{ padding:'9px 14px', color:'#475569', whiteSpace:'nowrap', fontSize:12 }}>
                      {fmt(e.ts)}
                    </td>
                    <td style={{ padding:'9px 14px' }}>
                      <DomainBadge domain={e.domain} />
                    </td>
                    <td style={{ padding:'9px 14px' }}>
                      <div style={{ fontWeight:600, color:'#1e293b' }}>{e.fieldLabel}</div>
                      <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{e.fieldKey}</div>
                    </td>
                    <td style={{ padding:'9px 14px', color:'#475569', whiteSpace:'nowrap' }}>{e.role}</td>
                    <td style={{ padding:'9px 14px' }}><ValueChip val={e.oldValue} kind="old" /></td>
                    <td style={{ padding:'9px 14px' }}><ValueChip val={e.newValue} kind="new" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:8, marginTop:16 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p-1))}
                disabled={page === 1}
                style={{
                  padding:'5px 12px', borderRadius:6, fontSize:13, fontWeight:600,
                  background: page === 1 ? '#f1f5f9' : '#1e3a5f',
                  color: page === 1 ? '#94a3b8' : '#fff',
                  border:'none', cursor: page === 1 ? 'default' : 'pointer', fontFamily:'inherit',
                }}
              >← Prev</button>
              <span style={{ fontSize:13, color:'#475569' }}>
                Page {page} of {totalPages} &nbsp;·&nbsp; {filtered.length} entries
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p+1))}
                disabled={page === totalPages}
                style={{
                  padding:'5px 12px', borderRadius:6, fontSize:13, fontWeight:600,
                  background: page === totalPages ? '#f1f5f9' : '#1e3a5f',
                  color: page === totalPages ? '#94a3b8' : '#fff',
                  border:'none', cursor: page === totalPages ? 'default' : 'pointer', fontFamily:'inherit',
                }}
              >Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

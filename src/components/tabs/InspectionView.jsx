import React, { useState, useEffect, useRef } from 'react';
import { getDomainFields } from '../../complianceFields';
import InspectionReportExport from './InspectionReportExport';

// ── Helpers ───────────────────────────────────────────────────────────────
function sColor(score) {
  if (score === null || score === undefined) return '#94a3b8';
  if (score >= 80) return '#2d7a4f';
  if (score >= 60) return '#b45309';
  return '#b91c1c';
}
function sLabel(score) {
  if (score === null || score === undefined) return 'No data';
  if (score >= 80) return 'Compliant';
  if (score >= 60) return 'At Risk';
  return 'Non-Compliant';
}
function sStatusColor(status) {
  return {
    compliant:   '#2d7a4f',
    atrisk:      '#b45309',
    missing:     '#b91c1c',
    notrequired: '#94a3b8',
    nodata:      '#94a3b8',
  }[status] || '#94a3b8';
}
function sStatusBg(status) {
  return {
    compliant:   '#eef7f2',
    atrisk:      '#fdf4e7',
    missing:     '#fdf1f1',
    notrequired: '#f1f5f9',
    nodata:      '#f8fafc',
  }[status] || '#f8fafc';
}
function sStatusBd(status) {
  return {
    compliant:   '#a7d4ba',
    atrisk:      '#e6b87a',
    missing:     '#e8a0a0',
    notrequired: '#cbd5e1',
    nodata:      '#e2e8f0',
  }[status] || '#e2e8f0';
}
function sStatusLabel(status) {
  return {
    compliant:   '✓ Met',
    atrisk:      '⚠ At Risk',
    missing:     '✗ Not Met',
    notrequired: '— Not Required',
    nodata:      '— Not entered',
  }[status] || '—';
}

const LS_KEY_NR = '1core_compliance_v6_not_required';
function loadNR() { try { return JSON.parse(localStorage.getItem(LS_KEY_NR)) || {}; } catch { return {}; } }
function saveNR(v) { try { localStorage.setItem(LS_KEY_NR, JSON.stringify(v)); } catch {} }


// ── Field row ─────────────────────────────────────────────────────────────
function FieldRow({ field, onFix, domainId }) {
  const { label, requirement, value, status, note } = field;
  const isIssue  = status === 'missing' || status === 'atrisk';
  const isNoData = status === 'nodata';
  const isGood   = status === 'compliant';

  return (
    <div style={{
      display:'grid', gridTemplateColumns:'1.2fr 1fr 1.1fr 130px',
      gap:0, padding:'10px 18px',
      background: isIssue ? (status === 'missing' ? '#fff9f9' : '#fffcf5') : 'transparent',
      borderBottom:'1px solid #f1f5f9',
      alignItems:'center',
    }}>
      {/* Field name */}
      <div style={{ fontSize:13, fontWeight: isIssue ? 600 : 500, color: isIssue ? '#1e293b' : '#374151' }}>
        {label}
        {note && <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{note}</div>}
      </div>
      {/* State requirement */}
      <div style={{ fontSize:12, color:'#64748b', paddingRight:12 }}>
        {requirement}
      </div>
      {/* Current value — only show if there's an actual value */}
      <div style={{ fontSize:12.5, paddingRight:8 }}>
        {isNoData
          ? <span style={{ fontSize:11.5, color:'#94a3b8', fontStyle:'italic' }}>—</span>
          : <span style={{ color: isIssue ? '#b91c1c' : '#1e293b', fontWeight: isIssue ? 600 : 400 }}>{value}</span>
        }
      </div>
      {/* Status / action */}
      <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end' }}>
        {isNoData && onFix && field.fieldKey ? (
          <button onClick={() => onFix(domainId, field.fieldKey, field.subTab)} style={{
            fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:6, whiteSpace:'nowrap',
            border:'1px solid #cbd5e1', background:'#f8fafc', color:'#374151',
            cursor:'pointer', display:'flex', alignItems:'center', gap:4,
          }}>+ Enter data →</button>
        ) : isNoData ? null : (
          <>
            <span style={{
              fontSize:11.5, fontWeight:600, padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap',
              background: sStatusBg(status), color: sStatusColor(status), border:`1px solid ${sStatusBd(status)}`,
            }}>
              {sStatusLabel(status)}
            </span>
            {isIssue && onFix && (
              <button onClick={() => onFix(domainId, field.fieldKey, field.subTab)} style={{
                fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:6,
                border:'1px solid #e2e8f0', background:'#f8fafc', color:'#374151',
                cursor:'pointer', whiteSpace:'nowrap',
              }}>Fix →</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Domain section ────────────────────────────────────────────────────────
function DomainSection({ domain, score, isExpanded, isNR, onToggle, onToggleNR, onFix, domainRef }) {
  const issues   = domain.fields.filter(f => f.status === 'missing' || f.status === 'atrisk');
  const met      = domain.fields.filter(f => f.status === 'compliant');
  const nodata   = domain.fields.filter(f => f.status === 'nodata');
  const [metOpen, setMetOpen] = useState(false);

  const dotColor = isNR ? '#94a3b8' : score !== null ? sColor(score) : issues.length > 0 ? '#b91c1c' : '#94a3b8';

  return (
    <div ref={domainRef} style={{
      background:'#fff', border:'1px solid #e2e8f0',
      borderLeft:`4px solid ${dotColor}`,
      borderRadius:10, marginBottom:10, overflow:'hidden',
      opacity: isNR ? 0.6 : 1,
      boxShadow: isExpanded ? '0 4px 16px rgba(0,0,0,0.06)' : 'none',
      transition:'box-shadow 0.2s',
    }}>

      {/* ── Domain header ── */}
      <div style={{ display:'flex', alignItems:'center', padding:'14px 18px', gap:12, cursor:'pointer' }}
        onClick={() => {
        onToggle(domain.id);
        setTimeout(() => {
          if (domainRef?.current) domainRef.current.scrollIntoView({ behavior:'smooth', block:'start' });
        }, 80);
      }}>

        {/* Chevron */}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5"
          style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition:'transform 0.2s', flexShrink:0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>

        {/* Domain number + name */}
        <span style={{ fontSize:12, fontWeight:700, color:'#94a3b8', flexShrink:0 }}>{domain.dNum}</span>
        <span style={{ fontSize:14, fontWeight:700, color: isNR ? '#94a3b8' : '#0f172a', flex:1 }}>{domain.label}</span>

        {/* Score badge */}
        {!isNR && score !== null && (
          <span style={{
            fontSize:13, fontWeight:800, color: sColor(score),
            background: score >= 80 ? '#eef7f2' : score >= 60 ? '#fdf4e7' : '#fdf1f1',
            border:`1px solid ${score >= 80 ? '#a7d4ba' : score >= 60 ? '#e6b87a' : '#e8a0a0'}`,
            padding:'3px 12px', borderRadius:20, flexShrink:0,
          }}>{score}% — {sLabel(score)}</span>
        )}

        {/* Status chips */}
        {!isNR && (
          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
            {issues.filter(f => f.status === 'missing').length > 0 && (
              <span style={{ fontSize:11.5, fontWeight:700, padding:'3px 10px', borderRadius:20,
                background:'#fdf1f1', color:'#7f1d1d', border:'1px solid #e8a0a0' }}>
                ✗ {issues.filter(f => f.status === 'missing').length} not met
              </span>
            )}
            {issues.filter(f => f.status === 'atrisk').length > 0 && (
              <span style={{ fontSize:11.5, fontWeight:700, padding:'3px 10px', borderRadius:20,
                background:'#fdf4e7', color:'#7c4a00', border:'1px solid #e6b87a' }}>
                ⚠ {issues.filter(f => f.status === 'atrisk').length} at risk
              </span>
            )}
            {met.length > 0 && (
              <span style={{ fontSize:11.5, fontWeight:600, padding:'3px 10px', borderRadius:20,
                background:'#eef7f2', color:'#1e5c38', border:'1px solid #a7d4ba' }}>
                ✓ {met.length} met
              </span>
            )}
            {nodata.length > 0 && (
              <span style={{ fontSize:11.5, color:'#94a3b8', padding:'3px 8px' }}>
                {nodata.length} not entered
              </span>
            )}
          </div>
        )}

        {isNR && (
          <span style={{ fontSize:11.5, fontWeight:600, padding:'3px 10px', borderRadius:20,
            background:'#f1f5f9', color:'#94a3b8', border:'1px solid #e2e8f0', flexShrink:0 }}>
            Not tracked
          </span>
        )}

        {/* Not required toggle */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0, marginLeft:8 }}
          onClick={e => e.stopPropagation()}>
          <span style={{ fontSize:11.5, color:'#94a3b8' }}>Not required</span>
          <button onClick={() => onToggleNR(domain.id)} style={{
            width:38, height:20, borderRadius:10, border:'none', cursor:'pointer',
            background: isNR ? '#4f5fa8' : '#e2e8f0', position:'relative', transition:'background 0.2s',
          }}>
            <span style={{
              position:'absolute', top:2, left: isNR ? 19 : 2,
              width:16, height:16, borderRadius:'50%', background:'#fff',
              transition:'left 0.2s', display:'block', boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
            }}/>
          </button>
        </div>
      </div>

      {/* ── Expanded content ── */}
      {isExpanded && !isNR && (
        <div style={{ borderTop:'1px solid #f1f5f9' }}>

          {/* Column headers */}
          <div style={{
            display:'grid', gridTemplateColumns:'1.2fr 1fr 1.1fr 130px',
            padding:'8px 18px', background:'#f8fafc',
            borderBottom:'1px solid #e2e8f0',
          }}>
            {['Field', 'State requirement', 'Current value', 'Action'].map((h, i) => (
              <div key={h} style={{ fontSize:11, fontWeight:700, color:'#94a3b8',
                letterSpacing:'0.04em', textTransform:'uppercase',
                textAlign: i === 3 ? 'right' : 'left', paddingRight: i === 2 ? 8 : 0 }}>
                {h}
              </div>
            ))}
          </div>

          {/* Issues section — always shown first */}
          {issues.length > 0 && (
            <>
              <div style={{ padding:'8px 18px 4px', background:'#fff9f9',
                borderBottom:'1px solid #fee2e2', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'#b91c1c',
                  textTransform:'uppercase', letterSpacing:'0.05em' }}>
                  Needs attention — {issues.length} item{issues.length > 1 ? 's' : ''}
                </span>
              </div>
              {issues.map((f, i) => (
                <FieldRow key={`issue-${i}`} field={f} onFix={onFix} domainId={domain.id} />
              ))}
            </>
          )}

          {/* Not entered section */}
          {nodata.length > 0 && (
            <>
              <div style={{ padding:'8px 18px 4px', background:'#f8fafc',
                borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'#94a3b8',
                  textTransform:'uppercase', letterSpacing:'0.05em' }}>
                  Not yet entered — {nodata.length} item{nodata.length > 1 ? 's' : ''}
                </span>
              </div>
              {nodata.map((f, i) => (
                <FieldRow key={`nodata-${i}`} field={f} onFix={onFix} domainId={domain.id} />
              ))}
            </>
          )}

          {/* Met section — collapsible */}
          {met.length > 0 && (
            <>
              <button
                onClick={() => setMetOpen(p => !p)}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:8,
                  padding:'8px 18px', background:'#f0fdf4',
                  border:'none', borderTop:'1px solid #d1fae5', cursor:'pointer',
                  fontFamily:'inherit', textAlign:'left',
                }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2d7a4f" strokeWidth="2.5"
                  style={{ transform: metOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
                <span style={{ fontSize:11, fontWeight:700, color:'#1e5c38',
                  textTransform:'uppercase', letterSpacing:'0.05em' }}>
                  Met — {met.length} item{met.length > 1 ? 's' : ''}
                </span>
                <span style={{ fontSize:11, color:'#86efac', marginLeft:'auto' }}>
                  {metOpen ? 'Hide' : 'Show'}
                </span>
              </button>
              {metOpen && met.map((f, i) => (
                <FieldRow key={`met-${i}`} field={f} domainId={domain.id} />
              ))}
            </>
          )}

          {/* Footer nudge */}
          <div style={{ padding:'10px 18px', borderTop:'1px solid #f8fafc',
            fontSize:12, color:'#94a3b8', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>Enter data via the <strong>Data Entry</strong> tab to update field values</span>
            <button onClick={() => onFix(domain.id, null, null)} style={{
              fontSize:12, fontWeight:600, padding:'5px 14px', borderRadius:7,
              border:'1px solid #e6b87a', background:'#fdf4e7', color:'#7c4a00', cursor:'pointer',
            }}>
              Go to Data Entry for {domain.dNum} →
            </button>
          </div>
        </div>
      )}

      {isExpanded && isNR && (
        <div style={{ borderTop:'1px solid #f1f5f9', padding:'16px 20px',
          fontSize:13.5, color:'#94a3b8', fontStyle:'italic' }}>
          This domain is marked "Not Required" — excluded from compliance scoring and alerts.
          Toggle the switch above to re-enable tracking.
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function InspectionView({ center, reg, initialDomain }) {
  const [expanded,    setExpanded]    = useState(() => {
    // Auto-expand the domain passed from Overview tile click
    if (initialDomain) return { [`d${initialDomain}`]: true };
    return {};
  });
  const [notRequired, setNotRequired] = useState(() => loadNR());
  const [showReport,  setShowReport]  = useState(false);

  const domainRefs = useRef({});
  const liveDataRef = center.liveData || {};
  const domains    = getDomainFields(center, reg, liveDataRef);
  const scores     = center.scores || {};

  const domainScores = {
    d1: scores.d1 ?? scores.licensing ?? null,
    d2: scores.d2 ?? scores.center    ?? null,
    d3: scores.d3 ?? scores.credentials ?? null,
    d4: scores.d4 ?? scores.ratios    ?? null,
    d5: scores.d5 ?? null,
    d6: scores.d6 ?? scores.family    ?? null,
    d7: scores.d7 ?? null,
  };

  // Scroll to auto-expanded domain on mount
  useEffect(() => {
    if (initialDomain) {
      const key = `d${initialDomain}`;
      setTimeout(() => {
        const el = domainRefs.current[key];
        if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
      }, 120);
    }
  }, [initialDomain]);

  const toggleExpand = id => setExpanded(p => ({ ...p, [id]: !p[id] }));
  const toggleNR     = id => {
    setNotRequired(p => {
      const next = { ...p, [id]: !p[id] };
      saveNR(next);
      return next;
    });
  };

  // Domain → default subTab mapping for "Go to Data Entry for DX" button
  const DOMAIN_SUBTAB = {
    d1: 'licensing', d2: 'physical', d3: 'personnel',
    d4: 'ratios', d5: 'staffhealth', d6: 'children', d7: 'emergency',
  };

  // Passed to "Fix →" / "Go to Data Entry" buttons — caller wires this via onNavigate
  const handleFix = (domainId, fieldKey, subTab) => {
    const resolvedSubTab = subTab || DOMAIN_SUBTAB[domainId] || 'licensing';
    window.dispatchEvent(new CustomEvent('1core_navigate_dataentry', {
      detail: { domain: parseInt(domainId.replace('d','')), fieldKey, subTab: resolvedSubTab }
    }));
  };

  // Overall totals
  const allFields  = domains.flatMap(d => d.fields);
  const totalIssues = allFields.filter(f => f.status === 'missing' || f.status === 'atrisk').length;
  const totalMet    = allFields.filter(f => f.status === 'compliant').length;
  const totalND     = allFields.filter(f => f.status === 'nodata').length;

  const DOMAIN_SHORT = ['Licensing','Physical','Personnel','Ratios','Staff Health','Children','Emergency'];

  return (
    <div>
      {showReport && <InspectionReportExport center={center} onClose={() => setShowReport(false)}/>}

      {/* ── Page header ── */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12,
        padding:'18px 22px', marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16 }}>
          <div>
            <h3 style={{ fontSize:16, fontWeight:700, color:'#0f172a', margin:'0 0 4px' }}>
              Inspection View — {center.name}
            </h3>
            <p style={{ fontSize:12.5, color:'#64748b', margin:'0 0 14px' }}>
              Non-editable read-only view · Shows what is met and what is not met per domain · Click any domain to expand
            </p>
            {/* Summary row */}
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {totalIssues > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px',
                  borderRadius:8, background:'#fdf1f1', border:'1px solid #e8a0a0' }}>
                  <span style={{ fontSize:18, fontWeight:800, color:'#b91c1c' }}>{totalIssues}</span>
                  <span style={{ fontSize:12, color:'#7f1d1d', fontWeight:600 }}>items not met or at risk</span>
                </div>
              )}
              {totalMet > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px',
                  borderRadius:8, background:'#eef7f2', border:'1px solid #a7d4ba' }}>
                  <span style={{ fontSize:18, fontWeight:800, color:'#2d7a4f' }}>{totalMet}</span>
                  <span style={{ fontSize:12, color:'#1e5c38', fontWeight:600 }}>items met</span>
                </div>
              )}
              {totalND > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px',
                  borderRadius:8, background:'#f8fafc', border:'1px solid #e2e8f0' }}>
                  <span style={{ fontSize:18, fontWeight:800, color:'#94a3b8' }}>{totalND}</span>
                  <span style={{ fontSize:12, color:'#64748b', fontWeight:600 }}>not yet entered</span>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => setShowReport(true)} style={{
            display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8,
            border:'1px solid #e2e8f0', background:'#f8fafc', color:'#374151',
            fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit',
            whiteSpace:'nowrap', flexShrink:0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Export Report
          </button>
        </div>
      </div>

      {/* ── D1–D7 score strip (clickable) ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8, marginBottom:16 }}>
        {domains.map((d, i) => {
          const score = domainScores[d.id];
          const color = sColor(score);
          const isOpen = !!expanded[d.id];
          const isNR   = !!notRequired[d.id];
          const domainIssues = d.fields.filter(f => f.status === 'missing' || f.status === 'atrisk').length;
          const nodataCount  = d.fields.filter(f => f.status === 'nodata').length;
          return (
            <div key={d.id}
              onClick={() => {
                toggleExpand(d.id);
                setTimeout(() => {
                  const el = domainRefs.current[d.id];
                  if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
                }, 80);
              }}
              style={{
                background:'#fff', border:'1px solid #e2e8f0',
                borderTop:`3px solid ${isNR ? '#e2e8f0' : color}`,
                borderRadius:10, padding:'10px 8px', textAlign:'center',
                cursor:'pointer', transition:'box-shadow 0.15s',
                boxShadow: isOpen ? '0 0 0 2px ' + color + '40' : 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = `0 2px 8px rgba(0,0,0,0.08)`}
              onMouseLeave={e => e.currentTarget.style.boxShadow = isOpen ? '0 0 0 2px ' + color + '40' : 'none'}
            >
              <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', marginBottom:3 }}>{d.dNum}</div>
              <div style={{ fontSize:17, fontWeight:800, color: isNR ? '#94a3b8' : color, lineHeight:1 }}>
                {score !== null ? `${score}%` : '—'}
              </div>
              <div style={{ fontSize:10, color:'#94a3b8', marginTop:3, lineHeight:1.3 }}>{DOMAIN_SHORT[i]}</div>
              {!isNR && domainIssues > 0 && (
                <div style={{ marginTop:5, fontSize:10, fontWeight:600, color:'#b91c1c',
                  background:'#fdf1f1', borderRadius:4, padding:'1px 4px' }}>
                  {domainIssues} item{domainIssues > 1 ? 's' : ''} not met
                </div>
              )}
              {!isNR && nodataCount > 0 && (
                <div style={{ marginTop:3, fontSize:10, fontWeight:600, color:'#b45309',
                  background:'#fdf4e7', borderRadius:4, padding:'1px 4px' }}>
                  {nodataCount} not entered
                </div>
              )}
              {!isNR && domainIssues === 0 && nodataCount === 0 && score !== null && score >= 80 && (
                <div style={{ marginTop:5, fontSize:10, fontWeight:600, color:'#2d7a4f',
                  background:'#eef7f2', borderRadius:4, padding:'1px 4px' }}>✓ Good</div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Domain sections ── */}
      {domains.map((domain, i) => (
        <DomainSection
          key={domain.id}
          domain={domain}
          score={domainScores[domain.id]}
          isExpanded={!!expanded[domain.id]}
          isNR={!!notRequired[domain.id]}
          onToggle={toggleExpand}
          onToggleNR={toggleNR}
          onFix={handleFix}
          domainRef={el => domainRefs.current[domain.id] = el}
        />
      ))}
    </div>
  );
}

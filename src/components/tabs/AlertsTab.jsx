import React, { useState } from 'react';

// Map alert keywords → domain number + label
function inferDomain(title, detail) {
  const text = (title + ' ' + (detail || '')).toLowerCase();
  if (text.match(/license|insurance|inspection|qris|qrs|permit/)) return 1;
  if (text.match(/fence|fencing|sqft|square|space|co detector|carbon|hot water|toilet|smoke/)) return 2;
  if (text.match(/director|teacher|aide|background|bg check|workforce|registry|credential|degree|qualification/)) return 3;
  if (text.match(/ratio|staff.to.child|children.per|supervision|group size/)) return 4;
  if (text.match(/cpr|first aid|training hour|tb test|physical exam|mandated reporter|immuniz|in.service/)) return 5;
  if (text.match(/child record|immunization|allergy|medication|enrollment|emergency contact|parental|safe sleep|attendance/)) return 6;
  if (text.match(/fire drill|tornado|lockdown|drill|evacuation|emergency plan|safety/)) return 7;
  return 0; // general
}

const DOMAIN_NAMES = {
  0: 'General',
  1: 'D1 · Licensing & Admin',
  2: 'D2 · Physical Environment',
  3: 'D3 · Personnel & Qualifications',
  4: 'D4 · Ratios & Supervision',
  5: 'D5 · Staff Health & Training',
  6: "D6 · Children's Records & Health",
  7: 'D7 · Emergency & Safety',
};

const DOMAIN_COLORS = { 0:'#94a3b8', 1:'#94a3b8', 2:'#94a3b8', 3:'#94a3b8', 4:'#94a3b8', 5:'#94a3b8', 6:'#94a3b8', 7:'#94a3b8' };

const SEVERITY_ORDER = { danger: 0, warning: 1, info: 2, success: 3 };

// Static alerts for seed/demo centers
const SEED_ALERTS = [
  { type:'danger',  domain:5, title:'CPR Certification Expired — Sarah Mitchell', detail:'Expired May 1, 2026. Staff cannot provide direct care until renewed. Texas requires valid CPR for all licensed staff at all times.' },
  { type:'warning', domain:1, title:'General Liability Insurance expiring in 38 days', detail:'Policy expires June 18, 2026. Contact your insurer to initiate renewal. Required to maintain TX HHSC license in good standing.' },
  { type:'warning', domain:5, title:'Annual training hours below state minimum', detail:'2 staff members at 9 hrs/yr. Texas requires 12 hrs/yr minimum. 3 additional hours needed before year-end.' },
  { type:'warning', domain:3, title:'Workforce registry enrollment incomplete', detail:'Texas Workforce Registry requires all qualifying teachers and directors to enroll. 2 staff members not yet enrolled.' },
  { type:'info',    domain:2, title:'CO detector compliance not confirmed', detail:'Texas requires carbon monoxide detectors on every level of the facility. Confirm installation, testing log, and that records are on file.' },
  { type:'info',    domain:2, title:'Fencing compliance not confirmed', detail:'Texas requires minimum 4 ft fencing around all outdoor play areas. Confirm and record fencing height measurement.' },
  { type:'info',    domain:7, title:'Drill documentation not confirmed', detail:'Texas requires: fire drills monthly · tornado drills monthly · lockdown drills 2×/year. Confirm your drill log is current and on file.' },
  { type:'info',    domain:5, title:'Staff physical exam records — 2 staff missing', detail:'Texas requires physical exam on file at time of hire. Records for DeShawn Carter and Priya Nair are incomplete.' },
];

export default function AlertsTab({ center }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'danger' | 'warning' | 'info'

  // Enrich center alerts with domain inference, fall back to seed alerts
  const rawAlerts = (center.alerts && center.alerts.length > 0) ? center.alerts : SEED_ALERTS;

  const enriched = rawAlerts.map(a => ({
    ...a,
    domain: a.domain ?? inferDomain(a.title, a.detail),
  }));

  const filtered = enriched.filter(a => filter === 'all' || a.type === filter);

  // Group by domain, sorted by domain number
  const grouped = {};
  filtered.forEach(a => {
    const d = a.domain;
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(a);
  });
  // Sort within each group by severity
  Object.values(grouped).forEach(g => g.sort((a, b) => (SEVERITY_ORDER[a.type] ?? 9) - (SEVERITY_ORDER[b.type] ?? 9)));
  const domainKeys = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  const counts = {
    danger:  enriched.filter(a => a.type === 'danger').length,
    warning: enriched.filter(a => a.type === 'warning').length,
    info:    enriched.filter(a => a.type === 'info').length,
  };

  const alertBg    = t => t === 'danger' ? '#fdf1f1' : t === 'warning' ? '#fdf4e7' : t === 'success' ? '#eef7f2' : '#eef4fc';
  const alertBd    = t => t === 'danger' ? '#e8a0a0' : t === 'warning' ? '#e6b87a' : t === 'success' ? '#a7d4ba' : '#a8c4e0';
  const alertDot   = t => t === 'danger' ? '#b91c1c' : t === 'warning' ? '#b45309' : t === 'success' ? '#2d7a4f'  : '#2563eb';
  const alertLabel = t => t === 'danger' ? 'Critical' : t === 'warning' ? 'Warning' : t === 'success' ? 'Resolved' : 'Info';

  return (
    <div>
      {/* Header + filter bar */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px 20px', marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div>
            <h3 style={{ fontSize:15, fontWeight:700, color:'#0f172a', margin:0 }}>Compliance Alerts — {center.name}</h3>
            <p style={{ fontSize:12.5, color:'#64748b', margin:'4px 0 0' }}>
              Grouped by compliance domain · sorted Critical → Warning → Info
            </p>
          </div>
          {/* Summary pills */}
          <div style={{ display:'flex', gap:8 }}>
            {[
              { key:'all',     label:`All (${enriched.length})`, bg:'#f1f5f9', border:'#cbd5e1', color:'#475569' },
              { key:'danger',  label:`Critical (${counts.danger})`,  bg:'#fdf1f1', border:'#e8a0a0', color:'#7f1d1d' },
              { key:'warning', label:`Warning (${counts.warning})`,  bg:'#fdf4e7', border:'#e6b87a', color:'#7c4a00' },
              { key:'info',    label:`Info (${counts.info})`,         bg:'#eef4fc', border:'#a8c4e0', color:'#1e3a5f' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{
                padding:'5px 12px', borderRadius:20, border:`1px solid ${filter === f.key ? f.border : '#e2e8f0'}`,
                background: filter === f.key ? f.bg : '#fff',
                color: filter === f.key ? f.color : '#64748b',
                fontWeight: filter === f.key ? 600 : 500, fontSize:12.5, cursor:'pointer', fontFamily:'inherit',
                transition:'all 0.12s',
              }}>{f.label}</button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 && (
        <div style={{ background:'#eef7f2', border:'1px solid #a7d4ba', borderRadius:12, padding:'24px', textAlign:'center' }}>
          <div style={{ fontSize:14, fontWeight:600, color:'#1e5c38' }}>No alerts in this category</div>
        </div>
      )}

      {/* Grouped by domain */}
      {domainKeys.map(d => (
        <div key={d} style={{ marginBottom:20 }}>
          {/* Domain header */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, paddingBottom:8, borderBottom:`2px solid ${DOMAIN_COLORS[d]}22` }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:DOMAIN_COLORS[d], flexShrink:0 }}/>
            <span style={{ fontSize:13, fontWeight:700, color:DOMAIN_COLORS[d], letterSpacing:'0.02em' }}>
              {DOMAIN_NAMES[d]}
            </span>
            <span style={{ fontSize:11.5, fontWeight:600, padding:'1px 8px', borderRadius:20,
              background:`${DOMAIN_COLORS[d]}15`, color:DOMAIN_COLORS[d] }}>
              {grouped[d].length} alert{grouped[d].length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Alerts in this domain */}
          {grouped[d].map((a, i) => (
            <div key={i} style={{
              padding:'14px 16px', borderRadius:10, marginBottom:8,
              background: alertBg(a.type), border:`1px solid ${alertBd(a.type)}`,
              borderLeft:`3px solid ${alertDot(a.type)}`,
            }}>
              <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <div style={{ flexShrink:0, marginTop:1 }}>
                  <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                    background: alertDot(a.type) + '22', color: alertDot(a.type), border:`1px solid ${alertDot(a.type)}44` }}>
                    {alertLabel(a.type)}
                  </span>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13.5, fontWeight:600, color:'#1e293b', marginBottom:3 }}>{a.title}</div>
                  <div style={{ fontSize:12.5, color:'#64748b', lineHeight:1.6 }}>{a.detail}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

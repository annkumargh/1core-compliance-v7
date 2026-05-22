import React, { useState } from 'react';
import { getDomainCounts } from '../../complianceFields';

// ── Helpers ──────────────────────────────────────────────────────────────────
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

const DOMAIN_LABELS = [
  'Licensing & Admin',
  'Physical Environment',
  'Personnel & Qualifications',
  'Ratios & Supervision',
  'Staff Health & Training',
  "Children's Records & Health",
  'Emergency & Safety',
];

const DOMAIN_SHORT = ['Licensing','Physical','Personnel','Ratios','Staff Health','Children','Emergency'];

// Mock CO state average benchmarks (realistic mock data)
const CO_AVG = [88, 79, 81, 74, 72, 68, 71];

// Effort-to-compliant: driven by real field data from getDomainCounts
function getEffortItems(realCounts) {
  return realCounts.map(rc => {
    const items = [
      ...rc.issues.filter(f => f.fieldKey),
      ...rc.nodata.filter(f => f.fieldKey),
    ];
    return { count: items.length, items: items.slice(0, 3) };
  });
}

// Today's action list — driven by real field issues and nodata, sorted by severity
function getActions(domains, realCounts) {
  const actions = [];
  // Issues first (not met / at risk), then nodata — across all domains, sorted by domain score
  const sorted = domains.map((s, i) => ({ s, i })).filter(x => x.s !== null).sort((a, b) => a.s - b.s);
  sorted.forEach(({ s, i }) => {
    if (actions.length >= 6) return;
    const rc = realCounts[i];
    const topField = rc.issues[0] || rc.nodata[0];
    if (!topField) return;
    actions.push({
      domain: `D${i+1}`,
      label: topField.label,
      fieldKey: topField.fieldKey || null,
      subTab: topField.subTab || null,
      urgency: rc.issues.length > 0 ? 'critical' : 'warning',
      detail: `${DOMAIN_LABELS[i]} · ${s !== null ? `${s}%` : 'No data'}`,
    });
  });
  // If fewer than 6, fill with more items from domains that had multiple issues
  if (actions.length < 6) {
    sorted.forEach(({ s, i }) => {
      const rc = realCounts[i];
      const fields = [...rc.issues, ...rc.nodata].filter(f => f.fieldKey);
      fields.slice(1, 3).forEach(f => {
        if (actions.length >= 6) return;
        if (actions.some(a => a.fieldKey === f.fieldKey && a.domain === `D${i+1}`)) return;
        actions.push({
          domain: `D${i+1}`,
          label: f.label,
          fieldKey: f.fieldKey,
          subTab: f.subTab,
          urgency: rc.issues.includes(f) ? 'critical' : 'warning',
          detail: `${DOMAIN_LABELS[i]} · ${s !== null ? `${s}%` : 'No data'}`,
        });
      });
    });
  }
  return actions.slice(0, 6);
}

// Staff snapshot from seed staff array
function getStaffSnapshot(staff) {
  if (!staff || staff.length === 0) return null;
  const total = staff.length;
  const today = new Date();
  const cprOk = staff.filter(s => {
    if (!s.cpr) return false;
    const d = s.cpr.split(' ')[0];
    return new Date(d) > today;
  }).length;
  const bgOk = staff.filter(s => s.bg === 'Valid').length;
  const mandatedOk = staff.filter(s => s.mandated === 'Current').length;
  const physOk = staff.filter(s => s.physical === 'On file').length;
  // training: parse "X hrs" and compare to 15 as rough threshold
  const trainOk = staff.filter(s => {
    const hrs = parseInt((s.training || '').replace(' hrs',''));
    return !isNaN(hrs) && hrs >= 12;
  }).length;
  return { total, cprOk, bgOk, mandatedOk, physOk, trainOk };
}

// Fallback mock staff
const MOCK_STAFF = [
  { name:"Sarah M.",   role:"Director",     cpr:"2026-11-11", bg:"Valid", training:"16 hrs", mandated:"Current", physical:"On file",  status:"ok" },
  { name:"Marcus L.",  role:"Lead Teacher", cpr:"2028-05-03", bg:"Valid", training:"16 hrs", mandated:"Current", physical:"On file",  status:"ok" },
  { name:"Priya N.",   role:"Teacher",      cpr:"2026-12-25", bg:"Valid", training:"12 hrs", mandated:"Current", physical:"Pending",  status:"warning" },
  { name:"James R.",   role:"Teacher",      cpr:"2027-12-11", bg:"Valid", training:"19 hrs", mandated:"Current", physical:"On file",  status:"ok" },
  { name:"Tanya B.",   role:"Assistant",    cpr:"2028-04-17", bg:"Valid", training:"16 hrs", mandated:"Current", physical:"On file",  status:"ok" },
  { name:"DeShawn C.", role:"Floater",      cpr:"2028-03-31", bg:"Valid", training:"18 hrs", mandated:"Current", physical:"Missing",  status:"warning" },
];


// Donut for overall score
function Donut({ score, color }) {
  const r = 36, c = 2 * Math.PI * r;
  const pct = score !== null ? score : 0;
  const dash = (pct / 100) * c;
  return (
    <svg width="90" height="90" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8"/>
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${c}`} strokeDashoffset={c / 4} strokeLinecap="round"/>
      <text x="50" y="55" textAnchor="middle" fontSize="18" fontWeight="800" fill={color}>
        {score !== null ? `${score}%` : '—'}
      </text>
    </svg>
  );
}

// Bullet chart row
function BulletRow({ label, score, avg, isLast }) {
  const color = sColor(score);
  const barW = score !== null ? `${score}%` : '0%';
  const avgLeft = `${avg}%`;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: isLast ? 0 : 9 }}>
      <div style={{ fontSize:11, fontWeight:600, color:'#94a3b8', width:22, flexShrink:0 }}>
        D{label}
      </div>
      <div style={{ flex:1, position:'relative', height:20, background:'#f1f5f9', borderRadius:3, overflow:'visible' }}>
        {/* Background range band */}
        <div style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%',
          background: color + '18', borderRadius:3 }}/>
        {/* Center score bar */}
        <div style={{ position:'absolute', top:4, left:0, width: barW, height:12,
          background: color, borderRadius:2, transition:'width 0.5s ease' }}/>
        {/* State avg marker */}
        <div style={{ position:'absolute', top:1, left: avgLeft, width:3, height:18,
          background:'#4f5fa8', borderRadius:2, transform:'translateX(-1px)' }}/>
      </div>
      <div style={{ width:52, textAlign:'right', flexShrink:0 }}>
        <span style={{ fontSize:12, fontWeight:700, color }}>{score !== null ? `${score}%` : '—'}</span>
        <span style={{ fontSize:10, color:'#94a3b8', marginLeft:3 }}>/{avg}</span>
      </div>
    </div>
  );
}

// Staff bar
function StaffBar({ label, ok, total }) {
  const pct = total > 0 ? Math.round((ok / total) * 100) : 0;
  const color = pct >= 80 ? '#2d7a4f' : pct >= 60 ? '#b45309' : '#b91c1c';
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
        <span style={{ fontSize:12, color:'#374151' }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:700, color }}>{ok}/{total}</span>
      </div>
      <div style={{ height:6, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:3, transition:'width 0.4s' }}/>
      </div>
    </div>
  );
}

export default function OverviewTab({ center, scoreColor, scoreLabel, onNavigate, liveData = {}, reg = {} }) {
  const [expandedDomain, setExpandedDomain] = useState(null);
  const sc = center.scores || {};
  const overall = sc.overall ?? null;
  const overallColor = sColor(overall);
  const overallLabel = sLabel(overall);

  // Use center.liveData if available (same source as InspectionView), fall back to prop
  const resolvedLiveData = center.liveData || liveData;

  const domains = [
    sc.d1 ?? sc.licensing ?? null,
    sc.d2 ?? sc.center ?? null,
    sc.d3 ?? sc.credentials ?? null,
    sc.d4 ?? sc.ratios ?? null,
    sc.d5 ?? null,
    sc.d6 ?? sc.family ?? null,
    sc.d7 ?? null,
  ];

  const realCounts = getDomainCounts(center, reg, resolvedLiveData);
  const alerts = center.alerts || [];
  const criticalAlerts = alerts.filter(a => a.type === 'danger');
  const warningAlerts = alerts.filter(a => a.type === 'warning');
  const effortItems = getEffortItems(realCounts);
  const actionList = getActions(domains, realCounts);
  const staff = center.staff || center._staff || [];
  const usingMockStaff = staff.length === 0;
  const staffSnap = getStaffSnapshot(usingMockStaff ? MOCK_STAFF : staff);

  // Quick wins: domains between 60-79% needing ≤ 1 action, or domains 40-59% needing ≤ 2
  const quickWins = domains
    .map((s, i) => ({ s, i, effort: effortItems[i] }))
    .filter(x => x.s !== null && x.s < 80 && x.effort.count <= 2 && x.effort.items.length > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);

  // Inspection readiness
  const lastInspDate = center.lastInspection || 'Unknown';
  const daysAgo = center.inspDaysAgo || 201;
  const nextInspDays = Math.max(0, 365 - daysAgo);
  const readyPct = overall !== null ? Math.min(100, Math.round(overall * 0.9 + 5)) : null;

  const statusStyle = {
    'Compliant':     { bg:'#eef7f2', border:'#a7d4ba', color:'#1e5c38' },
    'At Risk':       { bg:'#fdf4e7', border:'#e6b87a', color:'#7c4a00' },
    'Non-Compliant': { bg:'#fdf1f1', border:'#e8a0a0', color:'#7f1d1d' },
    'No data':       { bg:'#f1f5f9', border:'#cbd5e1', color:'#475569' },
  }[overallLabel] || { bg:'#f1f5f9', border:'#cbd5e1', color:'#475569' };

  const card = {
    background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'18px 20px',
  };

  return (
    <>
      {/* ── Hero row ─────────────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom:16, display:'flex', alignItems:'center', gap:24 }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
          paddingRight:24, borderRight:'1px solid #f1f5f9', flexShrink:0 }}>
          <Donut score={overall} color={overallColor}/>
          <div style={{ marginTop:8, padding:'3px 14px', borderRadius:20,
            background:statusStyle.bg, border:`1px solid ${statusStyle.border}`,
            fontSize:11.5, fontWeight:600, color:statusStyle.color }}>
            {overallLabel}
          </div>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:18, fontWeight:700, color:'#0f172a', marginBottom:2 }}>{center.name}</div>
          <div style={{ fontSize:13, color:'#64748b' }}>{center.city}, {center.state} · {center.agency}</div>
          <div style={{ display:'flex', gap:12, marginTop:12, flexWrap:'wrap' }}>
            {criticalAlerts.length > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px',
                borderRadius:8, background:'#fdf1f1', border:'1px solid #e8a0a0' }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:'#b91c1c' }}/>
                <span style={{ fontSize:12.5, fontWeight:600, color:'#7f1d1d' }}>
                  {criticalAlerts.length} critical alert{criticalAlerts.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {warningAlerts.length > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px',
                borderRadius:8, background:'#fdf4e7', border:'1px solid #e6b87a' }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:'#b45309' }}/>
                <span style={{ fontSize:12.5, fontWeight:600, color:'#7c4a00' }}>
                  {warningAlerts.length} warning{warningAlerts.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {criticalAlerts.length === 0 && warningAlerts.length === 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px',
                borderRadius:8, background:'#eef7f2', border:'1px solid #a7d4ba' }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:'#2d7a4f' }}/>
                <span style={{ fontSize:12.5, fontWeight:600, color:'#1e5c38' }}>No critical alerts</span>
              </div>
            )}
            <div style={{ fontSize:12.5, color:'#94a3b8', display:'flex', alignItems:'center' }}>
              Last inspection: {lastInspDate} · {center.inspResult}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 1: D1–D7 clickable tiles ────────────────────────────────── */}
      <div className="ov-domain-grid">
        {domains.map((score, i) => {
          const color = sColor(score);
          const effort = effortItems[i];
          return (
            <div key={i}
              onClick={() => onNavigate && onNavigate('inspection', i + 1)}
              style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10,
                padding:'12px 8px', textAlign:'center',
                borderTop:`3px solid ${score !== null ? color : '#e2e8f0'}`,
                cursor:'pointer', transition:'box-shadow 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow='none'}
              title={`Go to ${DOMAIN_LABELS[i]} data entry`}
            >
              <div style={{ fontSize:13, fontWeight:700, color:'#94a3b8', marginBottom:4 }}>
                D{i+1}
              </div>
              <div style={{ fontSize:18, fontWeight:800, color, lineHeight:1 }}>
                {score !== null ? `${score}%` : '—'}
              </div>
              <div style={{ fontSize:10, color:'#94a3b8', marginTop:4, lineHeight:1.3 }}>
                {DOMAIN_SHORT[i]}
              </div>
              {(() => {
                const rc = realCounts[i];
                return (
                  <>
                    {rc.issues.length > 0 && (
                      <div style={{ marginTop:6, fontSize:10, fontWeight:600,
                        color:'#b91c1c', background:'#fdf1f1', borderRadius:4, padding:'2px 4px' }}>
                        {rc.issues.length} item{rc.issues.length > 1 ? 's' : ''} not met
                      </div>
                    )}
                    {rc.nodata.length > 0 && (
                      <div style={{ marginTop:3, fontSize:10, fontWeight:600,
                        color:'#b45309', background:'#fdf4e7', borderRadius:4, padding:'2px 4px' }}>
                        {rc.nodata.length} not entered
                      </div>
                    )}
                    {rc.issues.length === 0 && rc.nodata.length === 0 && score !== null && score >= 80 && (
                      <div style={{ marginTop:6, fontSize:10, fontWeight:600,
                        color:'#2d7a4f', background:'#eef7f2', borderRadius:4, padding:'2px 4px' }}>
                        ✓ Compliant
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* ── Row 2: Inspection Readiness | State Benchmark | Effort to Compliant ── */}
      <div className="ov-three-col">

        {/* Inspection Readiness */}
        <div style={card}>
          <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:14 }}>
            Inspection Readiness
          </div>
          <div style={{ textAlign:'center', marginBottom:14,
            padding:'12px', background:'#f8fafc', borderRadius:8 }}>
            <div style={{ fontSize:11, color:'#94a3b8', marginBottom:4 }}>Est. next inspection</div>
            <div style={{ fontSize:26, fontWeight:800, color:'#0f172a' }}>
              {nextInspDays} <span style={{ fontSize:13, fontWeight:500, color:'#64748b' }}>days</span>
            </div>
            <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>
              Last: {lastInspDate}
            </div>
          </div>
          {readyPct !== null && (
            <div style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:11, color:'#64748b' }}>If inspected today</span>
                <span style={{ fontSize:12, fontWeight:700, color: sColor(readyPct) }}>{readyPct}% ready</span>
              </div>
              <div style={{ height:8, background:'#f1f5f9', borderRadius:4, overflow:'hidden' }}>
                <div style={{ width:`${readyPct}%`, height:'100%',
                  background: sColor(readyPct), borderRadius:4, transition:'width 0.5s' }}/>
              </div>
            </div>
          )}
          <div style={{ fontSize:11, fontWeight:600, color:'#94a3b8', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>
            Risk by domain
          </div>
          {domains.map((score, i) => {
            const risk = score === null ? 'No data' : score >= 80 ? 'Low' : score >= 60 ? 'Medium' : 'High';
            const riskColor = score === null ? '#94a3b8' : score >= 80 ? '#2d7a4f' : score >= 60 ? '#b45309' : '#b91c1c';
            const riskBg = score === null ? '#f1f5f9' : score >= 80 ? '#eef7f2' : score >= 60 ? '#fdf4e7' : '#fdf1f1';
            return (
              <div key={i} style={{ display:'flex', justifyContent:'space-between',
                alignItems:'center', padding:'5px 0',
                borderBottom: i < 6 ? '1px solid #f8fafc' : 'none' }}>
                <span style={{ fontSize:11.5, color:'#374151' }}>D{i+1} {DOMAIN_SHORT[i]}</span>
                <span style={{ fontSize:11, fontWeight:600, color:riskColor,
                  background:riskBg, padding:'1px 8px', borderRadius:4 }}>{risk}</span>
              </div>
            );
          })}
        </div>

        {/* State Benchmark — Bullet Chart */}
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>
              State Benchmark
            </div>
            <div style={{ fontSize:10, color:'#64748b', textAlign:'right', lineHeight:1.5 }}>
              vs CO average<br/>
              <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                <span style={{ display:'inline-block', width:10, height:3, background:'#4f5fa8', borderRadius:2 }}/>
                <span>state avg</span>
              </span>
            </div>
          </div>
          {domains.map((score, i) => (
            <BulletRow key={i} label={i+1} score={score} avg={CO_AVG[i]} isLast={i === 6}/>
          ))}
          <div style={{ marginTop:14, paddingTop:10, borderTop:'1px solid #f1f5f9',
            display:'flex', gap:16, fontSize:11, color:'#64748b' }}>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ display:'inline-block', width:10, height:3, background:'#4f5fa8',
                borderRadius:2, flexShrink:0 }}/>
              CO state avg
            </span>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ display:'inline-block', width:10, height:6,
                background:'#2d7a4f', borderRadius:1, flexShrink:0 }}/>
              This center
            </span>
            <span style={{ fontSize:10, color:'#94a3b8', marginLeft:'auto' }}>
              Mock benchmark data
            </span>
          </div>
        </div>

        {/* Effort to Compliant */}
        <div style={card}>
          <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:14 }}>
            Effort to Compliant
          </div>
          <div style={{ fontSize:11, color:'#64748b', marginBottom:12 }}>
            Actions needed to reach 80% per domain. Click to expand.
          </div>
          {domains.map((score, i) => {
            const effort = effortItems[i];
            const color = sColor(score);
            const isExpanded = expandedDomain === i;
            return (
              <div key={i} style={{ marginBottom:8 }}>
                <div
                  onClick={() => setExpandedDomain(isExpanded ? null : i)}
                  style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer',
                    padding:'6px 8px', borderRadius:6, background: isExpanded ? '#f8fafc' : 'transparent',
                    transition:'background 0.15s' }}
                  onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize:11, fontWeight:600, color:'#94a3b8', width:22 }}>D{i+1}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                      <span style={{ fontSize:11.5, color:'#374151' }}>{DOMAIN_SHORT[i]}</span>
                      {effort.count === 0
                        ? <span style={{ fontSize:10, fontWeight:600, color:'#2d7a4f' }}>✓ Done</span>
                        : <span style={{ fontSize:10, fontWeight:600, color,
                            background: score < 60 ? '#fdf1f1' : '#fdf4e7',
                            padding:'1px 6px', borderRadius:3 }}>
                            {effort.count} action{effort.count > 1 ? 's' : ''}
                          </span>
                      }
                    </div>
                    {effort.count > 0 && (
                      <div style={{ height:4, background:'#f1f5f9', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ width:`${score || 0}%`, height:'100%',
                          background: color, borderRadius:2 }}/>
                      </div>
                    )}
                  </div>
                  {effort.count > 0 && (
                    <span style={{ fontSize:10, color:'#94a3b8', flexShrink:0 }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  )}
                </div>
                {isExpanded && effort.items.length > 0 && (
                  <div style={{ marginLeft:30, marginTop:4, marginBottom:4 }}>
                    {effort.items.map((item, j) => (
                      <div key={j} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6,
                        padding:'5px 8px', marginBottom:3, borderRadius:5,
                        background:'#fdf4e7', border:'1px solid #e6b87a' }}>
                        <span style={{ display:'flex', alignItems:'flex-start', gap:6, flex:1 }}>
                          <span style={{ fontSize:11, color:'#b45309', marginTop:1, flexShrink:0 }}>→</span>
                          <span style={{ fontSize:11.5, color:'#7c4a00' }}>{item.label || item}</span>
                        </span>
                        {(item.fieldKey || item.subTab) && onNavigate && (
                          <button
                            onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('1core_navigate_dataentry', { detail: { fieldKey: item.fieldKey, subTab: item.subTab } })); onNavigate('dataentry', i+1); }}
                            style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:5,
                              border:'1px solid #cbd5e1', background:'white', color:'#374151', cursor:'pointer', flexShrink:0 }}>
                            Fix →
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Row 3: Today's Actions | Staff Snapshot ─────────────────────── */}
      <div className="ov-two-col-wide">

        {/* Today's Action List */}
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>Today's Action List</div>
            <span style={{ fontSize:11, color:'#94a3b8' }}>Auto-generated from compliance gaps</span>
          </div>
          <div style={{ fontSize:11, color:'#94a3b8', marginBottom:12, paddingBottom:10, borderBottom:'1px solid #f1f5f9' }}>
            Prioritised by severity — resolve critical items first
          </div>
          {actionList.length === 0 ? (
            <div style={{ fontSize:13, color:'#2d7a4f', padding:'12px', background:'#eef7f2', borderRadius:8 }}>
              ✓ No actions needed — all domains compliant
            </div>
          ) : (
            actionList.map((action, i) => (
              <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start',
                padding:'10px 12px', borderRadius:8, marginBottom:8,
                background: action.urgency === 'critical' ? '#fdf1f1' : '#fdf4e7',
                border: `1px solid ${action.urgency === 'critical' ? '#e8a0a0' : '#e6b87a'}` }}>
                <div style={{ flexShrink:0, marginTop:2 }}>
                  <span style={{ fontSize:11, fontWeight:700,
                    color: action.urgency === 'critical' ? '#b91c1c' : '#b45309',
                    background: action.urgency === 'critical' ? '#fee2e2' : '#fef3c7',
                    padding:'2px 6px', borderRadius:4 }}>
                    {action.domain}
                  </span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600,
                    color: action.urgency === 'critical' ? '#7f1d1d' : '#7c4a00',
                    lineHeight:1.4 }}>{action.label}</div>
                  <div style={{ fontSize:11.5, color:'#94a3b8', marginTop:2 }}>{action.detail}</div>
                </div>
                {action.fieldKey && onNavigate && (
                  <button onClick={() => { window.dispatchEvent(new CustomEvent('1core_navigate_dataentry', { detail: { fieldKey: action.fieldKey, subTab: action.subTab } })); onNavigate('dataentry'); }}
                    style={{ fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:5, flexShrink:0, alignSelf:'center',
                      border:'1px solid #cbd5e1', background:'white', color:'#374151', cursor:'pointer' }}>
                    Fix →
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Staff Compliance Snapshot */}
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>
              Staff Compliance Snapshot
            </div>
            {usingMockStaff && (
              <span style={{ fontSize:10, color:'#94a3b8', background:'#f1f5f9',
                padding:'2px 7px', borderRadius:4 }}>Sample data</span>
            )}
          </div>
          <>
              <div style={{ fontSize:11, color:'#94a3b8', marginBottom:14, paddingBottom:10,
                borderBottom:'1px solid #f1f5f9' }}>
                {staffSnap.total} staff members · D3 &amp; D5
              </div>
              <StaffBar label="CPR / First Aid current" ok={staffSnap.cprOk} total={staffSnap.total}/>
              <StaffBar label="Background check valid" ok={staffSnap.bgOk} total={staffSnap.total}/>
              <StaffBar label="Mandated reporter current" ok={staffSnap.mandatedOk} total={staffSnap.total}/>
              <StaffBar label="Physical exam on file" ok={staffSnap.physOk} total={staffSnap.total}/>
              <StaffBar label="Training hours (≥12 hrs)" ok={staffSnap.trainOk} total={staffSnap.total}/>
              <div style={{ marginTop:14, paddingTop:10, borderTop:'1px solid #f1f5f9',
                display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:11, color:'#64748b' }}>Overall staff compliance</span>
                <span style={{ fontSize:13, fontWeight:700,
                  color: sColor(Math.round(((staffSnap.cprOk + staffSnap.bgOk + staffSnap.mandatedOk + staffSnap.physOk + staffSnap.trainOk) / (staffSnap.total * 5)) * 100)) }}>
                  {Math.round(((staffSnap.cprOk + staffSnap.bgOk + staffSnap.mandatedOk + staffSnap.physOk + staffSnap.trainOk) / (staffSnap.total * 5)) * 100)}%
                </span>
              </div>
            </>
        </div>
      </div>

      {/* ── Row 4: Quick Wins + Active Alerts ───────────────────────────── */}
      <div className="ov-two-col">

        {/* Quick Wins */}
        <div style={{ ...card, border:'1px solid #e6b87a', background:'#fffbf5' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <span style={{ fontSize:16 }}>⚡</span>
            <div style={{ fontSize:13, fontWeight:700, color:'#7c4a00' }}>Quick Wins</div>
            <span style={{ fontSize:11, color:'#94a3b8', marginLeft:'auto' }}>
              Fix these to improve your score today
            </span>
          </div>
          <div style={{ fontSize:11, color:'#94a3b8', marginBottom:12, paddingBottom:10,
            borderBottom:'1px solid #e6b87a' }}>
            Domains within 1–2 actions of reaching 80%
          </div>
          {quickWins.length === 0 ? (
            <div style={{ fontSize:13, color:'#2d7a4f' }}>✓ All reachable domains are already compliant.</div>
          ) : (
            quickWins.map(({ s, i, effort }) => (
              <div key={i} style={{ padding:'10px 12px', borderRadius:8, marginBottom:8,
                background:'#fff', border:'1px solid #e6b87a',
                cursor:'pointer' }}
                onClick={() => onNavigate && onNavigate('inspection', i + 1)}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#7c4a00' }}>
                    D{i+1} · {DOMAIN_LABELS[i]}
                  </span>
                  <span style={{ fontSize:11, color:'#b45309', fontWeight:600 }}>
                    {s}% → 80% in {effort.count} action{effort.count > 1 ? 's' : ''}
                  </span>
                </div>
                {effort.items[0] && (
                  <div style={{ fontSize:12, color:'#64748b' }}>→ {effort.items[0]?.label || effort.items[0]}</div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Active Alerts */}
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <h3 style={{ fontSize:13, fontWeight:700, color:'#0f172a', margin:0 }}>Active Alerts</h3>
            {alerts.filter(a => a.type === 'danger').length > 0 && (
              <span style={{ fontSize:12, fontWeight:600, color:'#b91c1c' }}>
                {alerts.filter(a => a.type === 'danger').length} critical
              </span>
            )}
          </div>
          <div style={{ fontSize:11, color:'#94a3b8', marginBottom:12, paddingBottom:10,
            borderBottom:'1px solid #f1f5f9' }}>
            Ratio violations · Expiring documents · Missing required fields · State-specific requirements
          </div>
          {alerts.length === 0 ? (
            <div style={{ fontSize:13, color:'#64748b' }}>No active alerts.</div>
          ) : (
            alerts.slice(0, 4).map((a, i) => (
              <div key={i} style={{ padding:'9px 12px', borderRadius:8, marginBottom:8,
                background: a.type==='danger'?'#fdf1f1':a.type==='warning'?'#fdf4e7':'#eef4fc',
                border:`1px solid ${a.type==='danger'?'#e8a0a0':a.type==='warning'?'#e6b87a':'#a8c4e0'}` }}>
                <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', marginTop:5, flexShrink:0,
                    background: a.type==='danger'?'#b91c1c':a.type==='warning'?'#b45309':'#2563eb' }}/>
                  <div>
                    <div style={{ fontSize:12.5, fontWeight:600, color:'#1e293b' }}>{a.title}</div>
                    <div style={{ fontSize:11.5, color:'#64748b', marginTop:2 }}>{a.detail}</div>
                  </div>
                </div>
              </div>
            ))
          )}
          {alerts.length > 4 && (
            <div style={{ fontSize:12.5, color:'#64748b', marginTop:4, textAlign:'center' }}>
              +{alerts.length - 4} more — view Alerts tab
            </div>
          )}
        </div>
      </div>
    </>
  );
}

import React, { useState, useMemo } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const sColor = s => s>=80?'#2d7a4f':s>=60?'#b45309':s!=null?'#b91c1c':'#94a3b8';
const sBg    = s => s>=80?'#eef7f2':s>=60?'#fdf4e7':s!=null?'#fdf1f1':'#f8fafc';

const PERIODS = [
  { key:'Dec 09, 2025', label:'Dec 2025' },
  { key:'Jan 18, 2026', label:'Jan 2026' },
  { key:'Feb 27, 2026', label:'Feb 2026' },
  { key:'Apr 08, 2026', label:'Apr 2026' },
  { key:'May 18, 2026', label:'May 2026' },
];

// Domain keys available in history
const DOMAIN_HISTORY = [
  { key:'ratios',      label:'D4 · Ratios & Supervision',      color:'#b45309' },
  { key:'credentials', label:'D3 · Personnel & Qualifications', color:'#7c3aed' },
  { key:'center',      label:'D2 · Physical Environment',       color:'#0891b2' },
  { key:'family',      label:'D6 · Children\'s Records',        color:'#be185d' },
];

const CENTER_COLORS = [
  '#4f5fa8','#0891b2','#7c3aed','#b45309','#15803d',
  '#be185d','#0f766e','#1d4ed8','#92400e','#065f46',
  '#7e22ce','#0369a1','#9a3412','#166534','#1e40af',
  '#6b21a8','#155e75','#78350f','#064e3b','#1e3a5f',
  '#4a1942','#0c4a6e','#7c2d12','#14532d','#334155',
];

function getHistoryVal(seed, dateKey, field) {
  const entry = (seed._history || []).find(h => h.date === dateKey);
  return entry?.[field] ?? null;
}

function buildNetworkSeries(centers, lionheartSeed) {
  return PERIODS.map(p => {
    const scores = centers.map(c => {
      const seed = lionheartSeed[c.id] || {};
      return getHistoryVal(seed, p.key, 'overall');
    }).filter(v => v != null);
    return {
      label: p.label,
      avg: scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : null,
      count: scores.length,
    };
  });
}

function buildCenterSeries(centers, lionheartSeed) {
  return centers.map((c, i) => {
    const seed = lionheartSeed[c.id] || {};
    const points = PERIODS.map(p => getHistoryVal(seed, p.key, 'overall'));
    const first  = points[0];
    const last   = points[points.length - 1];
    return {
      id: c.id,
      name: (c.name||'').replace('Lionheart - ',''),
      fullName: c.name,
      city: c.city, state: c.state,
      color: CENTER_COLORS[i % CENTER_COLORS.length],
      points,
      first, last,
      trend: (first!=null && last!=null) ? last - first : null,
    };
  }).filter(c => c.first != null && c.last != null);
}

function buildDomainSeries(centers, lionheartSeed) {
  return DOMAIN_HISTORY.map(d => ({
    ...d,
    series: PERIODS.map(p => {
      const vals = centers.map(c => {
        const seed = lionheartSeed[c.id] || {};
        return getHistoryVal(seed, p.key, d.key);
      }).filter(v => v != null);
      return {
        label: p.label,
        avg: vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null,
      };
    }),
  }));
}

// ── Network avg line chart ────────────────────────────────────────────────────
function NetworkLineChart({ series }) {
  const W=680, H=180, PAD={top:20,right:20,bottom:30,left:36};
  const cW=W-PAD.left-PAD.right, cH=H-PAD.top-PAD.bottom;
  const n=PERIODS.length;
  const xPos = i => PAD.left + (i/(n-1))*cW;
  const yPos = v => PAD.top + cH - (v/100)*cH;
  const valid = series.map((p,i) => p.avg!=null?[i,p.avg]:null).filter(Boolean);
  const path  = valid.map(([i,v],idx) => `${idx===0?'M':'L'}${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`).join(' ');
  const area  = valid.length>=2 ? path+` L${xPos(valid[valid.length-1][0])},${yPos(0)} L${xPos(valid[0][0])},${yPos(0)} Z` : '';
  const last  = series[series.length-1]?.avg;
  const c     = sColor(last);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:H}}>
      {[20,40,60,80,100].map(v=>(
        <g key={v}>
          <line x1={PAD.left} y1={yPos(v)} x2={W-PAD.right} y2={yPos(v)} stroke="#f1f5f9" strokeWidth="1"/>
          <text x={PAD.left-5} y={yPos(v)+4} fontSize="9" fill="#94a3b8" textAnchor="end">{v}%</text>
        </g>
      ))}
      <line x1={PAD.left} y1={yPos(80)} x2={W-PAD.right} y2={yPos(80)} stroke="#2d7a4f" strokeWidth="1" strokeDasharray="4,3" opacity="0.35"/>
      <line x1={PAD.left} y1={yPos(60)} x2={W-PAD.right} y2={yPos(60)} stroke="#b45309" strokeWidth="1" strokeDasharray="4,3" opacity="0.35"/>
      {PERIODS.map((p,i)=>(
        <text key={p.key} x={xPos(i)} y={H-6} fontSize="9.5" fill="#94a3b8" textAnchor="middle">{p.label}</text>
      ))}
      {area && <path d={area} fill={c} opacity="0.07"/>}
      {path && <path d={path} stroke={c} strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round"/>}
      {valid.map(([i,v])=>(
        <g key={i}>
          <circle cx={xPos(i)} cy={yPos(v)} r="4" fill={c} stroke="#fff" strokeWidth="2"/>
          <text x={xPos(i)} y={yPos(v)-10} fontSize="10" fill={c} fontWeight="700" textAnchor="middle">{v}%</text>
        </g>
      ))}
    </svg>
  );
}

// ── Domain mini chart ─────────────────────────────────────────────────────────
function DomainMiniChart({ label, color, series }) {
  const W=200, H=90, PAD={top:14,right:8,bottom:22,left:28};
  const cW=W-PAD.left-PAD.right, cH=H-PAD.top-PAD.bottom;
  const n=series.length;
  const xPos = i => PAD.left + (i/(n-1))*cW;
  const yPos = v => PAD.top + cH - (v/100)*cH;
  const valid = series.map((p,i) => p.avg!=null?[i,p.avg]:null).filter(Boolean);
  const path  = valid.map(([i,v],idx) => `${idx===0?'M':'L'}${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`).join(' ');
  const first = valid[0]?.[1], last = valid[valid.length-1]?.[1];
  const delta = (first!=null&&last!=null) ? last-first : null;

  return (
    <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, padding:'10px 12px', flex:1, minWidth:180 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#64748b' }}>{label}</div>
        {delta!=null && (
          <div style={{ fontSize:11, fontWeight:800, color: delta>=0?'#2d7a4f':'#b91c1c' }}>
            {delta>=0?'+':''}{delta}pts
          </div>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:H}}>
        {[40,60,80].map(v=>(
          <line key={v} x1={PAD.left} y1={yPos(v)} x2={W-PAD.right} y2={yPos(v)}
            stroke="#f1f5f9" strokeWidth="1"/>
        ))}
        <line x1={PAD.left} y1={yPos(80)} x2={W-PAD.right} y2={yPos(80)}
          stroke="#2d7a4f" strokeWidth="1" strokeDasharray="3,2" opacity="0.3"/>
        {series.map((p,i)=>(
          <text key={p.label} x={xPos(i)} y={H-4} fontSize="7.5" fill="#94a3b8" textAnchor="middle">
            {p.label.split(' ')[0]}
          </text>
        ))}
        {[40,60,80].map(v=>(
          <text key={v} x={PAD.left-3} y={yPos(v)+3} fontSize="7" fill="#cbd5e1" textAnchor="end">{v}</text>
        ))}
        {path && <path d={path} stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round"/>}
        {valid.map(([i,v])=>(
          <circle key={i} cx={xPos(i)} cy={yPos(v)} r="3" fill={color} stroke="#fff" strokeWidth="1.5"/>
        ))}
        {last!=null && (
          <text x={xPos(valid[valid.length-1][0])+6} y={yPos(last)+4} fontSize="9" fill={color} fontWeight="800">
            {last}%
          </text>
        )}
      </svg>
    </div>
  );
}

// ── Interactive per-center line chart ────────────────────────────────────────
function PerCenterChart({ series, networkSeries }) {
  const [visible, setVisible] = useState(new Set(['__network__']));

  function toggle(id) {
    setVisible(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const W = 680, H = 260, PAD = { top:20, right:20, bottom:32, left:36 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top  - PAD.bottom;
  const n  = PERIODS.length;
  const xPos = i => PAD.left + (i/(n-1)) * cW;
  const yPos = v => PAD.top + cH - (v/100) * cH;

  function makePath(points) {
    const valid = points.map((v,i) => v!=null ? [i,v] : null).filter(Boolean);
    if (valid.length < 2) return '';
    return valid.map(([i,v], idx) => `${idx===0?'M':'L'}${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`).join(' ');
  }

  const netPoints  = networkSeries.map(p => p.avg);
  const netPath    = makePath(netPoints);
  const netLast    = netPoints[netPoints.length-1];
  const netColor   = sColor(netLast);
  const netArea    = (() => {
    const valid = netPoints.map((v,i) => v!=null?[i,v]:null).filter(Boolean);
    if (valid.length < 2) return '';
    const line = valid.map(([i,v],idx)=>`${idx===0?'M':'L'}${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`).join(' ');
    return line + ` L${xPos(valid[valid.length-1][0])},${yPos(0)} L${xPos(valid[0][0])},${yPos(0)} Z`;
  })();

  return (
    <div>
      {/* Chart */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, padding:'16px 16px 8px', marginBottom:14 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:H }}>
          {/* Grid */}
          {[20,40,60,80,100].map(v => (
            <g key={v}>
              <line x1={PAD.left} y1={yPos(v)} x2={W-PAD.right} y2={yPos(v)} stroke="#f1f5f9" strokeWidth="1"/>
              <text x={PAD.left-5} y={yPos(v)+4} fontSize="9" fill="#94a3b8" textAnchor="end">{v}%</text>
            </g>
          ))}
          {/* Threshold lines */}
          <line x1={PAD.left} y1={yPos(80)} x2={W-PAD.right} y2={yPos(80)} stroke="#2d7a4f" strokeWidth="1" strokeDasharray="4,3" opacity="0.35"/>
          <line x1={PAD.left} y1={yPos(60)} x2={W-PAD.right} y2={yPos(60)} stroke="#b45309" strokeWidth="1" strokeDasharray="4,3" opacity="0.35"/>
          <text x={W-PAD.right} y={yPos(80)-5} fontSize="8.5" fill="#2d7a4f" textAnchor="end" opacity="0.55">Compliant ≥80%</text>
          <text x={W-PAD.right} y={yPos(60)-5} fontSize="8.5" fill="#b45309" textAnchor="end" opacity="0.55">At Risk ≥60%</text>
          {/* X labels */}
          {PERIODS.map((p,i) => (
            <text key={p.key} x={xPos(i)} y={H-8} fontSize="9.5" fill="#94a3b8" textAnchor="middle">{p.label}</text>
          ))}

          {/* Center lines (drawn first, under network avg) */}
          {series.filter(c => visible.has(c.id)).map(c => {
            const path = makePath(c.points);
            if (!path) return null;
            return (
              <g key={c.id}>
                <path d={path} stroke={c.color} strokeWidth="1.8" fill="none"
                  strokeLinejoin="round" strokeLinecap="round" opacity="0.8"/>
                {c.points.map((v,i) => v!=null && (
                  <circle key={i} cx={xPos(i)} cy={yPos(v)} r="3"
                    fill={c.color} stroke="#fff" strokeWidth="1.5"/>
                ))}
              </g>
            );
          })}

          {/* Network avg (always on top) */}
          {visible.has('__network__') && netArea && (
            <path d={netArea} fill={netColor} opacity="0.07"/>
          )}
          {visible.has('__network__') && netPath && (
            <path d={netPath} stroke={netColor} strokeWidth="2.5" fill="none"
              strokeLinejoin="round" strokeLinecap="round"/>
          )}
          {visible.has('__network__') && netPoints.map((v,i) => v!=null && (
            <g key={i}>
              <circle cx={xPos(i)} cy={yPos(v)} r="4" fill={netColor} stroke="#fff" strokeWidth="2"/>
              <text x={xPos(i)} y={yPos(v)-10} fontSize="10" fill={netColor} fontWeight="700" textAnchor="middle">{v}%</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        {/* Network avg toggle */}
        <button onClick={() => toggle('__network__')} style={{
          display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20,
          border:`1.5px solid ${visible.has('__network__') ? netColor : '#e2e8f0'}`,
          background: visible.has('__network__') ? netColor+'14' : '#fff',
          cursor:'pointer', fontSize:11, fontWeight:700,
          color: visible.has('__network__') ? netColor : '#94a3b8',
        }}>
          <div style={{ width:14, height:3, borderRadius:2, background: visible.has('__network__') ? netColor : '#e2e8f0' }}/>
          Network avg
          {visible.has('__network__') && netLast!=null && (
            <span style={{ fontWeight:800 }}>{netLast}%</span>
          )}
        </button>

        {series.map(c => {
          const on = visible.has(c.id);
          return (
            <button key={c.id} onClick={() => toggle(c.id)} style={{
              display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20,
              border:`1.5px solid ${on ? c.color : '#e2e8f0'}`,
              background: on ? c.color+'14' : '#fff',
              cursor:'pointer', fontSize:11, fontWeight:600,
              color: on ? '#1e293b' : '#94a3b8',
            }}>
              <div style={{ width:14, height:3, borderRadius:2, background: on ? c.color : '#e2e8f0' }}/>
              {c.name}
              {on && c.last!=null && (
                <span style={{ fontWeight:800, color:sColor(c.last) }}>{c.last}%</span>
              )}
            </button>
          );
        })}

        {visible.size > 1 && (
          <button onClick={() => setVisible(new Set(['__network__']))} style={{
            padding:'4px 10px', borderRadius:20, border:'1px solid #e2e8f0',
            background:'#f8fafc', cursor:'pointer', fontSize:11, color:'#94a3b8',
          }}>
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function TrendsTab({ centers, lionheartSeed }) {
  const networkSeries = useMemo(() => buildNetworkSeries(centers, lionheartSeed), [centers, lionheartSeed]);
  const centerSeries  = useMemo(() => buildCenterSeries(centers, lionheartSeed),  [centers, lionheartSeed]);
  const domainSeries  = useMemo(() => buildDomainSeries(centers, lionheartSeed),  [centers, lionheartSeed]);

  const first = networkSeries[0]?.avg;
  const last  = networkSeries[networkSeries.length-1]?.avg;
  const delta = (first!=null && last!=null) ? last-first : null;

  const movers = useMemo(() => [...centerSeries]
    .filter(c => c.trend!=null)
    .sort((a,b) => Math.abs(b.trend)-Math.abs(a.trend))
    .slice(0,6), [centerSeries]);

  return (
    <div style={{ padding:'22px 26px' }}>

      {/* ── 1. Network avg trend ── */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:14, marginBottom:12, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:11.5, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:2 }}>
              Network average — 6 month trend
            </div>
            <div style={{ fontSize:12.5, color:'#64748b' }}>Dec 2025 → May 2026 · All 25 Lionheart centers</div>
          </div>
          {delta!=null && (
            <span style={{
              fontSize:13, fontWeight:700, padding:'3px 12px', borderRadius:20,
              background: delta>=0?'#eef7f2':'#fdf1f1',
              color: delta>=0?'#2d7a4f':'#b91c1c',
              border:`1px solid ${delta>=0?'#a7d4ba':'#e8a0a0'}`,
            }}>
              {delta>=0?'+':''}{delta} pts over 6 months
            </span>
          )}
        </div>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, padding:'16px 16px 8px' }}>
          <NetworkLineChart series={networkSeries} />
        </div>
      </div>

      {/* ── 2. Domain trends ── */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:11.5, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>
          Domain trends · network average
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {domainSeries.map(d => (
            <DomainMiniChart key={d.key} label={d.label} color={d.color} series={d.series} />
          ))}
        </div>
        <div style={{ fontSize:11, color:'#94a3b8', marginTop:8 }}>
          Based on available history data · D1, D5, D7 history not yet tracked in seed
        </div>
      </div>

      {/* ── 3. Biggest movers ── */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:11.5, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>
          Biggest movers · Dec 2025 → May 2026
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:8 }}>
          {movers.map(c => (
            <div key={c.id} style={{
              display:'flex', alignItems:'center', gap:10,
              background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, padding:'10px 12px',
            }}>
              <div style={{
                width:34, height:34, borderRadius:6, flexShrink:0,
                background: c.trend>0?'#eef7f2':c.trend<0?'#fdf1f1':'#f8fafc',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:16, color: c.trend>0?'#2d7a4f':c.trend<0?'#b91c1c':'#94a3b8',
              }}>
                {c.trend>0?'↑':c.trend<0?'↓':'→'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12.5, fontWeight:600, color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {c.name}
                </div>
                <div style={{ fontSize:10.5, color:'#94a3b8' }}>{c.city}, {c.state}</div>
              </div>
              <div style={{
                fontSize:13, fontWeight:800, flexShrink:0,
                color: c.trend>0?'#2d7a4f':c.trend<0?'#b91c1c':'#64748b',
              }}>
                {c.trend>0?'+':''}{c.trend}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Per-center interactive chart ── */}
      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:11.5, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>
          Per-center trends · Dec 2025 → May 2026
        </div>
        <div style={{ fontSize:12.5, color:'#64748b', marginBottom:14 }}>
          Network average shown by default · click any center in the legend to add or remove it
        </div>
        <PerCenterChart series={centerSeries} networkSeries={networkSeries} />
      </div>

    </div>
  );
}

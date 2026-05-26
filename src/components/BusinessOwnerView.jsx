import React, { useState, useMemo } from 'react';
import NetworkIntelligenceTab from './NetworkIntelligenceTab';
import TrendsTab from './TrendsTab';
import DataEntryTab          from './tabs/DataEntryTab';
import AuditSimTab           from './tabs/AuditSimTab';
import HistoryTab            from './tabs/HistoryTab';
import CorrectiveActionPlanTab from './tabs/CorrectiveActionPlanTab';
import InspectionView        from './tabs/InspectionView';

// ── Score helpers (muted palette matching app-wide) ───────────────────────────
const sColor = s => s>=80?'#2d7a4f':s>=60?'#b45309':s!==null&&s!==undefined?'#b91c1c':'#64748b';
const sLabel = s => s>=80?'Compliant':s>=60?'At Risk':s!==null&&s!==undefined?'Non-Compliant':'No Data';
const sBg    = s => s>=80?'#eef7f2':s>=60?'#fdf4e7':s!==null&&s!==undefined?'#fdf1f1':'#f8fafc';
const sBd    = s => s>=80?'#a7d4ba':s>=60?'#e6b87a':s!==null&&s!==undefined?'#e8a0a0':'#e2e8f0';

const D_KEYS   = ['d1','d2','d3','d4','d5','d6','d7'];
const D_LABELS = ['D1','D2','D3','D4','D5','D6','D7'];
const D_SHORT  = ['Licensing','Physical','Personnel','Ratios','Staff Health','Children','Emergency'];
const D_COLORS = ['#4f5fa8','#0891b2','#7c3aed','#b45309','#15803d','#be185d','#0f766e'];

// ── Center tile ───────────────────────────────────────────────────────────────
function CenterTile({ center, onSelect }) {
  const s = center.score;
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={() => onSelect(center.id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:'#fff', border:`1.5px solid ${hov ? sColor(s)+'80' : sBd(s)}`,
        borderRadius:10, overflow:'hidden', cursor:'pointer',
        boxShadow: hov ? `0 4px 14px ${sColor(s)}18` : '0 1px 3px rgba(0,0,0,0.05)',
        transform: hov ? 'translateY(-2px)' : 'none',
        transition:'all 0.15s', display:'flex', flexDirection:'column',
      }}
    >
      <div style={{ height:3, background:sColor(s) }} />
      <div style={{ padding:'12px 14px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:26, fontWeight:800, color:sColor(s), lineHeight:1, letterSpacing:'-0.02em' }}>
            {s!=null ? `${s}%` : '—'}
          </span>
          <span style={{
            fontSize:9.5, fontWeight:700, padding:'2px 7px', borderRadius:20,
            background:sBg(s), color:sColor(s), border:`1px solid ${sBd(s)}`,
            textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap',
          }}>
            {sLabel(s)}
          </span>
        </div>
        <div style={{ fontSize:12.5, fontWeight:700, color:'#1e293b', lineHeight:1.3, marginBottom:2 }}>
          {center.name}
        </div>
        <div style={{ fontSize:11, color:'#94a3b8', marginBottom:10 }}>
          {[center.city, center.state].filter(Boolean).join(', ')}
        </div>
        {center.domainScores && (
          <>
            <div style={{ display:'flex', gap:3, alignItems:'flex-end', height:20, marginBottom:3 }}>
              {D_KEYS.map((k, i) => {
                const v = center.domainScores[k];
                const hasV = v!=null;
                const h = hasV ? Math.max(3, Math.round(v*20/100)) : 3;
                const c2 = !hasV ? '#e2e8f0' : v>=80 ? '#2d7a4f' : v>=60 ? '#b45309' : '#b91c1c';
                return (
                  <div key={k} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center' }}>
                    <div style={{ width:'100%', height:h, background:c2, borderRadius:2, opacity:hasV?1:0.4 }}
                      title={`${D_SHORT[i]}: ${hasV?v+'%':'No data'}`} />
                  </div>
                );
              })}
            </div>
            <div style={{ display:'flex', gap:3 }}>
              {D_LABELS.map(d => (
                <div key={d} style={{ flex:1, textAlign:'center', fontSize:8, fontWeight:700, color:'#94a3b8' }}>{d}</div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Status group ──────────────────────────────────────────────────────────────
function StatusGroup({ label, score, centers, onSelect, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!centers.length) return null;
  return (
    <div style={{ marginBottom:24 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display:'flex', alignItems:'center', gap:10, width:'100%',
          background:'none', border:'none', cursor:'pointer',
          padding:'0 0 10px', borderBottom:'1px solid #f1f5f9', marginBottom:12,
        }}
      >
        <span style={{
          fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
          background:sBg(score), color:sColor(score), border:`1px solid ${sBd(score)}`,
          textTransform:'uppercase', letterSpacing:'0.05em',
        }}>{label}</span>
        <span style={{ fontSize:12.5, fontWeight:600, color:'#64748b' }}>
          {centers.length} center{centers.length!==1?'s':''}
        </span>
        <span style={{ marginLeft:'auto', fontSize:10.5, color:'#94a3b8' }}>{open?'▲':'▼'}</span>
      </button>
      {open && (
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(195px, 1fr))', gap:10,
        }}>
          {centers.map(c => <CenterTile key={c.id} center={c} onSelect={onSelect} />)}
        </div>
      )}
    </div>
  );
}

// ── Domain health tile ────────────────────────────────────────────────────────
function DomainTile({ label, tag, color, avg }) {
  const hasVal = avg!=null;
  const barColor = !hasVal ? '#e2e8f0' : avg>=80 ? '#2d7a4f' : avg>=60 ? '#b45309' : '#b91c1c';
  return (
    <div style={{
      background:'#fff', border:'1px solid #e2e8f0', borderRadius:10,
      padding:'12px 14px', flex:1, minWidth:0,
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <span style={{ fontSize:10, fontWeight:700, color, letterSpacing:'0.04em' }}>{tag}</span>
        <span style={{ fontSize:15, fontWeight:800, color: hasVal ? barColor : '#94a3b8' }}>
          {hasVal ? `${avg}%` : '—'}
        </span>
      </div>
      <div style={{ height:4, background:'#f1f5f9', borderRadius:2, overflow:'hidden' }}>
        <div style={{ width:`${hasVal?avg:0}%`, height:'100%', background:barColor, borderRadius:2 }} />
      </div>
      <div style={{ fontSize:10, color:'#94a3b8', marginTop:5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
        {label}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BusinessOwnerView({
  network = {},
  centers = [],
  scoreColor,
  scoreLabel,
  allData = {},
  lionheartSeed = {},
  onSelectCenter,
  allCentersMap = [],
  getRegForUI,
}) {
  const [boTab, setBoTab] = useState('overview');
  const [drillCenter, setDrillCenter] = useState(null); // {id, name, state, ...}
  const [drillTab, setDrillTab]       = useState('data');
  const [drillLiveData, setDrillLiveData] = useState({});

  // Load flat liveData for drilled center from localStorage
  const loadDrillData = (centerId) => {
    try {
      const raw = JSON.parse(localStorage.getItem('1core_compliance_v6') || '{}');
      return raw[centerId] || {};
    } catch { return {}; }
  };
  const saveDrillData = (centerId, key, val) => {
    try {
      const raw = JSON.parse(localStorage.getItem('1core_compliance_v6') || '{}');
      if (!raw[centerId]) raw[centerId] = {};
      raw[centerId][key] = val;
      localStorage.setItem('1core_compliance_v6', JSON.stringify(raw));
      setDrillLiveData(prev => ({ ...prev, [key]: val }));
    } catch {}
  };

  const openDrill = (centerId) => {
    const found = enriched.find(c => c.id === centerId) || { id: centerId };
    setDrillCenter(found);
    setDrillTab('data');
    setDrillLiveData(loadDrillData(centerId));
  };
  const closeDrill = () => { setDrillCenter(null); setDrillLiveData({}); };

  const enriched = useMemo(() => centers.map(c => {
    const seed = lionheartSeed[c.id] || {};
    const s = seed._scores || {};
    return {
      ...c,
      domainScores: {
        d1: s.d1 ?? s.licensing   ?? null,
        d2: s.d2 ?? s.center      ?? null,
        d3: s.d3 ?? s.credentials ?? null,
        d4: s.d4 ?? s.ratios      ?? null,
        d5: s.d5                  ?? null,
        d6: s.d6 ?? s.family      ?? null,
        d7: s.d7                  ?? null,
      },
    };
  }), [centers, lionheartSeed]);

  const compliant    = enriched.filter(c => c.score >= 80);
  const atRisk       = enriched.filter(c => c.score >= 60 && c.score < 80);
  const nonCompliant = enriched.filter(c => c.score != null && c.score < 60);
  const noData       = enriched.filter(c => c.score == null);
  const total        = enriched.length;
  const avg          = network.networkScore ?? null;

  const domainAvgs = useMemo(() => D_KEYS.map(k => {
    const vals = enriched.map(c => c.domainScores?.[k]).filter(v => v!=null);
    return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null;
  }), [enriched]);

  const stateBreakdown = network.stateBreakdown || [];
  const networkAlerts  = network.networkAlerts  || [];

  // ── Tab content ──────────────────────────────────────────────────────────────
  const overviewContent = (
    <div style={{ padding:'22px 26px' }}>

      {/* Header + avg pill */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:18, flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:200 }}>
          <h2 style={{ margin:'0 0 2px', fontSize:20, fontWeight:800, color:'#0f172a', letterSpacing:'-0.02em' }}>
            Network Compliance
          </h2>
          <div style={{ fontSize:13, color:'#94a3b8' }}>
            {total} centers · {network.states?.length||0} states
          </div>
        </div>
        <div style={{
          background:sBg(avg), border:`1.5px solid ${sBd(avg)}`,
          borderRadius:12, padding:'10px 18px', textAlign:'center', flexShrink:0,
        }}>
          <div style={{ fontSize:26, fontWeight:800, color:sColor(avg), lineHeight:1, letterSpacing:'-0.02em' }}>
            {avg!=null ? `${avg}%` : '—'}
          </div>
          <div style={{ fontSize:10, fontWeight:700, color:sColor(avg), marginTop:2, textTransform:'uppercase', letterSpacing:'0.06em' }}>
            Network avg
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {[
          { label:'Total Centers',   val:total,              color:'#1e293b', bg:'#f8fafc', bd:'#e2e8f0' },
          { label:'Fully Compliant', val:compliant.length,   color:'#2d7a4f', bg:'#eef7f2', bd:'#a7d4ba', sub:'≥ 80%' },
          { label:'At Risk',         val:atRisk.length,      color:'#b45309', bg:'#fdf4e7', bd:'#e6b87a', sub:'60–79%' },
          { label:'Non-Compliant',   val:nonCompliant.length,color:'#b91c1c', bg:'#fdf1f1', bd:'#e8a0a0', sub:'< 60%' },
          { label:'No Data',         val:noData.length,      color:'#64748b', bg:'#f8fafc', bd:'#e2e8f0', sub:'Not entered' },
        ].map(k => (
          <div key={k.label} style={{
            flex:1, minWidth:80, background:k.bg, border:`1px solid ${k.bd}`, borderRadius:10, padding:'11px 13px',
          }}>
            <div style={{ fontSize:11, color:'#64748b', marginBottom:3, whiteSpace:'nowrap' }}>{k.label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:k.color, lineHeight:1, letterSpacing:'-0.02em' }}>{k.val}</div>
            {k.sub && <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Distribution bar */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex', height:7, borderRadius:4, overflow:'hidden', gap:2 }}>
          {[
            { n:compliant.length,    c:'#2d7a4f' },
            { n:atRisk.length,       c:'#b45309' },
            { n:nonCompliant.length, c:'#b91c1c' },
            { n:noData.length,       c:'#e2e8f0' },
          ].map((seg,i) => {
            const pct = total>0 ? (seg.n/total)*100 : 0;
            if (!pct) return null;
            return <div key={i} style={{ width:`${pct}%`, background:seg.c, minWidth:3 }} />;
          })}
        </div>
        <div style={{ display:'flex', gap:14, marginTop:6, flexWrap:'wrap' }}>
          {[
            { label:'Compliant',     c:'#2d7a4f', n:compliant.length    },
            { label:'At Risk',       c:'#b45309', n:atRisk.length       },
            { label:'Non-Compliant', c:'#b91c1c', n:nonCompliant.length },
            { label:'No Data',       c:'#94a3b8', n:noData.length       },
          ].filter(s=>s.n>0).map(s => (
            <div key={s.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11.5, color:'#64748b' }}>
              <div style={{ width:8, height:8, borderRadius:2, background:s.c }} />
              {s.label} — {s.n}
            </div>
          ))}
        </div>
      </div>

      {/* Domain health strip */}
      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:11.5, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>
          Domain health · network average
        </div>
        <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
          {D_KEYS.map((k,i) => (
            <DomainTile key={k} tag={D_LABELS[i]} label={D_SHORT[i]} color={D_COLORS[i]} avg={domainAvgs[i]} />
          ))}
        </div>
      </div>

      {/* State breakdown + Network alerts */}
      <div className="ov-two-col">
        {stateBreakdown.length > 0 && (
          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:11.5, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>
              Compliance by state
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {stateBreakdown.map(st => (
                <div key={st.abbr} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{
                    fontSize:11, fontWeight:700, width:26, textAlign:'center',
                    padding:'2px 0', borderRadius:4, background:sBg(st.score), color:sColor(st.score),
                  }}>{st.abbr}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:12, color:'#1e293b' }}>{st.state}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:sColor(st.score) }}>
                        {st.score!=null ? `${st.score}%` : '—'}
                      </span>
                    </div>
                    <div style={{ height:4, background:'#f1f5f9', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ width:`${st.score||0}%`, height:'100%', background:sColor(st.score), borderRadius:2 }} />
                    </div>
                  </div>
                  <span style={{ fontSize:10.5, color:'#94a3b8', whiteSpace:'nowrap' }}>
                    {st.centers} ctr{st.centers!==1?'s':''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {networkAlerts.length > 0 && (
          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:11.5, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>
              Network-wide alerts
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {networkAlerts.map((a,i) => {
                const dot = a.type==='danger'?'#b91c1c':a.type==='warning'?'#b45309':'#4f5fa8';
                const bg2 = a.type==='danger'?'#fdf1f1':a.type==='warning'?'#fdf4e7':'#f0f1fc';
                const bd2 = a.type==='danger'?'#e8a0a0':a.type==='warning'?'#e6b87a':'#c7cbed';
                return (
                  <div key={i} style={{
                    display:'flex', gap:8, alignItems:'flex-start',
                    background:bg2, border:`1px solid ${bd2}`, borderRadius:7, padding:'8px 10px',
                  }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:dot, marginTop:5, flexShrink:0 }} />
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:'#1e293b', lineHeight:1.3 }}>{a.text}</div>
                      {a.detail && <div style={{ fontSize:11, color:'#64748b', marginTop:1 }}>{a.detail}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* All centers grouped */}
      <div style={{ fontSize:11.5, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:14 }}>
        All {total} centers — compliance status
      </div>
      <StatusGroup label="Non-Compliant" score={40}   centers={nonCompliant} onSelect={openDrill} defaultOpen={true}  />
      <StatusGroup label="At Risk"       score={70}   centers={atRisk}       onSelect={openDrill} defaultOpen={true}  />
      <StatusGroup label="Compliant"     score={90}   centers={compliant}    onSelect={openDrill} defaultOpen={true}  />
      <StatusGroup label="No Data"       score={null} centers={noData}       onSelect={openDrill} defaultOpen={false} />
    </div>
  );

  const alertsContent = (
    <div style={{ padding:'22px 26px' }}>
      <div style={{ fontSize:11.5, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:14 }}>
        Network-wide alerts
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {networkAlerts.map((a,i) => {
          const dot = a.type==='danger'?'#b91c1c':a.type==='warning'?'#b45309':'#4f5fa8';
          const bg2 = a.type==='danger'?'#fdf1f1':a.type==='warning'?'#fdf4e7':'#f0f1fc';
          const bd2 = a.type==='danger'?'#e8a0a0':a.type==='warning'?'#e6b87a':'#c7cbed';
          return (
            <div key={i} style={{
              display:'flex', gap:10, alignItems:'flex-start',
              background:bg2, border:`1px solid ${bd2}`, borderRadius:8, padding:'10px 14px',
            }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:dot, marginTop:5, flexShrink:0 }} />
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'#1e293b' }}>{a.text}</div>
                {a.detail && <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{a.detail}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const trendsContent = (
    <TrendsTab centers={centers} lionheartSeed={lionheartSeed} />
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', position:'relative' }}>

      {/* ── Center drill-through panel (sits inside the content area, no viewport takeover) ── */}
      {drillCenter && (() => {
        const dc = drillCenter;
        const reg = getRegForUI ? getRegForUI(dc.state) : {};
        const centerObj = { id: dc.id, name: dc.name, state: dc.state, city: dc.city, zip: dc.zip || '' };
        const DRILL_TABS = [
          { id:'data',       label:'Data Entry' },
          { id:'inspection', label:'Inspection View' },
          { id:'auditsim',   label:'Audit Simulation' },
          { id:'history',    label:'History' },
          { id:'cap',        label:'Corrective Action Plan' },
        ];
        return (
          <div style={{ position:'absolute', inset:0, zIndex:50, display:'flex', flexDirection:'column', background:'var(--bg, #f8fafc)', overflow:'hidden' }}>
            {/* Drill header */}
            <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'0 20px', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0 0' }}>
                <button onClick={closeDrill} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:6, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#64748b', fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Back to Network
                </button>
                <span style={{ color:'#94a3b8', fontSize:13 }}>›</span>
                <span style={{ fontSize:13.5, fontWeight:700, color:'#1e293b' }}>{dc.name}</span>
                <span style={{ fontSize:11.5, color:'#94a3b8' }}>{[dc.city, dc.state].filter(Boolean).join(', ')}</span>
                {dc.score != null && (
                  <span style={{ marginLeft:'auto', fontSize:13, fontWeight:700, padding:'3px 10px', borderRadius:20, background:sBg(dc.score), color:sColor(dc.score), border:`1px solid ${sBd(dc.score)}` }}>
                    {dc.score}% — {sLabel(dc.score)}
                  </span>
                )}
              </div>
              {/* Drill tab bar */}
              <div style={{ display:'flex', gap:0, marginTop:2 }}>
                {DRILL_TABS.map(t => (
                  <button key={t.id} onClick={() => setDrillTab(t.id)} style={{
                    padding:'8px 14px', fontSize:12.5, fontWeight:600,
                    background:'none', border:'none', cursor:'pointer',
                    borderBottom: drillTab===t.id ? '2px solid #00a99d' : '2px solid transparent',
                    color: drillTab===t.id ? '#00a99d' : '#64748b',
                    marginBottom:-1, fontFamily:'inherit',
                  }}>{t.label}</button>
                ))}
              </div>
            </div>
            {/* Drill content */}
            <div style={{ flex:1, overflowY:'auto', padding: drillTab==='data' ? 0 : 20 }}>
              {drillTab === 'data' && (
                <DataEntryTab
                  center={centerObj}
                  liveData={drillLiveData}
                  updateData={(key, val) => saveDrillData(dc.id, key, val)}
                  reg={reg}
                />
              )}
              {drillTab === 'inspection' && (
                <InspectionView
                  center={centerObj}
                  reg={reg}
                  liveData={drillLiveData}
                />
              )}
              {drillTab === 'auditsim' && (
                <AuditSimTab
                  center={centerObj}
                  reg={reg}
                  liveData={{ data: drillLiveData }}
                />
              )}
              {drillTab === 'history' && (
                <HistoryTab
                  center={centerObj}
                  reg={reg}
                  liveData={drillLiveData}
                />
              )}
              {drillTab === 'cap' && (
                <CorrectiveActionPlanTab
                  center={centerObj}
                  reg={reg}
                  liveData={drillLiveData}
                />
              )}
            </div>
          </div>
        );
      })()}

      {/* Teal breadcrumb */}
      <div style={{ padding:'10px 26px 0', background:'#fff', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00a89d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span style={{ fontSize:13, color:'#00a89d', fontWeight:600 }}>
            Business Owner — Network Overview
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom:'1px solid #e2e8f0', background:'#fff', flexShrink:0, padding:'0 26px' }}>
        <div style={{ display:'flex', gap:0 }}>
          {[
            { id:'overview',     label:'Overview' },
            { id:'intelligence', label:'Network Intelligence' },
            { id:'trends',       label:'Trends'   },
            { id:'alerts',       label:`All Alerts (${networkAlerts.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setBoTab(t.id)} style={{
              padding:'10px 16px', fontSize:13, fontWeight:600,
              background:'none', border:'none', cursor:'pointer',
              borderBottom: boTab===t.id ? '2px solid #0f172a' : '2px solid transparent',
              color: boTab===t.id ? '#0f172a' : '#64748b',
              marginBottom:-1,
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {boTab === 'overview'     && overviewContent}
        {boTab === 'intelligence' && (
          <NetworkIntelligenceTab
            centers={centers}
            lionheartSeed={lionheartSeed}
            allCentersMap={allCentersMap}
            getRegForUI={getRegForUI}
            onSelectCenter={onSelectCenter}
          />
        )}
        {boTab === 'trends'       && trendsContent}
        {boTab === 'alerts'       && alertsContent}
      </div>
    </div>
  );
}

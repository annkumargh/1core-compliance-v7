import React, { useState, useMemo } from 'react';
import { calcCompliance, hasData } from '../compliance';
import CenterDirectorView from './CenterDirectorView';

// ── Palette helpers (matching app-wide muted palette) ────────────────────────
const sc  = s => s>=80?'#2d7a4f':s>=60?'#b45309':s!==null&&s!==undefined?'#b91c1c':'#94a3b8';
const sl  = s => s>=80?'Compliant':s>=60?'At Risk':s!==null&&s!==undefined?'Non-Compliant':'No Data';
const sbg = s => s>=80?'#eef7f2':s>=60?'#fdf4e7':s!==null&&s!==undefined?'#fdf1f1':'#f8fafc';
const sbd = s => s>=80?'#a7d4ba':s>=60?'#e6b87a':s!==null&&s!==undefined?'#e8a0a0':'#e2e8f0';

const DOMAIN_KEYS   = ['d1','d2','d3','d4','d5','d6','d7'];
const DOMAIN_LABELS = ['D1','D2','D3','D4','D5','D6','D7'];

// ── Center tile ───────────────────────────────────────────────────────────────
function CenterTile({ center, onClick }) {
  const s = center.score;
  return (
    <div
      onClick={() => onClick(center)}
      className="bo-tile"
      style={{
        background:'#fff', border:`1px solid ${sbd(s)}`,
        borderRadius:10, overflow:'hidden',
        cursor:'pointer', transition:'box-shadow 0.15s, transform 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 14px rgba(0,0,0,0.10)'; e.currentTarget.style.transform='translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none'; }}
    >
      {/* Colour accent bar */}
      <div style={{ height:3, background: sc(s) }} />
      <div style={{ padding:'12px 14px' }}>
        {/* Score + badge */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:26, fontWeight:800, color:sc(s), letterSpacing:'-0.02em', lineHeight:1 }}>
            {s !== null && s !== undefined ? `${s}%` : '—'}
          </span>
          <span style={{
            fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20,
            background:sbg(s), color:sc(s), border:`1px solid ${sbd(s)}`,
            textTransform:'uppercase', letterSpacing:'0.04em',
          }}>
            {sl(s)}
          </span>
        </div>
        {/* Name + location */}
        <div style={{ fontSize:12.5, fontWeight:700, color:'#1e293b', marginBottom:2, lineHeight:1.3 }}>
          {center.name}
        </div>
        <div style={{ fontSize:11, color:'#94a3b8', marginBottom:10 }}>
          {[center.city, center.state].filter(Boolean).join(', ')}
        </div>
        {/* Domain mini-bars */}
        {center.domainScores && (
          <>
            <div style={{ display:'flex', gap:2, alignItems:'flex-end', height:18, marginBottom:4 }}>
              {DOMAIN_KEYS.map((k, i) => {
                const v = center.domainScores[k];
                const hasV = v !== null && v !== undefined;
                const h = hasV ? Math.max(3, Math.round(v * 18 / 100)) : 3;
                const c2 = !hasV ? '#e2e8f0' : v>=80 ? '#2d7a4f' : v>=60 ? '#b45309' : '#b91c1c';
                return (
                  <div key={k} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center' }}>
                    <div style={{ width:'100%', height:h, background:c2, borderRadius:2, opacity: hasV?1:0.5 }}
                      title={`${DOMAIN_LABELS[i]}: ${hasV ? v+'%' : 'No data'}`} />
                  </div>
                );
              })}
            </div>
            <div style={{ display:'flex', gap:2 }}>
              {DOMAIN_LABELS.map(d => (
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
function StatusGroup({ label, centers, color, bg, border, onSelectCenter, defaultOpen=true }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!centers.length) return null;
  return (
    <div style={{ marginBottom:20 }}>
      <button
        onClick={() => setOpen(o=>!o)}
        style={{
          display:'flex', alignItems:'center', gap:8, width:'100%',
          background:'none', border:'none', cursor:'pointer', padding:'8px 0', marginBottom: open ? 10 : 0,
        }}
      >
        <span style={{
          fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20,
          background:bg, color, border:`1px solid ${border}`,
          textTransform:'uppercase', letterSpacing:'0.05em',
        }}>
          {label}
        </span>
        <span style={{ fontSize:12, fontWeight:700, color:'#64748b' }}>
          {centers.length} center{centers.length!==1?'s':''}
        </span>
        <span style={{ fontSize:10, color:'#94a3b8', marginLeft:'auto' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',
          gap:10,
        }}>
          {centers.map(c => (
            <CenterTile key={c.id} center={c} onClick={onSelectCenter} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Network overview tab ──────────────────────────────────────────────────────
function NetworkTab({ network, enrichedCenters, onSelectCenter }) {
  const compliant    = enrichedCenters.filter(c => c.score >= 80);
  const atRisk       = enrichedCenters.filter(c => c.score >= 60 && c.score < 80);
  const nonCompliant = enrichedCenters.filter(c => c.score !== null && c.score < 60);
  const noData       = enrichedCenters.filter(c => c.score === null || c.score === undefined);
  const total        = enrichedCenters.length;

  const avgScore = network.networkScore;
  const avgColor = sc(avgScore);

  return (
    <div style={{ padding:'20px 24px' }}>
      {/* KPI row */}
      <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
        {[
          { label:'Total centers',  val: total,               color:'#1e293b', bg:'#f8fafc',  bd:'#e2e8f0' },
          { label:'Compliant',      val: compliant.length,    color:'#2d7a4f', bg:'#eef7f2',  bd:'#a7d4ba', sub:'≥ 80%' },
          { label:'At risk',        val: atRisk.length,       color:'#b45309', bg:'#fdf4e7',  bd:'#e6b87a', sub:'60–79%' },
          { label:'Non-compliant',  val: nonCompliant.length, color:'#b91c1c', bg:'#fdf1f1',  bd:'#e8a0a0', sub:'< 60%' },
        ].map(k => (
          <div key={k.label} style={{
            flex:1, minWidth:100, background:k.bg, border:`1px solid ${k.bd}`,
            borderRadius:10, padding:'12px 14px',
          }}>
            <div style={{ fontSize:11, color:'#64748b', marginBottom:3 }}>{k.label}</div>
            <div style={{ fontSize:24, fontWeight:800, color:k.color, lineHeight:1, letterSpacing:'-0.02em' }}>{k.val}</div>
            {k.sub && <div style={{ fontSize:10.5, color:'#94a3b8', marginTop:2 }}>{k.sub}</div>}
          </div>
        ))}
        {/* Network avg */}
        <div style={{
          flex:1, minWidth:100, background:sbg(avgScore), border:`1px solid ${sbd(avgScore)}`,
          borderRadius:10, padding:'12px 14px',
        }}>
          <div style={{ fontSize:11, color:'#64748b', marginBottom:3 }}>Network avg</div>
          <div style={{ fontSize:24, fontWeight:800, color:avgColor, lineHeight:1, letterSpacing:'-0.02em' }}>
            {avgScore !== null ? `${avgScore}%` : '—'}
          </div>
          <div style={{ fontSize:10.5, color:'#94a3b8', marginTop:2 }}>{sl(avgScore)}</div>
        </div>
      </div>

      {/* Distribution bar */}
      <div style={{ marginBottom:18 }}>
        <div style={{ display:'flex', height:8, borderRadius:4, overflow:'hidden', gap:2 }}>
          {[
            { count:compliant.length,    color:'#2d7a4f' },
            { count:atRisk.length,       color:'#b45309' },
            { count:nonCompliant.length, color:'#b91c1c' },
            { count:noData.length,       color:'#e2e8f0' },
          ].map((seg, i) => {
            const pct = total > 0 ? (seg.count / total) * 100 : 0;
            if (!pct) return null;
            return <div key={i} style={{ width:`${pct}%`, background:seg.color, minWidth:3 }} />;
          })}
        </div>
        <div style={{ display:'flex', gap:14, marginTop:6, flexWrap:'wrap' }}>
          {[
            { label:'Compliant',     color:'#2d7a4f', count:compliant.length },
            { label:'At Risk',       color:'#b45309', count:atRisk.length },
            { label:'Non-Compliant', color:'#b91c1c', count:nonCompliant.length },
            { label:'No data',       color:'#94a3b8', count:noData.length },
          ].filter(s => s.count > 0).map(s => (
            <div key={s.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11.5, color:'#64748b' }}>
              <div style={{ width:8, height:8, borderRadius:2, background:s.color }} />
              {s.label} — {s.count}
            </div>
          ))}
        </div>
      </div>

      {/* State breakdown */}
      {network.stateBreakdown?.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11.5, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
            By state
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {network.stateBreakdown.map(st => (
              <div key={st.abbr} style={{
                background:sbg(st.score), border:`1px solid ${sbd(st.score)}`,
                borderRadius:8, padding:'8px 12px', minWidth:90,
              }}>
                <div style={{ fontSize:11, color:'#64748b', marginBottom:2 }}>{st.state || st.abbr}</div>
                <div style={{ fontSize:18, fontWeight:800, color:sc(st.score), lineHeight:1 }}>
                  {st.score !== null ? `${st.score}%` : '—'}
                </div>
                <div style={{ fontSize:10.5, color:'#94a3b8', marginTop:2 }}>{st.centers} center{st.centers!==1?'s':''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Network alerts */}
      {network.networkAlerts?.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:11.5, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
            Network alerts
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {network.networkAlerts.map((a, i) => {
              const dotColor = a.type==='danger' ? '#b91c1c' : a.type==='warning' ? '#b45309' : '#4f5fa8';
              const bg2      = a.type==='danger' ? '#fdf1f1' : a.type==='warning' ? '#fdf4e7' : '#f0f1fc';
              const bd2      = a.type==='danger' ? '#e8a0a0' : a.type==='warning' ? '#e6b87a' : '#c7cbed';
              return (
                <div key={i} style={{
                  display:'flex', gap:10, alignItems:'flex-start',
                  background:bg2, border:`1px solid ${bd2}`, borderRadius:8, padding:'9px 12px',
                }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:dotColor, marginTop:4, flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:12.5, fontWeight:600, color:'#1e293b' }}>{a.text}</div>
                    {a.detail && <div style={{ fontSize:11.5, color:'#64748b', marginTop:1 }}>{a.detail}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Center groups */}
      <StatusGroup label="Non-Compliant" centers={nonCompliant} color="#b91c1c" bg="#fdf1f1" border="#e8a0a0" onSelectCenter={onSelectCenter} defaultOpen={true} />
      <StatusGroup label="At Risk"       centers={atRisk}       color="#b45309" bg="#fdf4e7" border="#e6b87a" onSelectCenter={onSelectCenter} defaultOpen={true} />
      <StatusGroup label="Compliant"     centers={compliant}    color="#2d7a4f" bg="#eef7f2" border="#a7d4ba" onSelectCenter={onSelectCenter} defaultOpen={true} />
      <StatusGroup label="No Data"       centers={noData}       color="#64748b" bg="#f8fafc" border="#e2e8f0" onSelectCenter={onSelectCenter} defaultOpen={false} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BusinessOwnerView({
  network = {},
  centers = [],
  scoreColor,
  scoreLabel,
  allData = {},
  updateData,
  lionheartSeed = {},
  allCentersMap = [],
  getRegForUI,
}) {
  const [boTab,           setBoTab]           = useState('network');
  const [selectedCenter,  setSelectedCenter]  = useState(null);
  const [cdActiveTab,     setCdActiveTab]      = useState('overview');

  // Enrich centers with domain scores from seed
  const enrichedCenters = useMemo(() => {
    return centers.map(c => {
      const seed = lionheartSeed[c.id] || {};
      const liveData = allData[c.id];
      let domainScores = null;

      if (liveData && hasData(liveData)) {
        const full = calcCompliance(liveData, c.state);
        domainScores = { d1:full.d1, d2:full.d2, d3:full.d3, d4:full.d4, d5:full.d5, d6:full.d6, d7:full.d7 };
      } else if (seed._scores) {
        const s = seed._scores;
        domainScores = {
          d1: s.d1 ?? s.licensing   ?? null,
          d2: s.d2 ?? s.center      ?? null,
          d3: s.d3 ?? s.credentials ?? null,
          d4: s.d4 ?? s.ratios      ?? null,
          d5: s.d5                  ?? null,
          d6: s.d6 ?? s.family      ?? null,
          d7: s.d7                  ?? null,
        };
      }

      return { ...c, domainScores };
    });
  }, [centers, allData, lionheartSeed]);

  // Drill-through: selected center view
  if (selectedCenter) {
    const centerId  = selectedCenter.id;
    const liveData  = allData[centerId] || {};
    const seed      = lionheartSeed[centerId] || {};
    const centerObj = allCentersMap.find(c => c.id === centerId) || selectedCenter;
    const reg       = getRegForUI ? getRegForUI(centerObj.state) : {};

    const scores = (liveData.lastUpdated && hasData(liveData))
      ? calcCompliance(liveData, centerObj.state)
      : null;

    const centerViewData = {
      id:             centerId,
      name:           centerObj.centerName || selectedCenter.name,
      address:        seed._address || '',
      city:           centerObj.city,
      state:          centerObj.state,
      zip:            seed._zip || '',
      scores: {
        overall:     scores?.overall     ?? seed._scores?.overall     ?? null,
        d1:          scores?.d1          ?? seed._scores?.d1          ?? seed._scores?.licensing   ?? null,
        d2:          scores?.d2          ?? seed._scores?.d2          ?? seed._scores?.center      ?? null,
        d3:          scores?.d3          ?? seed._scores?.d3          ?? seed._scores?.credentials ?? null,
        d4:          scores?.d4          ?? seed._scores?.d4          ?? seed._scores?.ratios      ?? null,
        d5:          scores?.d5          ?? seed._scores?.d5          ?? null,
        d6:          scores?.d6          ?? seed._scores?.d6          ?? seed._scores?.family      ?? null,
        d7:          scores?.d7          ?? seed._scores?.d7          ?? null,
        ratios:      scores?.d4          ?? seed._scores?.ratios      ?? null,
        credentials: scores?.d3          ?? seed._scores?.credentials ?? null,
        center:      scores?.d2          ?? seed._scores?.center      ?? null,
        family:      scores?.d6          ?? seed._scores?.family      ?? null,
        licensing:   scores?.d1          ?? seed._scores?.licensing   ?? null,
      },
      alerts:         seed._alerts   || [],
      ratios:         seed._ratios   || [],
      staff:          seed._staff    || [],
      history:        seed._history  || [],
      lastInspection: seed._lastInspection || 'No data',
      inspResult:     seed._inspResult     || '—',
      inspDaysAgo:    seed._inspDaysAgo    || 0,
      agency:         seed._agency         || reg.agency || 'State Licensing Agency',
      agencyPhone:    seed._agencyPhone    || '',
    };

    return (
      <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
        {/* Back bar */}
        <div style={{
          display:'flex', alignItems:'center', gap:10, padding:'9px 20px',
          borderBottom:'1px solid #e2e8f0', background:'#f8fafc', flexShrink:0,
        }}>
          <button
            onClick={() => setSelectedCenter(null)}
            style={{
              background:'none', border:'1px solid #e2e8f0', borderRadius:7,
              padding:'4px 12px', fontSize:12.5, fontWeight:600, color:'#475569',
              cursor:'pointer',
            }}
          >
            ← Network
          </button>
          <span style={{ fontSize:13, color:'#94a3b8' }}>
            Viewing: <strong style={{ color:'#1e293b' }}>{centerViewData.name}</strong>
          </span>
        </div>
        <div style={{ flex:1, overflow:'auto' }}>
          <CenterDirectorView
            center={centerViewData}
            activeTab={cdActiveTab}
            setActiveTab={setCdActiveTab}
            scoreColor={scoreColor}
            scoreLabel={scoreLabel}
            liveData={liveData}
            updateData={(section, fields) => updateData && updateData(centerId, section, fields)}
            reg={reg}
            userRole="owner"
            pendingStaffUpdates={[]}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
      {/* Sub-nav tabs */}
      <div style={{
        display:'flex', gap:4, padding:'10px 20px 0',
        borderBottom:'1px solid #e2e8f0', background:'#fff', flexShrink:0,
      }}>
        {[
          { id:'network', label:'Network Overview' },
          { id:'trends',  label:'Trends'           },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setBoTab(t.id)}
            style={{
              padding:'7px 14px', fontSize:13, fontWeight:600,
              background:'none', border:'none', cursor:'pointer',
              borderBottom: boTab===t.id ? '2px solid #4f5fa8' : '2px solid transparent',
              color: boTab===t.id ? '#4f5fa8' : '#64748b',
              marginBottom:-1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex:1, overflow:'auto' }}>
        {boTab === 'network' && (
          <NetworkTab
            network={network}
            enrichedCenters={enrichedCenters}
            onSelectCenter={setSelectedCenter}
          />
        )}
        {boTab === 'trends' && (
          <div style={{ padding:'32px 24px', textAlign:'center', color:'#94a3b8' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>📈</div>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>Trends coming soon</div>
            <div style={{ fontSize:13 }}>Historical compliance data will appear here once centers have been active for multiple periods.</div>
          </div>
        )}
      </div>
    </div>
  );
}

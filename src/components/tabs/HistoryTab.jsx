import React, { useState, useEffect, useMemo } from 'react';

const LS_RUNS_KEY = '1core_compliance_v6_auditruns';

function getSavedRuns(centerId) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_RUNS_KEY) || '{}');
    return all[centerId] || [];
  } catch { return []; }
}

// ── Type config ───────────────────────────────────────────────────────────────
const TYPE_CFG = {
  system: { label:'System-Simulated', shortLabel:'System-Sim', color:'#1e5c8a', bg:'#eef4fc', bd:'#a8c4e0',
    desc:'Automated quarterly run', icon:'system' },
  center: { label:'Director-Simulated', shortLabel:'Director-Sim', color:'#1e5c38', bg:'#eef7f2', bd:'#a7d4ba',
    desc:'Manually triggered by director or owner', icon:'center' },
  real:   { label:'Real Inspection', shortLabel:'Real', color:'#7f1d1d', bg:'#fdf1f1', bd:'#e8a0a0',
    desc:'State-appointed inspector or historical record', icon:'real' },
};

function scoreColor(s) {
  if (s === null || s === undefined) return '#94a3b8';
  if (s >= 80) return '#2d7a4f';
  if (s >= 60) return '#b45309';
  return '#b91c1c';
}
function scoreLabel(s) {
  if (s === null || s === undefined) return 'No data';
  if (s >= 80) return 'Inspection Ready';
  if (s >= 60) return 'Needs Attention';
  return 'At Risk';
}

// ── SVG icons ─────────────────────────────────────────────────────────────────
function Icon({name, size=14, color='currentColor'}) {
  const s = {width:size, height:size, verticalAlign:'middle', flexShrink:0};
  const p = {fill:'none', stroke:color, strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round'};
  if(name==='system')   return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
  if(name==='center')   return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if(name==='real')     return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
  if(name==='trending') return <svg style={s} viewBox="0 0 24 24" {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
  if(name==='info')     return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  return null;
}

function TypeBadge({typeId, small, quarter}) {
  const cfg = TYPE_CFG[typeId] || TYPE_CFG.system;
  return (
    <span style={{fontSize:small?10:11,fontWeight:700,padding:small?'2px 6px':'3px 10px',borderRadius:20,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.bd}`,whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:3}}>
      <Icon name={cfg.icon} size={small?9:10} color={cfg.color}/>
      {cfg.shortLabel}{quarter?` · ${quarter}`:''}
    </span>
  );
}

// ── Spark line (inline SVG trend) ─────────────────────────────────────────────
function SparkLine({points, width=120, height=32, color='#00a99d'}) {
  if (!points || points.length < 2) return null;
  const vals = points.filter(p => p !== null && p !== undefined);
  if (vals.length < 2) return null;
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const pts = points.map((v, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{verticalAlign:'middle'}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {points.map((v, i) => {
        const x = (i / (points.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 6) - 3;
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color}/>;
      })}
    </svg>
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({score, width='100%'}) {
  if (score === null || score === undefined) {
    return <span style={{fontSize:12,color:'#94a3b8'}}>—</span>;
  }
  const color = scoreColor(score);
  return (
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <div style={{flex:1,height:6,background:'#e2e8f0',borderRadius:3,overflow:'hidden',minWidth:60}}>
        <div style={{height:'100%',width:`${score}%`,background:color,borderRadius:3,transition:'width 0.4s'}}/>
      </div>
      <span style={{fontSize:13,fontWeight:700,color,minWidth:38}}>{score}%</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HistoryTab({center, scoreColor: scoreColorProp}) {
  const [runs, setRuns]         = useState([]);
  const [filter, setFilter]     = useState('all');  // 'all' | 'system' | 'center' | 'real'
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    setRuns(getSavedRuns(center.id));
  }, [center.id]);

  // Also merge legacy center.history (old snapshot data) as synthetic "system" runs
  const allRuns = useMemo(() => {
    const fromLS = runs.map(r => ({
      ...r,
      _source: 'live',
    }));
    // Legacy history rows — show as old records if no live runs yet
    const legacy = fromLS.length === 0 && center.history
      ? (center.history || []).map((h, i) => ({
          _source: 'legacy',
          inspectionType: h.label ? 'real' : 'system',
          date: h.date,
          readinessScore: h.overall,
          pass: null, fail: null, notEntered: null, total: null,
          capId: null,
          quarter: null,
          inspectorName: '',
          label: h.label || '',
          _legacy: h,
        }))
      : [];
    return [...fromLS, ...legacy];
  }, [runs, center.history]);

  const filtered = filter === 'all' ? allRuns : allRuns.filter(r => r.inspectionType === filter);

  // Trend data per type (last 8 runs of each)
  const trendData = useMemo(() => {
    const out = {};
    ['system','center','real'].forEach(type => {
      const typeRuns = allRuns.filter(r => r.inspectionType === type && r.readinessScore !== null);
      out[type] = typeRuns.slice(0, 8).reverse().map(r => r.readinessScore);
    });
    return out;
  }, [allRuns]);

  // Summary stats
  const stats = useMemo(() => {
    const latest = {};
    ['system','center','real'].forEach(type => {
      const r = allRuns.find(x => x.inspectionType === type);
      latest[type] = r ? r.readinessScore : null;
    });
    return {
      total: allRuns.length,
      latest,
      systemCount: allRuns.filter(r=>r.inspectionType==='system').length,
      centerCount: allRuns.filter(r=>r.inspectionType==='center').length,
      realCount:   allRuns.filter(r=>r.inspectionType==='real').length,
    };
  }, [allRuns]);

  return (
    <div>
      {/* ── Header ── */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'18px 20px',marginBottom:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12,marginBottom:16}}>
          <div>
            <h3 style={{fontSize:15,fontWeight:700,color:'#0f172a',margin:'0 0 3px'}}>Compliance History</h3>
            <p style={{fontSize:12.5,color:'#64748b',margin:0}}>{center.name} · Inspection runs across all three types</p>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <Icon name="info" size={13} color="#94a3b8"/>
            <span style={{fontSize:11.5,color:'#94a3b8'}}>Higher scores = better inspection readiness</span>
          </div>
        </div>

        {/* ── Three-type summary cards ── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
          {['system','center','real'].map(type => {
            const cfg   = TYPE_CFG[type];
            const score = stats.latest[type];
            const count = stats[`${type}Count`];
            const trend = trendData[type];
            return (
              <div key={type} style={{background:cfg.bg,border:`1px solid ${cfg.bd}`,borderRadius:10,padding:'14px 16px'}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}>
                  <Icon name={cfg.icon} size={15} color={cfg.color}/>
                  <span style={{fontSize:12,fontWeight:700,color:cfg.color}}>{cfg.label}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
                  <div>
                    <div style={{fontSize:28,fontWeight:800,color:score!==null?scoreColor(score):'#94a3b8',lineHeight:1}}>
                      {score!==null?`${score}%`:'—'}
                    </div>
                    <div style={{fontSize:11,color:cfg.color,marginTop:2,fontWeight:600}}>{score!==null?scoreLabel(score):'No runs yet'}</div>
                    <div style={{fontSize:10.5,color:'#94a3b8',marginTop:1}}>{count} run{count!==1?'s':''} total</div>
                  </div>
                  {trend.length >= 2 && (
                    <SparkLine points={trend} color={cfg.color} width={80} height={28}/>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Filter ── */}
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        <span style={{fontSize:11.5,fontWeight:700,color:'#94a3b8',letterSpacing:'0.05em'}}>SHOW</span>
        {[
          {id:'all',    label:'All runs'},
          {id:'system', label:'System-Simulated'},
          {id:'center', label:'Director-Simulated'},
          {id:'real',   label:'Real Inspections'},
        ].map(f => (
          <button key={f.id} onClick={()=>setFilter(f.id)} style={{
            padding:'4px 13px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',
            background:filter===f.id?'#0f172a':'#f1f5f9',
            color:filter===f.id?'#fff':'#64748b',
            border:filter===f.id?'none':'1px solid #e2e8f0',
          }}>
            {f.label}
            {f.id!=='all'&&<span style={{marginLeft:4,opacity:0.7}}>{stats[`${f.id}Count`]}</span>}
          </button>
        ))}
        <span style={{fontSize:12,color:'#94a3b8',marginLeft:'auto'}}>{filtered.length} record{filtered.length!==1?'s':''}</span>
      </div>

      {/* ── Run list ── */}
      {filtered.length === 0 ? (
        <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:12,padding:'32px',textAlign:'center'}}>
          <Icon name="trending" size={28} color="#94a3b8"/>
          <div style={{fontSize:14,fontWeight:600,color:'#64748b',marginTop:10,marginBottom:4}}>No inspection history yet</div>
          <div style={{fontSize:13,color:'#94a3b8'}}>Run an inspection from the Audit Simulation tab to start building your history.</div>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {filtered.map((run, i) => {
            const cfg    = TYPE_CFG[run.inspectionType] || TYPE_CFG.system;
            const score  = run.readinessScore;
            const isOpen = !!expanded[i];

            return (
              <div key={i} style={{background:'#fff',border:`1px solid ${cfg.bd}`,borderLeft:`3px solid ${cfg.color}`,borderRadius:10,overflow:'hidden'}}>
                {/* Row header */}
                <button
                  onClick={()=>setExpanded(p=>({...p,[i]:!p[i]}))}
                  style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'13px 16px',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}
                >
                  <TypeBadge typeId={run.inspectionType} small quarter={run.quarter}/>

                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#1e293b'}}>
                      {run.inspectionType==='real'&&run.inspectorName?`Inspector: ${run.inspectorName} · `:''}
                      {run.date}
                    </div>
                    <div style={{fontSize:11,color:'#94a3b8',marginTop:1}}>
                      {run.total?`${run.total} checks`:''}
                      {run.capId?` · ${run.capId}`:''}
                    </div>
                  </div>

                  <div style={{display:'flex',alignItems:'center',gap:16,flexShrink:0}}>
                    {run.total&&(
                      <div style={{display:'flex',gap:8,fontSize:12}}>
                        {run.pass!==null&&<span style={{color:'#1e5c38',fontWeight:600}}>{run.pass} pass</span>}
                        {run.fail!==null&&run.fail>0&&<span style={{color:'#b91c1c',fontWeight:600}}>{run.fail} fail</span>}
                        {run.notEntered!==null&&run.notEntered>0&&<span style={{color:'#94a3b8'}}>{run.notEntered} not entered</span>}
                      </div>
                    )}
                    <div style={{textAlign:'right',minWidth:80}}>
                      <div style={{fontSize:20,fontWeight:800,color:scoreColor(score),lineHeight:1}}>
                        {score!==null?`${score}%`:'—'}
                      </div>
                      <div style={{fontSize:10.5,color:scoreColor(score),fontWeight:600}}>{scoreLabel(score)}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"
                      style={{transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s',flexShrink:0}}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{borderTop:'1px solid #f1f5f9',padding:'14px 16px',background:'#f8fafc'}}>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
                      <div>
                        <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:4}}>Inspection type</div>
                        <div style={{fontSize:13,color:'#374151'}}>{cfg.label}</div>
                        <div style={{fontSize:11.5,color:'#64748b',marginTop:1}}>{cfg.desc}</div>
                      </div>
                      {run.quarter&&(
                        <div>
                          <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:4}}>Quarter</div>
                          <div style={{fontSize:13,color:'#374151'}}>{run.quarter} {new Date(run.runTimestamp||run.date).getFullYear()}</div>
                        </div>
                      )}
                      {run.inspectorName&&run.inspectorName!=='—'&&run.inspectorName!==''&&(
                        <div>
                          <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:4}}>Inspector</div>
                          <div style={{fontSize:13,color:'#374151'}}>{run.inspectorName}</div>
                        </div>
                      )}
                      {run.capId&&(
                        <div>
                          <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:4}}>CAP ID</div>
                          <div style={{fontSize:13,fontWeight:600,color:'#166534',background:'#f0fdf4',padding:'3px 9px',borderRadius:20,border:'1px solid #86efac',display:'inline-block'}}>{run.capId}</div>
                        </div>
                      )}
                      {run.readinessScore!==null&&(
                        <div>
                          <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:6}}>Score breakdown</div>
                          <ScoreBar score={run.readinessScore}/>
                        </div>
                      )}
                    </div>
                    {/* Legacy history detail */}
                    {run._source==='legacy'&&run._legacy&&(
                      <div style={{marginTop:12,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:8}}>
                        {['ratios','credentials','center','family'].map(key=>(
                          run._legacy[key]!==undefined&&(
                            <div key={key} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:7,padding:'8px 10px',textAlign:'center'}}>
                              <div style={{fontSize:15,fontWeight:700,color:scoreColor(run._legacy[key])}}>{run._legacy[key]}%</div>
                              <div style={{fontSize:10.5,color:'#94a3b8',marginTop:2,textTransform:'capitalize'}}>{key}</div>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Legend ── */}
      <div style={{marginTop:16,display:'flex',gap:14,flexWrap:'wrap',alignItems:'center',padding:'10px 14px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8}}>
        <span style={{fontSize:11.5,fontWeight:700,color:'#94a3b8'}}>TYPES</span>
        {Object.entries(TYPE_CFG).map(([id,cfg])=>(
          <span key={id} style={{fontSize:11.5,color:cfg.color,display:'flex',alignItems:'center',gap:5}}>
            <Icon name={cfg.icon} size={12} color={cfg.color}/>{cfg.label}
          </span>
        ))}
        <span style={{fontSize:11,color:'#94a3b8',marginLeft:'auto'}}>
          ≥80% Inspection Ready · 60–79% Needs Attention · &lt;60% At Risk
        </span>
      </div>
    </div>
  );
}

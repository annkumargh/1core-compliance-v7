import React, { useState, useMemo } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const sColor = s => s>=80?'#2d7a4f':s>=60?'#b45309':s!=null?'#b91c1c':'#64748b';
const sBg    = s => s>=80?'#eef7f2':s>=60?'#fdf4e7':s!=null?'#fdf1f1':'#f8fafc';
const sBd    = s => s>=80?'#a7d4ba':s>=60?'#e6b87a':s!=null?'#e8a0a0':'#e2e8f0';

const D_KEYS  = ['d1','d2','d3','d4','d5','d6','d7'];
const D_SHORT = ['Licensing','Physical','Personnel','Ratios','Staff Hlth','Children','Emergency'];
const D_LEGACY = { d1:'licensing', d2:'center', d3:'credentials', d4:'ratios', d5:null, d6:'family', d7:null };

function getDomainScore(scores, key) {
  if (!scores) return null;
  return scores[key] ?? scores[D_LEGACY[key]] ?? null;
}

function daysFromNow(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    return Math.round((d - new Date()) / 86400000);
  } catch { return null; }
}

function parseDateStr(str) {
  // Handles "Jan 25, 2026", "2026-01-25", "Oct 29, 2025"
  if (!str) return null;
  try {
    const d = new Date(str);
    return isNaN(d) ? null : d;
  } catch { return null; }
}

function nextInspDue(lastInspStr, inspPerYear) {
  const last = parseDateStr(lastInspStr);
  if (!last || !inspPerYear || typeof inspPerYear !== 'number') return null;
  const daysPerCycle = Math.round(365 / inspPerYear);
  return new Date(last.getTime() + daysPerCycle * 86400000);
}

function urgencyColor(days) {
  if (days === null) return '#64748b';
  if (days < 0)   return '#b91c1c';
  if (days <= 30) return '#b91c1c';
  if (days <= 60) return '#b45309';
  if (days <= 90) return '#b45309';
  return '#2d7a4f';
}
function urgencyBg(days) {
  if (days === null) return '#f8fafc';
  if (days <= 30)  return '#fdf1f1';
  if (days <= 90)  return '#fdf4e7';
  return '#eef7f2';
}

const SectionHeader = ({ children }) => (
  <div style={{ fontSize:11.5, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>
    {children}
  </div>
);

// ── 1. Cross-center comparison table ─────────────────────────────────────────
function ComparisonTable({ centers, onSelect }) {
  const [sortKey, setSortKey] = useState('overall');
  const [sortDir, setSortDir] = useState('asc');

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d==='asc'?'desc':'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const sorted = useMemo(() => [...centers].sort((a, b) => {
    const av = sortKey === 'name' ? (a.name||'') : (sortKey==='overall' ? a.overall : getDomainScore(a.scores, sortKey));
    const bv = sortKey === 'name' ? (b.name||'') : (sortKey==='overall' ? b.overall : getDomainScore(b.scores, sortKey));
    if (sortKey === 'name') return sortDir==='asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    const an = av ?? -1, bn = bv ?? -1;
    return sortDir === 'asc' ? an - bn : bn - an;
  }), [centers, sortKey, sortDir]);

  // Column averages
  const avgs = useMemo(() => {
    const result = { overall: null };
    D_KEYS.forEach(k => {
      const vals = centers.map(c => getDomainScore(c.scores, k)).filter(v => v!=null);
      result[k] = vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null;
    });
    const ov = centers.map(c => c.overall).filter(v => v!=null);
    result.overall = ov.length ? Math.round(ov.reduce((a,b)=>a+b,0)/ov.length) : null;
    return result;
  }, [centers]);

  const SortTh = ({ col, label, width }) => {
    const active = sortKey === col;
    return (
      <th onClick={() => handleSort(col)} style={{
        padding:'8px 10px', fontSize:10.5, fontWeight:700, color: active ? '#1e293b' : '#94a3b8',
        textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer',
        background:'#f8fafc', borderBottom:'2px solid #e2e8f0',
        whiteSpace:'nowrap', width, userSelect:'none',
        borderRight:'1px solid #f1f5f9',
      }}>
        {label} {active ? (sortDir==='asc'?'↑':'↓') : ''}
      </th>
    );
  };

  const ScoreCell = ({ val }) => (
    <td style={{
      padding:'8px 10px', textAlign:'center',
      borderRight:'1px solid #f8fafc', borderBottom:'1px solid #f1f5f9',
    }}>
      {val != null ? (
        <span style={{
          display:'inline-block', fontSize:12, fontWeight:700,
          color: sColor(val), background: sBg(val),
          padding:'2px 7px', borderRadius:20, minWidth:38, textAlign:'center',
        }}>{val}%</span>
      ) : (
        <span style={{ fontSize:11, color:'#cbd5e1' }}>—</span>
      )}
    </td>
  );

  return (
    <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, overflow:'hidden', marginBottom:28 }}>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:780 }}>
          <thead>
            <tr>
              <SortTh col="name"    label="Center"  width={180} />
              <SortTh col="overall" label="Overall" width={80}  />
              {D_KEYS.map((k,i) => <SortTh key={k} col={k} label={D_SHORT[i]} width={80} />)}
            </tr>
          </thead>
          <tbody>
            {/* Network avg row */}
            <tr style={{ background:'#f8fafc' }}>
              <td style={{ padding:'7px 10px', fontSize:11, fontWeight:700, color:'#64748b', borderBottom:'2px solid #e2e8f0', borderRight:'1px solid #f1f5f9' }}>
                Network avg
              </td>
              {['overall', ...D_KEYS].map(k => (
                <td key={k} style={{ padding:'7px 10px', textAlign:'center', borderBottom:'2px solid #e2e8f0', borderRight:'1px solid #f8fafc' }}>
                  {avgs[k] != null ? (
                    <span style={{ fontSize:11, fontWeight:800, color:sColor(avgs[k]) }}>{avgs[k]}%</span>
                  ) : <span style={{ color:'#cbd5e1', fontSize:11 }}>—</span>}
                </td>
              ))}
            </tr>
            {sorted.map((c, i) => (
              <tr
                key={c.id}
                onClick={() => onSelect(c.id)}
                style={{
                  background: i%2===0 ? '#fff' : '#fafafa',
                  cursor:'pointer',
                  transition:'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background='#f0f7ff'}
                onMouseLeave={e => e.currentTarget.style.background=i%2===0?'#fff':'#fafafa'}
              >
                <td style={{ padding:'9px 10px', borderBottom:'1px solid #f1f5f9', borderRight:'1px solid #f1f5f9' }}>
                  <div style={{ fontSize:12.5, fontWeight:600, color:'#1e293b' }}>{c.name}</div>
                  <div style={{ fontSize:10.5, color:'#94a3b8' }}>{c.city}, {c.state}</div>
                </td>
                <ScoreCell val={c.overall} />
                {D_KEYS.map(k => <ScoreCell key={k} val={getDomainScore(c.scores, k)} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding:'7px 12px', background:'#f8fafc', borderTop:'1px solid #e2e8f0', fontSize:11, color:'#94a3b8' }}>
        Click any column header to sort · Click any row to open that center
      </div>
    </div>
  );
}

// ── 2. Inspection calendar ────────────────────────────────────────────────────
function InspectionCalendar({ centers }) {
  const items = useMemo(() => centers.map(c => {
    const seed    = c._seed || {};
    const lastStr = seed._lastInspection || seed._lastInspectionDate;
    const ipy     = c.inspPerYear || 1;
    const dueDate = nextInspDue(lastStr, ipy);
    const daysUntil = dueDate ? Math.round((dueDate - new Date()) / 86400000) : null;
    return {
      id: c.id, name: c.name, city: c.city, state: c.state,
      lastInsp: lastStr || '—',
      inspResult: seed._inspResult || '—',
      dueDate, daysUntil,
      ipy,
    };
  }).sort((a, b) => {
    if (a.daysUntil === null) return 1;
    if (b.daysUntil === null) return -1;
    return a.daysUntil - b.daysUntil;
  }), [centers]);

  const overdue  = items.filter(i => i.daysUntil !== null && i.daysUntil < 0);
  const due30    = items.filter(i => i.daysUntil !== null && i.daysUntil >= 0  && i.daysUntil <= 30);
  const due90    = items.filter(i => i.daysUntil !== null && i.daysUntil > 30  && i.daysUntil <= 90);
  const ok       = items.filter(i => i.daysUntil !== null && i.daysUntil > 90);
  const unknown  = items.filter(i => i.daysUntil === null);

  return (
    <div style={{ marginBottom:28 }}>
      {/* Summary pills */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {[
          { label:'Overdue',        n:overdue.length,  days:null,  c:'#b91c1c', bg:'#fdf1f1', bd:'#e8a0a0' },
          { label:'Due within 30d', n:due30.length,    days:30,    c:'#b91c1c', bg:'#fdf1f1', bd:'#e8a0a0' },
          { label:'Due within 90d', n:due90.length,    days:90,    c:'#b45309', bg:'#fdf4e7', bd:'#e6b87a' },
          { label:'On track',       n:ok.length,       days:999,   c:'#2d7a4f', bg:'#eef7f2', bd:'#a7d4ba' },
        ].map(k => (
          <div key={k.label} style={{
            flex:1, minWidth:100, background:k.bg, border:`1px solid ${k.bd}`, borderRadius:10, padding:'10px 13px',
          }}>
            <div style={{ fontSize:11, color:'#64748b', marginBottom:2 }}>{k.label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:k.c, lineHeight:1 }}>{k.n}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {['Center','Last Inspection','Result','Inspections/yr','Next Due','Status'].map(h => (
                <th key={h} style={{
                  padding:'8px 12px', fontSize:10.5, fontWeight:700, color:'#94a3b8',
                  textTransform:'uppercase', letterSpacing:'0.05em',
                  background:'#f8fafc', borderBottom:'2px solid #e2e8f0', textAlign:'left',
                  whiteSpace:'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const d = item.daysUntil;
              const dueFmt = item.dueDate
                ? item.dueDate.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
                : '—';
              const statusLabel = d === null ? 'Unknown'
                : d < 0   ? `${Math.abs(d)}d overdue`
                : d === 0 ? 'Due today'
                : `${d}d away`;
              return (
                <tr key={item.id} style={{ background: i%2===0?'#fff':'#fafafa' }}>
                  <td style={{ padding:'9px 12px', borderBottom:'1px solid #f1f5f9' }}>
                    <div style={{ fontSize:12.5, fontWeight:600, color:'#1e293b' }}>{item.name}</div>
                    <div style={{ fontSize:10.5, color:'#94a3b8' }}>{item.city}, {item.state}</div>
                  </td>
                  <td style={{ padding:'9px 12px', fontSize:12.5, color:'#475569', borderBottom:'1px solid #f1f5f9' }}>{item.lastInsp}</td>
                  <td style={{ padding:'9px 12px', fontSize:12, borderBottom:'1px solid #f1f5f9' }}>
                    <span style={{
                      padding:'2px 7px', borderRadius:20, fontSize:11.5, fontWeight:600,
                      background: /pass|no viol/i.test(item.inspResult) ? '#eef7f2' : /viol|fail|conditional/i.test(item.inspResult) ? '#fdf1f1' : '#f8fafc',
                      color:      /pass|no viol/i.test(item.inspResult) ? '#2d7a4f' : /viol|fail|conditional/i.test(item.inspResult) ? '#b91c1c' : '#64748b',
                    }}>
                      {item.inspResult}
                    </span>
                  </td>
                  <td style={{ padding:'9px 12px', fontSize:12.5, color:'#475569', textAlign:'center', borderBottom:'1px solid #f1f5f9' }}>{item.ipy}x / yr</td>
                  <td style={{ padding:'9px 12px', fontSize:12.5, color:'#475569', borderBottom:'1px solid #f1f5f9' }}>{dueFmt}</td>
                  <td style={{ padding:'9px 12px', borderBottom:'1px solid #f1f5f9' }}>
                    <span style={{
                      padding:'2px 8px', borderRadius:20, fontSize:11.5, fontWeight:700,
                      background: urgencyBg(d), color: urgencyColor(d),
                    }}>
                      {statusLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 3. License & insurance expiry watchlist ───────────────────────────────────
function ExpiryWatchlist({ centers }) {
  const items = useMemo(() => {
    const rows = [];
    centers.forEach(c => {
      const lic = c._seed?.licensing || {};
      const licDays = daysFromNow(lic.licenseExpiry);
      const insDays = daysFromNow(lic.insuranceExpiry);
      const wcDays  = daysFromNow(lic.workersCompExpiry);
      if (licDays !== null) rows.push({ id:c.id+'_lic', centerId:c.id, name:c.name, city:c.city, state:c.state, type:'License', expiry:lic.licenseExpiry, days:licDays });
      if (insDays !== null) rows.push({ id:c.id+'_ins', centerId:c.id, name:c.name, city:c.city, state:c.state, type:'GL Insurance', expiry:lic.insuranceExpiry, days:insDays });
      if (wcDays  !== null) rows.push({ id:c.id+'_wc',  centerId:c.id, name:c.name, city:c.city, state:c.state, type:"Workers' Comp", expiry:lic.workersCompExpiry, days:wcDays });
    });
    return rows.sort((a, b) => a.days - b.days);
  }, [centers]);

  const critical = items.filter(i => i.days <= 30);
  const warning  = items.filter(i => i.days > 30 && i.days <= 90);
  const ok       = items.filter(i => i.days > 90);

  const typeIcon = t => t==='License' ? '📋' : t==='GL Insurance' ? '🛡' : '👷';

  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {[
          { label:'Expired / ≤30d',  n:critical.length, c:'#b91c1c', bg:'#fdf1f1', bd:'#e8a0a0' },
          { label:'Expiring 31–90d', n:warning.length,  c:'#b45309', bg:'#fdf4e7', bd:'#e6b87a' },
          { label:'Current (>90d)',  n:ok.length,       c:'#2d7a4f', bg:'#eef7f2', bd:'#a7d4ba' },
        ].map(k => (
          <div key={k.label} style={{ flex:1, minWidth:100, background:k.bg, border:`1px solid ${k.bd}`, borderRadius:10, padding:'10px 13px' }}>
            <div style={{ fontSize:11, color:'#64748b', marginBottom:2 }}>{k.label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:k.c, lineHeight:1 }}>{k.n}</div>
          </div>
        ))}
      </div>

      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {['Center','Type','Expiry Date','Days Remaining','Action needed'].map(h => (
                <th key={h} style={{
                  padding:'8px 12px', fontSize:10.5, fontWeight:700, color:'#94a3b8',
                  textTransform:'uppercase', letterSpacing:'0.05em',
                  background:'#f8fafc', borderBottom:'2px solid #e2e8f0', textAlign:'left', whiteSpace:'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const expFmt = item.expiry
                ? new Date(item.expiry).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
                : '—';
              const action = item.days < 0  ? 'Renew immediately — expired'
                : item.days <= 30           ? 'Renew within 30 days'
                : item.days <= 90           ? 'Schedule renewal soon'
                : 'No action needed';
              return (
                <tr key={item.id} style={{ background: i%2===0?'#fff':'#fafafa' }}>
                  <td style={{ padding:'9px 12px', borderBottom:'1px solid #f1f5f9' }}>
                    <div style={{ fontSize:12.5, fontWeight:600, color:'#1e293b' }}>{item.name}</div>
                    <div style={{ fontSize:10.5, color:'#94a3b8' }}>{item.city}, {item.state}</div>
                  </td>
                  <td style={{ padding:'9px 12px', fontSize:12.5, color:'#475569', borderBottom:'1px solid #f1f5f9' }}>
                    {item.type}
                  </td>
                  <td style={{ padding:'9px 12px', fontSize:12.5, color:'#475569', borderBottom:'1px solid #f1f5f9' }}>
                    {expFmt}
                  </td>
                  <td style={{ padding:'9px 12px', borderBottom:'1px solid #f1f5f9' }}>
                    <span style={{
                      padding:'2px 8px', borderRadius:20, fontSize:12, fontWeight:700,
                      background: urgencyBg(item.days), color: urgencyColor(item.days),
                    }}>
                      {item.days < 0 ? `${Math.abs(item.days)}d expired` : `${item.days}d`}
                    </span>
                  </td>
                  <td style={{ padding:'9px 12px', fontSize:12, color: urgencyColor(item.days), fontWeight:600, borderBottom:'1px solid #f1f5f9' }}>
                    {action}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 4. Staff credential gaps ──────────────────────────────────────────────────
function StaffCredentialGaps({ centers }) {
  const items = useMemo(() => centers.map(c => {
    const staff = c._seed?._staff || [];
    const total = staff.length;
    if (total === 0) return { id:c.id, name:c.name, city:c.city, state:c.state, total:0, cprExp:0, bgIssue:0, physMissing:0, gapScore:0 };

    const cprExp    = staff.filter(s => /expired/i.test(s.cpr||'')).length;
    const bgIssue   = staff.filter(s => !/valid|clear/i.test(s.bg||'')).length;
    const physMiss  = staff.filter(s => /missing|pending/i.test(s.physical||'')).length;
    const gapScore  = Math.round(((cprExp + bgIssue + physMiss) / (total * 3)) * 100);

    return { id:c.id, name:c.name, city:c.city, state:c.state, total, cprExp, bgIssue, physMissing:physMiss, gapScore };
  }).sort((a, b) => b.gapScore - a.gapScore), [centers]);

  const GapBar = ({ val, max, color }) => (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ flex:1, height:4, background:'#f1f5f9', borderRadius:2, overflow:'hidden' }}>
        <div style={{ width:`${max>0?(val/max)*100:0}%`, height:'100%', background:color, borderRadius:2 }} />
      </div>
      <span style={{ fontSize:12, fontWeight:700, color, minWidth:14, textAlign:'right' }}>{val}</span>
    </div>
  );

  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {['Center','Staff','CPR Expired','BG Check Issues','Physical Missing','Gap Score'].map(h => (
                <th key={h} style={{
                  padding:'8px 12px', fontSize:10.5, fontWeight:700, color:'#94a3b8',
                  textTransform:'uppercase', letterSpacing:'0.05em',
                  background:'#f8fafc', borderBottom:'2px solid #e2e8f0', textAlign:'left', whiteSpace:'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const gapColor = item.gapScore >= 40 ? '#b91c1c' : item.gapScore >= 20 ? '#b45309' : '#2d7a4f';
              return (
                <tr key={item.id} style={{ background: i%2===0?'#fff':'#fafafa' }}>
                  <td style={{ padding:'9px 12px', borderBottom:'1px solid #f1f5f9' }}>
                    <div style={{ fontSize:12.5, fontWeight:600, color:'#1e293b' }}>{item.name}</div>
                    <div style={{ fontSize:10.5, color:'#94a3b8' }}>{item.city}, {item.state}</div>
                  </td>
                  <td style={{ padding:'9px 12px', fontSize:12.5, color:'#475569', textAlign:'center', borderBottom:'1px solid #f1f5f9' }}>
                    {item.total}
                  </td>
                  <td style={{ padding:'9px 12px', borderBottom:'1px solid #f1f5f9', minWidth:100 }}>
                    <GapBar val={item.cprExp} max={item.total} color={item.cprExp>0?'#b91c1c':'#2d7a4f'} />
                  </td>
                  <td style={{ padding:'9px 12px', borderBottom:'1px solid #f1f5f9', minWidth:100 }}>
                    <GapBar val={item.bgIssue} max={item.total} color={item.bgIssue>0?'#b45309':'#2d7a4f'} />
                  </td>
                  <td style={{ padding:'9px 12px', borderBottom:'1px solid #f1f5f9', minWidth:100 }}>
                    <GapBar val={item.physMissing} max={item.total} color={item.physMissing>0?'#b45309':'#2d7a4f'} />
                  </td>
                  <td style={{ padding:'9px 12px', borderBottom:'1px solid #f1f5f9' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ flex:1, height:6, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ width:`${item.gapScore}%`, height:'100%', background:gapColor, borderRadius:3 }} />
                      </div>
                      <span style={{ fontSize:12, fontWeight:800, color:gapColor, minWidth:32 }}>{item.gapScore}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding:'7px 12px', background:'#f8fafc', borderTop:'1px solid #e2e8f0', fontSize:11, color:'#94a3b8' }}>
          Gap Score = combined credential gaps as % of total possible (CPR + BG + Physical) · Sorted by most critical first
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function NetworkIntelligenceTab({ centers, lionheartSeed, allCentersMap, getRegForUI, onSelectCenter }) {
  const [section, setSection] = useState('comparison');

  // Enrich centers with seed data and regulation inspPerYear
  const enriched = useMemo(() => centers.map(c => {
    const seed   = lionheartSeed[c.id] || {};
    const fullC  = (allCentersMap||[]).find(x => x.id===c.id) || {};
    const reg    = getRegForUI ? getRegForUI(c.state||fullC.state) : {};
    const scores = seed._scores || {};
    return {
      id:          c.id,
      name:        c.name || fullC.centerName,
      city:        c.city || fullC.city,
      state:       c.state || fullC.state,
      overall:     c.score ?? scores.overall ?? null,
      scores,
      inspPerYear: typeof reg.inspPerYear === 'number' ? reg.inspPerYear : 1,
      _seed:       seed,
    };
  }), [centers, lionheartSeed, allCentersMap, getRegForUI]);

  const SECTIONS = [
    { id:'comparison',  label:'Domain Comparison' },
    { id:'inspections', label:'Inspection Calendar' },
    { id:'expiry',      label:'Expiry Watchlist' },
    { id:'credentials', label:'Staff Credential Gaps' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Sub-nav */}
      <div style={{
        display:'flex', gap:0, padding:'0 26px',
        borderBottom:'1px solid #e2e8f0', background:'#fff', flexShrink:0,
      }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            padding:'10px 14px', fontSize:12.5, fontWeight:600, background:'none', border:'none', cursor:'pointer',
            borderBottom: section===s.id ? '2px solid #4f5fa8' : '2px solid transparent',
            color: section===s.id ? '#4f5fa8' : '#64748b',
            marginBottom:-1, whiteSpace:'nowrap',
          }}>{s.label}</button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'22px 26px' }}>
        {section === 'comparison'  && <ComparisonTable centers={enriched} onSelect={onSelectCenter} />}
        {section === 'inspections' && <InspectionCalendar centers={enriched} />}
        {section === 'expiry'      && <ExpiryWatchlist centers={enriched} />}
        {section === 'credentials' && <StaffCredentialGaps centers={enriched} />}
      </div>
    </div>
  );
}

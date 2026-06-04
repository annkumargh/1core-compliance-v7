import React, { useState, useMemo, useEffect } from 'react';

const sc = s => s>=80?'#2d7a4f':s>=60?'#b45309':s!==null?'#b91c1c':'#94a3b8';
const sl = s => s>=80?'Compliant':s>=60?'At Risk':s!==null?'Non-Compliant':'No Data';
const sbg = s => s>=80?'#eef7f2':s>=60?'#fdf4e7':s!==null?'#fdf1f1':'#f8fafc';
const sbd = s => s>=80?'#a7d4ba':s>=60?'#e6b87a':s!==null?'#e8a0a0':'#e2e8f0';

export default function SuperAdminView({ allData={}, companies=[], allCenters=[], lionheartSeed={}, scoreColor, onSelectCenter, onSelectCompany, initialCompanyView=null }) {
  const [search,      setSearch]    = useState('');
  const [sortBy,      setSortBy]    = useState('name');
  const [expanded,    setExpanded]  = useState(null);
  const [activeView,  setActiveView]= useState(initialCompanyView ? 'company-view' : 'companies');
  const [companyView, setCompanyView] = useState(initialCompanyView);

  // Sync when SA clicks a company in the sidebar (prop changes)
  useEffect(() => {
    if (initialCompanyView) {
      setCompanyView(initialCompanyView);
      setActiveView('company-view');
    }
  }, [initialCompanyView?.id]); // eslint-disable-line

  const enriched = useMemo(() => companies.map(co => {
    const centers = co.centers;
    const scores  = centers.map(c => {
      const seed = lionheartSeed[c.id];
      if (seed?._scores?.overall != null) return seed._scores.overall;
      return null;
    }).filter(s => s !== null);
    const avg = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : null;
    const withData = centers.filter(c => allData[c.id]?.lastUpdated || lionheartSeed[c.id]).length;
    return { ...co, avg, withData, scores };
  }), [companies, allData, lionheartSeed]);

  const filtered = useMemo(() => enriched.filter(co =>
    !search || co.name.toLowerCase().includes(search.toLowerCase())
  ).sort((a,b) => {
    if (sortBy==='score')   return (b.avg??-1)-(a.avg??-1);
    if (sortBy==='centers') return b.centers.length-a.centers.length;
    return a.name.localeCompare(b.name);
  }), [enriched, search, sortBy]);

  const totalCenters   = companies.reduce((s,c)=>s+c.centers.length,0);
  const totalCompanies = companies.length;
  const withAny        = enriched.filter(c=>c.withData>0).length;
  const lhScore        = enriched.find(c=>c.id===1292)?.avg;

  // ── Company View: all centers under a single company ──────────────────────
  if (activeView === 'company-view' && companyView) {
    const coEnriched = enriched.find(c=>c.id===companyView.id) || companyView;
    const centers    = coEnriched.centers || [];
    const compliant  = centers.filter(c => { const s=lionheartSeed[c.id]?._scores?.overall??null; return s!==null&&s>=80; });
    const atRisk     = centers.filter(c => { const s=lionheartSeed[c.id]?._scores?.overall??null; return s!==null&&s>=60&&s<80; });
    const critical   = centers.filter(c => { const s=lionheartSeed[c.id]?._scores?.overall??null; return s!==null&&s<60; });
    const noData     = centers.filter(c => (lionheartSeed[c.id]?._scores?.overall??null)===null);

    function CCard({ c }) {
      const s     = lionheartSeed[c.id]?._scores?.overall??null;
      const color = sc(s);
      return (
        <div onClick={() => onSelectCenter && onSelectCenter(c.id)}
          style={{ background:'#fff', border:`1px solid ${sbd(s)}`, borderLeft:`3px solid ${sc(s)}`,
            borderRadius:10, padding:'16px 18px', cursor:'pointer', transition:'all 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
          <div style={{ fontSize:22, fontWeight:800, color }}>{s!==null?`${s}%`:'—'}</div>
          <div style={{ fontSize:11, padding:'2px 8px', borderRadius:20, marginTop:4, display:'inline-block',
            background:sbg(s), color:sc(s), border:`1px solid ${sbd(s)}`, fontWeight:600 }}>{sl(s)}</div>
          <div style={{ fontSize:13, fontWeight:600, color:'#1e293b', marginTop:8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.centerName}</div>
          <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{c.city}, {c.state}</div>
        </div>
      );
    }

    const groups = [
      { label:'Compliant', color:'#2d7a4f', list:compliant },
      { label:'At Risk — Action Required', color:'#b45309', list:atRisk },
      { label:'Non-Compliant — Immediate Action', color:'#b91c1c', list:critical },
      { label:'No Data Entered', color:'#94a3b8', list:noData },
    ].filter(g=>g.list.length>0);

    return (
      <div style={{ display:'flex',flexDirection:'column',height:'100%',overflowY:'auto',background:'#f8fafc' }}>
        <div style={{ background:'#fff',borderBottom:'1px solid #e2e8f0',padding:'20px 28px' }}>
          <button onClick={() => { setActiveView('companies'); if(onSelectCompany) onSelectCompany(null); }} style={{
            display:'flex', alignItems:'center', gap:8, background:'none', border:'1px solid #e2e8f0',
            borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:13, color:'#64748b',
            fontFamily:'inherit', marginBottom:16, fontWeight:500,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back to All Companies
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4f5fa8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <span style={{ fontSize:13.5, fontWeight:600, color:'#4f5fa8' }}>Company View — Super Admin</span>
          </div>
          <h2 style={{ fontSize:22, fontWeight:700, color:'#0f172a', margin:0 }}>{coEnriched.name}</h2>
          <p style={{ fontSize:13.5, color:'#64748b', margin:'5px 0 0' }}>
            {centers.length} centers · {coEnriched.states?.join(', ')} · Avg score: {coEnriched.avg!==null?`${coEnriched.avg}%`:'No data'}
          </p>
        </div>
        <div style={{ padding:'24px 28px' }}>
          {/* Summary KPIs */}
          <div className="sa-stats-grid">
            {[
              { label:'Total Centers',   val:centers.length,    color:'#0f172a', border:'#e2e8f0' },
              { label:'Compliant',       val:compliant.length,  color:'#2d7a4f', border:'#a7d4ba' },
              { label:'At Risk',         val:atRisk.length,     color:'#b45309', border:'#e6b87a' },
              { label:'Non-Compliant',   val:critical.length,   color:'#b91c1c', border:'#e8a0a0' },
            ].map((k,i)=>(
              <div key={i} style={{ background:'#fff', border:`1px solid ${k.border}`, borderTop:`3px solid ${k.color}`, borderRadius:12, padding:'18px 20px' }}>
                <div style={{ fontSize:30, fontWeight:800, color:k.color, lineHeight:1 }}>{k.val}</div>
                <div style={{ fontSize:13.5, fontWeight:600, color:'#374151', marginTop:7 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {groups.map((g,gi) => (
            <div key={gi} style={{ marginBottom:24 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:g.color }}/>
                <span style={{ fontSize:12.5, fontWeight:700, color:g.color, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                  {g.label} — {g.list.length} Centers
                </span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
                {g.list.map(c => <CCard key={c.id} c={c}/>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── COMPANIES LIST (default) ──────────────────────────────────────────────
  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%',overflowY:'auto',background:'#f8fafc' }}>
      <div style={{ background:'#fff',borderBottom:'1px solid #e2e8f0',padding:'20px 28px' }}>
        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:5 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4f5fa8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span style={{ fontSize:13.5,fontWeight:600,color:'#4f5fa8' }}>Super Admin — Platform Overview</span>
        </div>
        <h2 style={{ fontSize:22,fontWeight:700,color:'#0f172a',margin:0 }}>Platform Overview</h2>
        <p style={{ fontSize:13.5,color:'#64748b',margin:'5px 0 0' }}>1Core Solution · All client companies and centers</p>
      </div>

      <div style={{ padding:'24px 28px' }}>
        {/* KPIs */}
        <div className="sa-stats-grid">
          {[
            { label:'Total Companies',   val:totalCompanies, color:'#4f5fa8', border:'#c5cbee' },
            { label:'Total Centers',     val:totalCenters,   color:'#1e5c8a', border:'#a8c4e0' },
            { label:'With Data Entered', val:withAny,        color:'#2d7a4f', border:'#a7d4ba', sub:'companies with entry' },
            { label:'Lionheart Score',   val:lhScore?`${lhScore}%`:'—', color:sc(lhScore), border:'#e6b87a', sub:'pilot client' },
          ].map((k,i)=>(
            <div key={i} style={{ background:'#fff',border:`1px solid ${k.border}`,borderTop:`3px solid ${k.color}`,borderRadius:12,padding:'18px 20px' }}>
              <div style={{ fontSize:30,fontWeight:800,color:k.color,lineHeight:1 }}>{k.val}</div>
              <div style={{ fontSize:13.5,fontWeight:600,color:'#374151',marginTop:7 }}>{k.label}</div>
              {k.sub&&<div style={{ fontSize:12,color:'#64748b',marginTop:2 }}>{k.sub}</div>}
            </div>
          ))}
        </div>

        {/* Company table */}
        <div style={{ background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden' }}>
          <div style={{ padding:'16px 20px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12 }}>
            <div>
              <h3 style={{ fontSize:15.5,fontWeight:700,color:'#0f172a',margin:0 }}>All Client Companies ({filtered.length})</h3>
              <p style={{ fontSize:12.5,color:'#64748b',margin:'3px 0 0' }}>Click <strong>▼ show</strong> to expand center list · Click <strong>Company View</strong> for status overview</p>
            </div>
            <div style={{ display:'flex',gap:10 }}>
              <input placeholder="Search companies..." value={search} onChange={e=>setSearch(e.target.value)}
                style={{ padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,outline:'none',width:200 }}/>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                style={{ padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:13,background:'#fff' }}>
                <option value="name">Sort: Name</option>
                <option value="centers">Sort: Centers ↓</option>
                <option value="score">Sort: Score ↓</option>
              </select>
            </div>
          </div>

          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13.5 }}>
            <thead>
              <tr style={{ background:'#f8fafc',borderBottom:'1px solid #e2e8f0' }}>
                {['Company','Centers','States','Data Entered','Avg Score','Actions'].map(h=>(
                  <th key={h} style={{ textAlign:'left',padding:'10px 16px',fontSize:11.5,fontWeight:700,color:'#94a3b8',letterSpacing:'0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(co=>(
                <React.Fragment key={co.id}>
                  <tr style={{ borderBottom:'1px solid #f8fafc', cursor:'pointer',
                      background:expanded===co.id?'#f5f7ff':co.id===1292?'#f0fdf4':'transparent' }}
                    onMouseEnter={e=>e.currentTarget.style.background=expanded===co.id?'#f5f7ff':'#f8fafc'}
                    onMouseLeave={e=>e.currentTarget.style.background=expanded===co.id?'#f5f7ff':co.id===1292?'#f0fdf4':'transparent'}>
                    <td style={{ padding:'13px 16px' }} onClick={()=>setExpanded(expanded===co.id?null:co.id)}>
                      <div style={{ fontWeight:600,color:'#1e293b' }}>{co.name}</div>
                      {co.id===1292&&<span style={{ fontSize:11,padding:'1px 7px',borderRadius:20,background:'#eef7f2',color:'#2d7a4f',border:'1px solid #a7d4ba',marginTop:3,display:'inline-block' }}>Pilot client</span>}
                    </td>
                    <td style={{ padding:'13px 16px',color:'#374151' }} onClick={()=>setExpanded(expanded===co.id?null:co.id)}>{co.centers.length}</td>
                    <td style={{ padding:'13px 16px',color:'#374151' }} onClick={()=>setExpanded(expanded===co.id?null:co.id)}>{co.states.slice(0,3).join(', ')}{co.states.length>3?` +${co.states.length-3}`:''}</td>
                    <td style={{ padding:'13px 16px' }} onClick={()=>setExpanded(expanded===co.id?null:co.id)}>
                      <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                        <div style={{ flex:1,maxWidth:80,height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden' }}>
                          <div style={{ width:`${Math.round(co.withData/co.centers.length*100)}%`,height:'100%',background:'#00a99d',borderRadius:3 }}/>
                        </div>
                        <span style={{ fontSize:12,color:'#64748b' }}>{co.withData}/{co.centers.length}</span>
                      </div>
                    </td>
                    <td style={{ padding:'13px 16px' }} onClick={()=>setExpanded(expanded===co.id?null:co.id)}>
                      {co.avg!==null
                        ? <span style={{ fontWeight:700,fontSize:15,color:sc(co.avg) }}>{co.avg}%</span>
                        : <span style={{ color:'#94a3b8' }}>—</span>}
                    </td>
                    <td style={{ padding:'13px 16px' }}>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <button onClick={()=>{ setCompanyView(co); setActiveView('company-view'); if(onSelectCompany) onSelectCompany(co); }}
                          style={{ fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:6,
                            border:'1px solid #c5cbee', background:'#f0f2ff', color:'#4f5fa8',
                            cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                          Company View
                        </button>
                        <span style={{ fontSize:12,color:'#94a3b8',cursor:'pointer' }}
                          onClick={()=>setExpanded(expanded===co.id?null:co.id)}>
                          {expanded===co.id?'▲ hide':'▼ show'}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {expanded===co.id&&(
                    <tr>
                      <td colSpan={6} style={{ background:'#f5f7ff',padding:'16px 20px',borderBottom:'1px solid #c5cbee' }}>
                        <div style={{ fontSize:13,fontWeight:600,color:'#4f5fa8',marginBottom:12 }}>{co.name} — All {co.centers.length} Centers</div>
                        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10 }}>
                          {co.centers.map(c=>{
                            const seed = lionheartSeed[c.id];
                            const s    = seed?._scores?.overall??null;
                            const hasD = !!allData[c.id]?.lastUpdated||!!seed;
                            return (
                              <div key={c.id} onClick={() => onSelectCenter && onSelectCenter(c.id)}
                                style={{ background:'#fff',border:`1px solid ${sbd(s)}`,borderLeft:`3px solid ${sc(s)}`,borderRadius:9,padding:'12px 14px',cursor:'pointer' }}
                                onMouseEnter={e=>e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.07)'}
                                onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
                                <div style={{ fontSize:18,fontWeight:800,color:sc(s) }}>{s!==null?`${s}%`:'—'}</div>
                                <div style={{ fontSize:10, padding:'1px 7px', borderRadius:20, marginTop:4, display:'inline-block',
                                  background:sbg(s), color:sc(s), border:`1px solid ${sbd(s)}`, fontWeight:600 }}>{sl(s)}</div>
                                <div style={{ fontSize:12.5,fontWeight:600,color:'#1e293b',marginTop:6 }}>{c.centerName}</div>
                                <div style={{ fontSize:11,color:'#94a3b8',marginTop:2 }}>{c.city}, {c.state}</div>
                                {hasD&&<div style={{ fontSize:10,color:'#2d7a4f',marginTop:4,fontWeight:600 }}>✓ Data on file</div>}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';

// ── Inspection type definitions ───────────────────────────────────────────────
const INSPECTION_TYPES = [
  {
    id: 'system',
    label: 'System-Simulated Inspection',
    shortLabel: 'System-Simulated',
    whoTriggers: 'Automated by the system',
    accentColor: '#1e5c8a', accentBg: '#eef4fc', accentBd: '#a8c4e0',
    badgeColor: '#1e5c8a', badgeBg: '#eef4fc', badgeBd: '#a8c4e0',
    description: 'The system randomly selects ~10–20% of controls and checks them against your entered data. Runs 4 times a year (one per quarter) on pre-set dates. Results and a Corrective Action Plan are generated automatically.',
    icon: 'system', randomise: true, subsetMin: 0.10, subsetMax: 0.20,
  },
  {
    id: 'center',
    label: 'Director / Owner Simulation',
    shortLabel: 'Director-Simulated',
    whoTriggers: 'You trigger it manually',
    accentColor: '#1e5c38', accentBg: '#eef7f2', accentBd: '#a7d4ba',
    badgeColor: '#1e5c38', badgeBg: '#eef7f2', badgeBd: '#a7d4ba',
    description: 'You take on the inspector role and run a full trial inspection of your own center. Choose which domains to focus on, or run all 7. Each run generates a Corrective Action Plan you can work from before the real inspection.',
    icon: 'center', randomise: false, subsetMin: 1, subsetMax: 1,
  },
  {
    id: 'real',
    label: 'Record Past State Inspection',
    shortLabel: 'Real Inspection',
    whoTriggers: 'Manual entry only',
    accentColor: '#7f1d1d', accentBg: '#fdf1f1', accentBd: '#e8a0a0',
    badgeColor: '#7f1d1d', badgeBg: '#fdf1f1', badgeBd: '#e8a0a0',
    description: 'Record the results of a past state licensing inspection conducted before this system was in use. Future real inspections completed by an inspector through the Inspector View are saved automatically.',
    icon: 'real', randomise: false, subsetMin: 1, subsetMax: 1, isReal: true,
    infoNote: 'Future real inspections are auto-saved from the Inspector View. Use this only for historical records.',
  },
];

// ── Quarterly schedule helpers ────────────────────────────────────────────────
function getQuarterlyDates(year) {
  return [
    { quarter: 'Q1', label: 'Q1 — January',   date: `${year}-01-15` },
    { quarter: 'Q2', label: 'Q2 — April',     date: `${year}-04-15` },
    { quarter: 'Q3', label: 'Q3 — July',      date: `${year}-07-15` },
    { quarter: 'Q4', label: 'Q4 — October',   date: `${year}-10-15` },
  ];
}

function getQuarterStatus(runs) {
  // Returns which quarters of the current year already have a system-sim run
  const year = new Date().getFullYear();
  const done = new Set();
  (runs || []).forEach(r => {
    if (r.inspectionType !== 'system') return;
    const d = new Date(r.runTimestamp || r.date);
    if (d.getFullYear() !== year) return;
    const m = d.getMonth();
    if (m < 3) done.add('Q1');
    else if (m < 6) done.add('Q2');
    else if (m < 9) done.add('Q3');
    else done.add('Q4');
  });
  return done;
}

function currentQuarter() {
  const m = new Date().getMonth();
  if (m < 3) return 'Q1';
  if (m < 6) return 'Q2';
  if (m < 9) return 'Q3';
  return 'Q4';
}

// ── LocalStorage ──────────────────────────────────────────────────────────────
const LS_RUNS_KEY = '1core_compliance_v6_auditruns';

function getSavedRuns(centerId) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_RUNS_KEY) || '{}');
    return all[centerId] || [];
  } catch { return []; }
}

function saveRun(centerId, run) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_RUNS_KEY) || '{}');
    if (!all[centerId]) all[centerId] = [];
    all[centerId].unshift(run);
    if (all[centerId].length > 50) all[centerId] = all[centerId].slice(0, 50);
    localStorage.setItem(LS_RUNS_KEY, JSON.stringify(all));
  } catch {}
}

// ── Build compliance checks ───────────────────────────────────────────────────
function buildAllChecks(center, reg, liveData) {
  const rules = reg?.rules || {};
  const lic   = liveData.licensing          || {};
  const phy   = liveData.physical           || {};
  const per   = liveData.personnel          || {};
  const cr    = liveData.staffCredentials   || {};
  const h     = liveData.staffHealth        || {};
  const ch    = liveData.children           || {};
  const em    = liveData.emergency          || {};
  const rat   = liveData.ratios             || {};
  const today = new Date();

  const yn    = v => !v || v==='' ? 'not_entered' : v==='Yes' ? 'pass' : 'fail';
  const ynNA  = v => !v || v==='' ? 'not_entered' : (v==='Yes'||v==='Not applicable'||v==='N/A') ? 'pass' : 'fail';
  const future= (ds,min=0) => !ds ? 'not_entered' : (new Date(ds)-today)/86400000>min ? 'pass' : 'fail';
  const age   = (ds,max)   => !ds ? 'not_entered' : (today-new Date(ds))/86400000<=max ? 'pass' : 'fail';
  const has   = v => !v || v==='' ? 'not_entered' : 'pass';

  return {
    d1:[
      {label:'License number on file',          critical:true,  result:has(lic.licenseNumber)},
      {label:'License not expired',             critical:true,  result:future(lic.licenseExpiry,0)},
      {label:'License certificate on file',     critical:false, result:yn(lic.licCertOnFile)},
      {label:'GL insurance active',             critical:true,  result:future(lic.insuranceExpiry,0)},
      {label:"Workers' comp active",            critical:false, result:future(lic.workersCompExpiry,0)},
      {label:'Last inspection result on file',  critical:false, result:has(lic.lastInspectionResult)},
      {label:'COI on file',                     critical:false, result:yn(lic.coiOnFile)},
    ],
    d2:[
      {label:'CO detector installed',           critical:true,  result:yn(phy.coDetectorInstalled)},
      {label:'Smoke detectors installed',       critical:true,  result:yn(phy.smokeDetectorInstalled)},
      {label:'Fire extinguisher current',       critical:true,  result:yn(phy.fireExtinguisherCurrent)},
      {label:'First aid kit present',           critical:false, result:yn(phy.firstAidKitPresent)},
      {label:'Indoor space compliant',          critical:false, result:(() => {
        const i=parseFloat(phy.indoorSqft),c=parseFloat(phy.capacity);
        if(!i||!c)return 'not_entered'; return i/c>=(reg?.indoorSqft||35)?'pass':'fail';
      })()},
      {label:'Outdoor space compliant',         critical:false, result:(() => {
        const o=parseFloat(phy.outdoorSqft),c=parseFloat(phy.capacity);
        if(!o||!c)return 'not_entered'; return o/c>=(reg?.outdoorSqft||75)?'pass':'fail';
      })()},
      {label:'Hot water temperature safe',      critical:true,  result:(() => {
        const hw=parseFloat(phy.hotWaterMaxTemp);
        if(!hw)return 'not_entered'; return hw<=parseFloat(rules.hotWaterMax||110)?'pass':'fail';
      })()},
    ],
    d3:[
      {label:'All staff background checked',    critical:true,  result:(() => {
        const v=parseFloat(cr.bgValid||0),t=parseFloat(cr.bgTotal||0);
        if(!t)return 'not_entered'; return v>=t?'pass':'fail';
      })()},
      {label:'FBI clearance on file',           critical:true,  result:yn(per.fbiClearance)},
      {label:'Child abuse registry checked',    critical:true,  result:has(per.childAbuseRegistryDate)},
      {label:'Director qualifications on file', critical:false, result:has(per.directorEduLevel)},
      {label:'Teacher qualifications met',      critical:false, result:yn(per.teacherEduMeetsReq)},
    ],
    d4:[
      ...['infant','toddler','preschool','schoolAge'].map(key=>({
        label:`${key.charAt(0).toUpperCase()+key.slice(1)} ratio compliant`,
        critical:true,
        result:(() => {
          const g=rat[key]||{};
          if(!g.staff||parseFloat(g.staff)===0)return 'not_entered';
          if(!g.children||parseFloat(g.children)===0)return 'pass';
          return parseFloat(g.children)/parseFloat(g.staff)<=(reg?.[key]||99)?'pass':'fail';
        })(),
      })),
      {label:'Sign-in/sign-out log',            critical:false, result:yn(rat.signinLogMaintained)},
    ],
    d5:[
      {label:'CPR certification current',       critical:true,  result:(() => {
        if(!h.cprCertValid)return 'not_entered';
        if(h.cprCertValid!=='Yes')return 'fail';
        return future(h.cprExpiryDate,0);
      })()},
      {label:'First Aid — all staff',           critical:false, result:yn(h.firstAidCertValid)},
      {label:'Annual training hours met',       critical:false, result:(() => {
        const hrs=parseFloat(cr.trainingHrs||0),req=reg?.trainingHrs||0;
        if(!cr.trainingHrs)return 'not_entered'; return hrs>=req?'pass':'fail';
      })()},
      {label:'TB screening on file',            critical:false, result:yn(h.tbScreeningAllStaff)},
      {label:'Mandated reporter training done', critical:false, result:(() => {
        const s=cr.mandatedReporterDone;
        if(!s)return 'not_entered'; return s==='all'||s.includes('All')?'pass':'fail';
      })()},
    ],
    d6:[
      {label:'Child enrollment records complete',critical:true, result:yn(ch.childRecordComplete)},
      {label:'Emergency contacts on file',       critical:true, result:yn(ch.emergContactsOnFile)},
      {label:'Immunization records on file',     critical:true, result:yn(ch.immRecordsOnFile)},
      {label:'Parent agreements signed',         critical:false,result:yn(ch.parentAgreementSigned)},
      {label:'Allergy care plans on file',       critical:false,result:yn(ch.allergyCareplan)},
      {label:'Safe sleep policy on file',        critical:false,result:ynNA(ch.safeSleepPolicy)},
      {label:'Daily attendance record on file',  critical:false,result:yn(ch.attendanceRecordOnFile)},
    ],
    d7:[
      {label:'Fire evacuation plan on file',    critical:true,  result:yn(em.fireEvacPlan)},
      {label:'Fire drill current (≤35 days)',   critical:true,  result:age(em.lastFireDrillDate,35)},
      {label:'Fire drill log on file',          critical:false, result:yn(em.fireDrillLog)},
      {label:'Tornado/weather drill done',      critical:false, result:(() => {
        if(rules.tornadoDrill==='Not required')return 'pass';
        return age(em.tornadoDrillDate,rules.tornadoDrill==='Monthly'?35:200);
      })()},
      {label:'Lockdown drill current',          critical:false, result:age(em.lockdownDrillDate,200)},
      {label:'Emergency plan on file',          critical:false, result:yn(em.emergencyPlanOnFile)},
      {label:'Drill log maintained',            critical:false, result:yn(em.drillLogMaintained)},
    ],
  };
}

const DOMAIN_META = {
  d1:{dNum:'D1',label:'Licensing & Administration'},
  d2:{dNum:'D2',label:'Physical Environment'},
  d3:{dNum:'D3',label:'Personnel & Qualifications'},
  d4:{dNum:'D4',label:'Ratios & Supervision'},
  d5:{dNum:'D5',label:'Staff Health & Training'},
  d6:{dNum:'D6',label:"Children's Records & Health"},
  d7:{dNum:'D7',label:'Emergency & Safety'},
};

function selectChecks(allChecks, inspType, domainFilter) {
  const all = ['d1','d2','d3','d4','d5','d6','d7'];
  const domains = domainFilter.length>0 ? domainFilter : all;
  const results = {};
  if (inspType.randomise) {
    const flat = [];
    all.forEach(dKey=>(allChecks[dKey]||[]).forEach(c=>flat.push({...c,dKey})));
    const pct = inspType.subsetMin + Math.random()*(inspType.subsetMax-inspType.subsetMin);
    const take = Math.max(3,Math.round(flat.length*pct));
    const picked = [...flat].sort(()=>Math.random()-0.5).slice(0,take);
    all.forEach(dKey=>{
      const dp = picked.filter(c=>c.dKey===dKey).map(({dKey:_,...r})=>r);
      if(dp.length>0) results[dKey]=dp;
    });
  } else {
    domains.forEach(dKey=>{ results[dKey]=allChecks[dKey]||[]; });
  }
  return results;
}

// ── Score helpers ─────────────────────────────────────────────────────────────
const scoreColor = s => s===null?'#94a3b8':s>=80?'#2d7a4f':s>=60?'#b45309':'#b91c1c';
const scoreLabel = s => s===null?'No data':s>=80?'Inspection Ready':s>=60?'Needs Attention':'At Risk of Failing';

const RESULT_CFG = {
  pass:       {bg:'#eef7f2',bd:'#a7d4ba',color:'#1e5c38',label:'✓ Pass'},
  fail:       {bg:'#fdf1f1',bd:'#e8a0a0',color:'#7f1d1d',label:'✗ Fail'},
  not_entered:{bg:'#f8fafc',bd:'#e2e8f0',color:'#94a3b8',label:'— Not entered'},
};

// ── SVG icons ─────────────────────────────────────────────────────────────────
function Icon({name,size=16,color='currentColor'}) {
  const s={width:size,height:size,verticalAlign:'middle',flexShrink:0};
  const p={fill:'none',stroke:color,strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'};
  if(name==='system') return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
  if(name==='center') return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if(name==='real')   return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
  if(name==='calendar')return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
  if(name==='history') return <svg style={s} viewBox="0 0 24 24" {...p}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.12"/></svg>;
  if(name==='chevron') return <svg style={s} viewBox="0 0 24 24" {...p}><polyline points="6 9 12 15 18 9"/></svg>;
  if(name==='check')   return <svg style={s} viewBox="0 0 24 24" {...p}><polyline points="20 6 9 17 4 12"/></svg>;
  if(name==='info')    return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  return null;
}

function TypeBadge({type,small}) {
  return <span style={{fontSize:small?10.5:11.5,fontWeight:700,padding:small?'2px 7px':'3px 10px',borderRadius:20,background:type.badgeBg,color:type.badgeColor,border:`1px solid ${type.badgeBd}`,whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:4}}><Icon name={type.icon} size={small?10:11} color={type.badgeColor}/>{type.shortLabel}</span>;
}

// ── Quarterly schedule panel ──────────────────────────────────────────────────
function QuarterlySchedule({runs}) {
  const year = new Date().getFullYear();
  const done = getQuarterStatus(runs);
  const cq   = currentQuarter();
  const schedule = getQuarterlyDates(year);

  return (
    <div style={{background:'#eef4fc',border:'1px solid #a8c4e0',borderRadius:10,padding:'14px 16px',marginBottom:16}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
        <Icon name="calendar" size={14} color="#1e5c8a"/>
        <span style={{fontSize:12,fontWeight:700,color:'#1e5c8a',textTransform:'uppercase',letterSpacing:'0.05em'}}>
          {year} System-Simulated Schedule
        </span>
        <span style={{fontSize:11,color:'#4f86b0',marginLeft:4}}>{done.size}/4 completed this year</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:8}}>
        {schedule.map(q => {
          const isDone = done.has(q.quarter);
          const isCurrent = q.quarter === cq;
          return (
            <div key={q.quarter} style={{
              background:isDone?'#eef7f2':'#fff',
              border:`1px solid ${isDone?'#a7d4ba':isCurrent?'#1e5c8a':'#c5d8ec'}`,
              borderRadius:8,padding:'8px 10px',textAlign:'center',
            }}>
              <div style={{fontSize:11,fontWeight:800,color:isDone?'#1e5c38':isCurrent?'#1e5c8a':'#64748b',marginBottom:2}}>
                {q.quarter} {isCurrent&&!isDone?'← Now':''}
              </div>
              <div style={{fontSize:10.5,color:'#64748b',marginBottom:4}}>{new Date(q.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
              {isDone
                ? <span style={{fontSize:10,fontWeight:700,color:'#1e5c38',display:'flex',alignItems:'center',justifyContent:'center',gap:3}}><Icon name="check" size={9} color="#1e5c38"/>Done</span>
                : <span style={{fontSize:10,color:isCurrent?'#1e5c8a':'#94a3b8',fontWeight:isCurrent?600:400}}>{isCurrent?'Pending':'Scheduled'}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Recent runs panel ─────────────────────────────────────────────────────────
function PastRunsPanel({runs}) {
  if(!runs.length) return null;
  return (
    <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:'14px 18px',marginBottom:16}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
        <Icon name="history" size={14} color="#64748b"/>
        <span style={{fontSize:13,fontWeight:700,color:'#374151'}}>Recent Runs</span>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:5}}>
        {runs.slice(0,5).map((run,i)=>{
          const t=INSPECTION_TYPES.find(x=>x.id===run.inspectionType);
          return (
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 10px',borderRadius:7,background:'#f8fafc',border:'1px solid #f1f5f9',fontSize:12.5}}>
              {t&&<TypeBadge type={t} small/>}
              <span style={{color:'#374151',flex:1}}>{run.date} · {run.total} checks</span>
              <span style={{fontWeight:700,color:scoreColor(run.readinessScore)}}>{run.readinessScore!==null?`${run.readinessScore}%`:'—'}</span>
              <span style={{color:run.fail>0?'#b91c1c':'#2d7a4f',fontWeight:600}}>{run.fail} fail</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Results screen ────────────────────────────────────────────────────────────
function ResultsScreen({results,type,center,onNew,onRerun}) {
  const [expandedDomain,setExpandedDomain] = useState(() => {
    const exp={};
    Object.entries(results.selected).forEach(([dKey,checks])=>{if(checks.some(c=>c.result==='fail'))exp[dKey]=true;});
    return exp;
  });
  const [filter,setFilter] = useState('all');
  const sc=results.readinessScore;

  return (
    <div>
      {/* Result header */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'20px 24px',marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,flexWrap:'wrap'}}>
          <TypeBadge type={type}/>
          <span style={{fontSize:12,color:'#64748b'}}>{center.name} · {center.state}</span>
          <span style={{fontSize:11.5,fontWeight:700,padding:'2px 9px',borderRadius:20,background:'#f0fdf4',color:'#166534',border:'1px solid #86efac'}}>{results.capId}</span>
          {results.quarter&&<span style={{fontSize:11.5,fontWeight:700,padding:'2px 9px',borderRadius:20,background:'#eef4fc',color:'#1e5c8a',border:'1px solid #a8c4e0'}}>{results.quarter}</span>}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:14}}>
          <div style={{display:'flex',alignItems:'baseline',gap:12}}>
            <div style={{fontSize:44,fontWeight:800,color:scoreColor(sc),lineHeight:1}}>{sc!==null?`${sc}%`:'—'}</div>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:scoreColor(sc)}}>{scoreLabel(sc)}</div>
              <div style={{fontSize:12.5,color:'#64748b'}}>If inspected today</div>
            </div>
          </div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {[
              {label:'Pass',val:results.pass,bg:'#eef7f2',bd:'#a7d4ba',c:'#1e5c38'},
              {label:'Fail',val:results.fail,bg:'#fdf1f1',bd:'#e8a0a0',c:'#7f1d1d'},
              {label:'Not entered',val:results.notEntered,bg:'#f1f5f9',bd:'#cbd5e1',c:'#475569'},
              {label:'Checks',val:results.total,bg:'#f8fafc',bd:'#e2e8f0',c:'#374151'},
            ].map(({label,val,bg,bd,c})=>(
              <div key={label} style={{background:bg,border:`1px solid ${bd}`,borderRadius:9,padding:'9px 14px',textAlign:'center',minWidth:72}}>
                <div style={{fontSize:22,fontWeight:700,color:c,lineHeight:1}}>{val}</div>
                <div style={{fontSize:11,color:c,marginTop:3,fontWeight:500}}>{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{marginTop:12}}>
          <div style={{height:8,background:'#e2e8f0',borderRadius:4,overflow:'hidden',display:'flex'}}>
            <div style={{height:'100%',background:'#2d7a4f',width:`${Math.round(results.pass/results.total*100)}%`,transition:'width 0.5s'}}/>
            <div style={{height:'100%',background:'#b91c1c',width:`${Math.round(results.fail/results.total*100)}%`,transition:'width 0.5s'}}/>
          </div>
        </div>
        <div style={{marginTop:12,padding:'10px 14px',background:'#f0fdf4',border:'1px solid #86efac',borderRadius:8,fontSize:13,color:'#166534'}}>
          <strong>CAP {results.capId} generated</strong> — {results.fail} finding{results.fail!==1?'s':''} require corrective action.
          {' '}<span style={{fontWeight:600,cursor:'pointer',textDecoration:'underline'}}>View in Corrective Action Plan tab →</span>
        </div>
        <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
          <button onClick={onNew} style={{padding:'7px 16px',borderRadius:8,cursor:'pointer',border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:13,fontWeight:500}}>← New run</button>
          <button onClick={onRerun} style={{padding:'7px 16px',borderRadius:8,cursor:'pointer',border:`1px solid ${type.accentBd}`,background:type.accentBg,color:type.accentColor,fontSize:13,fontWeight:500}}>↻ Re-run</button>
          <span style={{fontSize:12,color:'#94a3b8',alignSelf:'center',marginLeft:4}}>{results.date}</span>
        </div>
      </div>

      {/* Filter */}
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        <span style={{fontSize:12,color:'#94a3b8',fontWeight:600}}>SHOW</span>
        {['all','fail','not_entered','pass'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',background:filter===f?'#0f172a':'#f1f5f9',color:filter===f?'#fff':'#64748b',border:filter===f?'none':'1px solid #e2e8f0'}}>
            {f==='all'?'All':f==='fail'?'Fail':f==='not_entered'?'Not entered':'Pass'}
          </button>
        ))}
      </div>

      {/* Domain results */}
      {Object.entries(results.selected).map(([dKey,checks])=>{
        const meta=DOMAIN_META[dKey];
        const dPass=checks.filter(c=>c.result==='pass').length;
        const dFail=checks.filter(c=>c.result==='fail').length;
        const dNE=checks.filter(c=>c.result==='not_entered').length;
        const dotC=dFail>0?'#b91c1c':dNE>0?'#b45309':'#2d7a4f';
        const isOpen=!!expandedDomain[dKey];
        const visible=filter==='all'?checks:checks.filter(c=>c.result===filter);
        if(filter!=='all'&&visible.length===0)return null;

        return (
          <div key={dKey} style={{background:'#fff',border:'1px solid #e2e8f0',borderLeft:`3px solid ${dotC}`,borderRadius:10,marginBottom:10,overflow:'hidden'}}>
            <button onClick={()=>setExpandedDomain(p=>({...p,[dKey]:!p[dKey]}))} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'13px 18px',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
              <span style={{transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s',display:'flex'}}><Icon name="chevron" size={15} color="#94a3b8"/></span>
              <span style={{fontSize:12,fontWeight:700,color:'#94a3b8',minWidth:24}}>{meta.dNum}</span>
              <span style={{fontSize:13.5,fontWeight:600,color:'#0f172a'}}>{meta.label}</span>
              <div style={{flex:1,maxWidth:80,height:6,background:'#e2e8f0',borderRadius:3,overflow:'hidden',display:'flex',marginLeft:8}}>
                <div style={{height:'100%',background:'#2d7a4f',width:`${Math.round(dPass/checks.length*100)}%`}}/>
                <div style={{height:'100%',background:'#b91c1c',width:`${Math.round(dFail/checks.length*100)}%`}}/>
              </div>
              <div style={{display:'flex',gap:5}}>
                {dFail>0&&<span style={{fontSize:11,fontWeight:600,padding:'2px 7px',borderRadius:20,background:'#fdf1f1',color:'#7f1d1d',border:'1px solid #e8a0a0'}}>{dFail} fail</span>}
                {dNE>0&&<span style={{fontSize:11,padding:'2px 7px',borderRadius:20,color:'#94a3b8'}}>{dNE} not entered</span>}
                {dPass>0&&<span style={{fontSize:11,fontWeight:600,padding:'2px 7px',borderRadius:20,background:'#eef7f2',color:'#1e5c38',border:'1px solid #a7d4ba'}}>{dPass} pass</span>}
              </div>
            </button>
            {isOpen&&(
              <div style={{borderTop:'1px solid #f1f5f9'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead>
                    <tr style={{background:'#f8fafc'}}>
                      {['Priority','Compliance check','Result','Action'].map(h=>(
                        <th key={h} style={{textAlign:'left',padding:'8px 14px',fontSize:11,fontWeight:700,color:'#94a3b8',letterSpacing:'0.04em'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(filter==='all'?checks:visible).map((chk,i)=>{
                      const rc=RESULT_CFG[chk.result]||RESULT_CFG.not_entered;
                      return (
                        <tr key={i} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#fff':'#fafbfc'}}>
                          <td style={{padding:'9px 14px'}}>{chk.critical?<span style={{fontSize:11,fontWeight:700,padding:'2px 7px',borderRadius:20,background:'#fdf1f1',color:'#7f1d1d',border:'1px solid #e8a0a0'}}>Critical</span>:<span style={{fontSize:11,color:'#94a3b8'}}>Standard</span>}</td>
                          <td style={{padding:'9px 14px',color:'#374151',fontWeight:500}}>{chk.label}</td>
                          <td style={{padding:'9px 14px'}}><span style={{fontSize:11.5,fontWeight:600,padding:'3px 9px',borderRadius:20,background:rc.bg,color:rc.color,border:`1px solid ${rc.bd}`}}>{rc.label}</span></td>
                          <td style={{padding:'9px 14px',fontSize:12,color:'#64748b'}}>
                            {chk.result==='fail'&&'Update in Data Entry tab.'}
                            {chk.result==='not_entered'&&'No data yet — add in Data Entry tab.'}
                            {chk.result==='pass'&&'—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AuditSimTab({center,reg,liveData}) {
  const [selectedTypeId,setSelectedTypeId] = useState(null);
  const [phase,setPhase]                   = useState('choose');
  const [results,setResults]               = useState(null);
  const [domainFilter,setDomainFilter]     = useState([]);
  const [pastRuns,setPastRuns]             = useState([]);
  const [inspectionDate,setInspectionDate] = useState(new Date().toISOString().slice(0,10));
  const [inspectorName,setInspectorName]   = useState('');

  useEffect(()=>{ setPastRuns(getSavedRuns(center.id)); },[center.id]);

  const selectedType = INSPECTION_TYPES.find(t=>t.id===selectedTypeId);

  const toggleDomain = dKey => setDomainFilter(prev=>prev.includes(dKey)?prev.filter(d=>d!==dKey):[...prev,dKey]);

  const runSim = () => {
    const data      = liveData?.data || {};
    const allChecks = buildAllChecks(center,reg,data);
    const selected  = selectChecks(allChecks,selectedType,domainFilter);

    let pass=0,fail=0,notEntered=0;
    Object.values(selected).forEach(checks=>checks.forEach(c=>{
      if(c.result==='pass')pass++;
      else if(c.result==='fail')fail++;
      else notEntered++;
    }));
    const total          = pass+fail+notEntered;
    const readinessScore = total>0?Math.round(pass/total*100):null;
    const now            = new Date();
    const runDate        = now.toLocaleString();
    const cq             = selectedTypeId==='system'?currentQuarter():null;

    const runData = {
      inspectionType: selectedTypeId,
      date: runDate,
      runTimestamp: now.toISOString(),
      inspectionDate,
      inspectorName: inspectorName||(selectedType.isReal?'—':''),
      quarter: cq,
      selected,
      pass, fail, notEntered, total, readinessScore,
      capId: `CAP-${Date.now()}`,
    };

    setResults(runData);
    setPhase('results');
    saveRun(center.id,{...runData,selected:undefined});
    setPastRuns(getSavedRuns(center.id));
  };

  const reset = () => { setPhase('choose');setResults(null);setDomainFilter([]);setSelectedTypeId(null); };

  // ── Choose phase ─────────────────────────────────────────────────────────────
  if(phase==='choose') {
    return (
      <div style={{maxWidth:720,margin:'0 auto'}}>
        <QuarterlySchedule runs={pastRuns}/>
        <PastRunsPanel runs={pastRuns}/>

        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'24px 28px'}}>
          <h3 style={{fontSize:16,fontWeight:700,color:'#0f172a',margin:'0 0 4px'}}>Inspection Simulator</h3>
          <p style={{fontSize:13.5,color:'#64748b',margin:'0 0 20px',lineHeight:1.6}}>
            Choose an inspection type to run for <strong>{center.name}</strong>. Each run produces a Corrective Action Plan linked to that specific inspection instance.
          </p>
          <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',letterSpacing:'0.07em',marginBottom:10}}>SELECT INSPECTION TYPE</div>
          <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
            {INSPECTION_TYPES.map(type=>{
              const isSel=selectedTypeId===type.id;
              return (
                <button key={type.id} onClick={()=>setSelectedTypeId(type.id)} style={{textAlign:'left',padding:'15px 18px',borderRadius:10,cursor:'pointer',border:isSel?`2px solid ${type.accentColor}`:'1px solid #e2e8f0',background:isSel?type.accentBg:'#fff',fontFamily:'inherit',transition:'all 0.15s'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:5,gap:10}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <Icon name={type.icon} size={18} color={isSel?type.accentColor:'#94a3b8'}/>
                      <span style={{fontSize:14,fontWeight:700,color:isSel?type.accentColor:'#1e293b'}}>{type.label}</span>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3,flexShrink:0}}>
                      <TypeBadge type={type}/>
                      <span style={{fontSize:11,color:'#94a3b8'}}>{type.whoTriggers}</span>
                    </div>
                  </div>
                  <p style={{fontSize:13,color:'#64748b',margin:'0 0 0 28px',lineHeight:1.5}}>{type.description}</p>
                  {type.infoNote&&(
                    <div style={{margin:'8px 0 0 28px',display:'flex',alignItems:'flex-start',gap:5,padding:'7px 10px',background:'rgba(255,255,255,0.6)',borderRadius:6,border:'1px solid #e8a0a0'}}>
                      <Icon name="info" size={12} color="#7f1d1d"/>
                      <span style={{fontSize:11.5,color:'#7f1d1d'}}>{type.infoNote}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <button onClick={()=>selectedTypeId&&setPhase('configure')} disabled={!selectedTypeId} style={{width:'100%',padding:'13px',borderRadius:10,border:'none',cursor:selectedTypeId?'pointer':'not-allowed',background:selectedTypeId?'#00a99d':'#e2e8f0',color:selectedTypeId?'#fff':'#94a3b8',fontSize:15,fontWeight:700}}>
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // ── Configure phase ───────────────────────────────────────────────────────────
  if(phase==='configure') {
    const allDomains=['d1','d2','d3','d4','d5','d6','d7'];
    const isSystem=selectedType.id==='system';
    const isReal=selectedType.isReal;

    return (
      <div style={{maxWidth:720,margin:'0 auto'}}>
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'24px 28px'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
            <button onClick={()=>setPhase('choose')} style={{background:'none',border:'none',cursor:'pointer',color:'#64748b',fontSize:13,fontWeight:500,padding:0}}>← Back</button>
            <TypeBadge type={selectedType}/>
            <span style={{fontSize:15,fontWeight:700,color:'#0f172a'}}>{selectedType.label}</span>
          </div>

          {isReal&&(
            <div style={{background:'#fdf1f1',border:'1px solid #e8a0a0',borderRadius:10,padding:'16px 18px',marginBottom:20}}>
              <div style={{fontSize:12,fontWeight:700,color:'#7f1d1d',marginBottom:12}}>PAST INSPECTION DETAILS</div>
              <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                <div style={{flex:1,minWidth:180}}>
                  <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:5}}>Inspection Date</label>
                  <input type="date" value={inspectionDate} onChange={e=>setInspectionDate(e.target.value)} style={{width:'100%',padding:'8px 10px',border:'1px solid #e8a0a0',borderRadius:7,fontSize:13,fontFamily:'inherit'}}/>
                </div>
                <div style={{flex:1,minWidth:180}}>
                  <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:5}}>Inspector Name (optional)</label>
                  <input type="text" value={inspectorName} placeholder="State inspector name" onChange={e=>setInspectorName(e.target.value)} style={{width:'100%',padding:'8px 10px',border:'1px solid #e8a0a0',borderRadius:7,fontSize:13,fontFamily:'inherit'}}/>
                </div>
              </div>
            </div>
          )}

          {isSystem&&(
            <div style={{background:'#eef4fc',border:'1px solid #a8c4e0',borderRadius:10,padding:'13px 16px',marginBottom:20}}>
              <div style={{fontSize:13,color:'#1e5c8a',fontWeight:600,marginBottom:4}}>Quarterly run · {currentQuarter()}</div>
              <p style={{fontSize:13,color:'#1e5c8a',margin:0,lineHeight:1.5}}>Randomly selects ~10–20% of all compliance checks across all 7 domains — mirroring how a real state inspector works.</p>
            </div>
          )}

          {!isSystem&&!isReal&&(
            <div style={{marginBottom:20}}>
              <div style={{fontSize:12,fontWeight:700,color:'#94a3b8',letterSpacing:'0.06em',marginBottom:10}}>
                SELECT DOMAINS <span style={{fontWeight:400,marginLeft:4,color:'#b0bec5'}}>(leave all unselected to include all 7)</span>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {allDomains.map(dKey=>{
                  const meta=DOMAIN_META[dKey],isOn=domainFilter.includes(dKey);
                  return (
                    <button key={dKey} onClick={()=>toggleDomain(dKey)} style={{padding:'7px 14px',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:12.5,fontWeight:600,border:isOn?'2px solid #00a99d':'1px solid #e2e8f0',background:isOn?'#f0fdfb':'#f8fafc',color:isOn?'#007a72':'#374151',transition:'all 0.12s'}}>
                      <span style={{color:'#94a3b8',marginRight:5}}>{meta.dNum}</span>{meta.label}
                    </button>
                  );
                })}
              </div>
              {domainFilter.length===0&&<div style={{fontSize:12,color:'#94a3b8',marginTop:6}}>All 7 domains will be included.</div>}
            </div>
          )}

          <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'11px 15px',marginBottom:20,fontSize:13,color:'#374151'}}>
            <strong>A Corrective Action Plan will be generated</strong> and linked to this inspection instance.
          </div>

          <button onClick={runSim} style={{width:'100%',padding:'13px',borderRadius:10,border:'none',cursor:'pointer',background:selectedType.accentColor,color:'#fff',fontSize:15,fontWeight:700}}>
            {isSystem?'Run system simulation →':isReal?'Record inspection results →':'Run director simulation →'}
          </button>
        </div>
      </div>
    );
  }

  // ── Results phase ─────────────────────────────────────────────────────────────
  return <ResultsScreen results={results} type={selectedType} center={center} onNew={reset} onRerun={runSim}/>;
}

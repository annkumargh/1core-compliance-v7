import React, { useState } from 'react';

// ── Audit type definitions ────────────────────────────────────────────────────
const AUDIT_TYPES = [
  {
    id: 'standard',
    label: 'Standard inspection',
    badge: 'Most realistic',
    badgeColor: '#1e5c38',
    badgeBg: '#eef7f2',
    badgeBd: '#a7d4ba',
    description: '~23 checks — mirrors a routine annual licensing inspection. All critical items plus a representative selection of standard checks.',
    domains: ['d1','d2','d3','d4','d5','d6','d7'],
    criticalOnly: false,
    subset: 0.75, // 75% of checks
  },
  {
    id: 'critical',
    label: 'Critical items only',
    badge: 'Quick check',
    badgeColor: '#475569',
    badgeBg: '#f1f5f9',
    badgeBd: '#cbd5e1',
    description: '13 checks — covers only the items that trigger immediate citations. Use for a quick readiness check.',
    domains: ['d1','d2','d3','d4'],
    criticalOnly: true,
    subset: 1,
  },
  {
    id: 'full',
    label: 'Full comprehensive audit',
    badge: 'Most thorough',
    badgeColor: '#1e5c8a',
    badgeBg: '#eef4fc',
    badgeBd: '#a8c4e0',
    description: 'Every compliance check across all 7 domains. Use for a thorough annual self-assessment.',
    domains: ['d1','d2','d3','d4','d5','d6','d7'],
    criticalOnly: false,
    subset: 1,
  },
];

// ── Build all checks ──────────────────────────────────────────────────────────
function buildAllChecks(center, reg, liveData) {
  const rules  = reg?.rules  || {};
  const lic    = liveData.licensing          || {};
  const phy    = liveData.physical           || {};
  const per    = liveData.personnel          || {};
  const cr     = liveData.staffCredentials   || {};
  const h      = liveData.staffHealth        || {};
  const ch     = liveData.children           || {};
  const em     = liveData.emergency          || {};
  const ratios = liveData.ratios             || {};
  const today  = new Date();

  const yn = (val) => !val || val === '' ? 'not_entered' : val === 'Yes' ? 'pass' : 'fail';
  const ynNA = (val) => !val || val === '' ? 'not_entered' : (val === 'Yes' || val === 'Not applicable' || val === 'N/A') ? 'pass' : 'fail';
  const future = (ds, minDays=0) => !ds ? 'not_entered' : (new Date(ds)-today)/86400000 > minDays ? 'pass' : 'fail';
  const age = (ds, maxDays) => !ds ? 'not_entered' : (today-new Date(ds))/86400000 <= maxDays ? 'pass' : 'fail';
  const has = (val) => !val || val === '' ? 'not_entered' : 'pass';

  return {
    d1: [
      { label:'License number on file',          critical:true,  result: has(lic.licenseNumber) },
      { label:'License not expired',             critical:true,  result: future(lic.licenseExpiry, 0) },
      { label:'License certificate on file',     critical:false, result: yn(lic.licCertOnFile) },
      { label:'GL insurance active',             critical:true,  result: future(lic.insuranceExpiry, 0) },
      { label:"Workers' comp active",            critical:false, result: future(lic.workersCompExpiry, 0) },
      { label:'Inspection conducted on schedule',critical:false, result: (() => {
        if (!lic.lastInspectionDate) return 'not_entered';
        const days = (today-new Date(lic.lastInspectionDate))/86400000;
        return days <= 365/(reg?.inspPerYear||1)+30 ? 'pass' : 'fail';
      })() },
      { label:'Last inspection result on file',  critical:false, result: has(lic.lastInspectionResult) },
      { label:'COI on file',                     critical:false, result: yn(lic.coiOnFile) },
    ],
    d2: [
      { label:'CO detector installed',           critical:true,  result: yn(phy.coDetectorInstalled) },
      { label:'Smoke detectors installed',       critical:true,  result: yn(phy.smokeDetectorInstalled) },
      { label:'Fire extinguisher current',       critical:true,  result: yn(phy.fireExtinguisherCurrent) },
      { label:'First aid kit present',           critical:false, result: yn(phy.firstAidKitPresent) },
      { label:'Indoor space compliant',          critical:false, result: (() => {
        const i = parseFloat(phy.indoorSqft), c = parseFloat(phy.capacity);
        if (!i||!c) return 'not_entered'; return i/c >= (reg?.indoorSqft||35) ? 'pass' : 'fail';
      })() },
      { label:'Outdoor space compliant',         critical:false, result: (() => {
        const o = parseFloat(phy.outdoorSqft), c = parseFloat(phy.capacity);
        if (!o||!c) return 'not_entered'; return o/c >= (reg?.outdoorSqft||75) ? 'pass' : 'fail';
      })() },
      { label:'Fencing encloses play area',      critical:false, result: yn(phy.fencingEnclosesPlayArea) },
      { label:'Hot water temperature safe',      critical:true,  result: (() => {
        const hw = parseFloat(phy.hotWaterMaxTemp);
        if (!hw) return 'not_entered'; return hw <= parseFloat(rules.hotWaterMax||110) ? 'pass' : 'fail';
      })() },
    ],
    d3: [
      { label:'All staff background checked',    critical:true,  result: (() => {
        const v = parseFloat(cr.bgValid||0), t = parseFloat(cr.bgTotal||0);
        if (!t) return 'not_entered'; return v >= t ? 'pass' : 'fail';
      })() },
      { label:'FBI clearance on file',           critical:true,  result: yn(per.fbiClearance) },
      { label:'Child abuse registry checked',    critical:true,  result: has(per.childAbuseRegistryDate) },
      { label:'Director qualifications on file', critical:false, result: has(per.directorEduLevel) },
      { label:'Teacher qualifications met',      critical:false, result: yn(per.teacherEduMeetsReq) },
      { label:'Admin designation on file',       critical:false, result: yn(per.adminDesignationOnFile) },
      { label:'Workforce registry enrolled',     critical:false, result: (() => {
        const wreg = rules.workforceRegistry;
        if (!wreg || wreg==='No') return 'pass';
        const s = cr.workforceRegistryDone;
        if (!s) return 'not_entered';
        return s==='all'||s.includes('All') ? 'pass' : 'fail';
      })() },
    ],
    d4: [
      ...['infant','toddler','preschool','schoolAge'].map(key => ({
        label: `${key.charAt(0).toUpperCase()+key.slice(1)} ratio compliant`,
        critical: true,
        result: (() => {
          const g = ratios[key]||{};
          if (!g.staff||parseFloat(g.staff)===0) return 'not_entered';
          if (!g.children||parseFloat(g.children)===0) return 'pass';
          return parseFloat(g.children)/parseFloat(g.staff) <= (reg?.[key]||99) ? 'pass' : 'fail';
        })(),
      })),
      { label:'Sign-in/sign-out log maintained', critical:false, result: yn(ratios.signinLogMaintained) },
    ],
    d5: [
      { label:'CPR certification current',       critical:true,  result: (() => {
        if (!h.cprCertValid) return 'not_entered';
        if (h.cprCertValid!=='Yes') return 'fail';
        return future(h.cprExpiryDate, 0);
      })() },
      { label:'First Aid — all staff',           critical:false, result: yn(h.firstAidCertValid) },
      { label:'Annual training hours met',       critical:false, result: (() => {
        const hrs = parseFloat(cr.trainingHrs||0), req = reg?.trainingHrs||0;
        if (!cr.trainingHrs) return 'not_entered'; return hrs>=req ? 'pass' : 'fail';
      })() },
      { label:'TB screening on file',            critical:false, result: yn(h.tbScreeningAllStaff) },
      { label:'Staff physical exams on file',    critical:false, result: yn(h.physicalExamOnFile) },
      { label:'Mandated reporter training done', critical:false, result: (() => {
        const s = cr.mandatedReporterDone;
        if (!s) return 'not_entered'; return s==='all'||s.includes('All') ? 'pass' : 'fail';
      })() },
      { label:'New hire orientation completed',  critical:false, result: yn(h.newHireOrientationCompleted) },
      { label:'Training log on file',            critical:false, result: yn(h.trainingLogOnFile) },
    ],
    d6: [
      { label:'Child enrollment records complete', critical:true,  result: yn(ch.childRecordComplete) },
      { label:'Emergency contacts on file',        critical:true,  result: yn(ch.emergContactsOnFile) },
      { label:'Immunization records on file',      critical:true,  result: yn(ch.immRecordsOnFile) },
      { label:'Parent agreements signed',          critical:false, result: yn(ch.parentAgreementSigned) },
      { label:'Allergy care plans on file',        critical:false, result: yn(ch.allergyCareplan) },
      { label:'Medication log maintained',         critical:false, result: ynNA(ch.medLogMaintained) },
      { label:'Safe sleep policy on file',         critical:false, result: ynNA(ch.safeSleepPolicy) },
      { label:'Authorized pickup list on file',    critical:false, result: yn(ch.authPickupOnFile) },
      { label:'Daily attendance record on file',   critical:false, result: yn(ch.attendanceRecordOnFile) },
      { label:'Sign-in/sign-out log (children)',   critical:false, result: yn(ch.attendanceSignInLog) },
    ],
    d7: [
      { label:'Fire evacuation plan on file',    critical:true,  result: yn(em.fireEvacPlan) },
      { label:'Fire drill current (≤35 days)',   critical:true,  result: age(em.lastFireDrillDate, 35) },
      { label:'Fire drill log on file',          critical:false, result: yn(em.fireDrillLog) },
      { label:'Fire evacuation plan posted',     critical:false, result: yn(em.fireEvacPosted) },
      { label:'Fire safety training done',       critical:false, result: yn(em.fireSafetyTraining) },
      { label:'Tornado/weather drill done',      critical:false, result: (() => {
        if (rules.tornadoDrill==='Not required') return 'pass';
        return age(em.tornadoDrillDate, rules.tornadoDrill==='Monthly'?35:200);
      })() },
      { label:'Lockdown drill current',          critical:false, result: age(em.lockdownDrillDate, 200) },
      { label:'Emergency plan on file',          critical:false, result: yn(em.emergencyPlanOnFile) },
      { label:'Drill log maintained',            critical:false, result: yn(em.drillLogMaintained) },
      { label:'Annual health inspection on file',critical:false, result: yn(em.annualFireInspOnFile) },
    ],
  };
}

const DOMAIN_META = {
  d1:{ dNum:'D1', label:'Licensing & Administration' },
  d2:{ dNum:'D2', label:'Physical Environment' },
  d3:{ dNum:'D3', label:'Personnel & Qualifications' },
  d4:{ dNum:'D4', label:'Ratios & Supervision' },
  d5:{ dNum:'D5', label:'Staff Health & Training' },
  d6:{ dNum:'D6', label:"Children's Records & Health" },
  d7:{ dNum:'D7', label:'Emergency & Safety' },
};

// ── Select checks for audit type ──────────────────────────────────────────────
function selectChecks(allChecks, auditType) {
  const results = {};
  auditType.domains.forEach(dKey => {
    let checks = allChecks[dKey] || [];
    if (auditType.criticalOnly) {
      checks = checks.filter(c => c.critical);
    } else if (auditType.subset < 1) {
      // Standard: all critical + subset of non-critical
      const critical = checks.filter(c => c.critical);
      const nonCrit  = checks.filter(c => !c.critical);
      const take = Math.max(0, Math.round(nonCrit.length * auditType.subset) - critical.length);
      checks = [...critical, ...nonCrit.slice(0, take)];
    }
    results[dKey] = checks;
  });
  return results;
}

// ── Colors ────────────────────────────────────────────────────────────────────
const RESULT_CFG = {
  pass:       { bg:'#eef7f2', bd:'#a7d4ba', color:'#1e5c38', label:'✓ Pass',        dot:'#2d7a4f' },
  fail:       { bg:'#fdf1f1', bd:'#e8a0a0', color:'#7f1d1d', label:'✗ Fail',        dot:'#b91c1c' },
  not_entered:{ bg:'#f8fafc', bd:'#e2e8f0', color:'#94a3b8', label:'— Not entered', dot:'#94a3b8' },
};
function scoreColor(s) {
  if (s===null) return '#94a3b8';
  if (s>=80) return '#2d7a4f'; if (s>=60) return '#b45309'; return '#b91c1c';
}
function scoreLabel(s) {
  if (s===null) return 'No data';
  if (s>=80) return 'Inspection Ready'; if (s>=60) return 'Needs Attention'; return 'At Risk of Failing';
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AuditSimTab({ center, reg, liveData }) {
  const [selectedType, setSelectedType] = useState('standard');
  const [phase, setPhase]               = useState('choose'); // 'choose' | 'results'
  const [results, setResults]           = useState(null);
  const [expandedDomain, setExpandedDomain] = useState({});
  const [filterResult, setFilterResult] = useState('all');

  const runSim = () => {
    const data = liveData?.data || {};
    const allChecks = buildAllChecks(center, reg, data);
    const auditType = AUDIT_TYPES.find(t => t.id === selectedType);
    const selected  = selectChecks(allChecks, auditType);

    let pass=0, fail=0, notEntered=0;
    Object.values(selected).forEach(checks =>
      checks.forEach(c => { if (c.result==='pass') pass++; else if (c.result==='fail') fail++; else notEntered++; })
    );
    const total = pass+fail+notEntered;
    const readinessScore = total>0 ? Math.round(pass/total*100) : null;
    const checkedScore   = (pass+fail)>0 ? Math.round(pass/(pass+fail)*100) : null;

    setResults({ selected, pass, fail, notEntered, total, readinessScore, checkedScore, auditType });
    setPhase('results');
    // Expand failing domains by default
    const exp = {};
    Object.entries(selected).forEach(([dKey, checks]) => {
      if (checks.some(c => c.result==='fail')) exp[dKey] = true;
    });
    setExpandedDomain(exp);
  };

  const reset = () => { setPhase('choose'); setResults(null); setFilterResult('all'); };

  // ── Choose phase ──────────────────────────────────────────────────────────────
  if (phase === 'choose') {
    return (
      <div style={{ maxWidth:680, margin:'0 auto' }}>
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'24px 28px', marginBottom:14 }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:'#0f172a', margin:'0 0 6px' }}>Audit Simulator</h3>
          <p style={{ fontSize:13.5, color:'#64748b', margin:'0 0 22px', lineHeight:1.6 }}>
            Simulate a state licensing inspection for {center.name}. The simulator checks your entered
            data against {center.state} requirements and identifies gaps before they become citations.
          </p>

          <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.07em', marginBottom:10 }}>
            CHOOSE AUDIT TYPE
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
            {AUDIT_TYPES.map(type => {
              const isSelected = selectedType === type.id;
              return (
                <button key={type.id} onClick={() => setSelectedType(type.id)}
                  style={{
                    textAlign:'left', padding:'16px 18px', borderRadius:10, cursor:'pointer',
                    border: isSelected ? `2px solid #00a99d` : '1px solid #e2e8f0',
                    background: isSelected ? '#f0fdfb' : '#fff',
                    fontFamily:'inherit', transition:'all 0.15s',
                    boxShadow: isSelected ? '0 0 0 3px rgba(0,169,157,0.12)' : 'none',
                  }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                    <span style={{ fontSize:14.5, fontWeight:700, color: isSelected ? '#007a72' : '#1e293b' }}>
                      {type.label}
                    </span>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:20,
                      background:type.badgeBg, color:type.badgeColor, border:`1px solid ${type.badgeBd}` }}>
                      {type.badge}
                    </span>
                  </div>
                  <p style={{ fontSize:13, color:'#64748b', margin:0, lineHeight:1.5 }}>{type.description}</p>
                </button>
              );
            })}
          </div>

          {/* How it works note */}
          <div style={{ background:'#fdf4e7', border:'1px solid #e6b87a', borderRadius:8, padding:'12px 16px', marginBottom:22 }}>
            <span style={{ fontSize:13, color:'#7c4a00', fontWeight:600 }}>How it works: </span>
            <span style={{ fontSize:13, color:'#7c4a00' }}>
              Where you've already entered data, the simulator auto-answers using your records.
              Fields with no data entered are flagged as Not Entered. At the end you get a readiness
              score and a prioritised list of items to address.
            </span>
          </div>

          <button onClick={runSim} style={{
            width:'100%', padding:'14px', borderRadius:10, border:'none', cursor:'pointer',
            background:'#00a99d', color:'#fff', fontSize:15, fontWeight:700,
            display:'flex', alignItems:'center', justifyContent:'center', gap:10,
          }}>
            Start audit simulation →
          </button>
        </div>
      </div>
    );
  }

  // ── Results phase ─────────────────────────────────────────────────────────────
  const sc = results.readinessScore;
  const color = scoreColor(sc);

  return (
    <div>
      {/* Result header */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'20px 24px', marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:14 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#94a3b8', letterSpacing:'0.06em', marginBottom:4 }}>
              {results.auditType.label.toUpperCase()} · {center.name}
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:12 }}>
              <div style={{ fontSize:44, fontWeight:800, color, lineHeight:1 }}>
                {sc !== null ? `${sc}%` : '—'}
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color }}>{scoreLabel(sc)}</div>
                <div style={{ fontSize:12.5, color:'#64748b' }}>If inspected today</div>
              </div>
            </div>
          </div>

          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            {[
              { label:'Pass',        val:results.pass,       bg:'#eef7f2', bd:'#a7d4ba', c:'#1e5c38' },
              { label:'Fail',        val:results.fail,       bg:'#fdf1f1', bd:'#e8a0a0', c:'#7f1d1d' },
              { label:'Not entered', val:results.notEntered, bg:'#f1f5f9', bd:'#cbd5e1', c:'#475569' },
              { label:'Total checks',val:results.total,      bg:'#f8fafc', bd:'#e2e8f0', c:'#374151' },
            ].map(({ label, val, bg, bd, c }) => (
              <div key={label} style={{ background:bg, border:`1px solid ${bd}`, borderRadius:9,
                padding:'9px 14px', textAlign:'center', minWidth:80 }}>
                <div style={{ fontSize:22, fontWeight:700, color:c, lineHeight:1 }}>{val}</div>
                <div style={{ fontSize:11, color:c, marginTop:3, fontWeight:500 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop:14 }}>
          <div style={{ height:10, background:'#e2e8f0', borderRadius:5, overflow:'hidden', display:'flex' }}>
            <div style={{ height:'100%', background:'#2d7a4f', width:`${Math.round(results.pass/results.total*100)}%`, transition:'width 0.5s' }}/>
            <div style={{ height:'100%', background:'#b91c1c', width:`${Math.round(results.fail/results.total*100)}%`, transition:'width 0.5s' }}/>
            <div style={{ height:'100%', background:'#e2e8f0', width:`${Math.round(results.notEntered/results.total*100)}%` }}/>
          </div>
          <div style={{ display:'flex', gap:16, fontSize:11.5, color:'#64748b', marginTop:5 }}>
            <span><span style={{ color:'#2d7a4f', fontWeight:700 }}>■</span> Pass ({results.pass})</span>
            <span><span style={{ color:'#b91c1c', fontWeight:700 }}>■</span> Fail ({results.fail})</span>
            <span><span style={{ color:'#94a3b8', fontWeight:700 }}>■</span> Not entered ({results.notEntered})</span>
          </div>
        </div>

        {/* Action strip */}
        <div style={{ display:'flex', gap:8, marginTop:14 }}>
          <button onClick={reset} style={{
            padding:'7px 16px', borderRadius:8, cursor:'pointer',
            border:'1px solid #e2e8f0', background:'#f8fafc', color:'#374151', fontSize:13, fontWeight:500,
          }}>
            ← Change audit type
          </button>
          <button onClick={runSim} style={{
            padding:'7px 16px', borderRadius:8, cursor:'pointer',
            border:'1px solid #a8c4e0', background:'#eef4fc', color:'#1e5c8a', fontSize:13, fontWeight:500,
          }}>
            ↻ Re-run simulation
          </button>
          <span style={{ fontSize:12, color:'#94a3b8', alignSelf:'center', marginLeft:4 }}>
            {new Date().toLocaleString()} · {center.state} requirements · Results are informational only
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:12, color:'#94a3b8', fontWeight:600 }}>SHOW</span>
        {['all','fail','not_entered','pass'].map(f => (
          <button key={f} onClick={() => setFilterResult(f)} style={{
            padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
            background: filterResult===f ? '#0f172a' : '#f1f5f9',
            color:      filterResult===f ? '#fff'    : '#64748b',
            border:     filterResult===f ? 'none'    : '1px solid #e2e8f0',
          }}>
            {f==='all' ? 'All checks' : f==='fail' ? 'Fail only' : f==='not_entered' ? 'Not entered' : 'Pass only'}
          </button>
        ))}
      </div>

      {/* Domain results */}
      {Object.entries(results.selected).map(([dKey, checks]) => {
        const meta  = DOMAIN_META[dKey];
        const dPass = checks.filter(c=>c.result==='pass').length;
        const dFail = checks.filter(c=>c.result==='fail').length;
        const dNE   = checks.filter(c=>c.result==='not_entered').length;
        const dScore= dPass+dFail>0 ? Math.round(dPass/(dPass+dFail)*100) : null;
        const dotC  = dFail>0 ? '#b91c1c' : dNE>0 ? '#b45309' : '#2d7a4f';
        const isOpen= !!expandedDomain[dKey];

        const visible = filterResult==='all' ? checks : checks.filter(c=>c.result===filterResult);
        if (filterResult!=='all' && visible.length===0) return null;

        return (
          <div key={dKey} style={{ background:'#fff', border:'1px solid #e2e8f0',
            borderLeft:`3px solid ${dotC}`, borderRadius:10, marginBottom:10, overflow:'hidden' }}>
            <button onClick={() => setExpandedDomain(p=>({...p,[dKey]:!p[dKey]}))}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:12,
                padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ transform:isOpen?'rotate(180deg)':'none', transition:'transform 0.2s', flexShrink:0 }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
              <span style={{ fontSize:12, fontWeight:700, color:'#94a3b8', minWidth:24 }}>{meta.dNum}</span>
              <span style={{ fontSize:14, fontWeight:600, color:'#0f172a' }}>{meta.label}</span>
              {dScore!==null && (
                <span style={{ fontSize:13, fontWeight:700, color:scoreColor(dScore), marginLeft:4 }}>{dScore}%</span>
              )}
              {/* Mini progress bar */}
              <div style={{ flex:1, maxWidth:80, height:6, background:'#e2e8f0', borderRadius:3, overflow:'hidden', display:'flex', marginLeft:8 }}>
                <div style={{ height:'100%', background:'#2d7a4f', width:`${Math.round(dPass/checks.length*100)}%` }}/>
                <div style={{ height:'100%', background:'#b91c1c', width:`${Math.round(dFail/checks.length*100)}%` }}/>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {dFail>0 && <span style={{ fontSize:11.5, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#fdf1f1', color:'#7f1d1d', border:'1px solid #e8a0a0' }}>{dFail} fail</span>}
                {dNE>0   && <span style={{ fontSize:11.5, padding:'2px 8px', borderRadius:20, color:'#94a3b8' }}>{dNE} not entered</span>}
                {dPass>0 && <span style={{ fontSize:11.5, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#eef7f2', color:'#1e5c38', border:'1px solid #a7d4ba' }}>{dPass} pass</span>}
              </div>
            </button>

            {isOpen && (
              <div style={{ borderTop:'1px solid #f1f5f9' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#f8fafc' }}>
                      <th style={{ textAlign:'left', padding:'8px 14px', fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.04em', width:'12%' }}>Priority</th>
                      <th style={{ textAlign:'left', padding:'8px 14px', fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.04em', width:'50%' }}>Compliance check</th>
                      <th style={{ textAlign:'left', padding:'8px 14px', fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.04em', width:'20%' }}>Result</th>
                      <th style={{ textAlign:'left', padding:'8px 14px', fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.04em' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filterResult==='all' ? checks : visible).map((chk, i) => {
                      const rc = RESULT_CFG[chk.result] || RESULT_CFG.not_entered;
                      return (
                        <tr key={i} style={{ borderBottom:'1px solid #f1f5f9', background:i%2===0?'#fff':'#fafbfc' }}>
                          <td style={{ padding:'10px 14px' }}>
                            {chk.critical
                              ? <span style={{ fontSize:11, fontWeight:700, padding:'2px 7px', borderRadius:20, background:'#fdf1f1', color:'#7f1d1d', border:'1px solid #e8a0a0' }}>Critical</span>
                              : <span style={{ fontSize:11, color:'#94a3b8' }}>Standard</span>}
                          </td>
                          <td style={{ padding:'10px 14px', fontSize:13, color:'#374151', fontWeight:500 }}>{chk.label}</td>
                          <td style={{ padding:'10px 14px' }}>
                            <span style={{ fontSize:11.5, fontWeight:600, padding:'3px 9px', borderRadius:20,
                              background:rc.bg, color:rc.color, border:`1px solid ${rc.bd}` }}>
                              {rc.label}
                            </span>
                          </td>
                          <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b' }}>
                            {chk.result==='fail'        && 'Update in Data Entry tab.'}
                            {chk.result==='not_entered' && 'No data entered yet — add in Data Entry tab.'}
                            {chk.result==='pass'        && '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ padding:'9px 14px', borderTop:'1px solid #f8fafc', fontSize:12, color:'#94a3b8' }}>
                  {dFail>0||dNE>0
                    ? `${dFail} failing · ${dNE} not entered — update in Data Entry, then re-run the simulation.`
                    : `All ${checks.length} checks in this domain are passing.`}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { getReg } from '../regulations';
import { LIONHEART_SEED } from '../lionheartSeed';
import { CENTERS } from '../centers';
import RatiosTab    from './tabs/RatiosTab';
import StaffTab     from './tabs/StaffTab';
import AlertsTab    from './tabs/AlertsTab';
import StateRulesTab from './tabs/StateRulesTab';
import InspectionReportExport from './tabs/InspectionReportExport';

const SESSION_HOURS = 8;
const LS_KEY_MAIN     = '1core_compliance_v6';
const LS_KEY_FINDINGS = '1core_compliance_v6_inspector_findings';
const DEFAULT_CENTER_ID = '1292_Lionheart_-_RCCO';

const FIELD_STATUSES = [
  { id:'compliant',    label:'✓ Compliant',         bg:'#eef7f2', bd:'#a7d4ba', color:'#1e5c38' },
  { id:'noncompliant', label:'✗ Non-Compliant',      bg:'#fdf1f1', bd:'#e8a0a0', color:'#7f1d1d' },
  { id:'atrisk',       label:'⚠ At Risk',            bg:'#fdf4e7', bd:'#e6b87a', color:'#7c4a00' },
  { id:'corrected',    label:'✎ Corrected on Site',  bg:'#eef4fc', bd:'#a8c4e0', color:'#1e5c8a' },
  { id:'notobserved',  label:'— Not Observed',        bg:'#f1f5f9', bd:'#cbd5e1', color:'#475569' },
];
const STATUS_MAP = Object.fromEntries(FIELD_STATUSES.map(s => [s.id, s]));

function loadFindings(centerId) {
  try { return JSON.parse(localStorage.getItem(LS_KEY_FINDINGS))?.[centerId] || {}; } catch { return {}; }
}
function saveFindings(centerId, data) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY_FINDINGS)) || {};
    all[centerId] = data;
    localStorage.setItem(LS_KEY_FINDINGS, JSON.stringify(all));
  } catch {}
}
function loadCenterData(centerId) {
  try { return JSON.parse(localStorage.getItem(LS_KEY_MAIN))?.[centerId] || {}; } catch { return {}; }
}

function getDomainFields(center, reg, liveData) {
  const rules = reg?.rules || {};
  const seed  = LIONHEART_SEED[center.id] || {};
  const lic   = liveData.licensing          || {};
  const phy   = liveData.physical           || {};
  const per   = liveData.personnel          || {};
  const cr    = liveData.staffCredentials   || {};
  const h     = liveData.staffHealth        || {};
  const ch    = liveData.children           || {};
  const em    = liveData.emergency          || {};
  const rat   = liveData.ratios             || {};
  const v = (x) => (x && x !== '') ? x : '—';
  return [
    { id:'d1', label:'Licensing & Administration', dNum:'D1', fields: [
      { id:'licenseNumber',      label:'License number',                value:v(lic.licenseNumber||seed._licenseNumber) },
      { id:'licenseExpiry',      label:'License expiry date',           value:v(lic.licenseExpiry) },
      { id:'licCertOnFile',      label:'License certificate on file',   value:v(lic.licCertOnFile) },
      { id:'insurancePolicyNum', label:'GL insurance policy number',    value:v(lic.insurancePolicyNum) },
      { id:'insuranceExpiry',    label:'GL insurance expiry',           value:v(lic.insuranceExpiry) },
      { id:'workersCompExpiry',  label:"Workers' comp expiry",          value:v(lic.workersCompExpiry) },
      { id:'lastInspectionDate', label:'Last inspection date',          value:v(lic.lastInspectionDate) },
      { id:'lastInspectionResult',label:'Last inspection result',       value:v(lic.lastInspectionResult) },
      { id:'qrisStatus',         label:'QRIS enrollment status',        value:v(lic.qrisStatus), note:reg?.qrs||'' },
      { id:'coiOnFile',          label:'Certificate of insurance on file', value:v(lic.coiOnFile) },
    ]},
    { id:'d2', label:'Physical Environment', dNum:'D2', fields: [
      { id:'indoorSqft',           label:'Indoor sq ft (total)',         value:v(phy.indoorSqft),          note:`Req: ${reg?.indoorSqft||'?'} sq ft/child` },
      { id:'outdoorSqft',          label:'Outdoor sq ft (total)',        value:v(phy.outdoorSqft),         note:`Req: ${reg?.outdoorSqft||'?'} sq ft/child` },
      { id:'capacity',             label:'Licensed capacity',            value:v(phy.capacity) },
      { id:'coDetectorInstalled',  label:'CO detector installed',        value:v(phy.coDetectorInstalled) },
      { id:'smokeDetectorInstalled',label:'Smoke detectors present',     value:v(phy.smokeDetectorInstalled) },
      { id:'fireExtinguisherCurrent',label:'Fire extinguisher current',  value:v(phy.fireExtinguisherCurrent) },
      { id:'firstAidKitPresent',   label:'First aid kit present',        value:v(phy.firstAidKitPresent) },
      { id:'hotWaterMaxTemp',      label:'Hot water temp (°F)',          value:v(phy.hotWaterMaxTemp),     note:`Max ${rules.hotWaterMax||110}°F` },
      { id:'fencingEnclosesPlayArea',label:'Fencing encloses play area', value:v(phy.fencingEnclosesPlayArea) },
      { id:'fencingHeightFt',      label:'Fence height (ft)',            value:v(phy.fencingHeightFt),     note:`Min ${rules.minFencingHeight||'4 ft'}` },
      { id:'toiletCompliant',      label:'Toilet ratio compliant',       value:v(phy.toiletCompliant),     note:rules.toiletRatio?`1:${rules.toiletRatio}`:''},
    ]},
    { id:'d3', label:'Personnel & Qualifications', dNum:'D3', fields: [
      { id:'directorName',          label:'Director name on file',        value:v(per.directorName) },
      { id:'directorEduLevel',      label:'Director education level',     value:v(per.directorEduLevel),    note:reg?.directorReq||'' },
      { id:'directorYearsExp',      label:'Director years of experience', value:v(per.directorYearsExp) },
      { id:'teacherEduMeetsReq',    label:'Teacher qualifications met',   value:v(per.teacherEduMeetsReq),  note:reg?.teacherReq||'' },
      { id:'teacherMinAgeCompliant',label:'Teacher min age compliant',    value:v(per.teacherMinAgeCompliant) },
      { id:'bgCheckType',           label:'Background check type',        value:v(rules.bgCheckType) },
      { id:'bgValid',               label:'Staff with valid BG check',    value:v(cr.bgValid),              note:`of ${cr.bgTotal||'?'} total staff` },
      { id:'fbiClearance',          label:'FBI fingerprint clearance',    value:v(per.fbiClearance) },
      { id:'childAbuseRegistry',    label:'Child abuse registry check',   value:v(per.childAbuseRegistryDate) },
      { id:'adminDesignationOnFile',label:'Admin designation on file',    value:v(per.adminDesignationOnFile) },
      { id:'workforceRegistry',     label:'Workforce registry enrollment',value:v(cr.workforceRegistryDone), note:rules.workforceRegistry||'' },
    ]},
    { id:'d4', label:'Ratios & Supervision', dNum:'D4', fields: [
      { id:'infantChildren',    label:'Infant — enrolled children',  value:v((rat.infant||{}).children),    note:`State max 1:${reg?.infant||'?'}` },
      { id:'infantStaff',       label:'Infant — staff on duty',      value:v((rat.infant||{}).staff) },
      { id:'toddlerChildren',   label:'Toddler — enrolled children', value:v((rat.toddler||{}).children),   note:`State max 1:${reg?.toddler||'?'}` },
      { id:'toddlerStaff',      label:'Toddler — staff on duty',     value:v((rat.toddler||{}).staff) },
      { id:'preschoolChildren', label:'Preschool — enrolled',        value:v((rat.preschool||{}).children), note:`State max 1:${reg?.preschool||'?'}` },
      { id:'preschoolStaff',    label:'Preschool — staff on duty',   value:v((rat.preschool||{}).staff) },
      { id:'schoolAgeChildren', label:'School-age — enrolled',       value:v((rat.schoolAge||{}).children), note:`State max 1:${reg?.schoolAge||'?'}` },
      { id:'schoolAgeStaff',    label:'School-age — staff on duty',  value:v((rat.schoolAge||{}).staff) },
      { id:'signinLogMaintained',label:'Sign-in/sign-out log',       value:v(rat.signinLogMaintained) },
      { id:'supervisionPlan',   label:'Supervision plan on file',    value:v(liveData.supervisionPlan) },
    ]},
    { id:'d5', label:'Staff Health & Training', dNum:'D5', fields: [
      { id:'cprCertValid',         label:'CPR certification — all staff',    value:v(h.cprCertValid),          note:`Renewal: ${rules.cprRenewal||'2 years'}` },
      { id:'cprExpiryDate',        label:'CPR expiry date',                  value:v(h.cprExpiryDate) },
      { id:'firstAidCertValid',    label:'First Aid — all staff',            value:v(h.firstAidCertValid) },
      { id:'tbScreeningAllStaff',  label:'TB screening — all staff',         value:v(h.tbScreeningAllStaff),   note:rules.tbTestReq||'' },
      { id:'physicalExamOnFile',   label:'Physical exam on file — all staff',value:v(h.physicalExamOnFile) },
      { id:'trainingHrs',          label:'Annual training hours (avg)',       value:v(cr.trainingHrs),          note:`Req: ${reg?.trainingHrs||'?'} hrs/yr` },
      { id:'mandatedReporterDone', label:'Mandated reporter training',        value:v(cr.mandatedReporterDone), note:rules.mandatedReporterRenewal||'' },
      { id:'newHireOrientation',   label:'New hire orientation completed',    value:v(h.newHireOrientationCompleted) },
      { id:'trainingLogOnFile',    label:'Training log on file',              value:v(h.trainingLogOnFile) },
      { id:'tbRenewalDueDate',     label:'TB renewal due date',               value:v(h.tbRenewalDueDate) },
    ]},
    { id:'d6', label:"Children's Records & Health", dNum:'D6', fields: [
      { id:'childRecordComplete',    label:'Child enrollment records complete', value:v(ch.childRecordComplete) },
      { id:'emergContactsOnFile',    label:'Emergency contacts on file',        value:v(ch.emergContactsOnFile) },
      { id:'authPickupOnFile',       label:'Authorized pickup list on file',    value:v(ch.authPickupOnFile) },
      { id:'allergyDocOnFile',       label:'Allergy documentation on file',     value:v(ch.allergyDocOnFile) },
      { id:'allergyCareplan',        label:'Allergy care plans on file',        value:v(ch.allergyCareplan) },
      { id:'medLogMaintained',       label:'Medication log maintained',         value:v(ch.medLogMaintained) },
      { id:'medsStoredCorrectly',    label:'Medications stored correctly',      value:v(ch.medsStoredCorrectly) },
      { id:'immRecordsOnFile',       label:'Immunization records on file',      value:v(ch.immRecordsOnFile),    note:`Exemptions: ${rules.immExemptions||'Medical only'}` },
      { id:'immRecordsCurrent',      label:'Immunization records current',      value:v(ch.immRecordsCurrent) },
      { id:'parentAgreementSigned',  label:'Parent agreements signed',          value:v(ch.parentAgreementSigned) },
      { id:'safeSleepPolicy',        label:'Safe sleep policy on file',         value:v(ch.safeSleepPolicy) },
      { id:'attendanceRecordOnFile', label:'Daily attendance record on file',   value:v(ch.attendanceRecordOnFile) },
      { id:'attendanceSignInLog',    label:'Sign-in/sign-out log maintained',   value:v(ch.attendanceSignInLog) },
      { id:'attendanceRetentionMet', label:'Attendance retention period met',   value:v(ch.attendanceRetentionMet), note:`Retain ${rules.recordRetention||'3 years'}` },
    ]},
    { id:'d7', label:'Emergency & Safety', dNum:'D7', fields: [
      { id:'fireEvacPlan',        label:'Fire evacuation plan on file',   value:v(em.fireEvacPlan) },
      { id:'fireEvacPosted',      label:'Fire evacuation plan posted',    value:v(em.fireEvacPosted) },
      { id:'lastFireDrillDate',   label:'Last fire drill date',           value:v(em.lastFireDrillDate),   note:`Req: ${rules.fireDrillFreq||'Monthly'}` },
      { id:'fireDrillLog',        label:'Fire drill log on file',         value:v(em.fireDrillLog) },
      { id:'fireSafetyTraining',  label:'Fire safety training — all staff', value:v(em.fireSafetyTraining) },
      { id:'fireDeptInspCurrent', label:'Fire dept inspection current',   value:v(em.fireDeptInspCurrent) },
      { id:'tornadoDrillDate',    label:'Last tornado/weather drill',     value:v(em.tornadoDrillDate),    note:rules.tornadoDrill||'Check state' },
      { id:'lockdownDrillDate',   label:'Last lockdown drill',            value:v(em.lockdownDrillDate),   note:rules.lockdownDrill||'2x/year' },
      { id:'emergencyPlanOnFile', label:'Emergency plan on file',         value:v(em.emergencyPlanOnFile) },
      { id:'emergencyPlanPosted', label:'Emergency plan posted',          value:v(em.emergencyPlanPosted) },
      { id:'drillLogMaintained',  label:'Drill log maintained',           value:v(em.drillLogMaintained) },
      { id:'annualHealthInsp',    label:'Annual health inspection on file',value:v(em.annualFireInspOnFile) },
      { id:'bodiesOfWater',       label:'Bodies of water on premises',    value:v(em.bodiesOfWaterOnPremises) },
    ]},
  ];
}

function StatusPill({ statusId }) {
  const cfg = STATUS_MAP[statusId];
  if (!cfg) return null;
  return (
    <span style={{ fontSize:11.5, fontWeight:600, padding:'3px 10px', borderRadius:20,
      background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.bd}`, whiteSpace:'nowrap' }}>
      {cfg.label}
    </span>
  );
}

function FindingRow({ fieldId, label, value, note, finding, onUpdate, readOnly }) {
  const [open, setOpen] = useState(false);
  const statusId = finding?.status || '';
  const hasDetail = finding?.notes || finding?.correctiveAction || finding?.followUpDate;

  return (
    <React.Fragment>
      <tr style={{ borderBottom:'1px solid #f1f5f9' }}>
        <td style={{ padding:'10px 14px', fontSize:13, color:'#374151', fontWeight:500, width:'27%' }}>
          {label}
          {note && <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{note}</div>}
        </td>
        <td style={{ padding:'10px 14px', fontSize:13, color: value && value !== '—' ? '#1e293b' : '#94a3b8', width:'20%' }}>
          {value}
        </td>
        <td style={{ padding:'10px 14px', width:'38%' }}>
          {readOnly ? (
            statusId ? <StatusPill statusId={statusId}/> : <span style={{ color:'#94a3b8', fontSize:12 }}>—</span>
          ) : (
            <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
              {FIELD_STATUSES.map(s => (
                <button key={s.id} onClick={() => onUpdate(fieldId, { status: s.id })}
                  style={{
                    fontSize:11, padding:'3px 8px', borderRadius:20, cursor:'pointer', fontWeight:600,
                    background: statusId === s.id ? s.bg : '#f8fafc',
                    color:      statusId === s.id ? s.color : '#94a3b8',
                    border:     statusId === s.id ? `1px solid ${s.bd}` : '1px solid #e2e8f0',
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </td>
        <td style={{ padding:'10px 14px', textAlign:'right', width:'15%' }}>
          {(!readOnly || hasDetail) && (
            <button onClick={() => setOpen(o => !o)} style={{
              fontSize:11.5, padding:'3px 10px', borderRadius:6, cursor:'pointer',
              border:'1px solid #e2e8f0', background:'#f8fafc', color:'#475569',
              display:'inline-flex', alignItems:'center', gap:5,
            }}>
              {open ? '▲ Close' : (readOnly ? '▼ Detail' : '✎ Notes')}
              {!open && hasDetail && (
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#4f5fa8', display:'inline-block' }}/>
              )}
            </button>
          )}
        </td>
      </tr>
      {open && (
        <tr style={{ background:'#f8fafc' }}>
          <td colSpan={4} style={{ padding:'12px 16px', borderBottom:'1px solid #e2e8f0' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:12, alignItems:'start' }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'#94a3b8', display:'block', marginBottom:4 }}>NOTES</label>
                {readOnly
                  ? <p style={{ fontSize:12.5, color:'#374151', margin:0 }}>{finding?.notes || '—'}</p>
                  : <textarea rows={2} value={finding?.notes||''} placeholder="Observation notes..."
                      onChange={e => onUpdate(fieldId,{notes:e.target.value})}
                      style={{ width:'100%', fontSize:12.5, padding:'6px 10px', borderRadius:6,
                        border:'1px solid #cbd5e1', resize:'vertical', outline:'none', fontFamily:'inherit' }}/>}
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'#94a3b8', display:'block', marginBottom:4 }}>CORRECTIVE ACTION REQUIRED</label>
                {readOnly
                  ? <p style={{ fontSize:12.5, color:'#374151', margin:0 }}>{finding?.correctiveAction || '—'}</p>
                  : <textarea rows={2} value={finding?.correctiveAction||''} placeholder="Describe required correction..."
                      onChange={e => onUpdate(fieldId,{correctiveAction:e.target.value})}
                      style={{ width:'100%', fontSize:12.5, padding:'6px 10px', borderRadius:6,
                        border:'1px solid #cbd5e1', resize:'vertical', outline:'none', fontFamily:'inherit' }}/>}
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'#94a3b8', display:'block', marginBottom:4 }}>FOLLOW-UP DUE</label>
                {readOnly
                  ? <p style={{ fontSize:12.5, color:'#374151', margin:0 }}>{finding?.followUpDate || '—'}</p>
                  : <input type="date" value={finding?.followUpDate||''}
                      onChange={e => onUpdate(fieldId,{followUpDate:e.target.value})}
                      style={{ padding:'6px 10px', borderRadius:6, border:'1px solid #cbd5e1', fontSize:12.5, outline:'none' }}/>}
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

export default function InspectorView({ activeTab = 'overview', userRole = 'inspector', centerId, center, reg: regProp, liveData: liveDataProp }) {
  const [loginTime] = useState(Date.now());
  const [now, setNow]          = useState(Date.now());
  const [expanded, setExpanded] = useState({});
  const [findings, setFindings] = useState(() => loadFindings(DEFAULT_CENTER_ID));
  const [filterStatus, setFilter] = useState('all');
  const [saved, setSaved]       = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const elapsed   = (now - loginTime) / 1000 / 3600;
  const remaining = Math.max(0, SESSION_HOURS - elapsed);
  const hh = Math.floor(remaining);
  const mm  = Math.round((remaining - hh) * 60);
  const timerUrgent = remaining < 1;

  const resolvedId   = centerId || DEFAULT_CENTER_ID;
  const centerEntry  = CENTERS.find(c => c.id === resolvedId) || CENTERS.find(c => c.companyId === 1292) || CENTERS[0];
  const seedData     = LIONHEART_SEED[resolvedId] || LIONHEART_SEED[DEFAULT_CENTER_ID] || {};
  const liveData     = liveDataProp?.data || loadCenterData(resolvedId);
  const reg          = regProp || getReg(centerEntry?.state || 'CO');
  const domains      = getDomainFields({ id:resolvedId, ...centerEntry }, reg, liveData);

  // Build a center object suitable for sub-tabs
  const centerForTabs = center || {
    id: resolvedId,
    name: seedData._centerName || centerEntry?.centerName || 'Lionheart RCCO',
    city: seedData._city || centerEntry?.city || '',
    state: seedData._state || centerEntry?.state || 'CO',
    zip: seedData._zip || centerEntry?.zip || '',
    agency: seedData._agency || reg?.agency || '',
    ratios: seedData._ratios || [],
    staff: seedData._staff || [],
    history: seedData._history || [],
    scores: {},
    alerts: [],
  };

  const updateFinding = useCallback((fieldId, patch) => {
    setFindings(prev => {
      const next = { ...prev, [fieldId]: { ...(prev[fieldId]||{}), ...patch } };
      saveFindings(resolvedId, next);
      return next;
    });
  }, [resolvedId]);

  const handleSave = () => { saveFindings(resolvedId, findings); setSaved(true); setTimeout(()=>setSaved(false),2500); };

  const allF = Object.values(findings);
  const fc = {
    noncompliant: allF.filter(f=>f.status==='noncompliant').length,
    atrisk:       allF.filter(f=>f.status==='atrisk').length,
    corrected:    allF.filter(f=>f.status==='corrected').length,
    compliant:    allF.filter(f=>f.status==='compliant').length,
  };
  const isReadOnly = userRole !== 'inspector';

  if (userRole === 'inspector' && remaining <= 0) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', background:'#f8fafc' }}>
        <div style={{ textAlign:'center', background:'#fff', border:'1px solid #e8a0a0', borderRadius:16, padding:'40px 48px', maxWidth:400 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom:16 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <h2 style={{ fontSize:20, fontWeight:700, color:'#b91c1c', marginBottom:8 }}>Session Expired</h2>
          <p style={{ fontSize:14, color:'#64748b' }}>Your 8-hour inspection session has ended. Contact BUSoft to request a new access link.</p>
        </div>
      </div>
    );
  }

  const centerName  = seedData._centerName  || centerEntry?.centerName || 'Lionheart RCCO';
  const centerCity  = centerEntry?.city  || '';
  const centerState = centerEntry?.state || 'CO';

  // ── Sidebar-driven tab views (ratios, staff, alerts, staterules) ─────────────
  if (activeTab === 'ratios')     return <div style={{ padding:'24px', overflowY:'auto', height:'100%' }}><RatiosTab center={centerForTabs}/></div>;
  if (activeTab === 'staff')      return <div style={{ padding:'24px', overflowY:'auto', height:'100%' }}><StaffTab  center={centerForTabs}/></div>;
  if (activeTab === 'alerts')     return <div style={{ padding:'24px', overflowY:'auto', height:'100%' }}><AlertsTab center={centerForTabs}/></div>;
  if (activeTab === 'staterules') return <div style={{ padding:'24px', overflowY:'auto', height:'100%' }}><StateRulesTab center={centerForTabs} reg={reg} userRole="inspector"/></div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflowY:'auto', background:'#f8fafc' }}>
      {/* Header */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'16px 24px', flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, flexWrap:'wrap' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              <span style={{ fontSize:12.5, fontWeight:600, color:'#0891b2' }}>
                {isReadOnly ? 'Inspector Findings — Read Access' : 'Inspector — Active Inspection Session'}
              </span>
            </div>
            <h2 style={{ fontSize:20, fontWeight:700, color:'#0f172a', margin:'0 0 2px' }}>{centerName}</h2>
            <p style={{ fontSize:13, color:'#64748b', margin:0 }}>{centerCity && `${centerCity}, `}{centerState} · {reg?.agency || 'State Licensing Agency'}</p>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            {[
              { label:'Non-Compliant', key:'noncompliant', ...STATUS_MAP.noncompliant },
              { label:'At Risk',       key:'atrisk',       ...STATUS_MAP.atrisk },
              { label:'Corrected',     key:'corrected',    ...STATUS_MAP.corrected },
            ].filter(({ key }) => fc[key] > 0).map(({ label, key, bg, bd, color }) => (
              <div key={key} style={{ background:bg, border:`1px solid ${bd}`, borderRadius:8, padding:'6px 12px', textAlign:'center', minWidth:70 }}>
                <div style={{ fontSize:18, fontWeight:700, color }}>{fc[key]}</div>
                <div style={{ fontSize:10, color, fontWeight:600 }}>{label}</div>
              </div>
            ))}
            {userRole === 'inspector' && (
              <div style={{ background: timerUrgent?'#fdf1f1':'#fef9c3', border:`1px solid ${timerUrgent?'#e8a0a0':'#fde047'}`, borderRadius:10, padding:'10px 16px', textAlign:'center' }}>
                <div style={{ fontSize:10, fontWeight:700, color: timerUrgent?'#7f1d1d':'#713f12', textTransform:'uppercase', letterSpacing:'0.05em' }}>Session Expires</div>
                <div style={{ fontSize:22, fontWeight:800, color: timerUrgent?'#b91c1c':'#92400e', lineHeight:1.2 }}>{hh}h {mm}m</div>
                <div style={{ fontSize:10, color: timerUrgent?'#b91c1c':'#92400e' }}>{timerUrgent ? 'Expiring soon' : 'Inspector access'}</div>
              </div>
            )}
            <button onClick={() => setShowReport(true)} style={{ padding:'9px 14px', borderRadius:8,
              border:'1px solid #e2e8f0', background:'#fff', color:'#374151',
              fontSize:13, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Export Report
            </button>
            {!isReadOnly && (
              <button onClick={handleSave} style={{ padding:'9px 18px', borderRadius:8, border:'none', cursor:'pointer',
                background: saved?'#2d7a4f':'#4f5fa8', color:'#fff', fontSize:13, fontWeight:600 }}>
                {saved ? '✓ Saved' : 'Save Findings'}
              </button>
            )}
          </div>
        </div>
        {showReport && (
          <InspectionReportExport center={centerForTabs} onClose={() => setShowReport(false)} />
        )}
        <div style={{ background:'#eef4fc', border:'1px solid #a8c4e0', borderRadius:8, padding:'9px 14px', marginTop:12, display:'flex', alignItems:'center', gap:10 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style={{ fontSize:12.5, color:'#1d4ed8' }}>
            {isReadOnly
              ? 'Viewing inspector findings recorded during the last inspection session. Findings are read-only from this access level.'
              : `All 7 compliance domains · Select a status for each field · Use Notes to add observations, corrective actions, and follow-up dates · Click Save Findings when done`}
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'10px 24px', display:'flex', gap:8, alignItems:'center', flexShrink:0, flexWrap:'wrap' }}>
        <span style={{ fontSize:11.5, fontWeight:700, color:'#94a3b8' }}>SHOW</span>
        {[
          { id:'all',          label:'All fields' },
          { id:'noncompliant', label:'Non-Compliant' },
          { id:'atrisk',       label:'At Risk' },
          { id:'corrected',    label:'Corrected on Site' },
          { id:'flagged',      label:'All flagged' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
            background: filterStatus===f.id ? '#0f172a' : '#f1f5f9',
            color:      filterStatus===f.id ? '#fff'    : '#64748b',
            border:     filterStatus===f.id ? 'none'    : '1px solid #e2e8f0',
          }}>
            {f.label}
            {f.id!=='all' && f.id!=='flagged' && fc[f.id]>0 &&
              <span style={{ marginLeft:4, fontSize:10, opacity:0.8 }}>{fc[f.id]}</span>}
          </button>
        ))}
      </div>

      {/* Domains */}
      <div style={{ padding:'16px 24px', flex:1 }}>
        {domains.map(domain => {
          const isOpen = !!expanded[domain.id];
          const dF = domain.fields.map(f => findings[f.id]?.status).filter(Boolean);
          const dNC = dF.filter(s=>s==='noncompliant').length;
          const dAR = dF.filter(s=>s==='atrisk').length;
          const dCO = dF.filter(s=>s==='corrected').length;
          const dCMP= dF.filter(s=>s==='compliant').length;
          const dotC = dNC>0?'#b91c1c':dAR>0?'#b45309':dCO>0?'#1e5c8a':'#94a3b8';

          const visibleFields = domain.fields.filter(f => {
            if (filterStatus==='all') return true;
            const s = findings[f.id]?.status;
            if (filterStatus==='flagged') return s && s!=='compliant' && s!=='notobserved';
            return s === filterStatus;
          });
          if (filterStatus !== 'all' && visibleFields.length === 0) return null;

          return (
            <div key={domain.id} style={{ background:'#fff', border:'1px solid #e2e8f0',
              borderLeft:`3px solid ${dotC}`, borderRadius:10, marginBottom:10, overflow:'hidden' }}>
              <button onClick={() => setExpanded(p=>({...p,[domain.id]:!p[domain.id]}))}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:12,
                  padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform:isOpen?'rotate(180deg)':'none', transition:'transform 0.2s', flexShrink:0 }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
                <span style={{ fontSize:12, fontWeight:700, color:'#94a3b8', minWidth:24 }}>{domain.dNum}</span>
                <span style={{ fontSize:14, fontWeight:600, color:'#0f172a' }}>{domain.label}</span>
                <span style={{ fontSize:12, color:'#94a3b8' }}>{domain.fields.length} fields</span>
                <div style={{ display:'flex', gap:6, marginLeft:8 }}>
                  {dNC>0  && <span style={{ fontSize:11.5, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#fdf1f1', color:'#7f1d1d', border:'1px solid #e8a0a0' }}>{dNC} non-compliant</span>}
                  {dAR>0  && <span style={{ fontSize:11.5, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#fdf4e7', color:'#7c4a00', border:'1px solid #e6b87a' }}>{dAR} at risk</span>}
                  {dCO>0  && <span style={{ fontSize:11.5, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#eef4fc', color:'#1e5c8a', border:'1px solid #a8c4e0' }}>{dCO} corrected</span>}
                  {dCMP>0 && <span style={{ fontSize:11.5, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#eef7f2', color:'#1e5c38', border:'1px solid #a7d4ba' }}>{dCMP} compliant</span>}
                </div>
              </button>
              {isOpen && (
                <div style={{ borderTop:'1px solid #f1f5f9' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ background:'#f8fafc' }}>
                        <th style={{ textAlign:'left', padding:'8px 14px', fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.04em' }}>Field</th>
                        <th style={{ textAlign:'left', padding:'8px 14px', fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.04em' }}>Center data</th>
                        <th style={{ textAlign:'left', padding:'8px 14px', fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.04em' }}>
                          {isReadOnly ? 'Finding' : 'Inspector finding'}
                        </th>
                        <th style={{ padding:'8px 14px', width:100 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(filterStatus==='all' ? domain.fields : visibleFields).map(f => (
                        <FindingRow key={f.id} fieldId={f.id} label={f.label} value={f.value}
                          note={f.note} finding={findings[f.id]} onUpdate={updateFinding} readOnly={isReadOnly}/>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        {!isReadOnly && (
          <div style={{ display:'flex', justifyContent:'flex-end', paddingTop:8 }}>
            <button onClick={handleSave} style={{ padding:'10px 24px', borderRadius:8, border:'none', cursor:'pointer',
              background: saved?'#2d7a4f':'#4f5fa8', color:'#fff', fontSize:13.5, fontWeight:600 }}>
              {saved ? '✓ Findings Saved' : 'Save All Findings'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getReg } from '../regulations';
import { LIONHEART_SEED } from '../lionheartSeed';
import { CENTERS } from '../centers';
import RatiosTab    from './tabs/RatiosTab';
import StaffTab     from './tabs/StaffTab';
import AlertsTab    from './tabs/AlertsTab';
import StateRulesTab from './tabs/StateRulesTab';
import InspectionReportExport from './tabs/InspectionReportExport';

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const SESSION_HOURS     = 8;
const LS_KEY_MAIN       = '1core_compliance_v6';
const LS_KEY_FINDINGS   = '1core_compliance_v6_inspector_findings';
const LS_KEY_PHOTOS     = '1core_compliance_v6_inspector_photos';
const DEFAULT_CENTER_ID = '1292_Lionheart_-_RCCO';

/* ─── Swami's 3 inspection types ────────────────────────────────────────────── */
const INSP_TYPES = [
  { id:'real',       label:'Real Inspection',    icon:'🏛', desc:'State-appointed inspector — official licensing inspection', color:'#b91c1c', bg:'#fdf1f1', bd:'#e8a0a0', subset:false },
  { id:'center-sim', label:'Center-Simulated',   icon:'🏫', desc:'Director or owner running a self-assessment trial',         color:'#b45309', bg:'#fdf4e7', bd:'#e6b87a', subset:true  },
  { id:'system-sim', label:'System-Simulated',   icon:'⚙',  desc:'Automated — random 15% of controls selected by system',   color:'#4f5fa8', bg:'#eef4fc', bd:'#a8c4e0', subset:true  },
];

/* ─── Field statuses ────────────────────────────────────────────────────────── */
const FIELD_STATUSES = [
  { id:'compliant',    label:'Compliant',     short:'✓', bg:'var(--compliant-bg)',  bd:'var(--compliant-border)', color:'var(--compliant-text)' },
  { id:'noncompliant', label:'Non-Compliant', short:'✗', bg:'var(--critical-bg)',   bd:'var(--critical-border)',  color:'var(--critical-text)'  },
  { id:'atrisk',       label:'At Risk',       short:'⚠', bg:'var(--atrisk-bg)',     bd:'var(--atrisk-border)',    color:'var(--atrisk-text)'    },
  { id:'corrected',    label:'Corrected',     short:'✎', bg:'var(--info-bg)',       bd:'var(--info-border)',      color:'var(--info-text)'      },
  { id:'notobserved',  label:'Not Observed',  short:'—', bg:'#f1f5f9',              bd:'#cbd5e1',                 color:'#475569'               },
];
const STATUS_IDS = FIELD_STATUSES.map(s => s.id);
const STATUS_MAP = Object.fromEntries(FIELD_STATUSES.map(s => [s.id, s]));

/* ─── Keyboard shortcut map ─────────────────────────────────────────────────── */
const KEY_MAP = { c:'compliant', n:'noncompliant', a:'atrisk', x:'notobserved', r:'corrected' };

/* ─── Domain colours ────────────────────────────────────────────────────────── */
const D_COLORS = ['#4f5fa8','#0891b2','#7c3aed','#b45309','#15803d','#be185d','#0f766e'];

/* ─── Field → refs key mapping (for statutory citations) ───────────────────── */
const FIELD_REF_MAP = {
  licenseNumber:'ratios', licenseExpiry:'ratios', licCertOnFile:'ratios',
  indoorSqft:'indoorSqft', outdoorSqft:'outdoorSqft',
  hotWaterMaxTemp:'hotWaterMax', fencingHeightFt:'fencingMin', fencingEnclosesPlayArea:'fencingMin', toiletCompliant:'toiletRatio',
  directorName:'directorReq', directorEduLevel:'directorReq', directorYearsExp:'directorReq',
  teacherEduMeetsReq:'teacherReq', teacherMinAgeCompliant:'teacherReq',
  bgCheckType:'bgCheckType', bgValid:'bgCheckType', fbiClearance:'bgCheckType', childAbuseRegistry:'bgCheckType',
  workforceRegistry:'workforceRegistry',
  cprCertValid:'cprRenewal', cprExpiryDate:'cprRenewal', firstAidCertValid:'cprRenewal',
  tbScreeningAllStaff:'tbTestReq', trainingHrs:'trainingHrs', mandatedReporterDone:'mandatedReporter',
  lastFireDrillDate:'fireDrill', fireDrillLog:'fireDrill', fireSafetyTraining:'fireDrill',
};

/* ─── LocalStorage helpers ──────────────────────────────────────────────────── */
function loadFindings(centerId) {
  try { return JSON.parse(localStorage.getItem(LS_KEY_FINDINGS))?.[centerId] || {}; } catch { return {}; }
}
function saveFindings(centerId, data) {
  try { const all = JSON.parse(localStorage.getItem(LS_KEY_FINDINGS)) || {}; all[centerId] = data; localStorage.setItem(LS_KEY_FINDINGS, JSON.stringify(all)); } catch {}
}
function loadCenterData(centerId) {
  try { return JSON.parse(localStorage.getItem(LS_KEY_MAIN))?.[centerId] || {}; } catch { return {}; }
}
function loadPhotos(centerId) {
  try { return JSON.parse(localStorage.getItem(LS_KEY_PHOTOS))?.[centerId] || {}; } catch { return {}; }
}
function savePhotos(centerId, data) {
  try { const all = JSON.parse(localStorage.getItem(LS_KEY_PHOTOS)) || {}; all[centerId] = data; localStorage.setItem(LS_KEY_PHOTOS, JSON.stringify(all)); } catch {}
}

/* ─── Random subset: ~15% of fields, min 1 per domain ──────────────────────── */
function selectSubset(domains, pct = 0.15) {
  const selected = new Set();
  domains.forEach(d => {
    const shuffled = [...d.fields].sort(() => Math.random() - 0.5);
    const n = Math.max(1, Math.round(d.fields.length * pct));
    shuffled.slice(0, n).forEach(f => selected.add(f.id));
  });
  return selected;
}

/* ─── Domain field definitions ──────────────────────────────────────────────── */
function getDomainFields(center, reg, liveData) {
  const rules = reg?.rules || {};
  const seed  = LIONHEART_SEED[center.id] || {};
  const lic   = liveData.licensing        || {};
  const phy   = liveData.physical         || {};
  const per   = liveData.personnel        || {};
  const cr    = liveData.staffCredentials || {};
  const h     = liveData.staffHealth      || {};
  const ch    = liveData.children         || {};
  const em    = liveData.emergency        || {};
  const rat   = liveData.ratios           || {};
  const v = x => (x && x !== '') ? x : '—';
  return [
    { id:'d1', label:'Licensing & Administration', dNum:'D1', color:D_COLORS[0], fields:[
      { id:'licenseNumber',        label:'License number',                   value:v(lic.licenseNumber||seed._licenseNumber) },
      { id:'licenseExpiry',        label:'License expiry date',              value:v(lic.licenseExpiry) },
      { id:'licCertOnFile',        label:'License certificate on file',      value:v(lic.licCertOnFile) },
      { id:'insurancePolicyNum',   label:'GL insurance policy number',       value:v(lic.insurancePolicyNum) },
      { id:'insuranceExpiry',      label:'GL insurance expiry',              value:v(lic.insuranceExpiry) },
      { id:'workersCompExpiry',    label:"Workers' comp expiry",             value:v(lic.workersCompExpiry) },
      { id:'lastInspectionDate',   label:'Last inspection date',             value:v(lic.lastInspectionDate) },
      { id:'lastInspectionResult', label:'Last inspection result',           value:v(lic.lastInspectionResult) },
      { id:'qrisStatus',           label:'QRIS enrollment status',           value:v(lic.qrisStatus), note:reg?.qrs||'' },
      { id:'coiOnFile',            label:'Certificate of insurance on file', value:v(lic.coiOnFile) },
    ]},
    { id:'d2', label:'Physical Environment', dNum:'D2', color:D_COLORS[1], fields:[
      { id:'indoorSqft',              label:'Indoor sq ft (total)',            value:v(phy.indoorSqft),              note:`Req: ${reg?.indoorSqft||'?'} sq ft/child` },
      { id:'outdoorSqft',             label:'Outdoor sq ft (total)',           value:v(phy.outdoorSqft),             note:`Req: ${reg?.outdoorSqft||'?'} sq ft/child` },
      { id:'capacity',                label:'Licensed capacity',               value:v(phy.capacity) },
      { id:'coDetectorInstalled',     label:'CO detector installed',           value:v(phy.coDetectorInstalled) },
      { id:'smokeDetectorInstalled',  label:'Smoke detectors present',         value:v(phy.smokeDetectorInstalled) },
      { id:'fireExtinguisherCurrent', label:'Fire extinguisher current',       value:v(phy.fireExtinguisherCurrent) },
      { id:'firstAidKitPresent',      label:'First aid kit present',           value:v(phy.firstAidKitPresent) },
      { id:'hotWaterMaxTemp',         label:'Hot water temp (°F)',             value:v(phy.hotWaterMaxTemp),         note:`Max ${rules.hotWaterMax||110}°F` },
      { id:'fencingEnclosesPlayArea', label:'Fencing encloses play area',      value:v(phy.fencingEnclosesPlayArea) },
      { id:'fencingHeightFt',         label:'Fence height (ft)',               value:v(phy.fencingHeightFt),         note:`Min ${rules.minFencingHeight||'4 ft'}` },
      { id:'toiletCompliant',         label:'Toilet ratio compliant',          value:v(phy.toiletCompliant),         note:rules.toiletRatio?`1:${rules.toiletRatio}`:''},
    ]},
    { id:'d3', label:'Personnel & Qualifications', dNum:'D3', color:D_COLORS[2], fields:[
      { id:'directorName',           label:'Director name on file',            value:v(per.directorName) },
      { id:'directorEduLevel',       label:'Director education level',         value:v(per.directorEduLevel),    note:reg?.directorReq||'' },
      { id:'directorYearsExp',       label:'Director years of experience',     value:v(per.directorYearsExp) },
      { id:'teacherEduMeetsReq',     label:'Teacher qualifications met',       value:v(per.teacherEduMeetsReq),  note:reg?.teacherReq||'' },
      { id:'teacherMinAgeCompliant', label:'Teacher min age compliant',        value:v(per.teacherMinAgeCompliant) },
      { id:'bgCheckType',            label:'Background check type',            value:v(rules.bgCheckType) },
      { id:'bgValid',                label:'Staff with valid BG check',        value:v(cr.bgValid),              note:`of ${cr.bgTotal||'?'} total staff` },
      { id:'fbiClearance',           label:'FBI fingerprint clearance',        value:v(per.fbiClearance) },
      { id:'childAbuseRegistry',     label:'Child abuse registry check',       value:v(per.childAbuseRegistryDate) },
      { id:'adminDesignationOnFile', label:'Admin designation on file',        value:v(per.adminDesignationOnFile) },
      { id:'workforceRegistry',      label:'Workforce registry enrollment',    value:v(cr.workforceRegistryDone), note:rules.workforceRegistry||'' },
    ]},
    { id:'d4', label:'Ratios & Supervision', dNum:'D4', color:D_COLORS[3], isRatios:true, fields:[
      { id:'infantChildren',     label:'Infant — enrolled children',   value:v((rat.infant||{}).children),    note:`State max 1:${reg?.infant||'?'}` },
      { id:'infantStaff',        label:'Infant — staff on duty',       value:v((rat.infant||{}).staff) },
      { id:'toddlerChildren',    label:'Toddler — enrolled children',  value:v((rat.toddler||{}).children),   note:`State max 1:${reg?.toddler||'?'}` },
      { id:'toddlerStaff',       label:'Toddler — staff on duty',      value:v((rat.toddler||{}).staff) },
      { id:'preschoolChildren',  label:'Preschool — enrolled',         value:v((rat.preschool||{}).children), note:`State max 1:${reg?.preschool||'?'}` },
      { id:'preschoolStaff',     label:'Preschool — staff on duty',    value:v((rat.preschool||{}).staff) },
      { id:'schoolAgeChildren',  label:'School-age — enrolled',        value:v((rat.schoolAge||{}).children), note:`State max 1:${reg?.schoolAge||'?'}` },
      { id:'schoolAgeStaff',     label:'School-age — staff on duty',   value:v((rat.schoolAge||{}).staff) },
      { id:'signinLogMaintained',label:'Sign-in/sign-out log',         value:v(rat.signinLogMaintained) },
      { id:'supervisionPlan',    label:'Supervision plan on file',     value:v(liveData.supervisionPlan) },
    ]},
    { id:'d5', label:'Staff Health & Training', dNum:'D5', color:D_COLORS[4], fields:[
      { id:'cprCertValid',         label:'CPR certification — all staff',     value:v(h.cprCertValid),          note:`Renewal: ${rules.cprRenewal||'2 years'}` },
      { id:'cprExpiryDate',        label:'CPR expiry date',                   value:v(h.cprExpiryDate) },
      { id:'firstAidCertValid',    label:'First Aid — all staff',             value:v(h.firstAidCertValid) },
      { id:'tbScreeningAllStaff',  label:'TB screening — all staff',          value:v(h.tbScreeningAllStaff),   note:rules.tbTestReq||'' },
      { id:'physicalExamOnFile',   label:'Physical exam on file — all staff', value:v(h.physicalExamOnFile) },
      { id:'trainingHrs',          label:'Annual training hours (avg)',        value:v(cr.trainingHrs),          note:`Req: ${reg?.trainingHrs||'?'} hrs/yr` },
      { id:'mandatedReporterDone', label:'Mandated reporter training',         value:v(cr.mandatedReporterDone), note:rules.mandatedReporterRenewal||'' },
      { id:'newHireOrientation',   label:'New hire orientation completed',     value:v(h.newHireOrientationCompleted) },
      { id:'trainingLogOnFile',    label:'Training log on file',               value:v(h.trainingLogOnFile) },
      { id:'tbRenewalDueDate',     label:'TB renewal due date',                value:v(h.tbRenewalDueDate) },
    ]},
    { id:'d6', label:"Children's Records & Health", dNum:'D6', color:D_COLORS[5], fields:[
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
    { id:'d7', label:'Emergency & Safety', dNum:'D7', color:D_COLORS[6], fields:[
      { id:'fireEvacPlan',        label:'Fire evacuation plan on file',     value:v(em.fireEvacPlan) },
      { id:'fireEvacPosted',      label:'Fire evacuation plan posted',      value:v(em.fireEvacPosted) },
      { id:'lastFireDrillDate',   label:'Last fire drill date',             value:v(em.lastFireDrillDate),    note:`Req: ${rules.fireDrillFreq||'Monthly'}` },
      { id:'fireDrillLog',        label:'Fire drill log on file',           value:v(em.fireDrillLog) },
      { id:'fireSafetyTraining',  label:'Fire safety training — all staff', value:v(em.fireSafetyTraining) },
      { id:'fireDeptInspCurrent', label:'Fire dept inspection current',     value:v(em.fireDeptInspCurrent) },
      { id:'tornadoDrillDate',    label:'Last tornado/weather drill',       value:v(em.tornadoDrillDate),     note:rules.tornadoDrill||'Check state' },
      { id:'lockdownDrillDate',   label:'Last lockdown drill',              value:v(em.lockdownDrillDate),    note:rules.lockdownDrill||'2x/year' },
      { id:'emergencyPlanOnFile', label:'Emergency plan on file',           value:v(em.emergencyPlanOnFile) },
      { id:'emergencyPlanPosted', label:'Emergency plan posted',            value:v(em.emergencyPlanPosted) },
      { id:'drillLogMaintained',  label:'Drill log maintained',             value:v(em.drillLogMaintained) },
      { id:'annualHealthInsp',    label:'Annual health inspection on file', value:v(em.annualFireInspOnFile) },
      { id:'bodiesOfWater',       label:'Bodies of water on premises',      value:v(em.bodiesOfWaterOnPremises) },
    ]},
  ];
}

/* ═══════════════════════════════════════════════════════════════════════════════
   UTILITY COMPONENTS
═══════════════════════════════════════════════════════════════════════════════ */

function StatusPill({ statusId, small }) {
  const cfg = STATUS_MAP[statusId];
  if (!cfg) return null;
  return (
    <span style={{
      fontSize:small?10.5:11.5, fontWeight:600, padding:small?'2px 7px':'3px 10px', borderRadius:20,
      background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.bd}`, whiteSpace:'nowrap',
    }}>{cfg.short} {cfg.label}</span>
  );
}

function ProgressRing({ tagged, total, color, size=36 }) {
  const r=( size-4)/2, circ=2*Math.PI*r, pct=total>0?tagged/total:0;
  return (
    <svg width={size} height={size} style={{ flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={3}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={`${circ*pct} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        fontSize={9} fontWeight={700} fill={tagged===total&&total>0?color:'#94a3b8'}>
        {tagged}/{total}
      </text>
    </svg>
  );
}

function OverallProgress({ domains, findings, subset }) {
  const allF = domains.reduce((s,d)=>s+(subset?d.fields.filter(f=>subset.has(f.id)).length:d.fields.length),0);
  const tagged = domains.reduce((s,d)=>s+d.fields.filter(f=>(!subset||subset.has(f.id))&&!!findings[f.id]?.status).length,0);
  const pct = allF>0?Math.round((tagged/allF)*100):0;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
      <div style={{ flex:1, height:6, background:'#e2e8f0', borderRadius:3, overflow:'hidden', minWidth:60 }}>
        <div style={{ height:'100%', width:`${pct}%`, borderRadius:3, background:pct===100?'var(--green)':'var(--teal)', transition:'width 0.4s ease' }}/>
      </div>
      <span style={{ fontSize:12, fontWeight:700, color:pct===100?'var(--green)':'var(--teal)', whiteSpace:'nowrap' }}>{tagged}/{allF} fields</span>
    </div>
  );
}

/* ─── Tap-to-cycle (tablet/desktop) ─────────────────────────────────────────── */
function TapCycleStatus({ statusId, onUpdate, fieldId }) {
  const idx = STATUS_IDS.indexOf(statusId);
  const cfg = STATUS_MAP[statusId];
  const cycle = () => { const next = idx===-1?0:(idx+1)%STATUS_IDS.length; onUpdate(fieldId,{status:STATUS_IDS[next]}); };
  const clear = e => { e.stopPropagation(); onUpdate(fieldId,{status:''}); };
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <button onClick={cycle} style={{
        minHeight:38, padding:'5px 14px', borderRadius:8, cursor:'pointer', fontFamily:'inherit',
        fontSize:12.5, fontWeight:600, transition:'all 0.12s', display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap',
        background:cfg?cfg.bg:'#f1f5f9', color:cfg?cfg.color:'var(--muted)',
        border:cfg?`1.5px solid ${cfg.bd}`:'1.5px solid var(--border)',
      }}>
        {cfg?`${cfg.short} ${cfg.label}`:'Tap to set status'}
        <span style={{ fontSize:10, opacity:0.6 }}>▸</span>
      </button>
      {statusId && (
        <button onClick={clear} title="Clear" style={{ width:22, height:22, borderRadius:'50%', border:'1px solid var(--border)', background:'#f8fafc', color:'var(--muted)', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>×</button>
      )}
    </div>
  );
}

/* ─── Photo attachment ───────────────────────────────────────────────────────── */
function PhotoAttachment({ fieldId, photos, onPhotosChange }) {
  const fileRef = useRef();
  const list    = photos[fieldId] || [];
  const handleAdd = e => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      onPhotosChange(fieldId, [...list, { id:Date.now(), name:file.name, dataUrl:ev.target.result, takenAt:new Date().toISOString() }]);
    };
    reader.readAsDataURL(file); e.target.value='';
  };
  return (
    <div style={{ marginTop:6 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        {list.map(p => (
          <div key={p.id} style={{ position:'relative' }}>
            <img src={p.dataUrl} alt={p.name} style={{ width:50, height:50, objectFit:'cover', borderRadius:6, border:'1px solid var(--border)', display:'block' }}/>
            <button onClick={()=>onPhotosChange(fieldId,list.filter(x=>x.id!==p.id))} style={{ position:'absolute', top:-5, right:-5, width:15, height:15, borderRadius:'50%', background:'var(--red)', color:'#fff', border:'none', fontSize:9, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
            <div style={{ fontSize:9, color:'var(--muted)', marginTop:1, maxWidth:50, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{new Date(p.takenAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
          </div>
        ))}
        <button onClick={()=>fileRef.current?.click()} style={{ width:50, height:50, borderRadius:6, border:'1.5px dashed var(--border)', background:'#f8fafc', color:'var(--muted)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1, fontSize:9, fontWeight:600 }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--teal)';e.currentTarget.style.color='var(--teal)'}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--muted)'}}>
          <span style={{ fontSize:18 }}>📷</span><span>Add</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={handleAdd}/>
      </div>
      {list.length>0 && <div style={{ fontSize:10, color:'var(--muted)', marginTop:3 }}>{list.length} photo{list.length!==1?'s':''} · evidence on file</div>}
    </div>
  );
}

/* ─── Voice-to-text ──────────────────────────────────────────────────────────── */
function VoiceBtn({ onTranscript }) {
  const [on, setOn] = useState(false);
  const ref = useRef();
  const supported = typeof window!=='undefined' && ('SpeechRecognition' in window||'webkitSpeechRecognition' in window);
  const toggle = () => {
    if (!supported) { alert('Voice input requires Chrome on Android or iOS Safari.'); return; }
    if (on) { ref.current?.stop(); setOn(false); return; }
    const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
    const r  = new SR(); r.continuous=false; r.interimResults=false; r.lang='en-US';
    r.onresult = e => { onTranscript(e.results[0][0].transcript); setOn(false); };
    r.onerror = ()=>setOn(false); r.onend=()=>setOn(false);
    r.start(); ref.current=r; setOn(true);
  };
  return (
    <button onClick={toggle} title={on?'Stop recording':'Dictate note'} style={{
      width:30, height:30, borderRadius:'50%', border:'none', cursor:'pointer', flexShrink:0,
      background:on?'#fdf1f1':'#f1f5f9', color:on?'var(--red)':'var(--muted)',
      display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, transition:'all 0.15s',
      boxShadow:on?'0 0 0 4px rgba(185,28,28,0.15)':'none',
    }}>{on?'⏹':'🎙'}</button>
  );
}

/* ─── D4 Live Ratio Counter ──────────────────────────────────────────────────── */
function RatioCounter({ reg }) {
  const groups = [
    { id:'Infant',     max:reg?.infant||4   },
    { id:'Toddler',    max:reg?.toddler||6  },
    { id:'Preschool',  max:reg?.preschool||10 },
    { id:'School-age', max:reg?.schoolAge||15 },
  ];
  const [counts, setCounts] = useState(()=>Object.fromEntries(groups.map(g=>[g.id,{children:0,staff:0}])));
  const adj=(group,key,delta)=>setCounts(p=>({...p,[group]:{...p[group],[key]:Math.max(0,(p[group][key]||0)+delta)}}));
  return (
    <div style={{ padding:'12px 16px', background:'#f8fafc', borderBottom:'1px solid var(--border)' }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:10 }}>Live Headcount Counter</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(155px,1fr))', gap:10 }}>
        {groups.map(g => {
          const c=counts[g.id].children, s=counts[g.id].staff;
          const req=s>0?Math.ceil(c/g.max):0, ok=s>=req, clr=c===0?'var(--muted)':ok?'var(--green)':'var(--red)';
          return (
            <div key={g.id} style={{ background:'#fff', border:`1.5px solid ${c===0?'var(--border)':ok?'var(--compliant-border)':'var(--critical-border)'}`, borderRadius:10, padding:'10px 12px' }}>
              <div style={{ fontSize:10.5, fontWeight:700, color:'var(--muted)', marginBottom:8 }}>{g.id} · max 1:{g.max}</div>
              <div style={{ display:'flex', gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:'var(--muted)', marginBottom:4 }}>Children</div>
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <button onClick={()=>adj(g.id,'children',-1)} style={{ width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'#f8fafc',fontSize:14,cursor:'pointer' }}>−</button>
                    <span style={{ fontSize:18,fontWeight:800,color:clr,minWidth:26,textAlign:'center' }}>{c}</span>
                    <button onClick={()=>adj(g.id,'children',1)} style={{ width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'#f8fafc',fontSize:14,cursor:'pointer' }}>+</button>
                  </div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:'var(--muted)', marginBottom:4 }}>Staff</div>
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <button onClick={()=>adj(g.id,'staff',-1)} style={{ width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'#f8fafc',fontSize:14,cursor:'pointer' }}>−</button>
                    <span style={{ fontSize:18,fontWeight:800,color:clr,minWidth:26,textAlign:'center' }}>{s}</span>
                    <button onClick={()=>adj(g.id,'staff',1)} style={{ width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'#f8fafc',fontSize:14,cursor:'pointer' }}>+</button>
                  </div>
                </div>
              </div>
              {c>0 && <div style={{ marginTop:6,fontSize:11,fontWeight:600,color:clr }}>{ok?`✓ OK — need ${req}, have ${s}`:`✗ Need ${req} staff, have ${s}`}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Shared notes panel ─────────────────────────────────────────────────────── */
function NotesPanel({ fieldId, finding, onUpdate, readOnly, photos, onPhotosChange }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>Notes</label>
          {!readOnly && <VoiceBtn onTranscript={t=>onUpdate(fieldId,{notes:(finding?.notes?finding.notes+' ':'')+t})}/>}
        </div>
        {readOnly
          ? <p style={{ fontSize:12.5,color:'var(--text)',margin:0 }}>{finding?.notes||'—'}</p>
          : <textarea rows={2} value={finding?.notes||''} placeholder="Observation notes... (or tap 🎙 to dictate)"
              onChange={e=>onUpdate(fieldId,{notes:e.target.value})}
              style={{ width:'100%',fontSize:13,padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',resize:'vertical',outline:'none',fontFamily:'inherit' }}/>}
      </div>
      <div>
        <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.04em', display:'block', marginBottom:4 }}>Corrective Action</label>
        {readOnly
          ? <p style={{ fontSize:12.5,color:'var(--text)',margin:0 }}>{finding?.correctiveAction||'—'}</p>
          : <textarea rows={2} value={finding?.correctiveAction||''} placeholder="Describe required correction..."
              onChange={e=>onUpdate(fieldId,{correctiveAction:e.target.value})}
              style={{ width:'100%',fontSize:13,padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',resize:'vertical',outline:'none',fontFamily:'inherit' }}/>}
      </div>
      <div style={{ display:'flex', gap:14, flexWrap:'wrap', alignItems:'flex-start' }}>
        <div>
          <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.04em', display:'block', marginBottom:4 }}>Follow-up Due</label>
          {readOnly
            ? <p style={{ fontSize:12.5,color:'var(--text)',margin:0 }}>{finding?.followUpDate||'—'}</p>
            : <input type="date" value={finding?.followUpDate||''} onChange={e=>onUpdate(fieldId,{followUpDate:e.target.value})}
                style={{ padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',fontSize:13,outline:'none',minHeight:38 }}/>}
        </div>
        {!readOnly && (
          <div style={{ flex:1, minWidth:160 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.04em', display:'block', marginBottom:4 }}>Photo Evidence</label>
            <PhotoAttachment fieldId={fieldId} photos={photos} onPhotosChange={onPhotosChange}/>
          </div>
        )}
        {readOnly && (photos[fieldId]||[]).length>0 && (
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.04em', display:'block', marginBottom:4 }}>Evidence Photos</label>
            <div style={{ display:'flex', gap:5 }}>
              {(photos[fieldId]||[]).map(p=>(
                <img key={p.id} src={p.dataUrl} alt={p.name} style={{ width:42,height:42,objectFit:'cover',borderRadius:6,border:'1px solid var(--border)' }}/>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Desktop table row ──────────────────────────────────────────────────────── */
function FindingRow({ fieldId, label, value, note, finding, onUpdate, readOnly, photos, onPhotosChange, citation, focused, onFocus }) {
  const [open, setOpen] = useState(false);
  const statusId = finding?.status||'';
  const hasDetail = finding?.notes||finding?.correctiveAction||finding?.followUpDate||(photos[fieldId]||[]).length>0;

  useEffect(() => {
    if (!focused||readOnly) return;
    const handler = e => {
      if (e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT') return;
      const m = KEY_MAP[e.key.toLowerCase()];
      if (m) onUpdate(fieldId,{status:m});
    };
    window.addEventListener('keydown',handler);
    return ()=>window.removeEventListener('keydown',handler);
  },[focused,fieldId,onUpdate,readOnly]);

  return (
    <React.Fragment>
      <tr onClick={onFocus} style={{ borderBottom:'1px solid #f1f5f9', background:focused?'rgba(0,169,157,0.03)':'transparent', cursor:'default', transition:'background 0.1s' }}>
        <td style={{ padding:'9px 13px',fontSize:13,color:'var(--text)',fontWeight:500,width:'26%' }}>
          {label}
          {note && <div style={{ fontSize:11,color:'var(--muted)',marginTop:1 }}>{note}</div>}
          {citation && <div style={{ fontSize:10,color:'#4f5fa8',marginTop:2,fontStyle:'italic' }}>{citation}</div>}
        </td>
        <td style={{ padding:'9px 13px',fontSize:13,color:value&&value!=='—'?'var(--text)':'var(--muted)',width:'17%' }}>{value}</td>
        <td style={{ padding:'9px 13px',width:'40%' }}>
          {readOnly
            ? (statusId?<StatusPill statusId={statusId}/>:<span style={{ color:'var(--muted)',fontSize:12 }}>—</span>)
            : <TapCycleStatus statusId={statusId} fieldId={fieldId} onUpdate={onUpdate}/>}
        </td>
        <td style={{ padding:'9px 13px',textAlign:'right',width:'17%' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'flex-end',gap:5 }}>
            {(photos[fieldId]||[]).length>0 && <span title="Photos attached" style={{ fontSize:12 }}>📷</span>}
            {(!readOnly||hasDetail) && (
              <button onClick={e=>{e.stopPropagation();setOpen(o=>!o)}} style={{ fontSize:11.5,padding:'3px 9px',borderRadius:6,cursor:'pointer',border:'1px solid var(--border)',background:'#f8fafc',color:'var(--muted)',display:'inline-flex',alignItems:'center',gap:4 }}>
                {open?'▲ Close':(readOnly?'▼ Detail':'✎ Notes')}
                {!open&&hasDetail&&<span style={{ width:5,height:5,borderRadius:'50%',background:'var(--teal)',display:'inline-block' }}/>}
              </button>
            )}
          </div>
        </td>
      </tr>
      {open && (
        <tr style={{ background:'#f8fafc' }}>
          <td colSpan={4} style={{ padding:'13px 15px',borderBottom:'1px solid var(--border)' }}>
            <NotesPanel fieldId={fieldId} finding={finding} onUpdate={onUpdate} readOnly={readOnly} photos={photos} onPhotosChange={onPhotosChange}/>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

/* ─── Mobile card ────────────────────────────────────────────────────────────── */
function FindingCard({ fieldId, label, value, note, finding, onUpdate, readOnly, photos, onPhotosChange, citation }) {
  const [open, setOpen] = useState(false);
  const statusId = finding?.status||'';
  const cfg      = STATUS_MAP[statusId];
  const hasDetail= finding?.notes||finding?.correctiveAction||finding?.followUpDate||(photos[fieldId]||[]).length>0;
  return (
    <div style={{ background:'#fff',border:`1px solid ${cfg?cfg.bd:'var(--border)'}`,borderLeft:`3px solid ${cfg?cfg.color:'#e2e8f0'}`,borderRadius:10,marginBottom:10,overflow:'hidden' }}>
      <div style={{ padding:'12px 14px' }}>
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:13,fontWeight:600,color:'var(--text)',lineHeight:1.3 }}>{label}</div>
          {note && <div style={{ fontSize:11,color:'var(--muted)',marginTop:2 }}>{note}</div>}
          {citation && <div style={{ fontSize:10,color:'#4f5fa8',marginTop:2,fontStyle:'italic' }}>{citation}</div>}
          {value&&value!=='—' && <div style={{ fontSize:12,color:'var(--slate)',marginTop:5,background:'#f8fafc',padding:'3px 8px',borderRadius:6,display:'inline-block' }}>{value}</div>}
        </div>
        {!readOnly && (
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6 }}>
            {FIELD_STATUSES.map(s=>(
              <button key={s.id} onClick={()=>onUpdate(fieldId,{status:statusId===s.id?'':s.id})}
                style={{ padding:'10px 8px',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:12,minHeight:44,textAlign:'center',fontFamily:'inherit',
                  background:statusId===s.id?s.bg:'#f8fafc', color:statusId===s.id?s.color:'var(--muted)', border:statusId===s.id?`1.5px solid ${s.bd}`:'1px solid var(--border)', transition:'all 0.12s' }}>
                {s.short} {s.label}
              </button>
            ))}
          </div>
        )}
        {readOnly&&statusId&&<StatusPill statusId={statusId}/>}
      </div>
      {(!readOnly||hasDetail) && (
        <>
          <button onClick={()=>setOpen(o=>!o)} style={{ width:'100%',padding:'8px 14px',background:'#f8fafc',border:'none',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',fontFamily:'inherit',fontSize:12,color:'var(--muted)' }}>
            <span style={{ display:'flex',alignItems:'center',gap:5 }}>
              {readOnly?'▼ View notes':'✎ Notes / evidence'}
              {hasDetail&&!open&&<span style={{ width:5,height:5,borderRadius:'50%',background:'var(--teal)',display:'inline-block' }}/>}
            </span>
            <span>{open?'▲':'▼'}</span>
          </button>
          {open && (
            <div style={{ padding:'12px 14px',borderTop:'1px solid var(--border)',background:'#fafafa' }}>
              <NotesPanel fieldId={fieldId} finding={finding} onUpdate={onUpdate} readOnly={readOnly} photos={photos} onPhotosChange={onPhotosChange}/>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PREP SCREEN
═══════════════════════════════════════════════════════════════════════════════ */
function PrepScreen({ centerName, locationLabel, reg, lastFindings, onStart }) {
  const [inspType, setInspType] = useState('real');
  const [notes,    setNotes]    = useState('');
  const prevFlags = Object.values(lastFindings).filter(f=>f.status==='noncompliant'||f.status==='atrisk').length;

  return (
    <div style={{ flex:1,overflowY:'auto',background:'var(--bg)',padding:'20px' }}>
      <div style={{ background:'var(--navy)',borderRadius:14,padding:'20px 24px',marginBottom:14,display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12 }}>
        <div>
          <div style={{ fontSize:11,fontWeight:700,color:'var(--teal2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4 }}>Inspection Preparation</div>
          <div style={{ fontSize:18,fontWeight:800,color:'#fff',marginBottom:3 }}>{centerName}</div>
          <div style={{ fontSize:12,color:'#94a3b8' }}>{locationLabel} · {reg?.agency||'State Licensing Agency'}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:10,color:'#64748b' }}>Today</div>
          <div style={{ fontSize:14,fontWeight:700,color:'#e2e8f0' }}>{new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>
        </div>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12 }} className="insp-prep-grid">
        <div style={{ background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'14px 16px' }}>
          <div style={{ fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:10 }}>Prior Visit</div>
          {prevFlags>0 ? (
            <>
              <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:8 }}>
                <div style={{ width:32,height:32,borderRadius:7,background:'var(--critical-bg)',border:'1px solid var(--critical-border)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <span style={{ fontSize:14,fontWeight:800,color:'var(--critical-text)' }}>{prevFlags}</span>
                </div>
                <div>
                  <div style={{ fontSize:13,fontWeight:600,color:'var(--text)' }}>Open items from last visit</div>
                  <div style={{ fontSize:11,color:'var(--muted)' }}>Pre-loaded as At Risk below</div>
                </div>
              </div>
              <div style={{ fontSize:11.5,color:'var(--atrisk-text)',background:'var(--atrisk-bg)',border:'1px solid var(--atrisk-border)',borderRadius:7,padding:'6px 10px' }}>⚠ Review these items early</div>
            </>
          ) : (
            <div style={{ fontSize:13,color:'var(--muted)' }}>✓ No open items from prior visit</div>
          )}
        </div>
        <div style={{ background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'14px 16px' }}>
          <div style={{ fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:10 }}>State Requirements</div>
          {[['Infant ratio',`1:${reg?.infant||'?'}`],['Hot water max',`${reg?.rules?.hotWaterMax||110}°F`],['Training hrs',`${reg?.trainingHrs||'?'} hrs/yr`],['BG check',reg?.rules?.bgCheckType||'State + FBI']].map(([l,v])=>(
            <div key={l} style={{ display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5 }}>
              <span style={{ color:'var(--muted)' }}>{l}</span>
              <span style={{ fontWeight:600,color:'var(--text)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Swami's 3 inspection types */}
      <div style={{ background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'14px 16px',marginBottom:12 }}>
        <div style={{ fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:12 }}>Inspection Type</div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10 }}>
          {INSP_TYPES.map(t=>(
            <button key={t.id} onClick={()=>setInspType(t.id)} style={{ padding:'12px 13px',borderRadius:10,cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'all 0.12s',
              background:inspType===t.id?t.bg:'#f8fafc', border:inspType===t.id?`2px solid ${t.color}`:'1.5px solid var(--border)' }}>
              <div style={{ fontSize:15,marginBottom:4 }}>{t.icon}</div>
              <div style={{ fontSize:13,fontWeight:700,color:inspType===t.id?t.color:'var(--text)',marginBottom:2 }}>{t.label}</div>
              <div style={{ fontSize:11,color:'var(--muted)',lineHeight:1.4 }}>{t.desc}</div>
              {t.subset && <div style={{ fontSize:10.5,color:t.color,marginTop:4,fontWeight:600 }}>~15% of fields selected</div>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'14px 16px',marginBottom:18 }}>
        <div style={{ fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:8 }}>Pre-Inspection Notes</div>
        <textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Prior complaints, items to prioritise, context from last visit..."
          style={{ width:'100%',fontSize:13,padding:'9px 12px',borderRadius:8,border:'1px solid var(--border)',resize:'vertical',outline:'none',fontFamily:'inherit',color:'var(--text)',lineHeight:1.5 }}/>
      </div>

      <div style={{ display:'flex',justifyContent:'flex-end' }}>
        <button onClick={()=>onStart(inspType,notes)} style={{ padding:'11px 26px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:8 }}
          onMouseEnter={e=>e.currentTarget.style.background='var(--teal2)'}
          onMouseLeave={e=>e.currentTarget.style.background='var(--teal)'}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          Begin Inspection
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   EXIT CONFERENCE SCREEN
═══════════════════════════════════════════════════════════════════════════════ */
function ExitConferenceScreen({ domains, findings, photos, centerName, locationLabel, reg, inspType, onBack, onFinish }) {
  const [directorName,setDirectorName]=useState('');
  const [directorAck, setDirectorAck] =useState(false);
  const [done,        setDone]        =useState(false);
  const typeCfg = INSP_TYPES.find(t=>t.id===inspType)||INSP_TYPES[0];
  const cite    = reg?.inspectionCiteFormat||'';

  const flagged = [];
  domains.forEach(domain=>domain.fields.forEach(f=>{
    const fi=findings[f.id];
    if(fi?.status&&fi.status!=='compliant'&&fi.status!=='notobserved'){
      const refKey=FIELD_REF_MAP[f.id], refVal=refKey?reg?.refs?.[refKey]:null;
      flagged.push({...f,domain:domain.label,dNum:domain.dNum,dColor:domain.color,finding:fi,citation:refVal});
    }
  }));

  const totalF  = domains.reduce((s,d)=>s+d.fields.length,0);
  const taggedF = domains.reduce((s,d)=>s+d.fields.filter(f=>!!findings[f.id]?.status).length,0);
  const ncCount = flagged.filter(f=>f.finding.status==='noncompliant').length;
  const arCount = flagged.filter(f=>f.finding.status==='atrisk').length;
  const coCount = flagged.filter(f=>f.finding.status==='corrected').length;

  if (done) return (
    <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',padding:24 }}>
      <div style={{ background:'#fff',borderRadius:16,padding:'44px 36px',maxWidth:420,textAlign:'center',border:'1px solid var(--border)' }}>
        <div style={{ width:58,height:58,borderRadius:'50%',background:'var(--compliant-bg)',border:'2px solid var(--compliant-border)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--compliant-dot)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div style={{ fontSize:19,fontWeight:800,color:'var(--text)',marginBottom:6 }}>Inspection Complete</div>
        <div style={{ marginBottom:6 }}><span style={{ padding:'2px 8px',borderRadius:20,background:typeCfg.bg,color:typeCfg.color,border:`1px solid ${typeCfg.bd}`,fontWeight:600,fontSize:12 }}>{typeCfg.icon} {typeCfg.label}</span></div>
        <div style={{ fontSize:13,color:'var(--muted)',marginBottom:20,lineHeight:1.6,marginTop:10 }}>
          Findings acknowledged by <strong>{directorName}</strong><br/>{new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
        </div>
        <button onClick={onFinish} style={{ padding:'10px 26px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer' }}>
          Export Report & Close
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ flex:1,overflowY:'auto',background:'var(--bg)',padding:'20px' }}>
      <div style={{ background:'var(--navy)',borderRadius:14,padding:'17px 22px',marginBottom:14,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10 }}>
        <div>
          <div style={{ fontSize:11,fontWeight:700,color:'var(--teal2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:3 }}>Exit Conference</div>
          <div style={{ fontSize:16,fontWeight:800,color:'#fff' }}>{centerName}</div>
          <div style={{ display:'flex',alignItems:'center',gap:8,marginTop:4 }}>
            <span style={{ fontSize:11,padding:'2px 8px',borderRadius:20,background:typeCfg.bg,color:typeCfg.color,border:`1px solid ${typeCfg.bd}`,fontWeight:600 }}>{typeCfg.icon} {typeCfg.label}</span>
            <span style={{ fontSize:11,color:'#94a3b8' }}>{taggedF}/{totalF} reviewed</span>
          </div>
        </div>
        <button onClick={onBack} style={{ padding:'6px 13px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:8,color:'#94a3b8',fontSize:12,fontWeight:600,cursor:'pointer' }}>← Back</button>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:10,marginBottom:14 }}>
        {[['Non-Compliant',ncCount,'var(--critical-bg)','var(--critical-border)','var(--critical-text)'],
          ['At Risk',arCount,'var(--atrisk-bg)','var(--atrisk-border)','var(--atrisk-text)'],
          ['Corrected',coCount,'var(--info-bg)','var(--info-border)','var(--info-text)'],
          ['Fields Tagged',taggedF,'#f8fafc','var(--border)','var(--text)']].map(([l,c,bg,bd,cl])=>(
          <div key={l} style={{ background:bg,border:`1px solid ${bd}`,borderRadius:10,padding:'11px 13px',textAlign:'center' }}>
            <div style={{ fontSize:22,fontWeight:800,color:cl,lineHeight:1 }}>{c}</div>
            <div style={{ fontSize:10.5,fontWeight:600,color:cl,marginTop:4 }}>{l}</div>
          </div>
        ))}
      </div>

      {flagged.length>0 ? (
        <div style={{ background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'15px 17px',marginBottom:13 }}>
          <div style={{ fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:4 }}>{flagged.length} item{flagged.length!==1?'s':''} to review with director</div>
          {cite && <div style={{ fontSize:11,color:'var(--muted)',marginBottom:12 }}>Citation format: {cite}</div>}
          <div style={{ display:'flex',flexDirection:'column',gap:9 }}>
            {flagged.map(f=>{
              const sc=STATUS_MAP[f.finding.status], pc=(photos[f.id]||[]).length;
              return (
                <div key={f.id} style={{ border:`1px solid ${sc.bd}`,borderLeft:`3px solid ${sc.color}`,borderRadius:8,padding:'10px 13px',background:sc.bg }}>
                  <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8,flexWrap:'wrap' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:5,marginBottom:2 }}>
                        <span style={{ fontSize:10,fontWeight:700,color:f.dColor,background:f.dColor+'18',padding:'1px 5px',borderRadius:4 }}>{f.dNum}</span>
                        <span style={{ fontSize:11,color:'var(--muted)' }}>{f.domain}</span>
                        {pc>0 && <span style={{ fontSize:11 }}>📷{pc}</span>}
                      </div>
                      <div style={{ fontSize:13,fontWeight:600,color:'var(--text)' }}>{f.label}</div>
                      {f.citation && <div style={{ fontSize:10.5,color:'#4f5fa8',marginTop:2,fontStyle:'italic' }}>Reg: {f.citation}</div>}
                      {f.finding.notes && <div style={{ fontSize:12,color:'var(--muted)',marginTop:3 }}>{f.finding.notes}</div>}
                    </div>
                    <StatusPill statusId={f.finding.status} small/>
                  </div>
                  {f.finding.correctiveAction && <div style={{ marginTop:7,fontSize:12,color:'var(--text)',background:'rgba(255,255,255,0.6)',borderRadius:6,padding:'5px 9px' }}><strong>Action:</strong> {f.finding.correctiveAction}</div>}
                  {f.finding.followUpDate && <div style={{ marginTop:4,fontSize:11,color:'var(--muted)' }}>Follow-up: <strong>{f.finding.followUpDate}</strong></div>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ background:'var(--compliant-bg)',border:'1px solid var(--compliant-border)',borderRadius:12,padding:'18px 22px',marginBottom:13,textAlign:'center' }}>
          <div style={{ fontSize:18,marginBottom:5 }}>✓</div>
          <div style={{ fontSize:14,fontWeight:700,color:'var(--compliant-text)' }}>No issues found</div>
          <div style={{ fontSize:12,color:'var(--muted)',marginTop:3 }}>All reviewed fields are compliant</div>
        </div>
      )}

      <div style={{ background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'15px 17px',marginBottom:16 }}>
        <div style={{ fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:11 }}>Director Acknowledgement</div>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:12,fontWeight:600,color:'var(--text)',display:'block',marginBottom:5 }}>Director name</label>
          <input type="text" value={directorName} onChange={e=>setDirectorName(e.target.value)} placeholder="Type director's full name..."
            style={{ width:'100%',maxWidth:340,padding:'9px 12px',borderRadius:8,border:'1px solid var(--border)',fontSize:13,outline:'none',fontFamily:'inherit',minHeight:42 }}
            onFocus={e=>e.target.style.borderColor='var(--teal)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
        </div>
        <label style={{ display:'flex',alignItems:'flex-start',gap:10,cursor:'pointer' }}>
          <input type="checkbox" checked={directorAck} onChange={e=>setDirectorAck(e.target.checked)} style={{ marginTop:3,width:18,height:18,accentColor:'var(--teal)',cursor:'pointer',flexShrink:0 }}/>
          <span style={{ fontSize:13,color:'var(--text)',lineHeight:1.5 }}>
            I acknowledge that the {typeCfg.icon} {typeCfg.label} findings listed above have been reviewed with me today,{' '}
            <strong>{new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</strong>.
            I understand the corrective actions required and follow-up dates.
          </span>
        </label>
      </div>

      <div style={{ display:'flex',justifyContent:'flex-end',gap:10 }}>
        <button onClick={onBack} style={{ padding:'9px 17px',background:'transparent',border:'1px solid var(--border)',borderRadius:8,fontSize:13,fontWeight:600,color:'var(--muted)',cursor:'pointer' }}>← Back</button>
        <button onClick={()=>{if(directorName.trim()&&directorAck)setDone(true);}} disabled={!directorName.trim()||!directorAck}
          style={{ padding:'9px 22px',borderRadius:8,border:'none',fontSize:13,fontWeight:700,transition:'all 0.15s',
            cursor:(directorName.trim()&&directorAck)?'pointer':'not-allowed',
            background:(directorName.trim()&&directorAck)?'var(--teal)':'#e2e8f0',
            color:(directorName.trim()&&directorAck)?'#fff':'var(--muted)' }}>
          Complete Inspection ✓
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════════ */
export default function InspectorView({ activeTab='overview', userRole='inspector', centerId, center, reg:regProp, liveData:liveDataProp }) {
  const [loginTime]    = useState(Date.now());
  const [now,          setNow]          = useState(Date.now());
  const [screen,       setScreen]       = useState('prep');
  const [inspType,     setInspType]     = useState('real');
  const [subset,       setSubset]       = useState(null);
  const [expanded,     setExpanded]     = useState({});
  const [findings,     setFindings]     = useState(()=>loadFindings(centerId||DEFAULT_CENTER_ID));
  const [photos,       setPhotos]       = useState(()=>loadPhotos(centerId||DEFAULT_CENTER_ID));
  const [filterStatus, setFilter]       = useState('all');
  const [focusedField, setFocusedField] = useState(null);
  const [saved,        setSaved]        = useState(false);
  const [showReport,   setShowReport]   = useState(false);
  const [showShortcuts,setShowShortcuts]= useState(false);

  useEffect(()=>{ const t=setInterval(()=>setNow(Date.now()),30000); return()=>clearInterval(t); },[]);

  const elapsed  = (now-loginTime)/1000/3600;
  const remaining= Math.max(0,SESSION_HOURS-elapsed);
  const hh=Math.floor(remaining), mm=Math.round((remaining-hh)*60);
  const timerUrgent=remaining<1;

  const resolvedId   = centerId||DEFAULT_CENTER_ID;
  const centerEntry  = CENTERS.find(c=>c.id===resolvedId)||CENTERS.find(c=>c.companyId===1292)||CENTERS[0];
  const seedData     = LIONHEART_SEED[resolvedId]||LIONHEART_SEED[DEFAULT_CENTER_ID]||{};
  const liveData     = liveDataProp?.data||loadCenterData(resolvedId);
  const reg          = regProp||getReg(centerEntry?.state||'CO');
  const domains      = getDomainFields({id:resolvedId,...centerEntry},reg,liveData);
  const centerName   = seedData._centerName||centerEntry?.centerName||'Lionheart RCCO';
  const centerCity   = centerEntry?.city||'';
  const centerState  = centerEntry?.state||'CO';
  const locationLabel= [centerCity,centerState].filter(Boolean).join(', ');

  const centerForTabs= center||{ id:resolvedId, name:centerName, city:centerCity, state:centerState, zip:seedData._zip||centerEntry?.zip||'', agency:seedData._agency||reg?.agency||'', ratios:seedData._ratios||[], staff:seedData._staff||[], history:seedData._history||[], scores:{}, alerts:[] };

  const updateFinding = useCallback((fieldId,patch)=>{
    setFindings(prev=>{
      const merged={...(prev[fieldId]||{}),...patch};
      if(patch.status==='')delete merged.status;
      const next={...prev};
      if(Object.keys(merged).length===0)delete next[fieldId]; else next[fieldId]=merged;
      saveFindings(resolvedId,next); return next;
    });
  },[resolvedId]);

  const updatePhotos = useCallback((fieldId,newPhotos)=>{
    setPhotos(prev=>{ const next={...prev,[fieldId]:newPhotos}; savePhotos(resolvedId,next); return next; });
  },[resolvedId]);

  const handleSave=()=>{ saveFindings(resolvedId,findings); setSaved(true); setTimeout(()=>setSaved(false),2500); };

  const allF=Object.values(findings);
  const fc={ noncompliant:allF.filter(f=>f.status==='noncompliant').length, atrisk:allF.filter(f=>f.status==='atrisk').length, corrected:allF.filter(f=>f.status==='corrected').length, compliant:allF.filter(f=>f.status==='compliant').length };
  const isReadOnly=userRole!=='inspector';

  if(userRole==='inspector'&&remaining<=0) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',background:'var(--bg)' }}>
      <div style={{ textAlign:'center',background:'#fff',border:'1px solid var(--critical-border)',borderRadius:16,padding:'40px 48px',maxWidth:400 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom:16 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <h2 style={{ fontSize:20,fontWeight:700,color:'var(--red)',marginBottom:8 }}>Session Expired</h2>
        <p style={{ fontSize:14,color:'var(--muted)' }}>Your 8-hour inspection session has ended. Contact BUSoft to request a new access link.</p>
      </div>
    </div>
  );

  if(activeTab==='ratios')    return <div className="content"><RatiosTab   center={centerForTabs}/></div>;
  if(activeTab==='staff')     return <div className="content"><StaffTab    center={centerForTabs}/></div>;
  if(activeTab==='alerts')    return <div className="content"><AlertsTab   center={centerForTabs}/></div>;
  if(activeTab==='staterules')return <div className="content"><StateRulesTab center={centerForTabs} reg={reg} userRole="inspector"/></div>;

  if(!isReadOnly&&screen==='prep') return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%',overflowY:'auto',background:'var(--bg)' }}>
      <PrepScreen centerName={centerName} locationLabel={locationLabel} reg={reg} lastFindings={findings}
        onStart={(type,notes)=>{ setInspType(type); const def=INSP_TYPES.find(t=>t.id===type); setSubset(def?.subset?selectSubset(domains):null); setScreen('inspection'); }}/>
    </div>
  );

  if(!isReadOnly&&screen==='exit') return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%',overflowY:'auto',background:'var(--bg)' }}>
      <ExitConferenceScreen domains={domains} findings={findings} photos={photos} centerName={centerName} locationLabel={locationLabel} reg={reg} inspType={inspType} onBack={()=>setScreen('inspection')} onFinish={()=>setShowReport(true)}/>
      {showReport&&<InspectionReportExport center={centerForTabs} onClose={()=>setShowReport(false)}/>}
    </div>
  );

  const typeCfg=INSP_TYPES.find(t=>t.id===inspType)||INSP_TYPES[0];

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%',overflowY:'auto',background:'var(--bg)' }}>

      {/* Header */}
      <div style={{ background:'#fff',borderBottom:'1px solid var(--border)',flexShrink:0 }}>
        <div style={{ padding:'12px 18px 10px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexWrap:'wrap' }}>
          <div style={{ flex:1,minWidth:180 }}>
            <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:4,flexWrap:'wrap' }}>
              <span style={{ fontSize:10.5,fontWeight:700,padding:'2px 7px',borderRadius:20,background:typeCfg.bg,color:typeCfg.color,border:`1px solid ${typeCfg.bd}`,textTransform:'uppercase',letterSpacing:'0.05em' }}>
                {typeCfg.icon} {isReadOnly?'Read-only':typeCfg.label}
              </span>
              {subset&&<span style={{ fontSize:11,color:'var(--muted)' }}>Subset · {subset.size} fields</span>}
            </div>
            <h2 style={{ fontSize:17,fontWeight:800,color:'var(--text)',margin:'0 0 2px' }}>{centerName}</h2>
            <p style={{ fontSize:12,color:'var(--muted)',margin:0 }}>{locationLabel} · {reg?.agency||'State Licensing Agency'}</p>
          </div>
          <div style={{ display:'flex',gap:7,alignItems:'center',flexWrap:'wrap' }}>
            {[{key:'noncompliant',label:'NC',...STATUS_MAP.noncompliant},{key:'atrisk',label:'Risk',...STATUS_MAP.atrisk},{key:'corrected',label:'Corr',...STATUS_MAP.corrected}].filter(({key})=>fc[key]>0).map(({key,label,bg,bd,color})=>(
              <div key={key} style={{ background:bg,border:`1px solid ${bd}`,borderRadius:8,padding:'4px 9px',textAlign:'center',minWidth:46 }}>
                <div style={{ fontSize:16,fontWeight:800,color,lineHeight:1 }}>{fc[key]}</div>
                <div style={{ fontSize:9.5,color,fontWeight:700,marginTop:1 }}>{label}</div>
              </div>
            ))}
            {userRole==='inspector'&&(
              <div style={{ background:timerUrgent?'var(--critical-bg)':'#fefce8',border:`1px solid ${timerUrgent?'var(--critical-border)':'#fde047'}`,borderRadius:8,padding:'4px 10px',textAlign:'center',minWidth:64 }}>
                <div style={{ fontSize:9.5,fontWeight:700,color:timerUrgent?'var(--critical-text)':'#92400e',textTransform:'uppercase',letterSpacing:'0.04em' }}>Session</div>
                <div style={{ fontSize:16,fontWeight:800,color:timerUrgent?'var(--red)':'#92400e',lineHeight:1.2 }}>{hh}h {mm}m</div>
              </div>
            )}
            <button onClick={()=>setShowReport(true)} style={{ padding:'6px 11px',borderRadius:8,border:'1px solid var(--border)',background:'#fff',color:'var(--text)',fontSize:12,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',gap:5,minHeight:36 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Export
            </button>
            {!isReadOnly&&<>
              <button onClick={handleSave} style={{ padding:'6px 13px',borderRadius:8,border:'none',cursor:'pointer',minHeight:36,background:saved?'var(--green)':'var(--navy)',color:'#fff',fontSize:12,fontWeight:600 }}>{saved?'✓ Saved':'Save'}</button>
              <button onClick={()=>{handleSave();setScreen('exit');}} style={{ padding:'6px 13px',borderRadius:8,border:'none',cursor:'pointer',minHeight:36,background:'var(--teal)',color:'#fff',fontSize:12,fontWeight:600 }}>Exit Conf →</button>
            </>}
          </div>
        </div>
        {showReport&&<InspectionReportExport center={centerForTabs} onClose={()=>setShowReport(false)}/>}
        <div style={{ padding:'6px 18px 8px',display:'flex',alignItems:'center',gap:10,borderTop:'1px solid #f1f5f9' }}>
          <span style={{ fontSize:10.5,fontWeight:700,color:'var(--muted)',whiteSpace:'nowrap',textTransform:'uppercase',letterSpacing:'0.04em' }}>Progress</span>
          <OverallProgress domains={domains} findings={findings} subset={subset}/>
          {!isReadOnly&&<button onClick={()=>setScreen('prep')} style={{ fontSize:11,padding:'2px 8px',borderRadius:20,border:'1px solid var(--border)',background:'#f8fafc',color:'var(--muted)',cursor:'pointer',whiteSpace:'nowrap' }}>← Prep</button>}
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ background:'#fff',borderBottom:'1px solid var(--border)',padding:'6px 18px',display:'flex',gap:5,alignItems:'center',flexShrink:0,flexWrap:'wrap' }}>
        <span style={{ fontSize:10.5,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em',marginRight:2 }}>Show</span>
        {[{id:'all',label:'All'},{id:'noncompliant',label:'Non-Compliant'},{id:'atrisk',label:'At Risk'},{id:'corrected',label:'Corrected'},{id:'flagged',label:'All flagged'},{id:'untagged',label:'Untagged'}].map(f=>(
          <button key={f.id} onClick={()=>setFilter(f.id)} style={{ padding:'3px 10px',borderRadius:20,fontSize:11.5,fontWeight:600,cursor:'pointer',minHeight:28,
            background:filterStatus===f.id?'var(--navy)':'#f1f5f9', color:filterStatus===f.id?'#fff':'var(--muted)', border:filterStatus===f.id?'none':'1px solid var(--border)' }}>
            {f.label}{f.id!=='all'&&f.id!=='flagged'&&f.id!=='untagged'&&fc[f.id]>0&&<span style={{ marginLeft:3,fontSize:10,opacity:0.8 }}>{fc[f.id]}</span>}
          </button>
        ))}
        {!isReadOnly&&<button onClick={()=>setShowShortcuts(s=>!s)} style={{ marginLeft:'auto',fontSize:11,padding:'2px 8px',borderRadius:20,border:'1px solid var(--border)',background:'#f8fafc',color:'var(--muted)',cursor:'pointer' }}>⌨ Shortcuts</button>}
      </div>

      {/* Shortcuts strip */}
      {showShortcuts&&!isReadOnly&&(
        <div style={{ background:'var(--navy)',padding:'7px 18px',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap',flexShrink:0 }}>
          <span style={{ fontSize:11,color:'#94a3b8',fontWeight:600 }}>When a row is focused:</span>
          {[['C','Compliant'],['N','Non-Compliant'],['A','At Risk'],['R','Corrected'],['X','Not Observed']].map(([k,l])=>(
            <span key={k} style={{ fontSize:11,color:'#e2e8f0',display:'flex',alignItems:'center',gap:4 }}>
              <span style={{ background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:4,padding:'1px 6px',fontWeight:700,fontFamily:'monospace' }}>{k}</span>{l}
            </span>
          ))}
          <button onClick={()=>setShowShortcuts(false)} style={{ marginLeft:'auto',background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:14 }}>×</button>
        </div>
      )}

      {/* Domain accordion */}
      <div style={{ padding:'12px 18px',flex:1 }}>
        {domains.map(domain=>{
          const isOpen=!!expanded[domain.id];
          const domainFields=subset?domain.fields.filter(f=>subset.has(f.id)):domain.fields;
          if(domainFields.length===0&&subset)return null;

          const sorted=isOpen?[...domainFields].sort((a,b)=>{
            const o={noncompliant:0,atrisk:1,corrected:2,compliant:3,notobserved:4,'':5};
            return (o[findings[a.id]?.status||'']??5)-(o[findings[b.id]?.status||'']??5);
          }):domainFields;

          const visibleFields=filterStatus==='all'?sorted:sorted.filter(f=>{
            const s=findings[f.id]?.status;
            if(filterStatus==='flagged') return s&&s!=='compliant'&&s!=='notobserved';
            if(filterStatus==='untagged')return !s;
            return s===filterStatus;
          });
          if(filterStatus!=='all'&&visibleFields.length===0)return null;

          const tagged=domainFields.filter(f=>!!findings[f.id]?.status).length;
          const dF=domainFields.map(f=>findings[f.id]?.status).filter(Boolean);
          const dNC=dF.filter(s=>s==='noncompliant').length, dAR=dF.filter(s=>s==='atrisk').length, dCO=dF.filter(s=>s==='corrected').length, dCMP=dF.filter(s=>s==='compliant').length;
          const accent=dNC>0?'var(--red)':dAR>0?'var(--amber)':dCO>0?'var(--info-dot)':tagged>0?domain.color:'#cbd5e1';

          return (
            <div key={domain.id} style={{ background:'#fff',border:`1px solid ${isOpen?accent+'50':'var(--border)'}`,borderLeft:`3px solid ${accent}`,borderRadius:10,marginBottom:10,overflow:'hidden',transition:'border-color 0.2s' }}>
              <button onClick={()=>setExpanded(p=>({...p,[domain.id]:!p[domain.id]}))} style={{ width:'100%',display:'flex',alignItems:'center',gap:10,padding:'11px 14px',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'left' }}>
                <ProgressRing tagged={tagged} total={domainFields.length} color={domain.color} size={33}/>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:7,flexWrap:'wrap' }}>
                    <span style={{ fontSize:10.5,fontWeight:800,color:domain.color,background:domain.color+'14',padding:'1px 5px',borderRadius:4 }}>{domain.dNum}</span>
                    <span style={{ fontSize:13.5,fontWeight:700,color:'var(--text)' }}>{domain.label}</span>
                    <span style={{ fontSize:11,color:'var(--muted)' }}>{domainFields.length}{subset?' selected':' fields'}</span>
                  </div>
                  <div style={{ display:'flex',gap:5,marginTop:3,flexWrap:'wrap' }}>
                    {dNC>0&&<span style={{ fontSize:10.5,fontWeight:600,padding:'1px 6px',borderRadius:20,background:'var(--critical-bg)',color:'var(--critical-text)',border:'1px solid var(--critical-border)' }}>{dNC} NC</span>}
                    {dAR>0&&<span style={{ fontSize:10.5,fontWeight:600,padding:'1px 6px',borderRadius:20,background:'var(--atrisk-bg)',color:'var(--atrisk-text)',border:'1px solid var(--atrisk-border)' }}>{dAR} at risk</span>}
                    {dCO>0&&<span style={{ fontSize:10.5,fontWeight:600,padding:'1px 6px',borderRadius:20,background:'var(--info-bg)',color:'var(--info-text)',border:'1px solid var(--info-border)' }}>{dCO} corrected</span>}
                    {dCMP>0&&<span style={{ fontSize:10.5,fontWeight:600,padding:'1px 6px',borderRadius:20,background:'var(--compliant-bg)',color:'var(--compliant-text)',border:'1px solid var(--compliant-border)' }}>{dCMP} compliant</span>}
                  </div>
                </div>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s',flexShrink:0 }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>

              {isOpen&&(
                <div style={{ borderTop:'1px solid #f1f5f9' }}>
                  {domain.isRatios&&!isReadOnly&&<RatioCounter reg={reg}/>}

                  {/* Desktop table */}
                  <div className="inspector-table-wrap">
                    <table style={{ width:'100%',borderCollapse:'collapse' }}>
                      <thead>
                        <tr style={{ background:'#f8fafc' }}>
                          <th style={{ textAlign:'left',padding:'7px 13px',fontSize:10.5,fontWeight:700,color:'var(--muted)',letterSpacing:'0.04em',textTransform:'uppercase' }}>Field</th>
                          <th style={{ textAlign:'left',padding:'7px 13px',fontSize:10.5,fontWeight:700,color:'var(--muted)',letterSpacing:'0.04em',textTransform:'uppercase' }}>Center data</th>
                          <th style={{ textAlign:'left',padding:'7px 13px',fontSize:10.5,fontWeight:700,color:'var(--muted)',letterSpacing:'0.04em',textTransform:'uppercase' }}>{isReadOnly?'Finding':'Status — tap to cycle'}</th>
                          <th style={{ padding:'7px 13px',width:110 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(filterStatus==='all'?sorted:visibleFields).map(f=>{
                          const refKey=FIELD_REF_MAP[f.id], citation=refKey?reg?.refs?.[refKey]:null;
                          return <FindingRow key={f.id} fieldId={f.id} label={f.label} value={f.value} note={f.note} finding={findings[f.id]} onUpdate={updateFinding} readOnly={isReadOnly} photos={photos} onPhotosChange={updatePhotos} citation={citation} focused={focusedField===f.id} onFocus={()=>setFocusedField(f.id)}/>;
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="inspector-cards-wrap" style={{ padding:'10px 12px' }}>
                    {(filterStatus==='all'?sorted:visibleFields).map(f=>{
                      const refKey=FIELD_REF_MAP[f.id], citation=refKey?reg?.refs?.[refKey]:null;
                      return <FindingCard key={f.id} fieldId={f.id} label={f.label} value={f.value} note={f.note} finding={findings[f.id]} onUpdate={updateFinding} readOnly={isReadOnly} photos={photos} onPhotosChange={updatePhotos} citation={citation}/>;
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {!isReadOnly&&(
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:10,paddingBottom:10,flexWrap:'wrap',gap:10 }}>
            <button onClick={()=>{handleSave();setScreen('exit');}} style={{ padding:'9px 17px',borderRadius:8,border:'1px solid var(--teal)',background:'rgba(0,169,157,0.08)',color:'var(--teal)',fontSize:13,fontWeight:600,cursor:'pointer' }}>
              Proceed to Exit Conference →
            </button>
            <button onClick={handleSave} style={{ padding:'9px 20px',borderRadius:8,border:'none',cursor:'pointer',background:saved?'var(--green)':'var(--navy)',color:'#fff',fontSize:13,fontWeight:600 }}>
              {saved?'✓ Findings Saved':'Save All Findings'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

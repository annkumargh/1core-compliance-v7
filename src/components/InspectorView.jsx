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
const DEFAULT_CENTER_ID = '1292_Lionheart_-_RCCO';

/* ─── Inspection types ──────────────────────────────────────────────────────── */
const INSP_TYPES = [
  { id:'routine',     label:'Routine',      desc:'Full annual inspection — all 7 domains' },
  { id:'followup',    label:'Follow-up',    desc:'Re-check previously flagged items only' },
  { id:'complaint',   label:'Complaint',    desc:'Complaint-driven — targeted domains' },
  { id:'unannounced', label:'Unannounced',  desc:'Unannounced spot inspection' },
];

/* ─── Field statuses ────────────────────────────────────────────────────────── */
const FIELD_STATUSES = [
  { id:'compliant',    label:'Compliant',        short:'✓',  bg:'var(--compliant-bg)',  bd:'var(--compliant-border)', color:'var(--compliant-text)' },
  { id:'noncompliant', label:'Non-Compliant',     short:'✗',  bg:'var(--critical-bg)',   bd:'var(--critical-border)',  color:'var(--critical-text)'  },
  { id:'atrisk',       label:'At Risk',           short:'⚠',  bg:'var(--atrisk-bg)',     bd:'var(--atrisk-border)',    color:'var(--atrisk-text)'    },
  { id:'corrected',    label:'Corrected',         short:'✎',  bg:'var(--info-bg)',       bd:'var(--info-border)',      color:'var(--info-text)'      },
  { id:'notobserved',  label:'Not Observed',      short:'—',  bg:'#f1f5f9',              bd:'#cbd5e1',                 color:'#475569'               },
];
const STATUS_MAP = Object.fromEntries(FIELD_STATUSES.map(s => [s.id, s]));

/* ─── Domain colours (D1–D7) ────────────────────────────────────────────────── */
const D_COLORS = ['#4f5fa8','#0891b2','#7c3aed','#b45309','#15803d','#be185d','#0f766e'];
const D_SHORT  = ['Licensing','Physical','Personnel','Ratios','Staff Health','Children','Emergency'];

/* ─── LocalStorage helpers ──────────────────────────────────────────────────── */
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
  const v = (x) => (x && x !== '') ? x : '—';
  return [
    { id:'d1', label:'Licensing & Administration', dNum:'D1', color:D_COLORS[0], fields: [
      { id:'licenseNumber',       label:'License number',                  value:v(lic.licenseNumber||seed._licenseNumber) },
      { id:'licenseExpiry',       label:'License expiry date',             value:v(lic.licenseExpiry) },
      { id:'licCertOnFile',       label:'License certificate on file',     value:v(lic.licCertOnFile) },
      { id:'insurancePolicyNum',  label:'GL insurance policy number',      value:v(lic.insurancePolicyNum) },
      { id:'insuranceExpiry',     label:'GL insurance expiry',             value:v(lic.insuranceExpiry) },
      { id:'workersCompExpiry',   label:"Workers' comp expiry",            value:v(lic.workersCompExpiry) },
      { id:'lastInspectionDate',  label:'Last inspection date',            value:v(lic.lastInspectionDate) },
      { id:'lastInspectionResult',label:'Last inspection result',          value:v(lic.lastInspectionResult) },
      { id:'qrisStatus',          label:'QRIS enrollment status',          value:v(lic.qrisStatus), note:reg?.qrs||'' },
      { id:'coiOnFile',           label:'Certificate of insurance on file',value:v(lic.coiOnFile) },
    ]},
    { id:'d2', label:'Physical Environment', dNum:'D2', color:D_COLORS[1], fields: [
      { id:'indoorSqft',              label:'Indoor sq ft (total)',          value:v(phy.indoorSqft),              note:`Req: ${reg?.indoorSqft||'?'} sq ft/child` },
      { id:'outdoorSqft',             label:'Outdoor sq ft (total)',         value:v(phy.outdoorSqft),             note:`Req: ${reg?.outdoorSqft||'?'} sq ft/child` },
      { id:'capacity',                label:'Licensed capacity',             value:v(phy.capacity) },
      { id:'coDetectorInstalled',     label:'CO detector installed',         value:v(phy.coDetectorInstalled) },
      { id:'smokeDetectorInstalled',  label:'Smoke detectors present',       value:v(phy.smokeDetectorInstalled) },
      { id:'fireExtinguisherCurrent', label:'Fire extinguisher current',     value:v(phy.fireExtinguisherCurrent) },
      { id:'firstAidKitPresent',      label:'First aid kit present',         value:v(phy.firstAidKitPresent) },
      { id:'hotWaterMaxTemp',         label:'Hot water temp (°F)',           value:v(phy.hotWaterMaxTemp),         note:`Max ${rules.hotWaterMax||110}°F` },
      { id:'fencingEnclosesPlayArea', label:'Fencing encloses play area',    value:v(phy.fencingEnclosesPlayArea) },
      { id:'fencingHeightFt',         label:'Fence height (ft)',             value:v(phy.fencingHeightFt),         note:`Min ${rules.minFencingHeight||'4 ft'}` },
      { id:'toiletCompliant',         label:'Toilet ratio compliant',        value:v(phy.toiletCompliant),         note:rules.toiletRatio?`1:${rules.toiletRatio}`:''},
    ]},
    { id:'d3', label:'Personnel & Qualifications', dNum:'D3', color:D_COLORS[2], fields: [
      { id:'directorName',           label:'Director name on file',          value:v(per.directorName) },
      { id:'directorEduLevel',       label:'Director education level',       value:v(per.directorEduLevel),    note:reg?.directorReq||'' },
      { id:'directorYearsExp',       label:'Director years of experience',   value:v(per.directorYearsExp) },
      { id:'teacherEduMeetsReq',     label:'Teacher qualifications met',     value:v(per.teacherEduMeetsReq),  note:reg?.teacherReq||'' },
      { id:'teacherMinAgeCompliant', label:'Teacher min age compliant',      value:v(per.teacherMinAgeCompliant) },
      { id:'bgCheckType',            label:'Background check type',          value:v(rules.bgCheckType) },
      { id:'bgValid',                label:'Staff with valid BG check',      value:v(cr.bgValid),              note:`of ${cr.bgTotal||'?'} total staff` },
      { id:'fbiClearance',           label:'FBI fingerprint clearance',      value:v(per.fbiClearance) },
      { id:'childAbuseRegistry',     label:'Child abuse registry check',     value:v(per.childAbuseRegistryDate) },
      { id:'adminDesignationOnFile', label:'Admin designation on file',      value:v(per.adminDesignationOnFile) },
      { id:'workforceRegistry',      label:'Workforce registry enrollment',  value:v(cr.workforceRegistryDone), note:rules.workforceRegistry||'' },
    ]},
    { id:'d4', label:'Ratios & Supervision', dNum:'D4', color:D_COLORS[3], fields: [
      { id:'infantChildren',    label:'Infant — enrolled children',   value:v((rat.infant||{}).children),    note:`State max 1:${reg?.infant||'?'}` },
      { id:'infantStaff',       label:'Infant — staff on duty',       value:v((rat.infant||{}).staff) },
      { id:'toddlerChildren',   label:'Toddler — enrolled children',  value:v((rat.toddler||{}).children),   note:`State max 1:${reg?.toddler||'?'}` },
      { id:'toddlerStaff',      label:'Toddler — staff on duty',      value:v((rat.toddler||{}).staff) },
      { id:'preschoolChildren', label:'Preschool — enrolled',         value:v((rat.preschool||{}).children), note:`State max 1:${reg?.preschool||'?'}` },
      { id:'preschoolStaff',    label:'Preschool — staff on duty',    value:v((rat.preschool||{}).staff) },
      { id:'schoolAgeChildren', label:'School-age — enrolled',        value:v((rat.schoolAge||{}).children), note:`State max 1:${reg?.schoolAge||'?'}` },
      { id:'schoolAgeStaff',    label:'School-age — staff on duty',   value:v((rat.schoolAge||{}).staff) },
      { id:'signinLogMaintained',label:'Sign-in/sign-out log',        value:v(rat.signinLogMaintained) },
      { id:'supervisionPlan',   label:'Supervision plan on file',     value:v(liveData.supervisionPlan) },
    ]},
    { id:'d5', label:'Staff Health & Training', dNum:'D5', color:D_COLORS[4], fields: [
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
    { id:'d6', label:"Children's Records & Health", dNum:'D6', color:D_COLORS[5], fields: [
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
    { id:'d7', label:'Emergency & Safety', dNum:'D7', color:D_COLORS[6], fields: [
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
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════════════════════════ */

/* ─── StatusPill (read-only display) ────────────────────────────────────────── */
function StatusPill({ statusId }) {
  const cfg = STATUS_MAP[statusId];
  if (!cfg) return null;
  return (
    <span style={{
      fontSize:11.5, fontWeight:600, padding:'3px 10px', borderRadius:20,
      background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.bd}`, whiteSpace:'nowrap',
    }}>
      {cfg.short} {cfg.label}
    </span>
  );
}

/* ─── Mobile card finding row ────────────────────────────────────────────────── */
function FindingCard({ fieldId, label, value, note, finding, onUpdate, readOnly }) {
  const [open, setOpen] = useState(false);
  const statusId = finding?.status || '';
  const cfg = STATUS_MAP[statusId];
  const hasDetail = finding?.notes || finding?.correctiveAction || finding?.followUpDate;

  return (
    <div style={{
      background:'#fff', border:`1px solid ${cfg ? cfg.bd : 'var(--border)'}`,
      borderLeft:`3px solid ${cfg ? cfg.color : '#e2e8f0'}`,
      borderRadius:10, marginBottom:10, overflow:'hidden',
    }}>
      {/* Field header */}
      <div style={{ padding:'12px 14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:8 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', lineHeight:1.3 }}>{label}</div>
            {note && <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{note}</div>}
            {value && value !== '—' && (
              <div style={{ fontSize:12, color:'var(--slate)', marginTop:4, background:'#f8fafc', padding:'3px 8px', borderRadius:6, display:'inline-block' }}>
                {value}
              </div>
            )}
          </div>
          {statusId && <StatusPill statusId={statusId}/>}
        </div>

        {/* Status buttons — big touch targets */}
        {!readOnly && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {FIELD_STATUSES.map(s => (
              <button
                key={s.id}
                onClick={() => onUpdate(fieldId, { status: statusId === s.id ? '' : s.id })}
                style={{
                  padding:'9px 10px', borderRadius:8, cursor:'pointer', fontWeight:600,
                  fontSize:12, minHeight:40, textAlign:'center',
                  background: statusId === s.id ? s.bg : '#f8fafc',
                  color:      statusId === s.id ? s.color : 'var(--muted)',
                  border:     statusId === s.id ? `1.5px solid ${s.bd}` : '1px solid var(--border)',
                  transition:'all 0.12s',
                }}
              >
                {s.short} {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notes expander */}
      {(!readOnly || hasDetail) && (
        <>
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              width:'100%', padding:'8px 14px', background:'#f8fafc', border:'none',
              borderTop:'1px solid var(--border)', display:'flex', alignItems:'center',
              justifyContent:'space-between', cursor:'pointer', fontFamily:'inherit',
              fontSize:12, color:'var(--muted)',
            }}
          >
            <span style={{ display:'flex', alignItems:'center', gap:6 }}>
              {readOnly ? '▼ View notes' : '✎ Add notes / corrective action'}
              {hasDetail && !open && (
                <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--teal)', display:'inline-block' }}/>
              )}
            </span>
            <span>{open ? '▲' : '▼'}</span>
          </button>
          {open && (
            <div style={{ padding:'12px 14px', borderTop:'1px solid var(--border)', background:'#fafafa' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.04em' }}>Notes</label>
                  {readOnly
                    ? <p style={{ fontSize:13, color:'var(--text)', margin:0 }}>{finding?.notes || '—'}</p>
                    : <textarea rows={2} value={finding?.notes||''} placeholder="Observation notes..."
                        onChange={e => onUpdate(fieldId,{notes:e.target.value})}
                        style={{ width:'100%', fontSize:13, padding:'8px 10px', borderRadius:8,
                          border:'1px solid var(--border)', resize:'vertical', outline:'none', fontFamily:'inherit' }}/>}
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.04em' }}>Corrective Action Required</label>
                  {readOnly
                    ? <p style={{ fontSize:13, color:'var(--text)', margin:0 }}>{finding?.correctiveAction || '—'}</p>
                    : <textarea rows={2} value={finding?.correctiveAction||''} placeholder="Describe required correction..."
                        onChange={e => onUpdate(fieldId,{correctiveAction:e.target.value})}
                        style={{ width:'100%', fontSize:13, padding:'8px 10px', borderRadius:8,
                          border:'1px solid var(--border)', resize:'vertical', outline:'none', fontFamily:'inherit' }}/>}
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.04em' }}>Follow-up Due</label>
                  {readOnly
                    ? <p style={{ fontSize:13, color:'var(--text)', margin:0 }}>{finding?.followUpDate || '—'}</p>
                    : <input type="date" value={finding?.followUpDate||''}
                        onChange={e => onUpdate(fieldId,{followUpDate:e.target.value})}
                        style={{ padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)', fontSize:13, outline:'none', minHeight:44 }}/>}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Desktop table finding row ──────────────────────────────────────────────── */
function FindingRow({ fieldId, label, value, note, finding, onUpdate, readOnly }) {
  const [open, setOpen] = useState(false);
  const statusId = finding?.status || '';
  const hasDetail = finding?.notes || finding?.correctiveAction || finding?.followUpDate;

  return (
    <React.Fragment>
      <tr style={{ borderBottom:'1px solid #f1f5f9' }}>
        <td style={{ padding:'10px 14px', fontSize:13, color:'var(--text)', fontWeight:500, width:'28%' }}>
          {label}
          {note && <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{note}</div>}
        </td>
        <td style={{ padding:'10px 14px', fontSize:13, color: value && value !== '—' ? 'var(--text)' : 'var(--muted)', width:'18%' }}>
          {value}
        </td>
        <td style={{ padding:'10px 14px', width:'40%' }}>
          {readOnly ? (
            statusId ? <StatusPill statusId={statusId}/> : <span style={{ color:'var(--muted)', fontSize:12 }}>—</span>
          ) : (
            <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
              {FIELD_STATUSES.map(s => (
                <button
                  key={s.id}
                  onClick={() => onUpdate(fieldId, { status: statusId === s.id ? '' : s.id })}
                  style={{
                    fontSize:11.5, padding:'4px 10px', borderRadius:20, cursor:'pointer', fontWeight:600,
                    background: statusId === s.id ? s.bg    : '#f8fafc',
                    color:      statusId === s.id ? s.color : 'var(--muted)',
                    border:     statusId === s.id ? `1px solid ${s.bd}` : '1px solid var(--border)',
                    transition:'all 0.12s',
                  }}
                >
                  {s.short} {s.label}
                </button>
              ))}
            </div>
          )}
        </td>
        <td style={{ padding:'10px 14px', textAlign:'right', width:'14%' }}>
          {(!readOnly || hasDetail) && (
            <button onClick={() => setOpen(o => !o)} style={{
              fontSize:12, padding:'4px 10px', borderRadius:6, cursor:'pointer',
              border:'1px solid var(--border)', background:'#f8fafc', color:'var(--muted)',
              display:'inline-flex', alignItems:'center', gap:5,
            }}>
              {open ? '▲ Close' : (readOnly ? '▼ Detail' : '✎ Notes')}
              {!open && hasDetail && (
                <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--teal)', display:'inline-block' }}/>
              )}
            </button>
          )}
        </td>
      </tr>
      {open && (
        <tr style={{ background:'#f8fafc' }}>
          <td colSpan={4} style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:12, alignItems:'start' }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.04em' }}>Notes</label>
                {readOnly
                  ? <p style={{ fontSize:12.5, color:'var(--text)', margin:0 }}>{finding?.notes || '—'}</p>
                  : <textarea rows={2} value={finding?.notes||''} placeholder="Observation notes..."
                      onChange={e => onUpdate(fieldId,{notes:e.target.value})}
                      style={{ width:'100%', fontSize:12.5, padding:'6px 10px', borderRadius:6,
                        border:'1px solid var(--border)', resize:'vertical', outline:'none', fontFamily:'inherit' }}/>}
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.04em' }}>Corrective Action Required</label>
                {readOnly
                  ? <p style={{ fontSize:12.5, color:'var(--text)', margin:0 }}>{finding?.correctiveAction || '—'}</p>
                  : <textarea rows={2} value={finding?.correctiveAction||''} placeholder="Describe required correction..."
                      onChange={e => onUpdate(fieldId,{correctiveAction:e.target.value})}
                      style={{ width:'100%', fontSize:12.5, padding:'6px 10px', borderRadius:6,
                        border:'1px solid var(--border)', resize:'vertical', outline:'none', fontFamily:'inherit' }}/>}
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.04em' }}>Follow-up Due</label>
                {readOnly
                  ? <p style={{ fontSize:12.5, color:'var(--text)', margin:0 }}>{finding?.followUpDate || '—'}</p>
                  : <input type="date" value={finding?.followUpDate||''}
                      onChange={e => onUpdate(fieldId,{followUpDate:e.target.value})}
                      style={{ padding:'6px 10px', borderRadius:6, border:'1px solid var(--border)', fontSize:12.5, outline:'none' }}/>}
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

/* ─── Domain progress ring (SVG) ─────────────────────────────────────────────── */
function ProgressRing({ tagged, total, color, size = 36 }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = total > 0 ? tagged / total : 0;
  const dash = circ * pct;
  return (
    <svg width={size} height={size} style={{ flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={3}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        fontSize={9} fontWeight={700} fill={tagged===total && total>0 ? color : '#94a3b8'}>
        {tagged}/{total}
      </text>
    </svg>
  );
}

/* ─── Overall progress bar ───────────────────────────────────────────────────── */
function OverallProgress({ domains, findings }) {
  const totalFields  = domains.reduce((s, d) => s + d.fields.length, 0);
  const taggedFields = domains.reduce((s, d) =>
    s + d.fields.filter(f => !!findings[f.id]?.status).length, 0);
  const pct = totalFields > 0 ? Math.round((taggedFields / totalFields) * 100) : 0;

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
      <div style={{ flex:1, height:6, background:'#e2e8f0', borderRadius:3, overflow:'hidden', minWidth:60 }}>
        <div style={{
          height:'100%', width:`${pct}%`, borderRadius:3,
          background: pct === 100 ? 'var(--green)' : 'var(--teal)',
          transition:'width 0.4s ease',
        }}/>
      </div>
      <span style={{ fontSize:12, fontWeight:700, color: pct===100 ? 'var(--green)' : 'var(--teal)', whiteSpace:'nowrap' }}>
        {taggedFields}/{totalFields} fields
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SCREEN 1 — Pre-Inspection Prep
═══════════════════════════════════════════════════════════════════════════════ */
function PrepScreen({ centerName, centerState, reg, lastFindings, onStart }) {
  const [inspType, setInspType] = useState('routine');
  const [notes,    setNotes]    = useState('');

  const prevFlags = Object.entries(lastFindings)
    .filter(([, f]) => f.status === 'noncompliant' || f.status === 'atrisk')
    .length;

  return (
    <div style={{ flex:1, overflowY:'auto', background:'var(--bg)', padding:'24px' }}>

      {/* Hero */}
      <div style={{
        background:'var(--navy)', borderRadius:14, padding:'24px 28px', marginBottom:20,
        display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16,
      }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--teal2)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>
            Inspection Preparation
          </div>
          <div style={{ fontSize:20, fontWeight:800, color:'#fff', marginBottom:4 }}>{centerName}</div>
          <div style={{ fontSize:13, color:'#94a3b8' }}>{centerState} · {reg?.agency || 'State Licensing Agency'}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:11, color:'#64748b', marginBottom:2 }}>Today</div>
          <div style={{ fontSize:16, fontWeight:700, color:'#e2e8f0' }}>
            {new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>

        {/* Prior visit summary */}
        <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, padding:'18px 20px' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:12 }}>
            Prior Visit Summary
          </div>
          {prevFlags > 0 ? (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{ width:36, height:36, borderRadius:8, background:'var(--critical-bg)', border:'1px solid var(--critical-border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:16, fontWeight:800, color:'var(--critical-text)' }}>{prevFlags}</span>
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Open items from last visit</div>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>Pre-flagged as At Risk below</div>
                </div>
              </div>
              <div style={{ fontSize:12, color:'var(--atrisk-text)', background:'var(--atrisk-bg)', border:'1px solid var(--atrisk-border)', borderRadius:8, padding:'8px 12px' }}>
                ⚠ Review these items early in your inspection
              </div>
            </>
          ) : (
            <div style={{ fontSize:13, color:'var(--muted)', display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:16 }}>✓</span> No open items from prior visit
            </div>
          )}
        </div>

        {/* State requirements snapshot */}
        <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, padding:'18px 20px' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:12 }}>
            State Requirements Snapshot
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {[
              { label:'Infant ratio',   val:`1:${reg?.infant||'?'}` },
              { label:'Min fencing',    val:`${reg?.rules?.minFencingHeight||'4 ft'}` },
              { label:'Training hrs',   val:`${reg?.trainingHrs||'?'} hrs/yr` },
              { label:'BG check type',  val: reg?.rules?.bgCheckType || 'State + FBI' },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                <span style={{ color:'var(--muted)' }}>{r.label}</span>
                <span style={{ fontWeight:600, color:'var(--text)' }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inspection type selector */}
      <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, padding:'18px 20px', marginBottom:16 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:14 }}>
          Inspection Type
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:10 }}>
          {INSP_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setInspType(t.id)}
              style={{
                padding:'12px 14px', borderRadius:10, cursor:'pointer', textAlign:'left',
                fontFamily:'inherit', transition:'all 0.12s',
                background: inspType===t.id ? 'rgba(0,169,157,0.08)' : '#f8fafc',
                border:     inspType===t.id ? '2px solid var(--teal)' : '1.5px solid var(--border)',
              }}
            >
              <div style={{ fontSize:13, fontWeight:700, color: inspType===t.id ? 'var(--teal)' : 'var(--text)', marginBottom:3 }}>
                {t.label}
              </div>
              <div style={{ fontSize:11, color:'var(--muted)', lineHeight:1.4 }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Pre-inspection notes */}
      <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, padding:'18px 20px', marginBottom:24 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:10 }}>
          Pre-Inspection Notes (optional)
        </div>
        <textarea
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Note any prior complaints, observations from previous visits, or items to prioritise..."
          style={{
            width:'100%', fontSize:13, padding:'10px 12px', borderRadius:8,
            border:'1px solid var(--border)', resize:'vertical', outline:'none',
            fontFamily:'inherit', color:'var(--text)', lineHeight:1.5,
          }}
        />
      </div>

      {/* Begin button */}
      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <button
          onClick={() => onStart(inspType, notes)}
          style={{
            padding:'13px 32px', background:'var(--teal)', color:'#fff', border:'none',
            borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer',
            display:'flex', alignItems:'center', gap:8, transition:'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background='var(--teal2)'}
          onMouseLeave={e => e.currentTarget.style.background='var(--teal)'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          Begin Inspection
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SCREEN 3 — Exit Conference
═══════════════════════════════════════════════════════════════════════════════ */
function ExitConferenceScreen({ domains, findings, centerName, centerState, reg, onBack, onFinish }) {
  const [directorName,  setDirectorName]  = useState('');
  const [directorAck,   setDirectorAck]   = useState(false);
  const [finished,      setFinished]      = useState(false);

  const flagged = [];
  domains.forEach(domain => {
    domain.fields.forEach(f => {
      const fi = findings[f.id];
      if (fi?.status && fi.status !== 'compliant' && fi.status !== 'notobserved') {
        flagged.push({ ...f, domain: domain.label, dNum: domain.dNum, dColor: domain.color, finding: fi });
      }
    });
  });

  const totalFields  = domains.reduce((s,d) => s + d.fields.length, 0);
  const taggedFields = domains.reduce((s,d) => s + d.fields.filter(f => !!findings[f.id]?.status).length, 0);
  const ncCount   = flagged.filter(f => f.finding.status === 'noncompliant').length;
  const arCount   = flagged.filter(f => f.finding.status === 'atrisk').length;
  const coCount   = flagged.filter(f => f.finding.status === 'corrected').length;

  if (finished) {
    return (
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:24 }}>
        <div style={{ background:'#fff', borderRadius:16, padding:'48px 40px', maxWidth:420, textAlign:'center', border:'1px solid var(--border)' }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--compliant-bg)', border:'2px solid var(--compliant-border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--compliant-dot)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div style={{ fontSize:20, fontWeight:800, color:'var(--text)', marginBottom:8 }}>Inspection Complete</div>
          <div style={{ fontSize:13, color:'var(--muted)', marginBottom:24, lineHeight:1.6 }}>
            Findings acknowledged by <strong>{directorName}</strong> on {new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}.
          </div>
          <button onClick={onFinish} style={{
            padding:'11px 28px', background:'var(--teal)', color:'#fff', border:'none',
            borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer',
          }}>
            Export Report & Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex:1, overflowY:'auto', background:'var(--bg)', padding:'24px' }}>

      {/* Header */}
      <div style={{ background:'var(--navy)', borderRadius:14, padding:'20px 24px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--teal2)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Exit Conference</div>
          <div style={{ fontSize:18, fontWeight:800, color:'#fff' }}>{centerName}</div>
          <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>{centerState} · {taggedFields}/{totalFields} fields reviewed</div>
        </div>
        <button onClick={onBack} style={{
          padding:'8px 16px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)',
          borderRadius:8, color:'#94a3b8', fontSize:12, fontWeight:600, cursor:'pointer',
        }}>
          ← Back to findings
        </button>
      </div>

      {/* Summary counts */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { label:'Non-Compliant', count:ncCount,    bg:'var(--critical-bg)',  bd:'var(--critical-border)', color:'var(--critical-text)' },
          { label:'At Risk',       count:arCount,    bg:'var(--atrisk-bg)',    bd:'var(--atrisk-border)',   color:'var(--atrisk-text)' },
          { label:'Corrected',     count:coCount,    bg:'var(--info-bg)',      bd:'var(--info-border)',     color:'var(--info-text)' },
          { label:'Fields Tagged', count:taggedFields, bg:'#f8fafc',           bd:'var(--border)',          color:'var(--text)' },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.bd}`, borderRadius:10, padding:'14px 16px', textAlign:'center' }}>
            <div style={{ fontSize:26, fontWeight:800, color:s.color, lineHeight:1 }}>{s.count}</div>
            <div style={{ fontSize:11, fontWeight:600, color:s.color, marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Flagged items — plain language for director review */}
      {flagged.length > 0 ? (
        <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, padding:'18px 20px', marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:16 }}>
            {flagged.length} item{flagged.length !== 1 ? 's' : ''} to review with the director
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {flagged.map((f, i) => {
              const fi = f.finding;
              const sc = STATUS_MAP[fi.status];
              return (
                <div key={f.id} style={{
                  border:`1px solid ${sc.bd}`, borderLeft:`3px solid ${sc.color}`,
                  borderRadius:8, padding:'12px 14px',
                  background: sc.bg,
                }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                        <span style={{ fontSize:10, fontWeight:700, color:f.dColor, background:f.dColor+'18', padding:'1px 6px', borderRadius:4 }}>{f.dNum}</span>
                        <span style={{ fontSize:11, color:'var(--muted)' }}>{f.domain}</span>
                      </div>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{f.label}</div>
                      {fi.notes && <div style={{ fontSize:12, color:'var(--muted)', marginTop:3 }}>{fi.notes}</div>}
                    </div>
                    <StatusPill statusId={fi.status}/>
                  </div>
                  {fi.correctiveAction && (
                    <div style={{ marginTop:8, fontSize:12, color:'var(--text)', background:'rgba(255,255,255,0.6)', borderRadius:6, padding:'6px 10px' }}>
                      <strong>Action required:</strong> {fi.correctiveAction}
                    </div>
                  )}
                  {fi.followUpDate && (
                    <div style={{ marginTop:6, fontSize:11, color:'var(--muted)' }}>
                      Follow-up due: <strong>{fi.followUpDate}</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ background:'var(--compliant-bg)', border:'1px solid var(--compliant-border)', borderRadius:12, padding:'20px 24px', marginBottom:16, textAlign:'center' }}>
          <div style={{ fontSize:20, marginBottom:6 }}>✓</div>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--compliant-text)' }}>No issues found</div>
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>All reviewed fields are compliant</div>
        </div>
      )}

      {/* Director acknowledgement */}
      <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, padding:'18px 20px', marginBottom:20 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:14 }}>
          Director Acknowledgement
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, fontWeight:600, color:'var(--text)', display:'block', marginBottom:6 }}>Director name</label>
          <input
            type="text"
            value={directorName}
            onChange={e => setDirectorName(e.target.value)}
            placeholder="Type director's full name..."
            style={{
              width:'100%', maxWidth:340, padding:'10px 12px', borderRadius:8,
              border:'1px solid var(--border)', fontSize:13, outline:'none',
              fontFamily:'inherit', minHeight:44,
            }}
            onFocus={e => e.target.style.borderColor='var(--teal)'}
            onBlur={e => e.target.style.borderColor='var(--border)'}
          />
        </div>
        <label style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }}>
          <input
            type="checkbox"
            checked={directorAck}
            onChange={e => setDirectorAck(e.target.checked)}
            style={{ marginTop:3, width:18, height:18, accentColor:'var(--teal)', cursor:'pointer', flexShrink:0 }}
          />
          <span style={{ fontSize:13, color:'var(--text)', lineHeight:1.5 }}>
            I acknowledge that the inspection findings listed above have been reviewed with me today,{' '}
            <strong>{new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</strong>.
            I understand any corrective actions required and the associated follow-up dates.
          </span>
        </label>
      </div>

      {/* Complete button */}
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
        <button onClick={onBack} style={{
          padding:'11px 20px', background:'transparent', border:'1px solid var(--border)',
          borderRadius:8, fontSize:13, fontWeight:600, color:'var(--muted)', cursor:'pointer',
        }}>
          ← Back
        </button>
        <button
          onClick={() => { if (directorName.trim() && directorAck) setFinished(true); }}
          disabled={!directorName.trim() || !directorAck}
          style={{
            padding:'11px 28px', borderRadius:8, border:'none', fontSize:13, fontWeight:700,
            cursor: (directorName.trim() && directorAck) ? 'pointer' : 'not-allowed',
            background: (directorName.trim() && directorAck) ? 'var(--teal)' : '#e2e8f0',
            color: (directorName.trim() && directorAck) ? '#fff' : 'var(--muted)',
            transition:'all 0.15s',
          }}
        >
          Complete Inspection ✓
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════════ */
export default function InspectorView({
  activeTab = 'overview',
  userRole  = 'inspector',
  centerId,
  center,
  reg: regProp,
  liveData: liveDataProp,
}) {
  const [loginTime]     = useState(Date.now());
  const [now,           setNow]          = useState(Date.now());
  const [screen,        setScreen]       = useState('prep');   // 'prep' | 'inspection' | 'exit'
  const [inspType,      setInspType]     = useState('routine');
  const [prepNotes,     setPrepNotes]    = useState('');
  const [expanded,      setExpanded]     = useState({});
  const [findings,      setFindings]     = useState(() => loadFindings(centerId || DEFAULT_CENTER_ID));
  const [filterStatus,  setFilter]       = useState('all');
  const [saved,         setSaved]        = useState(false);
  const [showReport,    setShowReport]   = useState(false);

  // Session timer
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const elapsed   = (now - loginTime) / 1000 / 3600;
  const remaining = Math.max(0, SESSION_HOURS - elapsed);
  const hh = Math.floor(remaining);
  const mm  = Math.round((remaining - hh) * 60);
  const timerUrgent = remaining < 1;

  // Center + data resolution
  const resolvedId    = centerId || DEFAULT_CENTER_ID;
  const centerEntry   = CENTERS.find(c => c.id === resolvedId) || CENTERS.find(c => c.companyId === 1292) || CENTERS[0];
  const seedData      = LIONHEART_SEED[resolvedId] || LIONHEART_SEED[DEFAULT_CENTER_ID] || {};
  const liveData      = liveDataProp?.data || loadCenterData(resolvedId);
  const reg           = regProp || getReg(centerEntry?.state || 'CO');
  const domains       = getDomainFields({ id:resolvedId, ...centerEntry }, reg, liveData);

  const centerName    = seedData._centerName  || centerEntry?.centerName || 'Lionheart RCCO';
  const centerCity    = centerEntry?.city  || '';
  const centerState   = centerEntry?.state || 'CO';

  const centerForTabs = center || {
    id: resolvedId,
    name: centerName,
    city: centerCity,
    state: centerState,
    zip:   seedData._zip   || centerEntry?.zip  || '',
    agency:seedData._agency|| reg?.agency || '',
    ratios: seedData._ratios || [],
    staff:  seedData._staff  || [],
    history:seedData._history|| [],
    scores: {},
    alerts: [],
  };

  const updateFinding = useCallback((fieldId, patch) => {
    setFindings(prev => {
      const next = { ...prev, [fieldId]: { ...(prev[fieldId]||{}), ...patch } };
      // Clear status if toggling off
      if (patch.status === '') { delete next[fieldId].status; if (!next[fieldId].notes && !next[fieldId].correctiveAction && !next[fieldId].followUpDate) delete next[fieldId]; }
      saveFindings(resolvedId, next);
      return next;
    });
  }, [resolvedId]);

  const handleSave = () => { saveFindings(resolvedId, findings); setSaved(true); setTimeout(()=>setSaved(false),2500); };

  // Finding counts
  const allF = Object.values(findings);
  const fc = {
    noncompliant: allF.filter(f=>f.status==='noncompliant').length,
    atrisk:       allF.filter(f=>f.status==='atrisk').length,
    corrected:    allF.filter(f=>f.status==='corrected').length,
    compliant:    allF.filter(f=>f.status==='compliant').length,
  };

  const isReadOnly = userRole !== 'inspector';

  // ── Session expired ──
  if (userRole === 'inspector' && remaining <= 0) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', background:'var(--bg)' }}>
        <div style={{ textAlign:'center', background:'#fff', border:'1px solid var(--critical-border)', borderRadius:16, padding:'40px 48px', maxWidth:400 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom:16 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <h2 style={{ fontSize:20, fontWeight:700, color:'var(--red)', marginBottom:8 }}>Session Expired</h2>
          <p style={{ fontSize:14, color:'var(--muted)' }}>Your 8-hour inspection session has ended. Contact BUSoft to request a new access link.</p>
        </div>
      </div>
    );
  }

  // ── Sidebar-driven sub-tabs ──
  if (activeTab === 'ratios')     return <div className="content"><RatiosTab   center={centerForTabs}/></div>;
  if (activeTab === 'staff')      return <div className="content"><StaffTab    center={centerForTabs}/></div>;
  if (activeTab === 'alerts')     return <div className="content"><AlertsTab   center={centerForTabs}/></div>;
  if (activeTab === 'staterules') return <div className="content"><StateRulesTab center={centerForTabs} reg={reg} userRole="inspector"/></div>;

  // ── Pre-inspection prep screen ──
  if (!isReadOnly && screen === 'prep') {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%', overflowY:'auto', background:'var(--bg)' }}>
        <PrepScreen
          centerName={centerName}
          centerState={`${centerCity ? centerCity+', ' : ''}${centerState}`}
          reg={reg}
          lastFindings={findings}
          onStart={(type, notes) => {
            setInspType(type);
            setPrepNotes(notes);
            setScreen('inspection');
          }}
        />
      </div>
    );
  }

  // ── Exit conference screen ──
  if (!isReadOnly && screen === 'exit') {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%', overflowY:'auto', background:'var(--bg)' }}>
        <ExitConferenceScreen
          domains={domains}
          findings={findings}
          centerName={centerName}
          centerState={`${centerCity ? centerCity+', ' : ''}${centerState}`}
          reg={reg}
          onBack={() => setScreen('inspection')}
          onFinish={() => setShowReport(true)}
        />
        {showReport && (
          <InspectionReportExport center={centerForTabs} onClose={() => setShowReport(false)} />
        )}
      </div>
    );
  }

  // ── Main inspection screen ──
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflowY:'auto', background:'var(--bg)' }}>

      {/* ── Inspection header ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid var(--border)', flexShrink:0 }}>

        {/* Top bar */}
        <div style={{ padding:'14px 20px 12px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:200 }}>
            {/* Mode badge */}
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
              <span style={{
                fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                background: isReadOnly ? '#f1f5f9' : 'rgba(0,169,157,0.12)',
                color:      isReadOnly ? 'var(--slate)' : 'var(--teal)',
                border:     isReadOnly ? '1px solid var(--border)' : '1px solid rgba(0,169,157,0.3)',
                textTransform:'uppercase', letterSpacing:'0.05em',
              }}>
                {isReadOnly ? '👁 Read-only' : `● ${INSP_TYPES.find(t=>t.id===inspType)?.label || 'Routine'} Inspection`}
              </span>
              {!isReadOnly && prepNotes && (
                <span style={{ fontSize:11, color:'var(--muted)', fontStyle:'italic' }} title={prepNotes}>📋 Notes on file</span>
              )}
            </div>
            <h2 style={{ fontSize:18, fontWeight:800, color:'var(--text)', margin:'0 0 2px' }}>{centerName}</h2>
            <p style={{ fontSize:12, color:'var(--muted)', margin:0 }}>
              {centerCity && `${centerCity}, `}{centerState} · {reg?.agency || 'State Licensing Agency'}
            </p>
          </div>

          {/* Right: timer + counters + actions */}
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            {/* Finding count chips */}
            {[
              { key:'noncompliant', label:'NC',       ...STATUS_MAP.noncompliant },
              { key:'atrisk',       label:'At Risk',   ...STATUS_MAP.atrisk },
              { key:'corrected',    label:'Corrected', ...STATUS_MAP.corrected },
            ].filter(({ key }) => fc[key] > 0).map(({ key, label, bg, bd, color }) => (
              <div key={key} style={{ background:bg, border:`1px solid ${bd}`, borderRadius:8, padding:'5px 10px', textAlign:'center', minWidth:52 }}>
                <div style={{ fontSize:17, fontWeight:800, color, lineHeight:1 }}>{fc[key]}</div>
                <div style={{ fontSize:9.5, color, fontWeight:700, marginTop:1 }}>{label}</div>
              </div>
            ))}

            {/* Session timer */}
            {userRole === 'inspector' && (
              <div style={{
                background: timerUrgent ? 'var(--critical-bg)' : '#fefce8',
                border:     `1px solid ${timerUrgent ? 'var(--critical-border)' : '#fde047'}`,
                borderRadius:8, padding:'6px 12px', textAlign:'center', minWidth:72,
              }}>
                <div style={{ fontSize:9.5, fontWeight:700, color: timerUrgent?'var(--critical-text)':'#92400e', textTransform:'uppercase', letterSpacing:'0.05em' }}>Session</div>
                <div style={{ fontSize:17, fontWeight:800, color: timerUrgent?'var(--red)':'#92400e', lineHeight:1.2 }}>{hh}h {mm}m</div>
              </div>
            )}

            {/* Report export */}
            <button
              onClick={() => setShowReport(true)}
              style={{ padding:'8px 13px', borderRadius:8, border:'1px solid var(--border)', background:'#fff', color:'var(--text)', fontSize:12.5, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:5, minHeight:40 }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Export
            </button>

            {/* Save / Exit Conference */}
            {!isReadOnly && (
              <>
                <button
                  onClick={handleSave}
                  style={{ padding:'8px 16px', borderRadius:8, border:'none', cursor:'pointer', minHeight:40, background: saved?'var(--green)':'var(--navy)', color:'#fff', fontSize:12.5, fontWeight:600, transition:'background 0.15s' }}
                >
                  {saved ? '✓ Saved' : 'Save'}
                </button>
                <button
                  onClick={() => { handleSave(); setScreen('exit'); }}
                  style={{ padding:'8px 16px', borderRadius:8, border:'none', cursor:'pointer', minHeight:40, background:'var(--teal)', color:'#fff', fontSize:12.5, fontWeight:600 }}
                >
                  Exit Conference →
                </button>
              </>
            )}
          </div>
        </div>

        {showReport && (
          <InspectionReportExport center={centerForTabs} onClose={() => setShowReport(false)} />
        )}

        {/* Progress bar row */}
        <div style={{ padding:'8px 20px 10px', display:'flex', alignItems:'center', gap:12, borderTop:'1px solid #f1f5f9' }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)', whiteSpace:'nowrap', textTransform:'uppercase', letterSpacing:'0.04em' }}>Progress</span>
          <OverallProgress domains={domains} findings={findings}/>
          {!isReadOnly && (
            <button
              onClick={() => setScreen('prep')}
              style={{ fontSize:11.5, padding:'3px 10px', borderRadius:20, border:'1px solid var(--border)', background:'#f8fafc', color:'var(--muted)', cursor:'pointer', whiteSpace:'nowrap' }}
            >
              ← Prep
            </button>
          )}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid var(--border)', padding:'8px 20px', display:'flex', gap:6, alignItems:'center', flexShrink:0, flexWrap:'wrap' }}>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.04em', marginRight:2 }}>Show</span>
        {[
          { id:'all',          label:'All fields' },
          { id:'noncompliant', label:'Non-Compliant' },
          { id:'atrisk',       label:'At Risk' },
          { id:'corrected',    label:'Corrected' },
          { id:'flagged',      label:'All flagged' },
          { id:'untagged',     label:'Untagged' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
            background: filterStatus===f.id ? 'var(--navy)' : '#f1f5f9',
            color:      filterStatus===f.id ? '#fff'        : 'var(--muted)',
            border:     filterStatus===f.id ? 'none'        : '1px solid var(--border)',
            transition:'all 0.12s', minHeight:30,
          }}>
            {f.label}
            {f.id!=='all' && f.id!=='flagged' && f.id!=='untagged' && fc[f.id]>0 &&
              <span style={{ marginLeft:4, fontSize:10, opacity:0.8 }}>{fc[f.id]}</span>}
          </button>
        ))}
      </div>

      {/* ── Domain accordion ── */}
      <div style={{ padding:'14px 20px', flex:1 }}>
        {domains.map((domain, dIdx) => {
          const isOpen = !!expanded[domain.id];
          const dF     = domain.fields.map(f => findings[f.id]?.status).filter(Boolean);
          const tagged = domain.fields.filter(f => !!findings[f.id]?.status).length;
          const dNC    = dF.filter(s=>s==='noncompliant').length;
          const dAR    = dF.filter(s=>s==='atrisk').length;
          const dCO    = dF.filter(s=>s==='corrected').length;
          const dCMP   = dF.filter(s=>s==='compliant').length;

          // Accent color: red if NC, amber if AR, blue if corrected, domain color if all ok, gray if unstarted
          const accentColor = dNC>0 ? 'var(--red)' : dAR>0 ? 'var(--amber)' : dCO>0 ? 'var(--info-dot)' : tagged>0 ? domain.color : '#cbd5e1';

          const visibleFields = domain.fields.filter(f => {
            if (filterStatus==='all') return true;
            const s = findings[f.id]?.status;
            if (filterStatus==='flagged')  return s && s!=='compliant' && s!=='notobserved';
            if (filterStatus==='untagged') return !s;
            return s === filterStatus;
          });
          if (filterStatus !== 'all' && visibleFields.length === 0) return null;

          return (
            <div key={domain.id} style={{
              background:'#fff', border:`1px solid ${isOpen ? accentColor+'40' : 'var(--border)'}`,
              borderLeft:`3px solid ${accentColor}`,
              borderRadius:10, marginBottom:10, overflow:'hidden',
              transition:'border-color 0.2s',
            }}>
              {/* Domain header */}
              <button
                onClick={() => setExpanded(p=>({...p,[domain.id]:!p[domain.id]}))}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'13px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}
              >
                {/* Progress ring */}
                <ProgressRing tagged={tagged} total={domain.fields.length} color={domain.color} size={36}/>

                {/* Domain label */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, fontWeight:800, color:domain.color, background:domain.color+'14', padding:'1px 6px', borderRadius:4 }}>{domain.dNum}</span>
                    <span style={{ fontSize:13.5, fontWeight:700, color:'var(--text)' }}>{domain.label}</span>
                    <span style={{ fontSize:11, color:'var(--muted)' }}>{domain.fields.length} fields</span>
                  </div>
                  {/* Status badge row */}
                  <div style={{ display:'flex', gap:5, marginTop:4, flexWrap:'wrap' }}>
                    {dNC>0  && <span style={{ fontSize:11, fontWeight:600, padding:'1px 7px', borderRadius:20, background:'var(--critical-bg)', color:'var(--critical-text)', border:'1px solid var(--critical-border)' }}>{dNC} NC</span>}
                    {dAR>0  && <span style={{ fontSize:11, fontWeight:600, padding:'1px 7px', borderRadius:20, background:'var(--atrisk-bg)', color:'var(--atrisk-text)', border:'1px solid var(--atrisk-border)' }}>{dAR} at risk</span>}
                    {dCO>0  && <span style={{ fontSize:11, fontWeight:600, padding:'1px 7px', borderRadius:20, background:'var(--info-bg)', color:'var(--info-text)', border:'1px solid var(--info-border)' }}>{dCO} corrected</span>}
                    {dCMP>0 && <span style={{ fontSize:11, fontWeight:600, padding:'1px 7px', borderRadius:20, background:'var(--compliant-bg)', color:'var(--compliant-text)', border:'1px solid var(--compliant-border)' }}>{dCMP} compliant</span>}
                  </div>
                </div>

                {/* Chevron */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform:isOpen?'rotate(180deg)':'none', transition:'transform 0.2s', flexShrink:0 }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {/* Domain body */}
              {isOpen && (
                <div style={{ borderTop:'1px solid #f1f5f9' }}>
                  {/* ── Desktop table ── */}
                  <div className="inspector-table-wrap">
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead>
                        <tr style={{ background:'#f8fafc' }}>
                          <th style={{ textAlign:'left', padding:'8px 14px', fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:'0.04em', textTransform:'uppercase' }}>Field</th>
                          <th style={{ textAlign:'left', padding:'8px 14px', fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:'0.04em', textTransform:'uppercase' }}>Center data</th>
                          <th style={{ textAlign:'left', padding:'8px 14px', fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:'0.04em', textTransform:'uppercase' }}>
                            {isReadOnly ? 'Finding' : 'Inspector finding'}
                          </th>
                          <th style={{ padding:'8px 14px', width:90 }}></th>
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

                  {/* ── Mobile cards ── */}
                  <div className="inspector-cards-wrap" style={{ padding:'12px 14px' }}>
                    {(filterStatus==='all' ? domain.fields : visibleFields).map(f => (
                      <FindingCard key={f.id} fieldId={f.id} label={f.label} value={f.value}
                        note={f.note} finding={findings[f.id]} onUpdate={updateFinding} readOnly={isReadOnly}/>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Bottom save */}
        {!isReadOnly && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:12, paddingBottom:8, flexWrap:'wrap', gap:10 }}>
            <button
              onClick={() => { handleSave(); setScreen('exit'); }}
              style={{ padding:'10px 20px', borderRadius:8, border:'1px solid var(--teal)', background:'rgba(0,169,157,0.08)', color:'var(--teal)', fontSize:13, fontWeight:600, cursor:'pointer' }}
            >
              Proceed to Exit Conference →
            </button>
            <button
              onClick={handleSave}
              style={{ padding:'10px 24px', borderRadius:8, border:'none', cursor:'pointer', background: saved?'var(--green)':'var(--navy)', color:'#fff', fontSize:13, fontWeight:600 }}
            >
              {saved ? '✓ Findings Saved' : 'Save All Findings'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

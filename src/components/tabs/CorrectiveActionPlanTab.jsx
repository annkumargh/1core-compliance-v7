import React, { useState, useEffect, useCallback, useMemo } from 'react';

// ── Storage keys ──────────────────────────────────────────────────────────────
const LS_KEY_CAP      = '1core_compliance_v6_cap';
const LS_KEY_FINDINGS = '1core_compliance_v6_inspector_findings';
const LS_RUNS_KEY     = '1core_compliance_v6_auditruns';

function loadCAP(centerId) {
  try { return JSON.parse(localStorage.getItem(LS_KEY_CAP))?.[centerId] || {}; } catch { return {}; }
}
function saveCAP(centerId, data) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY_CAP)) || {};
    all[centerId] = data;
    localStorage.setItem(LS_KEY_CAP, JSON.stringify(all));
  } catch {}
}
function loadRuns(centerId) {
  try { return JSON.parse(localStorage.getItem(LS_RUNS_KEY))?.[centerId] || []; } catch { return []; }
}
function loadInspectorFindings(centerId) {
  try { return JSON.parse(localStorage.getItem(LS_KEY_FINDINGS))?.[centerId] || {}; } catch { return {}; }
}

// ── CAP ID generator ──────────────────────────────────────────────────────────
function generateCapId(inspectionType, runTimestamp, quarter, existingIds) {
  const date    = runTimestamp ? new Date(runTimestamp) : new Date();
  const year    = date.getFullYear();
  const typeCode = inspectionType === 'system' ? 'SYS'
                 : inspectionType === 'center' ? 'DIR'
                 : inspectionType === 'real'   ? 'REAL'
                 : 'SYS';
  const period = inspectionType === 'system' && quarter
    ? quarter                                             // Q1/Q2/Q3/Q4
    : String(date.getMonth() + 1).padStart(2, '0');      // 01–12

  // Find next sequence number for this type+year+period
  const prefix = `CAP-${typeCode}-${year}-${period}-`;
  const existing = (existingIds || []).filter(id => id && id.startsWith(prefix));
  const seq = existing.length + 1;
  return `${prefix}${String(seq).padStart(3, '0')}`;
}

// ── Type config ───────────────────────────────────────────────────────────────
const TYPE_CFG = {
  system: { label:'System-Simulated',  shortLabel:'System-Sim',    color:'#1e5c8a', bg:'#eef4fc', bd:'#a8c4e0', icon:'system' },
  center: { label:'Director-Simulated',shortLabel:'Director-Sim',  color:'#1e5c38', bg:'#eef7f2', bd:'#a7d4ba', icon:'center' },
  real:   { label:'Real Inspection',   shortLabel:'Real',          color:'#7f1d1d', bg:'#fdf1f1', bd:'#e8a0a0', icon:'real'   },
  auto:   { label:'System Assessment', shortLabel:'Auto-detected', color:'#475569', bg:'#f1f5f9', bd:'#cbd5e1', icon:'auto'   },
};

// ── SVG icons ─────────────────────────────────────────────────────────────────
function Icon({name, size=14, color='currentColor'}) {
  const s = {width:size, height:size, verticalAlign:'middle', flexShrink:0};
  const p = {fill:'none', stroke:color, strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round'};
  if(name==='system')  return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
  if(name==='center')  return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if(name==='real')    return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
  if(name==='auto')    return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></svg>;
  if(name==='fix')     return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
  if(name==='chevron') return <svg style={s} viewBox="0 0 24 24" {...p}><polyline points="6 9 12 15 18 9"/></svg>;
  if(name==='printer') return <svg style={s} viewBox="0 0 24 24" {...p}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
  if(name==='check')   return <svg style={s} viewBox="0 0 24 24" {...p}><polyline points="20 6 9 17 4 12"/></svg>;
  if(name==='alert')   return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
  return null;
}

function TypeBadge({typeId, small, capId, quarter}) {
  const cfg = TYPE_CFG[typeId] || TYPE_CFG.auto;
  return (
    <span style={{fontSize:small?10:11,fontWeight:700,padding:small?'2px 6px':'3px 10px',borderRadius:20,
      background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.bd}`,whiteSpace:'nowrap',
      display:'inline-flex',alignItems:'center',gap:4}}>
      <Icon name={cfg.icon} size={small?9:11} color={cfg.color}/>
      {cfg.shortLabel}{quarter?` · ${quarter}`:''}
    </span>
  );
}

// ── Status & progress configs ─────────────────────────────────────────────────
const STATUS_CFG = {
  missing: { bg:'#fdf1f1', bd:'#e8a0a0', color:'#7f1d1d', label:'✗ Missing',  dot:'#b91c1c' },
  atrisk:  { bg:'#fdf4e7', bd:'#e6b87a', color:'#7c4a00', label:'⚠ At Risk',  dot:'#b45309' },
};
const PROGRESS_CFG = {
  open:       { bg:'#f1f5f9', bd:'#cbd5e1', color:'#475569', label:'Open' },
  inprogress: { bg:'#eef4fc', bd:'#a8c4e0', color:'#1e5c8a', label:'In Progress' },
  resolved:   { bg:'#eef7f2', bd:'#a7d4ba', color:'#1e5c38', label:'✓ Resolved' },
};

// ── Field → domain mapping (for Fix navigation) ───────────────────────────────
const DOMAIN_MAP = {
  licenseNumber:'d1',licenseExpiry:'d1',licCertOnFile:'d1',insurancePolicyNum:'d1',
  insuranceExpiry:'d1',workersCompExpiry:'d1',lastInspectionDate:'d1',coiOnFile:'d1',
  indoorSqft:'d2',outdoorSqft:'d2',capacity:'d2',coDetectorInstalled:'d2',
  smokeDetectorInstalled:'d2',fireExtinguisherCurrent:'d2',firstAidKitPresent:'d2',
  hotWaterMaxTemp:'d2',fencingEnclosesPlayArea:'d2',fencingHeightFt:'d2',toiletCompliant:'d2',
  directorName:'d3',directorEduLevel:'d3',directorYearsExp:'d3',teacherEduMeetsReq:'d3',
  teacherMinAgeCompliant:'d3',bgCheckType:'d3',bgValid:'d3',fbiClearance:'d3',
  childAbuseRegistry:'d3',adminDesignationOnFile:'d3',workforceRegistry:'d3',
  infantChildren:'d4',infantStaff:'d4',toddlerChildren:'d4',toddlerStaff:'d4',
  preschoolChildren:'d4',preschoolStaff:'d4',schoolAgeChildren:'d4',schoolAgeStaff:'d4',
  signinLogMaintained:'d4',supervisionPlan:'d4',
  cprCertValid:'d5',cprExpiryDate:'d5',firstAidCertValid:'d5',tbScreeningAllStaff:'d5',
  physicalExamOnFile:'d5',trainingHrs:'d5',mandatedReporterDone:'d5',
  newHireOrientation:'d5',trainingLogOnFile:'d5',tbRenewalDueDate:'d5',
  childRecordComplete:'d6',emergContactsOnFile:'d6',authPickupOnFile:'d6',
  allergyDocOnFile:'d6',allergyCareplan:'d6',medLogMaintained:'d6',
  medsStoredCorrectly:'d6',immRecordsOnFile:'d6',immRecordsCurrent:'d6',
  parentAgreementSigned:'d6',safeSleepPolicy:'d6',attendanceRecordOnFile:'d6',
  attendanceSignInLog:'d6',attendanceRetentionMet:'d6',
  fireEvacPlan:'d7',fireEvacPosted:'d7',lastFireDrillDate:'d7',fireDrillLog:'d7',
  fireSafetyTraining:'d7',fireDeptInspCurrent:'d7',tornadoDrillDate:'d7',
  lockdownDrillDate:'d7',emergencyPlanOnFile:'d7',emergencyPlanPosted:'d7',
  drillLogMaintained:'d7',annualHealthInsp:'d7',bodiesOfWater:'d7',
};

const FIELD_LABEL_MAP = {
  licenseNumber:'License number',licenseExpiry:'License expiry date',licCertOnFile:'License certificate on file',
  licenseIssueDate:'License issue date',insurancePolicyNum:'GL coverage expiry',
  insuranceExpiry:"Workers' comp current",workersCompExpiry:"Workers' comp expiry",
  lastInspectionDate:'Last licensing inspection date',coiOnFile:'Certificate of Insurance (COI) current',
  indoorSqft:'Total indoor sq ft',outdoorSqft:'Total outdoor sq ft',capacity:'Licensed capacity (max children)',
  coDetectorInstalled:'CO detectors installed',smokeDetectorInstalled:'Smoke detectors installed',
  fireExtinguisherCurrent:'Fire extinguishers current',firstAidKitPresent:'First aid kit accessible — fully stocked',
  hotWaterMaxTemp:'Hot water temperature',fencingEnclosesPlayArea:'Gate self-latching',
  fencingHeightFt:'Fencing height (ft)',toiletCompliant:'Child-accessible toilets (count)',
  directorName:'Director education level',directorEduLevel:'Director qualification pathway',directorYearsExp:'Director credential on file',
  teacherEduMeetsReq:'Lead teacher qualification met',teacherMinAgeCompliant:'Aide age requirement met (18+)',
  bgCheckType:'BG check complete — all staff',bgValid:'State BG check clearance on file',fbiClearance:'FBI fingerprint clearance on file',
  childAbuseRegistry:'Child abuse registry check',adminDesignationOnFile:'Director on duty policy on file',
  workforceRegistry:'Workforce registry enrolled',
  cprCertValid:'CPR certification on file — required staff',cprExpiryDate:'CPR certification date on file',firstAidCertValid:'First aid certification current',
  tbScreeningAllStaff:'TB screening complete — all staff',physicalExamOnFile:'Staff physical exam on file — all staff',
  trainingHrs:'Annual training hours completed',mandatedReporterDone:'Mandated reporter training complete',
  childRecordComplete:'Child enrollment record complete — all children',emergContactsOnFile:'Emergency contacts on file — all children',
  authPickupOnFile:'Authorized pickup list on file — all children',allergyDocOnFile:'Allergy documentation on file — all children',
  allergyCareplan:'Allergy care plan on file',medLogMaintained:'Medication administration log maintained',
  medsStoredCorrectly:'Medications stored correctly',immRecordsOnFile:'Immunization records on file — all children',
  immRecordsCurrent:'Immunizations current',parentAgreementSigned:'Parent / guardian agreement signed — all children',
  safeSleepPolicy:'Safe sleep policy',attendanceRecordOnFile:'Daily attendance record on file',
  attendanceSignInLog:'Sign-in / sign-out log maintained',attendanceRetentionMet:'Incident / accident log on file',
  fireEvacPlan:'Fire evacuation plan',fireEvacPosted:'Fire evacuation plan posted visibly',
  lastFireDrillDate:'Last fire drill',fireDrillLog:'Fire drill log',
  fireSafetyTraining:'Fire safety training',fireDeptInspCurrent:'Fire department inspection current',
  tornadoDrillDate:'Last tornado drill date',lockdownDrillDate:'Last lockdown drill date',
  emergencyPlanOnFile:'Written emergency plan on file',emergencyPlanPosted:'Emergency plan reviewed annually',
  drillLogMaintained:'All drill logs retained',annualHealthInsp:'Health department inspection current',
  bodiesOfWater:'Water safety plan on file (if pool / water feature)',
};

function fieldLabel(id) {
  return FIELD_LABEL_MAP[id] || id.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase());
}
function fieldDomain(id) { return DOMAIN_MAP[id] || 'd1'; }

// ── Auto-detected items from live data ────────────────────────────────────────
function getAutoItems(center, reg) {
  const rules  = reg?.rules  || {};
  const ld     = center._liveData || {};
  const lic    = ld.licensing || {};
  const phy    = ld.physical  || {};
  const per    = ld.personnel || {};
  const cr     = ld.staffCredentials || {};
  const h      = ld.staffHealth || {};
  const ch     = ld.children  || {};
  const em     = ld.emergency || {};
  const rat    = ld.ratios    || {};
  const today  = new Date();
  const daysUntil = d => d ? Math.round((new Date(d)-today)/86400000) : null;
  const items  = [];
  const add = (fieldId, domainLabel, status, standard, action) =>
    items.push({ id:`auto__${fieldId}`, fieldId, domain:fieldDomain(fieldId).toUpperCase(),
      domainLabel, field:fieldLabel(fieldId), status, standard, action, sourceType:'auto',
      sourceLabel:'System Assessment', capId:null });

  if (!lic.licenseNumber) add('licenseNumber','Licensing & Admin','missing','License must be on file and current','Obtain and upload current childcare license certificate');
  if (lic.licenseExpiry) {
    const d=daysUntil(lic.licenseExpiry);
    if(d<0) add('licenseExpiry','Licensing & Admin','missing','Active unexpired license required',`License expired ${Math.abs(d)} days ago — renew immediately`);
    else if(d<60) add('licenseExpiry','Licensing & Admin','atrisk','License must not be within 60 days of expiry',`License expires in ${d} days — begin renewal`);
  }
  if (lic.insuranceExpiry) {
    const d=daysUntil(lic.insuranceExpiry);
    if(d<0) add('insuranceExpiry','Licensing & Admin','missing','Active GL insurance required','GL insurance has expired — contact insurer immediately');
    else if(d<60) add('insuranceExpiry','Licensing & Admin','atrisk','GL insurance must not lapse',`GL insurance expires in ${d} days — renew now`);
  }
  if (phy.coDetectorInstalled==='No') add('coDetectorInstalled','Physical Environment','missing',`${center.state} requires CO detectors`,'Install CO detector(s) and document');
  if (phy.smokeDetectorInstalled==='No') add('smokeDetectorInstalled','Physical Environment','missing','Smoke detectors required','Install smoke detectors; document in safety log');
  if (phy.fireExtinguisherCurrent==='No') add('fireExtinguisherCurrent','Physical Environment','missing','Current fire extinguisher required','Schedule fire extinguisher inspection/replacement');
  if (phy.hotWaterMaxTemp) {
    const hw=parseFloat(phy.hotWaterMaxTemp),mx=parseFloat(rules.hotWaterMax||110);
    if(hw>mx) add('hotWaterMaxTemp','Physical Environment','missing',`Max ${mx}°F per ${center.state} regulations`,`Current ${hw}°F exceeds limit — adjust water heater`);
  }
  const bgValid=parseFloat(cr.bgValid||0),bgTotal=parseFloat(cr.bgTotal||0);
  if(bgTotal>0&&bgValid<bgTotal) add('bgValid','Personnel & Qualifications',bgValid/bgTotal<0.8?'missing':'atrisk',`All staff must have ${rules.bgCheckType||'state-required'} background check`,`${bgTotal-bgValid} staff missing background check`);
  if(!per.directorEduLevel) add('directorEduLevel','Personnel & Qualifications','atrisk',reg?.directorReq||'Director must meet state requirements','Upload director education credentials');
  if (h.cprExpiryDate) {
    const d=daysUntil(h.cprExpiryDate);
    if(d<0) add('cprCertValid','Staff Health & Training','missing','CPR certification required',`CPR expired ${Math.abs(d)} days ago — schedule recertification immediately`);
    else if(d<30) add('cprExpiryDate','Staff Health & Training','atrisk','CPR must be current',`CPR expires in ${d} days — schedule now`);
  }
  const trainingHrs=parseFloat(cr.trainingHrs||0),reqHrs=reg?.trainingHrs||0;
  if(reqHrs>0&&trainingHrs<reqHrs) add('trainingHrs','Staff Health & Training',trainingHrs===0?'missing':'atrisk',`${reqHrs} hrs/year required`,`${trainingHrs} of ${reqHrs} hrs completed — schedule additional training`);
  ['childRecordComplete','emergContactsOnFile','immRecordsOnFile'].forEach(key=>{
    if(ch[key]==='No') add(key,"Children's Records & Health",'missing','Required documentation for all children',`Complete ${fieldLabel(key).toLowerCase()} in Data Entry`);
  });
  if(!em.fireEvacPlan||em.fireEvacPlan==='No') add('fireEvacPlan','Emergency & Safety','missing','Written fire evacuation plan required','Create and post fire evacuation plan');
  if(em.lastFireDrillDate&&(today-new Date(em.lastFireDrillDate))/86400000>35)
    add('lastFireDrillDate','Emergency & Safety','missing',`Fire drills required ${rules.fireDrillFreq||'monthly'}`,`Last drill overdue — conduct drill immediately`);
  return items;
}

// ── Build inspection-instance items from audit runs ───────────────────────────
function buildRunItems(runs, inspectorFindings) {
  const groups = [];
  const allCapIds = runs.map(r=>r.capId).filter(Boolean);

  runs.forEach((run, idx) => {
    if (!run) return;
    const typeId = run.inspectionType || 'system';
    const capId  = run.capId || generateCapId(typeId, run.runTimestamp, run.quarter, allCapIds.slice(0,idx));

    const items = [];

    // Inspector findings (from InspectorView exit conference) — treat as 'real' type
    if (typeId === 'real' || !run.capId) {
      // These come from inspector_findings localStorage for real inspections
      // handled separately below
    }

    // Items from the run's fail checks (if stored)
    // We only store summary, not full check data — so we synthesise from what we know
    // For now expose the run summary; detailed items come from inspector findings

    groups.push({
      runIdx:   idx,
      typeId,
      capId,
      date:     run.date,
      runTimestamp: run.runTimestamp,
      quarter:  run.quarter,
      inspectorName: run.inspectorName,
      score:    run.readinessScore,
      failCount:run.fail,
      passCount:run.pass,
      total:    run.total,
      items,     // populated below for inspector type
    });
  });

  // Inspector findings → attach to the most recent 'real' run group
  const inspItems = Object.entries(inspectorFindings)
    .filter(([,f])=>f.status==='noncompliant'||f.status==='atrisk')
    .map(([fieldId,f])=>({
      id: `insp__${fieldId}`,
      fieldId,
      domain: fieldDomain(fieldId).toUpperCase(),
      domainLabel: { d1:'Licensing & Admin',d2:'Physical Environment',d3:'Personnel & Qualifications',
        d4:'Ratios & Supervision',d5:'Staff Health & Training',d6:"Children's Records & Health",d7:'Emergency & Safety' }[fieldDomain(fieldId)],
      field: fieldLabel(fieldId),
      status: f.status==='noncompliant'?'missing':'atrisk',
      standard: f.correctiveAction||'Inspector finding',
      action:   f.correctiveAction||'Address inspector finding',
      notes:    f.notes||'',
      sourceType: 'real',
      sourceLabel: 'Real Inspection',
      capId: null,
    }));

  const realGroup = groups.find(g=>g.typeId==='real');
  if (realGroup && inspItems.length>0) {
    realGroup.items = inspItems;
    if (!realGroup.capId) realGroup.capId = generateCapId('real', realGroup.runTimestamp, null, allCapIds);
  } else if (inspItems.length>0) {
    // No real run yet — create a synthetic group for inspector findings
    groups.unshift({
      runIdx: -1, typeId:'real', capId: generateCapId('real', new Date().toISOString(), null, allCapIds),
      date: new Date().toLocaleString(), runTimestamp: new Date().toISOString(),
      quarter: null, inspectorName:'State Inspector', score:null, failCount:inspItems.length, passCount:null, total:null,
      items: inspItems,
    });
  }

  return groups;
}

// ── CAP item row ──────────────────────────────────────────────────────────────
function ItemRow({ item, override, onUpdateOverride, isEditing, onStartEdit, onSaveEdit, onCancelEdit, editForm, onEditFormChange }) {
  const sc = STATUS_CFG[item.status] || STATUS_CFG.atrisk;
  const pc = PROGRESS_CFG[override?.progress||'open'] || PROGRESS_CFG.open;

  const handleFix = () => {
    const domainId = fieldDomain(item.fieldId);
    window.dispatchEvent(new CustomEvent('1core_navigate_dataentry', {
      detail: { fieldKey: item.fieldId, subTab: domainId }
    }));
  };

  return (
    <>
      <tr style={{borderBottom:'1px solid #f1f5f9',verticalAlign:'top',background:'#fff'}}>
        <td style={{padding:'11px 12px',whiteSpace:'nowrap'}}>
          <div style={{fontSize:11.5,fontWeight:700,color:'#64748b'}}>{item.domain}</div>
          <div style={{fontSize:10.5,color:'#94a3b8',marginTop:1,maxWidth:90}}>{item.domainLabel}</div>
        </td>
        <td style={{padding:'11px 12px',maxWidth:160}}>
          <div style={{fontSize:13,fontWeight:600,color:'#1e293b'}}>{item.field}</div>
          {item.notes&&<div style={{fontSize:11.5,color:'#64748b',marginTop:2,fontStyle:'italic'}}>{item.notes}</div>}
        </td>
        <td style={{padding:'11px 12px',whiteSpace:'nowrap'}}>
          <span style={{fontSize:11.5,fontWeight:600,padding:'3px 9px',borderRadius:20,background:sc.bg,color:sc.color,border:`1px solid ${sc.bd}`}}>{sc.label}</span>
        </td>
        <td style={{padding:'11px 12px',fontSize:12.5,color:'#374151',maxWidth:200}}>{item.action}</td>
        <td style={{padding:'11px 12px',minWidth:120}}>
          {isEditing
            ? <input value={editForm.assignedTo||''} onChange={e=>onEditFormChange('assignedTo',e.target.value)} placeholder="Name or role" style={{width:'100%',padding:'5px 8px',borderRadius:6,border:'1px solid #cbd5e1',fontSize:12.5,outline:'none'}}/>
            : <span style={{fontSize:12.5,color:override?.assignedTo?'#1e293b':'#94a3b8'}}>{override?.assignedTo||'—'}</span>}
        </td>
        <td style={{padding:'11px 12px',minWidth:110}}>
          {isEditing
            ? <input type="date" value={editForm.dueDate||''} onChange={e=>onEditFormChange('dueDate',e.target.value)} style={{padding:'5px 8px',borderRadius:6,border:'1px solid #cbd5e1',fontSize:12.5,outline:'none'}}/>
            : <span style={{fontSize:12.5,color:override?.dueDate?'#1e293b':'#94a3b8'}}>{override?.dueDate?new Date(override.dueDate+'T00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—'}</span>}
        </td>
        <td style={{padding:'11px 12px',minWidth:160}}>
          {isEditing
            ? <div style={{display:'flex',flexDirection:'column',gap:5}}>
                <textarea value={editForm.notes||''} onChange={e=>onEditFormChange('notes',e.target.value)} placeholder="Add a note..." rows={2} style={{width:'100%',padding:'5px 8px',borderRadius:6,border:'1px solid #cbd5e1',fontSize:12,resize:'vertical',outline:'none'}}/>
                <div style={{display:'flex',gap:5}}>
                  <button onClick={onSaveEdit} style={{flex:1,padding:'4px 8px',borderRadius:5,border:'none',background:'#2d7a4f',color:'#fff',fontSize:12,cursor:'pointer'}}>Save</button>
                  <button onClick={onCancelEdit} style={{flex:1,padding:'4px 8px',borderRadius:5,border:'1px solid #e2e8f0',background:'#fff',color:'#374151',fontSize:12,cursor:'pointer'}}>Cancel</button>
                </div>
              </div>
            : <div style={{display:'flex',flexDirection:'column',gap:4}}>
                <span style={{fontSize:11.5,fontWeight:600,padding:'3px 9px',borderRadius:20,background:pc.bg,color:pc.color,border:`1px solid ${pc.bd}`,width:'fit-content'}}>{pc.label}</span>
                <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                  {(override?.progress||'open')==='open'&&<button onClick={()=>onUpdateOverride(item.id,{progress:'inprogress'})} style={{padding:'3px 7px',fontSize:11,borderRadius:5,border:'1px solid #a8c4e0',background:'#eef4fc',color:'#1e5c8a',cursor:'pointer'}}>→ In Progress</button>}
                  {(override?.progress||'open')==='inprogress'&&<button onClick={()=>onUpdateOverride(item.id,{progress:'resolved'})} style={{padding:'3px 7px',fontSize:11,borderRadius:5,border:'1px solid #a7d4ba',background:'#eef7f2',color:'#1e5c38',cursor:'pointer'}}>✓ Resolve</button>}
                  {(override?.progress||'open')!=='open'&&<button onClick={()=>onUpdateOverride(item.id,{progress:'open'})} style={{padding:'3px 7px',fontSize:11,borderRadius:5,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#94a3b8',cursor:'pointer'}}>Reopen</button>}
                  <button onClick={()=>onStartEdit(item.id,override)} style={{padding:'3px 7px',fontSize:11,borderRadius:5,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#475569',cursor:'pointer',display:'flex',alignItems:'center',gap:3}}><Icon name="fix" size={10}/>Edit</button>
                  {item.fieldId&&DOMAIN_MAP[item.fieldId]&&<button onClick={handleFix} style={{padding:'3px 7px',fontSize:11,borderRadius:5,border:'1px solid #00a99d',background:'rgba(0,169,157,0.07)',color:'#007a72',cursor:'pointer',display:'flex',alignItems:'center',gap:3}}><Icon name="fix" size={10}/>Fix →</button>}
                </div>
              </div>}
        </td>
      </tr>
    </>
  );
}

// ── Inspection group section ──────────────────────────────────────────────────
function InspectionGroup({ group, overrides, onUpdateOverride, editingId, onStartEdit, onSaveEdit, onCancelEdit, editForm, onEditFormChange, showResolved }) {
  const [open, setOpen] = useState(true);
  const cfg = TYPE_CFG[group.typeId] || TYPE_CFG.auto;

  const allItems  = group.items || [];
  const openItems = allItems.filter(i=>(overrides[i.id]?.progress||'open')!=='resolved');
  const doneItems = allItems.filter(i=>(overrides[i.id]?.progress||'open')==='resolved');
  const displayItems = showResolved ? allItems : openItems;

  if (!open) {
    return (
      <div style={{background:'#fff',border:`1px solid ${cfg.bd}`,borderLeft:`3px solid ${cfg.color}`,borderRadius:10,marginBottom:10,overflow:'hidden'}}>
        <button onClick={()=>setOpen(true)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'12px 16px',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
          <TypeBadge typeId={group.typeId} small quarter={group.quarter}/>
          <span style={{fontSize:12.5,fontWeight:600,color:'#1e293b',flex:1}}>{group.capId}</span>
          <span style={{fontSize:12,color:'#64748b'}}>{group.date}</span>
          <span style={{fontSize:12,fontWeight:600,color:openItems.length>0?'#b91c1c':'#2d7a4f',marginLeft:8}}>{openItems.length} open</span>
          <Icon name="chevron" size={14} color="#94a3b8"/>
        </button>
      </div>
    );
  }

  return (
    <div style={{background:'#fff',border:`1px solid ${cfg.bd}`,borderLeft:`3px solid ${cfg.color}`,borderRadius:10,marginBottom:14,overflow:'hidden'}}>
      {/* Group header */}
      <div style={{padding:'14px 16px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <TypeBadge typeId={group.typeId} quarter={group.quarter}/>
        <span style={{fontSize:13,fontWeight:700,color:'#166534',background:'#f0fdf4',padding:'3px 10px',borderRadius:20,border:'1px solid #86efac'}}>{group.capId}</span>
        {group.inspectorName&&group.inspectorName!=='—'&&group.inspectorName!==''&&(
          <span style={{fontSize:12,color:'#64748b'}}>Inspector: {group.inspectorName}</span>
        )}
        <span style={{fontSize:12,color:'#94a3b8',marginLeft:4}}>{group.date}</span>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          {group.score!==null&&group.score!==undefined&&(
            <span style={{fontSize:13,fontWeight:700,color:group.score>=80?'#2d7a4f':group.score>=60?'#b45309':'#b91c1c'}}>{group.score}%</span>
          )}
          {group.failCount>0&&<span style={{fontSize:12,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'#fdf1f1',color:'#7f1d1d',border:'1px solid #e8a0a0'}}>{openItems.length} open</span>}
          {doneItems.length>0&&<span style={{fontSize:12,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'#eef7f2',color:'#1e5c38',border:'1px solid #a7d4ba'}}>{doneItems.length} resolved</span>}
          <button onClick={()=>setOpen(false)} style={{fontSize:11,padding:'3px 8px',borderRadius:6,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#94a3b8',cursor:'pointer'}}>Collapse</button>
        </div>
      </div>

      {/* Items table */}
      {displayItems.length===0
        ? <div style={{padding:'16px 18px',fontSize:13,color:'#64748b',display:'flex',alignItems:'center',gap:7}}><Icon name="check" size={14} color="#2d7a4f"/>All items from this inspection are resolved.</div>
        : <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr style={{background:'#f8fafc'}}>
                  {['Domain','Field','Status','Action Needed','Assigned To','Due Date','Progress'].map(h=>(
                    <th key={h} style={{textAlign:'left',padding:'8px 12px',fontSize:11,fontWeight:700,color:'#94a3b8',letterSpacing:'0.04em',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayItems.map(item=>(
                  <ItemRow key={item.id} item={item}
                    override={overrides[item.id]}
                    onUpdateOverride={onUpdateOverride}
                    isEditing={editingId===item.id}
                    onStartEdit={onStartEdit}
                    onSaveEdit={()=>onSaveEdit(item.id)}
                    onCancelEdit={onCancelEdit}
                    editForm={editForm}
                    onEditFormChange={onEditFormChange}
                  />
                ))}
              </tbody>
            </table>
          </div>}
    </div>
  );
}

// ── Print styles ──────────────────────────────────────────────────────────────
const PRINT_STYLE = `
@media print {
  body > * { display:none!important; }
  #cap-print-layer { display:block!important; position:static!important; }
  .cap-no-print { display:none!important; }
}
@media screen { #cap-print-layer { display:none!important; } }
`;

// ── Main component ────────────────────────────────────────────────────────────
export default function CorrectiveActionPlanTab({ center, reg, liveData }) {
  const enriched     = useMemo(()=>({...center, _liveData:liveData?.data||{}}), [center,liveData]);
  const autoItems    = useMemo(()=>getAutoItems(enriched,reg), [enriched,reg]);
  const runs         = useMemo(()=>loadRuns(center.id), [center.id]);
  const inspFindings = useMemo(()=>loadInspectorFindings(center.id), [center.id]);
  const runGroups    = useMemo(()=>buildRunItems(runs,inspFindings), [runs,inspFindings]);

  const [overrides,   setOverrides]   = useState(()=>loadCAP(center.id));
  const [editingId,   setEditingId]   = useState(null);
  const [editForm,    setEditForm]    = useState({});
  const [showResolved,setShowResolved]= useState(false);
  const [filterType,  setFilterType]  = useState('all');

  useEffect(()=>{ saveCAP(center.id,overrides); },[center.id,overrides]);

  useEffect(()=>{
    if(!document.getElementById('cap-print-style')){
      const s=document.createElement('style');s.id='cap-print-style';s.textContent=PRINT_STYLE;document.head.appendChild(s);
    }
  },[]);

  const updateOverride = useCallback((id,fields)=>{
    setOverrides(prev=>({...prev,[id]:{...(prev[id]||{}),...fields}}));
  },[]);

  const startEdit=(id,ov)=>{ setEditingId(id); setEditForm({assignedTo:ov?.assignedTo||'',dueDate:ov?.dueDate||'',notes:ov?.notes||''}); };
  const saveEdit=(id)=>{ updateOverride(id,editForm); setEditingId(null); };
  const cancelEdit=()=>setEditingId(null);
  const onEditFormChange=(key,val)=>setEditForm(p=>({...p,[key]:val}));

  // All items flat for summary counts
  const allGroupItems = runGroups.flatMap(g=>g.items||[]);
  const allItems      = [...allGroupItems, ...autoItems];
  const totalOpen     = allItems.filter(i=>(overrides[i.id]?.progress||'open')!=='resolved').length;
  const totalResolved = allItems.filter(i=>(overrides[i.id]?.progress||'open')==='resolved').length;
  const missingCount  = allItems.filter(i=>(overrides[i.id]?.progress||'open')!=='resolved'&&i.status==='missing').length;
  const atRiskCount   = allItems.filter(i=>(overrides[i.id]?.progress||'open')!=='resolved'&&i.status==='atrisk').length;
  const inProgCount   = allItems.filter(i=>(overrides[i.id]?.progress||'open')==='inprogress').length;

  const filteredGroups = filterType==='all' ? runGroups : runGroups.filter(g=>g.typeId===filterType);

  const handlePrint=()=>{
    if(!document.getElementById('cap-print-layer')){const l=document.createElement('div');l.id='cap-print-layer';document.body.appendChild(l);}
    const src=document.getElementById('cap-print-root');
    const lay=document.getElementById('cap-print-layer');
    if(src&&lay)lay.innerHTML=src.innerHTML;
    window.print();
  };

  return (
    <div id="cap-print-root">
      {/* ── Header ── */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'18px 20px',marginBottom:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12,marginBottom:16}}>
          <div>
            <h3 style={{fontSize:15,fontWeight:700,color:'#0f172a',margin:'0 0 3px'}}>Corrective Action Plan — {center.name}</h3>
            <p style={{fontSize:12.5,color:'#64748b',margin:0}}>
              Findings grouped by inspection instance · CAP IDs: SYS=System-Simulated, DIR=Director-Simulated, REAL=Real Inspection
            </p>
          </div>
          <div style={{display:'flex',gap:8}} className="cap-no-print">
            <button onClick={handlePrint} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:13,fontWeight:500,cursor:'pointer'}}>
              <Icon name="printer" size={13}/>Print / Export PDF
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          {[
            {label:'Open items',   val:totalOpen,    color:'#475569',bg:'#f1f5f9',bd:'#cbd5e1'},
            {label:'Missing',      val:missingCount, color:'#7f1d1d',bg:'#fdf1f1',bd:'#e8a0a0'},
            {label:'At Risk',      val:atRiskCount,  color:'#7c4a00',bg:'#fdf4e7',bd:'#e6b87a'},
            {label:'In Progress',  val:inProgCount,  color:'#1e5c8a',bg:'#eef4fc',bd:'#a8c4e0'},
            {label:'Resolved',     val:totalResolved,color:'#1e5c38',bg:'#eef7f2',bd:'#a7d4ba'},
          ].map(({label,val,color,bg,bd})=>(
            <div key={label} style={{background:bg,border:`1px solid ${bd}`,borderRadius:10,padding:'10px 14px',textAlign:'center',minWidth:88}}>
              <div style={{fontSize:22,fontWeight:700,color,lineHeight:1}}>{val}</div>
              <div style={{fontSize:11,color,marginTop:3,fontWeight:500}}>{label}</div>
            </div>
          ))}
          {allItems.length>0&&(
            <div style={{flex:1,minWidth:180,display:'flex',flexDirection:'column',justifyContent:'center',gap:4}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11.5,color:'#64748b'}}>
                <span>Overall resolution progress</span>
                <span style={{fontWeight:600,color:totalResolved/Math.max(allItems.length,1)>=0.8?'#2d7a4f':'#b45309'}}>
                  {Math.round((totalResolved/Math.max(allItems.length,1))*100)}%
                </span>
              </div>
              <div style={{height:8,background:'#e2e8f0',borderRadius:4,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:4,width:`${Math.round((totalResolved/Math.max(allItems.length,1))*100)}%`,background:totalResolved/Math.max(allItems.length,1)>=0.8?'#2d7a4f':'#b45309',transition:'width 0.4s'}}/>
              </div>
              <div style={{fontSize:11,color:'#94a3b8'}}>{totalResolved} of {allItems.length} items resolved</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Filter + controls ── */}
      <div className="cap-no-print" style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        <span style={{fontSize:11.5,fontWeight:700,color:'#94a3b8',letterSpacing:'0.05em'}}>SHOW</span>
        {[{id:'all',label:'All types'},{id:'system',label:'System-Sim'},{id:'center',label:'Director-Sim'},{id:'real',label:'Real Inspection'}].map(f=>(
          <button key={f.id} onClick={()=>setFilterType(f.id)} style={{padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',background:filterType===f.id?'#0f172a':'#f1f5f9',color:filterType===f.id?'#fff':'#64748b',border:filterType===f.id?'none':'1px solid #e2e8f0'}}>
            {f.label}
          </button>
        ))}
        <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12.5,color:'#64748b',cursor:'pointer',marginLeft:8}}>
          <input type="checkbox" checked={showResolved} onChange={e=>setShowResolved(e.target.checked)} style={{accentColor:'#00a99d',width:14,height:14}}/>
          Show resolved items
        </label>
        <span style={{fontSize:12,color:'#94a3b8',marginLeft:'auto'}}>{totalOpen} open · {totalResolved} resolved</span>
      </div>

      {/* ── Inspection groups ── */}
      {filteredGroups.length===0&&autoItems.filter(i=>(overrides[i.id]?.progress||'open')!=='resolved').length===0
        ? <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:12,padding:'32px',textAlign:'center'}}>
            <Icon name="check" size={28} color="#2d7a4f"/>
            <div style={{fontSize:15,fontWeight:600,color:'#2d7a4f',marginTop:10,marginBottom:4}}>No open items</div>
            <div style={{fontSize:13,color:'#64748b'}}>Run an inspection from the Audit Simulation tab to generate findings.</div>
          </div>
        : <>
            {filteredGroups.map((group,i)=>(
              <InspectionGroup key={`${group.capId}-${i}`}
                group={group} overrides={overrides} onUpdateOverride={updateOverride}
                editingId={editingId} onStartEdit={startEdit} onSaveEdit={saveEdit}
                onCancelEdit={cancelEdit} editForm={editForm} onEditFormChange={onEditFormChange}
                showResolved={showResolved}/>
            ))}

            {/* Auto-detected items group */}
            {(filterType==='all')&&(()=>{
              const openAuto=autoItems.filter(i=>(overrides[i.id]?.progress||'open')!=='resolved');
              const doneAuto=autoItems.filter(i=>(overrides[i.id]?.progress||'open')==='resolved');
              const displayAuto=showResolved?autoItems:openAuto;
              if(displayAuto.length===0)return null;
              const cfg=TYPE_CFG.auto;
              return (
                <div style={{background:'#fff',border:`1px solid ${cfg.bd}`,borderLeft:`3px solid ${cfg.color}`,borderRadius:10,marginBottom:14,overflow:'hidden'}}>
                  <div style={{padding:'13px 16px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                    <TypeBadge typeId="auto"/>
                    <span style={{fontSize:12.5,fontWeight:600,color:'#475569',flex:1}}>Ongoing — auto-detected from entered data</span>
                    <span style={{fontSize:12,color:'#94a3b8'}}>Updates automatically as you enter data</span>
                    {openAuto.length>0&&<span style={{fontSize:12,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'#fdf4e7',color:'#7c4a00',border:'1px solid #e6b87a'}}>{openAuto.length} open</span>}
                    {doneAuto.length>0&&<span style={{fontSize:12,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'#eef7f2',color:'#1e5c38',border:'1px solid #a7d4ba'}}>{doneAuto.length} resolved</span>}
                  </div>
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                      <thead><tr style={{background:'#f8fafc'}}>
                        {['Domain','Field','Status','Action Needed','Assigned To','Due Date','Progress'].map(h=>(
                          <th key={h} style={{textAlign:'left',padding:'8px 12px',fontSize:11,fontWeight:700,color:'#94a3b8',letterSpacing:'0.04em',whiteSpace:'nowrap'}}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {displayAuto.map(item=>(
                          <ItemRow key={item.id} item={item}
                            override={overrides[item.id]} onUpdateOverride={updateOverride}
                            isEditing={editingId===item.id} onStartEdit={startEdit}
                            onSaveEdit={()=>saveEdit(item.id)} onCancelEdit={cancelEdit}
                            editForm={editForm} onEditFormChange={onEditFormChange}/>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </>}
    </div>
  );
}

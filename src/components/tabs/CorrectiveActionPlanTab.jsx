import React, { useState, useEffect, useCallback } from 'react';

// ── localStorage helpers ─────────────────────────────────────────────────────
const LS_KEY_CAP      = '1core_compliance_v6_cap';
const LS_KEY_FINDINGS = '1core_compliance_v6_inspector_findings';

function loadCAP(centerId) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY_CAP)) || {};
    return all[centerId] || {};
  } catch { return {}; }
}

function saveCAP(centerId, data) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY_CAP)) || {};
    all[centerId] = data;
    localStorage.setItem(LS_KEY_CAP, JSON.stringify(all));
  } catch {}
}

// ── Inspector findings loader ─────────────────────────────────────────────────
function loadInspectorFindings(centerId) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY_FINDINGS)) || {};
    const findings = all[centerId] || {};
    return Object.entries(findings)
      .filter(([, f]) => f.status === 'noncompliant' || f.status === 'atrisk')
      .map(([fieldId, f]) => ({
        id: `inspector__${fieldId}`,
        domain: fieldIdToDomain(fieldId),
        domainLabel: fieldIdToDomainLabel(fieldId),
        field: fieldIdToLabel(fieldId),
        status: f.status === 'noncompliant' ? 'missing' : 'atrisk',
        inspectorStatus: f.status,
        standard: f.correctiveAction || 'Inspector finding — see notes',
        action: f.correctiveAction || 'Address inspector finding',
        notes: f.notes || '',
        followUpDate: f.followUpDate || '',
        source: 'inspector',
      }));
  } catch { return []; }
}

const D1_FIELDS = ['licenseNumber','licenseExpiry','licCertOnFile','insurancePolicyNum','insuranceExpiry','workersCompExpiry','lastInspectionDate','lastInspectionResult','qrisStatus','coiOnFile'];
const D2_FIELDS = ['indoorSqft','outdoorSqft','capacity','coDetectorInstalled','smokeDetectorInstalled','fireExtinguisherCurrent','firstAidKitPresent','hotWaterMaxTemp','fencingEnclosesPlayArea','fencingHeightFt','toiletCompliant'];
const D3_FIELDS = ['directorName','directorEduLevel','directorYearsExp','teacherEduMeetsReq','teacherMinAgeCompliant','bgCheckType','bgValid','fbiClearance','childAbuseRegistry','adminDesignationOnFile','workforceRegistry'];
const D4_FIELDS = ['infantChildren','infantStaff','toddlerChildren','toddlerStaff','preschoolChildren','preschoolStaff','schoolAgeChildren','schoolAgeStaff','signinLogMaintained','supervisionPlan'];
const D5_FIELDS = ['cprCertValid','cprExpiryDate','firstAidCertValid','tbScreeningAllStaff','physicalExamOnFile','trainingHrs','mandatedReporterDone','newHireOrientation','trainingLogOnFile','tbRenewalDueDate'];
const D6_FIELDS = ['childRecordComplete','emergContactsOnFile','authPickupOnFile','allergyDocOnFile','allergyCareplan','medLogMaintained','medsStoredCorrectly','immRecordsOnFile','immRecordsCurrent','parentAgreementSigned','safeSleepPolicy','attendanceRecordOnFile','attendanceSignInLog','attendanceRetentionMet'];
const D7_FIELDS = ['fireEvacPlan','fireEvacPosted','lastFireDrillDate','fireDrillLog','fireSafetyTraining','fireDeptInspCurrent','tornadoDrillDate','lockdownDrillDate','emergencyPlanOnFile','emergencyPlanPosted','drillLogMaintained','annualHealthInsp','bodiesOfWater'];

function fieldIdToDomain(fieldId) {
  if (D1_FIELDS.includes(fieldId)) return 'D1';
  if (D2_FIELDS.includes(fieldId)) return 'D2';
  if (D3_FIELDS.includes(fieldId)) return 'D3';
  if (D4_FIELDS.includes(fieldId)) return 'D4';
  if (D5_FIELDS.includes(fieldId)) return 'D5';
  if (D6_FIELDS.includes(fieldId)) return 'D6';
  if (D7_FIELDS.includes(fieldId)) return 'D7';
  return 'D1';
}

function fieldIdToDomainLabel(fieldId) {
  const map = { D1:'Licensing & Admin', D2:'Physical Environment', D3:'Personnel & Qualifications',
    D4:'Ratios & Supervision', D5:'Staff Health & Training', D6:"Children's Records & Health", D7:'Emergency & Safety' };
  return map[fieldIdToDomain(fieldId)] || '';
}

const FIELD_LABEL_MAP = {
  licenseNumber:'License number', licenseExpiry:'License expiry date', licCertOnFile:'License certificate on file',
  insurancePolicyNum:'GL insurance policy number', insuranceExpiry:'GL insurance expiry', workersCompExpiry:"Workers' comp expiry",
  lastInspectionDate:'Last inspection date', lastInspectionResult:'Last inspection result', qrisStatus:'QRIS enrollment status',
  coiOnFile:'Certificate of insurance on file', indoorSqft:'Indoor sq ft', outdoorSqft:'Outdoor sq ft',
  capacity:'Licensed capacity', coDetectorInstalled:'CO detector installed', smokeDetectorInstalled:'Smoke detectors present',
  fireExtinguisherCurrent:'Fire extinguisher current', firstAidKitPresent:'First aid kit present',
  hotWaterMaxTemp:'Hot water temperature', fencingEnclosesPlayArea:'Fencing encloses play area',
  fencingHeightFt:'Fence height', toiletCompliant:'Toilet ratio compliant', directorName:'Director name on file',
  directorEduLevel:'Director education level', directorYearsExp:'Director years of experience',
  teacherEduMeetsReq:'Teacher qualifications met', teacherMinAgeCompliant:'Teacher min age compliant',
  bgCheckType:'Background check type', bgValid:'Staff with valid BG check', fbiClearance:'FBI fingerprint clearance',
  childAbuseRegistry:'Child abuse registry check', adminDesignationOnFile:'Admin designation on file',
  workforceRegistry:'Workforce registry enrollment', infantChildren:'Infant — enrolled children',
  infantStaff:'Infant — staff on duty', toddlerChildren:'Toddler — enrolled children', toddlerStaff:'Toddler — staff on duty',
  preschoolChildren:'Preschool — enrolled', preschoolStaff:'Preschool — staff on duty',
  schoolAgeChildren:'School-age — enrolled', schoolAgeStaff:'School-age — staff on duty',
  signinLogMaintained:'Sign-in/sign-out log', supervisionPlan:'Supervision plan on file',
  cprCertValid:'CPR certification', cprExpiryDate:'CPR expiry date', firstAidCertValid:'First Aid certification',
  tbScreeningAllStaff:'TB screening', physicalExamOnFile:'Physical exam on file', trainingHrs:'Annual training hours',
  mandatedReporterDone:'Mandated reporter training', newHireOrientation:'New hire orientation',
  trainingLogOnFile:'Training log on file', tbRenewalDueDate:'TB renewal due date',
  childRecordComplete:'Child enrollment records complete', emergContactsOnFile:'Emergency contacts on file',
  authPickupOnFile:'Authorized pickup list', allergyDocOnFile:'Allergy documentation',
  allergyCareplan:'Allergy care plans', medLogMaintained:'Medication log', medsStoredCorrectly:'Medications stored correctly',
  immRecordsOnFile:'Immunization records on file', immRecordsCurrent:'Immunization records current',
  parentAgreementSigned:'Parent agreements signed', safeSleepPolicy:'Safe sleep policy',
  attendanceRecordOnFile:'Attendance record on file', attendanceSignInLog:'Sign-in/sign-out log',
  attendanceRetentionMet:'Attendance retention period met', fireEvacPlan:'Fire evacuation plan',
  fireEvacPosted:'Fire evacuation plan posted', lastFireDrillDate:'Last fire drill date',
  fireDrillLog:'Fire drill log', fireSafetyTraining:'Fire safety training', fireDeptInspCurrent:'Fire dept inspection',
  tornadoDrillDate:'Tornado/weather drill', lockdownDrillDate:'Lockdown drill',
  emergencyPlanOnFile:'Emergency plan on file', emergencyPlanPosted:'Emergency plan posted',
  drillLogMaintained:'Drill log maintained', annualHealthInsp:'Annual health inspection', bodiesOfWater:'Bodies of water on premises',
};
function fieldIdToLabel(fieldId) {
  return FIELD_LABEL_MAP[fieldId] || fieldId.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase());
}

// ── Domain field definitions (mirrors InspectionView getDomainFields) ─────────
// Returns items with status 'missing' or 'atrisk' only
function getActionableFields(center, reg) {
  const rules  = reg?.rules  || {};
  const seed   = center._seed || center;
  const lic    = center._liveData?.licensing     || {};
  const phy    = center._liveData?.physical      || {};
  const per    = center._liveData?.personnel     || {};
  const cr     = center._liveData?.staffCredentials || {};
  const h      = center._liveData?.staffHealth   || {};
  const ch     = center._liveData?.children      || {};
  const em     = center._liveData?.emergency     || {};
  const ratios = center._liveData?.ratios        || {};
  const today  = new Date();

  // Helper: days until a date
  const daysUntil = (dateStr) => dateStr
    ? Math.round((new Date(dateStr) - today) / 86400000)
    : null;

  const items = [];

  // ── D1 Licensing & Admin ──────────────────────────────────────────────────
  if (!lic.licenseNumber && !seed._licenseNumber)
    items.push({ domain:'D1', domainLabel:'Licensing & Admin', field:'License number',
      status:'missing', standard:'License must be on file and current',
      action:'Obtain and upload current childcare license certificate' });

  if (lic.licenseExpiry) {
    const d = daysUntil(lic.licenseExpiry);
    if (d !== null && d < 0)
      items.push({ domain:'D1', domainLabel:'Licensing & Admin', field:'License expiry',
        status:'missing', standard:'Active, unexpired license required',
        action:`License expired ${Math.abs(d)} days ago — renew immediately` });
    else if (d !== null && d < 60)
      items.push({ domain:'D1', domainLabel:'Licensing & Admin', field:'License expiry',
        status:'atrisk', standard:'License must not be within 60 days of expiry',
        action:`License expires in ${d} days — begin renewal process` });
  } else if (lic.licenseNumber) {
    items.push({ domain:'D1', domainLabel:'Licensing & Admin', field:'License expiry date',
      status:'atrisk', standard:'Expiry date must be on record',
      action:'Enter license expiration date in Data Entry → Licensing' });
  }

  if (lic.insuranceExpiry) {
    const d = daysUntil(lic.insuranceExpiry);
    if (d !== null && d < 0)
      items.push({ domain:'D1', domainLabel:'Licensing & Admin', field:'GL insurance',
        status:'missing', standard:'Active GL insurance required',
        action:'GL insurance has expired — contact insurer immediately' });
    else if (d !== null && d < 60)
      items.push({ domain:'D1', domainLabel:'Licensing & Admin', field:'GL insurance expiry',
        status:'atrisk', standard:'Insurance must not lapse',
        action:`GL insurance expires in ${d} days — initiate renewal` });
  }

  if (lic.workersCompExpiry) {
    const d = daysUntil(lic.workersCompExpiry);
    if (d !== null && d < 0)
      items.push({ domain:'D1', domainLabel:'Licensing & Admin', field:"Workers' comp insurance",
        status:'missing', standard:"Active workers' compensation required",
        action:"Workers' comp has expired — renew immediately" });
  }

  // ── D2 Physical Environment ───────────────────────────────────────────────
  const coOk = phy.coDetectorInstalled || center._liveData?.centerFacility?.coDetectorInstalled;
  if (coOk === 'No')
    items.push({ domain:'D2', domainLabel:'Physical Environment', field:'CO detector',
      status:'missing', standard:`${center.state || 'State'} requires carbon monoxide detectors`,
      action:'Install CO detector(s) per state requirements and document' });

  if (phy.smokeDetectorInstalled === 'No')
    items.push({ domain:'D2', domainLabel:'Physical Environment', field:'Smoke detectors',
      status:'missing', standard:'Smoke detectors required in all licensed areas',
      action:'Install and test smoke detectors; document in safety log' });

  if (phy.fireExtinguisherCurrent === 'No')
    items.push({ domain:'D2', domainLabel:'Physical Environment', field:'Fire extinguisher',
      status:'missing', standard:'Current fire extinguisher required',
      action:'Schedule fire extinguisher inspection/replacement' });

  if (phy.hotWaterMaxTemp) {
    const hw = parseFloat(phy.hotWaterMaxTemp);
    const hwMax = parseFloat(rules.hotWaterMax || 110);
    if (hw > hwMax)
      items.push({ domain:'D2', domainLabel:'Physical Environment', field:'Hot water temperature',
        status:'missing', standard:`Max ${hwMax}°F per ${center.state} regulations`,
        action:`Current temp ${hw}°F exceeds limit — adjust water heater thermostat` });
  }

  // ── D3 Personnel ──────────────────────────────────────────────────────────
  const bgValid = parseFloat(cr.bgValid || 0);
  const bgTotal = parseFloat(cr.bgTotal || 0);
  if (bgTotal > 0 && bgValid < bgTotal)
    items.push({ domain:'D3', domainLabel:'Personnel & Qualifications', field:'Background checks',
      status: bgValid/bgTotal < 0.8 ? 'missing' : 'atrisk',
      standard:`All staff must have ${rules.bgCheckType || 'state-required'} background check`,
      action:`${bgTotal - bgValid} staff member(s) missing background check — initiate checks immediately` });

  if (!per.directorEduLevel)
    items.push({ domain:'D3', domainLabel:'Personnel & Qualifications', field:'Director qualifications on file',
      status:'atrisk', standard: reg?.directorReq || 'Director must meet state education/experience requirements',
      action:'Upload director education credentials and experience documentation' });

  if (per.teacherEduMeetsReq === 'No')
    items.push({ domain:'D3', domainLabel:'Personnel & Qualifications', field:'Teacher qualifications',
      status:'missing', standard: reg?.teacherReq || 'Teachers must meet minimum qualification standards',
      action:'Review teacher credentials against state requirements; arrange additional training if needed' });

  const wreg = rules.workforceRegistry;
  if (wreg && wreg !== 'No') {
    const wStatus = cr.workforceRegistryDone || per.workforceRegistryStatus;
    if (!wStatus || wStatus === 'some' || wStatus === 'Not enrolled')
      items.push({ domain:'D3', domainLabel:'Personnel & Qualifications', field:'Workforce registry enrollment',
        status:'atrisk', standard:`${wreg} — all qualifying staff must be enrolled`,
        action:`Enroll all qualifying staff in ${wreg}` });
  }

  // ── D4 Ratios ─────────────────────────────────────────────────────────────
  const ratioGroups = [
    { key:'infant',    limit:reg?.infant,    label:'Infant' },
    { key:'toddler',   limit:reg?.toddler,   label:'Toddler' },
    { key:'preschool', limit:reg?.preschool, label:'Preschool' },
    { key:'schoolAge', limit:reg?.schoolAge, label:'School-age' },
  ];
  ratioGroups.forEach(({ key, limit, label }) => {
    const g = ratios[key] || {};
    if (g.staff > 0 && limit) {
      const ratio = parseFloat(g.children) / parseFloat(g.staff);
      if (ratio > limit)
        items.push({ domain:'D4', domainLabel:'Ratios & Supervision', field:`${label} ratio`,
          status:'missing', standard:`State max 1:${limit} for ${label.toLowerCase()}`,
          action:`Current ratio 1:${ratio.toFixed(1)} exceeds state max — add staff or reduce group size immediately` });
    }
  });

  if (ratios.signinLogMaintained === 'No')
    items.push({ domain:'D4', domainLabel:'Ratios & Supervision', field:'Sign-in/sign-out log',
      status:'missing', standard:'Daily attendance sign-in/out log required',
      action:'Implement daily sign-in/sign-out log for all children' });

  // ── D5 Staff Health & Training ────────────────────────────────────────────
  if (h.cprExpiryDate) {
    const d = daysUntil(h.cprExpiryDate);
    if (d !== null && d < 0)
      items.push({ domain:'D5', domainLabel:'Staff Health & Training', field:'CPR certification',
        status:'missing', standard:`CPR/First Aid certification required; renews every ${rules.cprRenewal || '2 years'}`,
        action:`CPR certification expired ${Math.abs(d)} days ago — schedule recertification immediately` });
    else if (d !== null && d < 30)
      items.push({ domain:'D5', domainLabel:'Staff Health & Training', field:'CPR certification expiry',
        status:'atrisk', standard:`CPR/First Aid must be current`,
        action:`CPR expires in ${d} days — schedule recertification now` });
  } else if (!h.cprCertValid || h.cprCertValid === 'No') {
    items.push({ domain:'D5', domainLabel:'Staff Health & Training', field:'CPR certification',
      status:'atrisk', standard:`CPR/First Aid required for all staff`,
      action:'Verify and record CPR certification status for all staff members' });
  }

  const trainingHrs = parseFloat(cr.trainingHrs) || 0;
  const reqHrs = reg?.trainingHrs || 0;
  if (reqHrs > 0 && trainingHrs < reqHrs)
    items.push({ domain:'D5', domainLabel:'Staff Health & Training', field:'Annual training hours',
      status: trainingHrs === 0 ? 'missing' : 'atrisk',
      standard:`${reqHrs} hours/year required per ${center.state} regulations`,
      action:`${trainingHrs} of ${reqHrs} hours completed — schedule additional training to meet annual requirement` });

  if (h.tbScreeningAllStaff === 'No')
    items.push({ domain:'D5', domainLabel:'Staff Health & Training', field:'TB screening',
      status:'missing', standard: rules.tbTestReq || 'TB screening required at hire',
      action:'Ensure all staff have current TB screening on file' });

  if (h.tbRenewalDueDate) {
    const d = daysUntil(h.tbRenewalDueDate);
    if (d !== null && d < 0)
      items.push({ domain:'D5', domainLabel:'Staff Health & Training', field:'TB renewal',
        status:'missing', standard:'TB re-screening required per state schedule',
        action:`TB renewal overdue by ${Math.abs(d)} days — schedule re-screening immediately` });
  }

  const mrRenewal = rules.mandatedReporterRenewal;
  const mrDone = cr.mandatedReporterDone;
  if (mrRenewal && mrRenewal !== 'No renewal required') {
    if (!mrDone || mrDone === 'some' || mrDone === 'none')
      items.push({ domain:'D5', domainLabel:'Staff Health & Training', field:'Mandated reporter training',
        status:'atrisk', standard:`Renewal required: ${mrRenewal}`,
        action:'Schedule mandated reporter training for all staff not yet completed' });
  }

  if (h.physicalExamOnFile !== 'Yes')
    items.push({ domain:'D5', domainLabel:'Staff Health & Training', field:'Staff physical exams',
      status:'atrisk', standard: rules.staffPhysical || 'Physical exam required at hire',
      action:'Collect and file physical examination records for all staff' });

  // ── D6 Children's Records ─────────────────────────────────────────────────
  const childChecks = [
    { key:'childRecordComplete',     label:'Child enrollment records', action:'Complete all child enrollment records in Data Entry → Children' },
    { key:'emergencyContactOnFile',  label:'Emergency contacts',       action:'Collect emergency contact information for all enrolled children' },
    { key:'authorizedPickupsOnFile', label:'Authorized pickups',       action:'Document authorized pick-up persons for all children' },
    { key:'childImmunizationOnFile', label:'Immunization records',     action:`Collect immunization records per ${center.state} requirements (exemptions: ${rules.immExemptions || 'medical only'})` },
    { key:'parentAgreementSigned',   label:'Parent agreements',        action:'Obtain signed parent agreement forms for all enrolled children' },
    { key:'allergyCarePlanOnFile',   label:'Allergy care plans',       action:'Create and file allergy care plans for all children with known allergies' },
  ];
  childChecks.forEach(({ key, label, action }) => {
    const val = ch[key];
    if (val === 'No')
      items.push({ domain:'D6', domainLabel:"Children's Records & Health", field:label,
        status:'missing', standard:'Required documentation for all enrolled children', action });
    else if (!val || val === '')
      items.push({ domain:'D6', domainLabel:"Children's Records & Health", field:label,
        status:'atrisk', standard:'Required documentation for all enrolled children',
        action:`Enter ${label.toLowerCase()} status in Data Entry → Children` });
  });

  // ── D7 Emergency & Safety ─────────────────────────────────────────────────
  if (em.fireEvacPlanOnFile === 'No')
    items.push({ domain:'D7', domainLabel:'Emergency & Safety', field:'Fire evacuation plan',
      status:'missing', standard:'Written fire evacuation plan required and posted',
      action:'Create and post fire evacuation plan; file copy in compliance records' });

  if (em.fireDrillLastDate) {
    const d = (today - new Date(em.fireDrillLastDate)) / 86400000;
    if (d > 35)
      items.push({ domain:'D7', domainLabel:'Emergency & Safety', field:'Fire drill',
        status:'missing', standard:`Fire drills required ${rules.fireDrillFreq || 'monthly'}`,
        action:`Last fire drill was ${Math.round(d)} days ago — conduct drill immediately and log it` });
  } else {
    items.push({ domain:'D7', domainLabel:'Emergency & Safety', field:'Fire drill log',
      status:'atrisk', standard:`${rules.fireDrillFreq || 'Monthly'} fire drills required`,
      action:'Record last fire drill date in Data Entry → Emergency & Safety' });
  }

  if (em.lockdownDrillLastDate) {
    const d = (today - new Date(em.lockdownDrillLastDate)) / 86400000;
    if (d > 200)
      items.push({ domain:'D7', domainLabel:'Emergency & Safety', field:'Lockdown drill',
        status:'atrisk', standard:`Lockdown drills required ${rules.lockdownDrill || '2x/year'}`,
        action:`Last lockdown drill was ${Math.round(d)} days ago — schedule drill` });
  } else {
    items.push({ domain:'D7', domainLabel:'Emergency & Safety', field:'Lockdown drill',
      status:'atrisk', standard:`Lockdown drills required ${rules.lockdownDrill || '2x/year'}`,
      action:'Record lockdown drill history in Data Entry → Emergency & Safety' });
  }

  if (em.emergencyPlanOnFile !== 'Yes')
    items.push({ domain:'D7', domainLabel:'Emergency & Safety', field:'Emergency preparedness plan',
      status:'atrisk', standard:'Written emergency plan required covering fire, weather, medical, lockdown',
      action:'Develop and file comprehensive emergency preparedness plan' });

  return items;
}

// ── Status colors ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  missing: { bg:'#fdf1f1', bd:'#e8a0a0', color:'#7f1d1d', label:'✗ Missing',  dot:'#b91c1c' },
  atrisk:  { bg:'#fdf4e7', bd:'#e6b87a', color:'#7c4a00', label:'⚠ At Risk',  dot:'#b45309' },
};

const PROGRESS_CFG = {
  open:       { bg:'#f1f5f9', bd:'#cbd5e1', color:'#475569', label:'Open'        },
  inprogress: { bg:'#eef4fc', bd:'#a8c4e0', color:'#1e5c8a', label:'In Progress' },
  resolved:   { bg:'#eef7f2', bd:'#a7d4ba', color:'#1e5c38', label:'✓ Resolved'  },
};

const DOMAIN_ORDER = ['D1','D2','D3','D4','D5','D6','D7'];

// ── Print styles injected once ────────────────────────────────────────────────
const PRINT_STYLE = `
@media print {
  body > * { display: none !important; }
  #cap-print-layer { display: block !important; position: static !important; }
  .cap-no-print { display: none !important; }
}
@media screen {
  #cap-print-layer { display: none !important; }
}
`;

export default function CorrectiveActionPlanTab({ center, reg, liveData }) {
  const enrichedCenter = { ...center, _liveData: liveData?.data || {} };
  const systemItems    = getActionableFields(enrichedCenter, reg);
  const inspectorItems = loadInspectorFindings(center.id);

  // Deduplicate: if an inspector item references the same field as a system item, prefer inspector
  const systemItemIds = new Set(systemItems.map(i => `${i.domain}_${i.field.replace(/\s+/g,'_')}`));
  const inspectorDedupe = inspectorItems.filter(i => {
    const sysKey = `${i.domain}_${i.field.replace(/\s+/g,'_')}`;
    return !systemItemIds.has(sysKey);
  });

  const allItems = [...inspectorItems.map(i => ({ ...i, _isInspector: true })), ...systemItems];

  const [overrides, setOverrides]       = useState(() => loadCAP(center.id));
  const [filterDomain, setFilterDomain] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterProgress, setFilterProgress] = useState('open');
  const [filterSource, setFilterSource] = useState('All');
  const [editingId, setEditingId]       = useState(null);
  const [editForm, setEditForm]         = useState({});
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => { saveCAP(center.id, overrides); }, [center.id, overrides]);

  // Build merged item list: auto-generated + override data
  const items = allItems.map((item, idx) => {
    const id = `${item.domain}_${item.field.replace(/\s+/g,'_')}`;
    const ov = overrides[id] || {};
    return {
      ...item,
      id,
      idx,
      assignedTo: ov.assignedTo || '',
      dueDate:    ov.dueDate    || '',
      progress:   ov.progress   || 'open',
      notes:      ov.notes      || '',
    };
  });

  const openItems     = items.filter(i => i.progress !== 'resolved');
  const resolvedItems = items.filter(i => i.progress === 'resolved');

  // Filter open items
  const filteredOpen = openItems.filter(i => {
    if (filterDomain !== 'All' && i.domain !== filterDomain) return false;
    if (filterStatus !== 'All' && i.status !== filterStatus) return false;
    if (filterProgress !== 'All' && i.progress !== filterProgress) return false;
    if (filterSource === 'inspector' && !i._isInspector) return false;
    if (filterSource === 'system' && i._isInspector) return false;
    return true;
  });

  const updateOverride = useCallback((id, fields) => {
    setOverrides(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), ...fields },
    }));
  }, []);

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ assignedTo: item.assignedTo, dueDate: item.dueDate, notes: item.notes });
  };

  const saveEdit = (id) => {
    updateOverride(id, editForm);
    setEditingId(null);
  };

  const setProgress = (id, progress) => updateOverride(id, { progress });

  // Summary counts
  const missingCount    = openItems.filter(i => i.status === 'missing').length;
  const atRiskCount     = openItems.filter(i => i.status === 'atrisk').length;
  const inProgressCount = openItems.filter(i => i.progress === 'inprogress').length;
  const resolvedCount   = resolvedItems.length;
  const totalCount      = items.length;

  // Domain groupings for filter
  const domainLabels = {
    D1:'Licensing & Admin', D2:'Physical Environment', D3:'Personnel',
    D4:'Ratios & Supervision', D5:'Staff Health & Training',
    D6:"Children's Records", D7:'Emergency & Safety',
  };

  // Inject print styles once
  useEffect(() => {
    if (!document.getElementById('cap-print-style')) {
      const s = document.createElement('style');
      s.id = 'cap-print-style';
      s.textContent = PRINT_STYLE;
      document.head.appendChild(s);
    }
  }, []);

  const handlePrint = () => {
    if (!document.getElementById('cap-print-layer')) {
      const layer = document.createElement('div');
      layer.id = 'cap-print-layer';
      document.body.appendChild(layer);
    }
    const source = document.getElementById('cap-print-root');
    const layer  = document.getElementById('cap-print-layer');
    if (source && layer) layer.innerHTML = source.innerHTML;
    window.print();
  };

  return (
    <div id="cap-print-root">
      {/* ── Header ── */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12,
        padding:'18px 20px', marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
          <div>
            <h3 style={{ fontSize:15, fontWeight:700, color:'#0f172a', margin:'0 0 3px' }}>
              Corrective Action Plan — {center.name}
            </h3>
            <p style={{ fontSize:12.5, color:'#64748b', margin:0 }}>
              Auto-generated from compliance fields + inspector findings ·
              <span style={{ color:'#64748b' }}> Export label: <em>Corrective Action Plan</em></span>
            </p>
          </div>
          <div style={{ display:'flex', gap:8 }} className="cap-no-print">
            <button onClick={handlePrint} style={{
              display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8,
              border:'1px solid #e2e8f0', background:'#f8fafc', color:'#374151',
              fontSize:13, fontWeight:500, cursor:'pointer',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print / Export PDF
            </button>
          </div>
        </div>

        {/* ── KPI strip ── */}
        <div style={{ display:'flex', gap:12, marginTop:14, flexWrap:'wrap' }}>
          {[
            { label:'Total items',      val:totalCount,          color:'#475569', bg:'#f1f5f9', bd:'#cbd5e1' },
            { label:'Missing',          val:missingCount,        color:'#7f1d1d', bg:'#fdf1f1', bd:'#e8a0a0' },
            { label:'At Risk',          val:atRiskCount,         color:'#7c4a00', bg:'#fdf4e7', bd:'#e6b87a' },
            { label:'Inspector',        val:inspectorItems.length, color:'#4f5fa8', bg:'#f0f2ff', bd:'#c5cbee' },
            { label:'In Progress',      val:inProgressCount,     color:'#1e5c8a', bg:'#eef4fc', bd:'#a8c4e0' },
            { label:'Resolved',         val:resolvedCount,       color:'#1e5c38', bg:'#eef7f2', bd:'#a7d4ba' },
          ].map(({ label, val, color, bg, bd }) => (
            <div key={label} style={{ background:bg, border:`1px solid ${bd}`, borderRadius:10,
              padding:'10px 16px', textAlign:'center', minWidth:90 }}>
              <div style={{ fontSize:22, fontWeight:700, color, lineHeight:1 }}>{val}</div>
              <div style={{ fontSize:11, color, marginTop:3, fontWeight:500 }}>{label}</div>
            </div>
          ))}
          {/* Progress bar */}
          {totalCount > 0 && (
            <div style={{ flex:1, minWidth:180, display:'flex', flexDirection:'column', justifyContent:'center', gap:4 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11.5, color:'#64748b' }}>
                <span>Readiness progress</span>
                <span style={{ fontWeight:600, color: resolvedCount/totalCount >= 0.8 ? '#2d7a4f' : resolvedCount/totalCount >= 0.5 ? '#b45309' : '#b91c1c' }}>
                  {Math.round((resolvedCount/totalCount)*100)}%
                </span>
              </div>
              <div style={{ height:8, background:'#e2e8f0', borderRadius:4, overflow:'hidden' }}>
                <div style={{
                  height:'100%', borderRadius:4, transition:'width 0.4s',
                  width:`${Math.round((resolvedCount/totalCount)*100)}%`,
                  background: resolvedCount/totalCount >= 0.8 ? '#2d7a4f' : resolvedCount/totalCount >= 0.5 ? '#b45309' : '#b91c1c',
                }}/>
              </div>
              <div style={{ fontSize:11, color:'#94a3b8' }}>
                {resolvedCount} of {totalCount} items resolved
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Inspector findings banner ── */}
      {inspectorItems.length > 0 && (
        <div style={{ background:'#f0f2ff', border:'1px solid #c5cbee', borderRadius:10,
          padding:'12px 16px', marginBottom:12, display:'flex', alignItems:'center', gap:12 }}
          className="cap-no-print">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f5fa8" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          <div style={{ flex:1 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'#4f5fa8' }}>
              {inspectorItems.length} finding{inspectorItems.length > 1 ? 's' : ''} from last inspection
            </span>
            <span style={{ fontSize:12.5, color:'#64748b', marginLeft:8 }}>
              — {inspectorItems.filter(i => i.inspectorStatus === 'noncompliant').length} non-compliant,{' '}
              {inspectorItems.filter(i => i.inspectorStatus === 'atrisk').length} at risk
            </span>
          </div>
          <button onClick={() => setFilterSource(filterSource === 'inspector' ? 'All' : 'inspector')}
            style={{ padding:'4px 12px', borderRadius:6, fontSize:12, fontWeight:500, cursor:'pointer',
              border:'1px solid #c5cbee', background: filterSource === 'inspector' ? '#4f5fa8' : '#fff',
              color: filterSource === 'inspector' ? '#fff' : '#4f5fa8', fontFamily:'inherit' }}>
            {filterSource === 'inspector' ? 'Show all' : 'Show inspector only'}
          </button>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="cap-no-print" style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:12, color:'#94a3b8', fontWeight:600 }}>FILTER</span>

        <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)}
          style={{ fontSize:12.5, padding:'5px 10px', borderRadius:7, border:'1px solid #e2e8f0',
            background:'#fff', color:'#374151', cursor:'pointer' }}>
          <option value="All">All domains</option>
          {DOMAIN_ORDER.map(d => <option key={d} value={d}>{d} — {domainLabels[d]}</option>)}
        </select>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ fontSize:12.5, padding:'5px 10px', borderRadius:7, border:'1px solid #e2e8f0',
            background:'#fff', color:'#374151', cursor:'pointer' }}>
          <option value="All">All statuses</option>
          <option value="missing">Missing only</option>
          <option value="atrisk">At Risk only</option>
        </select>

        <select value={filterProgress} onChange={e => setFilterProgress(e.target.value)}
          style={{ fontSize:12.5, padding:'5px 10px', borderRadius:7, border:'1px solid #e2e8f0',
            background:'#fff', color:'#374151', cursor:'pointer' }}>
          <option value="All">All progress states</option>
          <option value="open">Open only</option>
          <option value="inprogress">In Progress only</option>
        </select>

        <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
          style={{ fontSize:12.5, padding:'5px 10px', borderRadius:7, border:'1px solid #e2e8f0',
            background:'#fff', color:'#374151', cursor:'pointer' }}>
          <option value="All">All sources</option>
          <option value="inspector">Inspector findings</option>
          <option value="system">System generated</option>
        </select>

        {(filterDomain !== 'All' || filterStatus !== 'All' || filterProgress !== 'All' || filterSource !== 'All') && (
          <button onClick={() => { setFilterDomain('All'); setFilterStatus('All'); setFilterProgress('All'); setFilterSource('All'); }}
            style={{ fontSize:12, color:'#b45309', background:'none', border:'none',
              cursor:'pointer', fontWeight:600, padding:'4px 8px' }}>
            Clear filters
          </button>
        )}

        <span style={{ fontSize:12, color:'#94a3b8', marginLeft:'auto' }}>
          Showing {filteredOpen.length} of {openItems.length} open items
        </span>
      </div>

      {/* ── Open items table ── */}
      {filteredOpen.length === 0 ? (
        <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12,
          padding:'32px', textAlign:'center' }}>
          {openItems.length === 0 ? (
            <>
              <div style={{ fontSize:28, marginBottom:8 }}>✓</div>
              <div style={{ fontSize:15, fontWeight:600, color:'#2d7a4f', marginBottom:4 }}>
                No open action items
              </div>
              <div style={{ fontSize:13, color:'#64748b' }}>
                All compliance fields are currently showing Compliant or No Data status.
              </div>
            </>
          ) : (
            <div style={{ fontSize:13.5, color:'#64748b' }}>
              No items match the current filters.
            </div>
          )}
        </div>
      ) : (
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden', marginBottom:16 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                {['Domain', 'Field', 'Status', 'Required Standard', 'Action Needed', 'Assigned To', 'Due Date', 'Progress'].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'10px 14px', fontSize:11,
                    fontWeight:700, color:'#94a3b8', letterSpacing:'0.04em', whiteSpace:'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOpen.map((item, i) => {
                const sc = STATUS_CFG[item.status] || STATUS_CFG.atrisk;
                const pc = PROGRESS_CFG[item.progress] || PROGRESS_CFG.open;
                const isEditing = editingId === item.id;

                return (
                  <tr key={item.id} style={{
                    borderBottom:'1px solid #f1f5f9',
                    background: i % 2 === 0 ? '#fff' : '#fafbfc',
                    verticalAlign:'top',
                  }}>
                    {/* Domain */}
                    <td style={{ padding:'12px 14px', whiteSpace:'nowrap' }}>
                      <span style={{ fontSize:11.5, fontWeight:700, color:'#94a3b8' }}>{item.domain}</span>
                      <div style={{ fontSize:10.5, color:'#94a3b8', marginTop:1 }}>{item.domainLabel}</div>
                    </td>

                    {/* Field */}
                    <td style={{ padding:'12px 14px', fontWeight:500, color:'#1e293b', maxWidth:160 }}>
                      {item.field}
                      {item._isInspector && (
                        <div style={{ marginTop:4 }}>
                          <span style={{ fontSize:10.5, fontWeight:600, padding:'2px 7px', borderRadius:20,
                            background:'#f0f2ff', color:'#4f5fa8', border:'1px solid #c5cbee' }}>
                            Inspector
                          </span>
                        </div>
                      )}
                      {!item._isInspector && (
                        <div style={{ marginTop:4 }}>
                          <span style={{ fontSize:10.5, fontWeight:600, padding:'2px 7px', borderRadius:20,
                            background:'#f1f5f9', color:'#64748b', border:'1px solid #e2e8f0' }}>
                            System
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding:'12px 14px', whiteSpace:'nowrap' }}>
                      <span style={{ fontSize:11.5, fontWeight:600, padding:'3px 9px', borderRadius:20,
                        background:sc.bg, color:sc.color, border:`1px solid ${sc.bd}`, whiteSpace:'nowrap' }}>
                        {sc.label}
                      </span>
                    </td>

                    {/* Standard */}
                    <td style={{ padding:'12px 14px', color:'#374151', maxWidth:200, fontSize:12.5 }}>
                      {item.standard}
                    </td>

                    {/* Action */}
                    <td style={{ padding:'12px 14px', color:'#1e293b', maxWidth:220, fontSize:12.5 }}>
                      {item.action}
                      {/* Notes display */}
                      {!isEditing && item.notes && (
                        <div style={{ fontSize:11.5, color:'#64748b', marginTop:4, fontStyle:'italic',
                          borderTop:'1px solid #f1f5f9', paddingTop:4 }}>
                          Note: {item.notes}
                        </div>
                      )}
                    </td>

                    {/* Assigned To */}
                    <td style={{ padding:'12px 14px', minWidth:130 }}>
                      {isEditing ? (
                        <input value={editForm.assignedTo}
                          onChange={e => setEditForm(f => ({ ...f, assignedTo:e.target.value }))}
                          placeholder="Name or role"
                          style={{ width:'100%', padding:'5px 8px', borderRadius:6,
                            border:'1px solid #cbd5e1', fontSize:12.5, outline:'none' }}/>
                      ) : (
                        <span style={{ fontSize:12.5, color: item.assignedTo ? '#1e293b' : '#94a3b8' }}>
                          {item.assignedTo || '—'}
                        </span>
                      )}
                    </td>

                    {/* Due Date */}
                    <td style={{ padding:'12px 14px', minWidth:120 }}>
                      {isEditing ? (
                        <input type="date" value={editForm.dueDate}
                          onChange={e => setEditForm(f => ({ ...f, dueDate:e.target.value }))}
                          style={{ padding:'5px 8px', borderRadius:6, border:'1px solid #cbd5e1',
                            fontSize:12.5, outline:'none' }}/>
                      ) : (
                        <span style={{ fontSize:12.5, color: item.dueDate ? '#1e293b' : '#94a3b8' }}>
                          {item.dueDate
                            ? new Date(item.dueDate + 'T00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
                            : '—'}
                        </span>
                      )}
                    </td>

                    {/* Progress + actions */}
                    <td style={{ padding:'12px 14px', minWidth:140 }}>
                      {isEditing ? (
                        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                          <textarea value={editForm.notes}
                            onChange={e => setEditForm(f => ({ ...f, notes:e.target.value }))}
                            placeholder="Add a note..."
                            rows={2}
                            style={{ width:'100%', padding:'5px 8px', borderRadius:6,
                              border:'1px solid #cbd5e1', fontSize:12, resize:'vertical', outline:'none' }}/>
                          <div style={{ display:'flex', gap:6 }}>
                            <button onClick={() => saveEdit(item.id)} style={{
                              flex:1, padding:'5px 8px', borderRadius:6, border:'none',
                              background:'#2d7a4f', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                              Save
                            </button>
                            <button onClick={() => setEditingId(null)} style={{
                              flex:1, padding:'5px 8px', borderRadius:6,
                              border:'1px solid #e2e8f0', background:'#fff', color:'#374151',
                              fontSize:12, cursor:'pointer' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                          {/* Progress badge */}
                          <span style={{ fontSize:11.5, fontWeight:600, padding:'3px 9px', borderRadius:20,
                            background:pc.bg, color:pc.color, border:`1px solid ${pc.bd}`,
                            width:'fit-content' }}>
                            {pc.label}
                          </span>
                          {/* Action buttons */}
                          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }} className="cap-no-print">
                            {item.progress === 'open' && (
                              <button onClick={() => setProgress(item.id, 'inprogress')} style={{
                                padding:'3px 8px', fontSize:11, borderRadius:5,
                                border:'1px solid #a8c4e0', background:'#eef4fc',
                                color:'#1e5c8a', cursor:'pointer', fontWeight:500 }}>
                                → In Progress
                              </button>
                            )}
                            {item.progress === 'inprogress' && (
                              <button onClick={() => setProgress(item.id, 'resolved')} style={{
                                padding:'3px 8px', fontSize:11, borderRadius:5,
                                border:'1px solid #a7d4ba', background:'#eef7f2',
                                color:'#1e5c38', cursor:'pointer', fontWeight:500 }}>
                                ✓ Resolve
                              </button>
                            )}
                            {item.progress !== 'open' && (
                              <button onClick={() => setProgress(item.id, 'open')} style={{
                                padding:'3px 8px', fontSize:11, borderRadius:5,
                                border:'1px solid #e2e8f0', background:'#f8fafc',
                                color:'#94a3b8', cursor:'pointer' }}>
                                Reopen
                              </button>
                            )}
                            <button onClick={() => startEdit(item)} style={{
                              padding:'3px 8px', fontSize:11, borderRadius:5,
                              border:'1px solid #e2e8f0', background:'#f8fafc',
                              color:'#475569', cursor:'pointer' }}>
                              ✎ Edit
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Resolved / Completed Log ── */}
      <div style={{ marginTop:8 }}>
        <button onClick={() => setShowCompleted(v => !v)} style={{
          display:'flex', alignItems:'center', gap:8, background:'none', border:'none',
          cursor:'pointer', padding:'8px 0', fontFamily:'inherit',
        }} className="cap-no-print">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"
            style={{ transform: showCompleted ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          <span style={{ fontSize:13, fontWeight:600, color:'#2d7a4f' }}>
            Completed log ({resolvedCount} resolved items)
          </span>
        </button>

        {showCompleted && resolvedItems.length > 0 && (
          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12,
            overflow:'hidden', marginTop:8, opacity:0.85 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
              <thead>
                <tr style={{ background:'#eef7f2', borderBottom:'1px solid #a7d4ba' }}>
                  {['Domain', 'Field', 'Status', 'Action Taken', 'Assigned To', 'Due Date'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'9px 14px', fontSize:11,
                      fontWeight:700, color:'#1e5c38', letterSpacing:'0.04em' }}>
                      {h}
                    </th>
                  ))}
                  <th style={{ padding:'9px 14px', fontSize:11, fontWeight:700, color:'#1e5c38' }}></th>
                </tr>
              </thead>
              <tbody>
                {resolvedItems.map(item => {
                  const sc = STATUS_CFG[item.status] || STATUS_CFG.atrisk;
                  return (
                    <tr key={item.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ fontSize:11.5, fontWeight:700, color:'#94a3b8' }}>{item.domain}</span>
                      </td>
                      <td style={{ padding:'10px 14px', color:'#374151', fontWeight:500 }}>
                        {item.field}
                        {item.notes && <div style={{ fontSize:11, color:'#94a3b8', fontStyle:'italic', marginTop:2 }}>{item.notes}</div>}
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20,
                          background:sc.bg, color:sc.color, border:`1px solid ${sc.bd}` }}>
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ padding:'10px 14px', color:'#374151', fontSize:12 }}>{item.action}</td>
                      <td style={{ padding:'10px 14px', color: item.assignedTo ? '#374151' : '#94a3b8' }}>
                        {item.assignedTo || '—'}
                      </td>
                      <td style={{ padding:'10px 14px', color: item.dueDate ? '#374151' : '#94a3b8' }}>
                        {item.dueDate
                          ? new Date(item.dueDate + 'T00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
                          : '—'}
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <button onClick={() => setProgress(item.id, 'open')}
                          className="cap-no-print"
                          style={{ fontSize:11, padding:'3px 8px', borderRadius:5,
                            border:'1px solid #e2e8f0', background:'#f8fafc',
                            color:'#94a3b8', cursor:'pointer' }}>
                          Reopen
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {showCompleted && resolvedItems.length === 0 && (
          <div style={{ fontSize:13, color:'#94a3b8', padding:'12px 0' }}>
            No resolved items yet.
          </div>
        )}
      </div>

      {/* ── Print header (hidden on screen) ── */}
      <div style={{ display:'none' }} id="cap-print-header">
        <h2>Corrective Action Plan</h2>
        <p>{center.name} · {center.city}, {center.state} · Generated {new Date().toLocaleDateString()}</p>
        <p>Total items: {totalCount} · Missing: {missingCount} · At Risk: {atRiskCount} · Resolved: {resolvedCount}</p>
      </div>
    </div>
  );
}

import { getReg } from './regulations';

export function hasData(data) {
  data = normalizeData(data);
  if (!data || !data.lastUpdated) return false;
  const checks = [
    Object.values(data.ratios || {}).some(g => g && (g.children > 0 || g.staff > 0)),
    Object.values(data.staffCredentials || {}).some(v => v !== '' && v !== null),
    Object.values(data.centerFacility || {}).some(v => v !== '' && v !== null),
    Object.values(data.centerLicensing || {}).some(v => v !== '' && v !== null),
    Object.values(data.licensing || {}).some(v => v !== '' && v !== null),
    Object.values(data.physical || {}).some(v => v !== '' && v !== null),
    Object.values(data.personnel || {}).some(v => v !== '' && v !== null),
    Object.values(data.staffHealth || {}).some(v => v !== '' && v !== null),
    Object.values(data.children || {}).some(v => v !== '' && v !== null),
    Object.values(data.emergency || {}).some(v => v !== '' && v !== null),
    (data.staffList || []).length > 0,
  ];
  return checks.some(Boolean);
}

function pct(num, den) { return den > 0 ? Math.round((num/den)*100) : null; }
function yn(val)        { return val === 'Yes' ? 1 : val ? 0 : null; }

// ── Domain 1: Licensing & Administration ────────────────────────────────────
function scoreD1(data, reg) {
  const lic = data.licensing || {};
  const legacy = data.centerLicensing || {};
  let pts = 0, max = 0;

  // License number on file (10pts)
  max += 10;
  if (lic.licenseNumber) pts += 10;

  // License expiry not expired (15pts)
  max += 15;
  if (lic.licenseExpiry) {
    const diff = (new Date(lic.licenseExpiry) - new Date()) / 86400000;
    if (diff > 90)  pts += 15;
    else if (diff > 0) pts += 8;
  }

  // License cert on file (10pts)
  max += 10;
  if (lic.licCertOnFile === 'Yes') pts += 10;

  // Insurance: GL policy + expiry (15pts)
  max += 15;
  if (lic.insurancePolicyNum) pts += 5;
  if (lic.insuranceExpiry) {
    const diff = (new Date(lic.insuranceExpiry) - new Date()) / 86400000;
    if (diff > 30) pts += 10;
    else if (diff > 0) pts += 5;
  }

  // Last inspection not overdue (15pts)
  max += 15;
  const inspDate = lic.lastInspectionDate || legacy.lastInspection;
  if (inspDate) {
    const days = (new Date() - new Date(inspDate)) / 86400000;
    const threshold = 365 / (reg.inspPerYear || 1);
    if (days <= threshold + 30) pts += 15;
    else if (days <= threshold + 90) pts += 7;
  }

  // Inspection result (10pts)
  max += 10;
  if (lic.lastInspectionResult?.startsWith('Pass')) pts += 10;
  else if (lic.lastInspectionResult) pts += 3;

  // Workers comp on file (10pts)
  max += 10;
  if (lic.workersCompExpiry) {
    const diff = (new Date(lic.workersCompExpiry) - new Date()) / 86400000;
    if (diff > 0) pts += 10;
  }

  // QRIS enrolled (10pts — bonus)
  max += 10;
  if (lic.qrisStatus?.includes('rated') || lic.qrisStatus?.includes('Enrolled')) pts += 10;

  // COI on file (5pts)
  max += 5;
  if (lic.coiOnFile === 'Yes') pts += 5;

  return pct(pts, max);
}

// ── Domain 2: Physical Environment ──────────────────────────────────────────
function scoreD2(data, reg) {
  const phy = data.physical || {};
  const fac = data.centerFacility || {};
  let pts = 0, max = 0;
  const cap = parseFloat(phy.capacity || fac.capacity) || 0;

  // Indoor space (20pts)
  max += 20;
  const indoor = parseFloat(phy.indoorSqft || fac.indoorSqft);
  if (!isNaN(indoor) && cap > 0) {
    pts += (indoor/cap) >= reg.indoorSqft ? 20 : (indoor/cap) >= reg.indoorSqft * 0.9 ? 12 : 5;
  }

  // Outdoor space (20pts)
  max += 20;
  const outdoor = parseFloat(phy.outdoorSqft || fac.outdoorSqft);
  if (!isNaN(outdoor) && cap > 0) {
    pts += (outdoor/cap) >= reg.outdoorSqft ? 20 : (outdoor/cap) >= reg.outdoorSqft * 0.9 ? 12 : 5;
  }

  // CO detector (15pts)
  max += 15;
  const co = phy.coDetectorInstalled || fac.coDetectorInstalled;
  if (co === 'Yes') pts += 15;
  else if (co === 'In progress') pts += 5;

  // Smoke detector (10pts)
  max += 10;
  if (phy.smokeDetectorInstalled === 'Yes') pts += 10;

  // Fire extinguisher current (10pts)
  max += 10;
  if (phy.fireExtinguisherCurrent === 'Yes') pts += 10;

  // First aid kit (10pts)
  max += 10;
  if (phy.firstAidKitPresent === 'Yes') pts += 10;

  // Fencing (10pts)
  max += 10;
  const fenceOk = phy.fencingEnclosesPlayArea || fac.fencingCompliant;
  if (fenceOk === 'Yes') {
    const minH = parseFloat(reg.rules?.minFencingHeight || 4);
    const h = parseFloat(phy.fencingHeightFt);
    pts += (!isNaN(h) ? (h >= minH ? 10 : 5) : 8);
  }

  // Hot water (5pts)
  max += 5;
  const hwMax = parseFloat(reg.rules?.hotWaterMax || 110);
  const hw = parseFloat(phy.hotWaterMaxTemp);
  if (!isNaN(hw) && hw <= hwMax) pts += 5;

  return pct(pts, max);
}

// ── Domain 3: Personnel & Qualifications ────────────────────────────────────
function scoreD3(data, reg) {
  const per = data.personnel || {};
  const cr  = data.staffCredentials || {};
  let pts = 0, max = 0;

  // BG checks (30pts)
  max += 30;
  const bgV = parseFloat(cr.bgValid || 0);
  const bgT = parseFloat(cr.bgTotal || 0);
  if (bgT > 0) pts += Math.min(20, (bgV/bgT)*20);
  if (per.fbiClearance === 'Yes') pts += 5;
  if (per.childAbuseRegistryDate === 'Yes') pts += 5;

  // Director qualifications on file (25pts)
  max += 25;
  if (per.directorName) pts += 5;
  if (per.directorEduLevel) pts += 10;
  if (per.directorYearsExp) pts += 10;

  // Teacher qualifications (20pts)
  max += 20;
  if (per.teacherEduMeetsReq === 'Yes') pts += 15;
  if (per.teacherMinAgeCompliant === 'Yes') pts += 5;

  // Admin designation on file (10pts)
  max += 10;
  if (per.adminDesignationOnFile === 'Yes') pts += 10;

  // Workforce registry (15pts)
  max += 15;
  const wreg = reg.rules?.workforceRegistry;
  if (!wreg || wreg === 'No') {
    pts += 15; // not required
  } else {
    const status = cr.workforceRegistryDone || per.workforceRegistryStatus;
    if (status === 'all' || status?.includes('All')) pts += 15;
    else if (status === 'most' || status?.includes('Most')) pts += 10;
    else if (status === 'some' || status?.includes('Some')) pts += 5;
  }

  return pct(pts, max);
}

// ── Domain 4: Ratios & Supervision ──────────────────────────────────────────
function scoreD4(data, reg) {
  const ratios = data.ratios || {};
  let pts = 0, max = 0;

  const groups = [
    { key:'infant',    limit:reg.infant    },
    { key:'toddler',   limit:reg.toddler   },
    { key:'preschool', limit:reg.preschool },
    { key:'schoolAge', limit:reg.schoolAge },
  ];

  groups.forEach(({ key, limit }) => {
    const g = ratios[key] || {};
    max += 15;
    if (g.staff > 0) {
      const ratio = parseFloat(g.children) / parseFloat(g.staff);
      if (ratio <= limit) pts += 15;
      else if (ratio <= limit * 1.1) pts += 8;
    } else {
      pts += 15; // no children in this group = compliant
    }
  });

  // Sign-in log (10pts)
  max += 10;
  if (ratios.signinLogMaintained === 'Yes') pts += 10;

  // Group sizes (10pts)
  max += 10;
  const gsKeys = ['groupSizeInfant','groupSizeToddler','groupSizePreschool','groupSizeSchoolAge'];
  const limits  = [reg.infant*2, reg.toddler*2, reg.preschool*2, reg.schoolAge*2];
  let gsPass = 0;
  gsKeys.forEach((k, i) => {
    if (!ratios[k]) { gsPass++; return; } // not entered = assume ok
    if (parseFloat(ratios[k]) <= limits[i]) gsPass++;
  });
  pts += Math.round((gsPass/4)*10);

  return pct(pts, max);
}

// ── Domain 5: Staff Health & Training ───────────────────────────────────────
function scoreD5(data, reg) {
  const h  = data.staffHealth  || {};
  const cr = data.staffCredentials || {};
  let pts = 0, max = 0;

  // Annual training (25pts)
  max += 25;
  const tHrs = parseFloat(cr.trainingHrs) || 0;
  if (tHrs >= reg.trainingHrs) pts += 25;
  else if (tHrs > 0) pts += Math.round((tHrs/reg.trainingHrs)*25);

  // Physical exams (15pts)
  max += 15;
  const physOk = parseFloat(cr.physicalOnFile) || 0;
  const bgT = parseFloat(cr.bgTotal) || 0;
  if (h.physicalExamOnFile === 'Yes') pts += 15;
  else if (bgT > 0 && physOk > 0) pts += Math.min(15, Math.round((physOk/bgT)*15));

  // CPR (15pts)
  max += 15;
  if (h.cprCertValid === 'Yes') {
    const expiry = h.cprExpiryDate ? (new Date(h.cprExpiryDate) - new Date())/86400000 : 1;
    pts += expiry > 0 ? 15 : 0;
  }

  // TB screening (10pts)
  max += 10;
  if (h.tbScreeningAllStaff === 'Yes') {
    const tbRenewal = reg.rules?.tbTestReq;
    if (tbRenewal?.includes('2 year') && h.tbRenewalDueDate) {
      const diff = (new Date(h.tbRenewalDueDate) - new Date())/86400000;
      pts += diff > 0 ? 10 : 0;
    } else {
      pts += 10;
    }
  }

  // Mandated reporter (10pts)
  max += 10;
  const mrDone = cr.mandatedReporterDone;
  if (mrDone === 'all' || mrDone === 'All staff completed') pts += 10;
  else if (mrDone === 'most') pts += 6;
  else if (mrDone === 'some') pts += 3;

  // Orientation (10pts)
  max += 10;
  if (h.newHireOrientationCompleted === 'Yes') pts += 10;

  // Training log on file (5pts)
  max += 5;
  if (h.trainingLogOnFile === 'Yes') pts += 5;

  // Staff physical limitations handled (5pts) — bonus for thoroughness
  max += 5;
  pts += 3; // baseline assumed unless flagged

  return pct(pts, max);
}

// ── Domain 6: Children's Records & Health ───────────────────────────────────
function scoreD6(data, reg) {
  const ch = data.children || {};
  const fh = data.familyHealth || {};
  const fi = data.familyImmunizations || {};
  const fa = data.familyAllergies || {};
  let pts = 0, max = 0;

  const checks = [
    [ch.childRecordComplete,      20, 'Child records complete'],
    [ch.emergencyContactOnFile,   15, 'Emergency contacts'],
    [ch.authorizedPickupsOnFile,  10, 'Authorized pickups'],
    [ch.childAllergiesOnFile,     10, 'Allergy documentation'],
    [ch.allergyCarePlanOnFile,    10, 'Allergy care plans'],
    [ch.childImmunizationOnFile,  15, 'Immunization records'],
    [ch.parentAgreementSigned,    10, 'Parent agreement signed'],
    [ch.emergencyCareAuthSigned,  10, 'Emergency care auth'],
  ];

  checks.forEach(([val, w]) => {
    max += w;
    if (val === 'Yes') pts += w;
    else if (val === 'In progress') pts += Math.round(w/2);
  });

  // Safe sleep (if infant program)
  max += 10;
  if (ch.safeSleepPlanOnFile === 'Yes') pts += 5;
  if (ch.napLog15Min === 'Yes') pts += 5;

  // Medication log
  max += 5;
  if (ch.medLogMaintained === 'Yes') pts += 5;
  else if (ch.medLogMaintained === 'Not applicable') pts += 5;

  // Legacy family data
  const famChecks = Object.values(fh).filter(v=>v==='Yes').length;
  const famTotal  = Object.values(fh).filter(v=>v!=='').length;
  if (famTotal > 0) {
    max += 15;
    pts += Math.round((famChecks/famTotal)*15);
  }

  return pct(pts, max);
}

// ── Domain 7: Emergency & Safety ────────────────────────────────────────────
function scoreD7(data, reg) {
  const em = data.emergency || {};
  const rules = reg.rules || {};
  let pts = 0, max = 0;

  // Fire drill (25pts)
  max += 25;
  if (em.fireEvacPlanOnFile === 'Yes') pts += 8;
  if (em.fireEvacPlanPosted === 'Yes') pts += 5;
  if (em.fireDrillLastDate) {
    const days = (new Date()-new Date(em.fireDrillLastDate))/86400000;
    pts += days <= 35 ? 12 : days <= 50 ? 6 : 0;
  }

  // Tornado drill (15pts)
  max += 15;
  if (rules.tornadoDrill === 'Not required') {
    pts += 15; // N/A state — full credit
  } else if (em.tornadoDrillLastDate) {
    const days = (new Date()-new Date(em.tornadoDrillLastDate))/86400000;
    const limit = rules.tornadoDrill === 'Monthly' ? 35 : 200;
    pts += days <= limit ? 15 : 5;
  }

  // Lockdown drill (15pts)
  max += 15;
  if (em.lockdownDrillLastDate) {
    const days = (new Date()-new Date(em.lockdownDrillLastDate))/86400000;
    pts += days <= 200 ? 15 : 5;
  }

  // Emergency plan (20pts)
  max += 20;
  if (em.emergencyPlanOnFile === 'Yes') pts += 10;
  const scenarioKeys = ['emergencyPlanFireCovered','emergencyPlanWeatherCovered','emergencyPlanMedicalCovered','emergencyPlanLockdownCovered','emergencyPlanStaffTrained'];
  const scenarioPts = scenarioKeys.filter(k=>em[k]==='Yes').length;
  pts += Math.round((scenarioPts/5)*10);

  // Annual fire inspection (10pts)
  max += 10;
  if (em.annualFireInspOnFile === 'Yes') pts += 5;
  if (em.annualFireInspDate) {
    const days = (new Date()-new Date(em.annualFireInspDate))/86400000;
    pts += days <= 400 ? 5 : 0;
  }

  // Drill log (5pts)
  max += 5;
  if (em.drillLogMaintained === 'Yes') pts += 5;

  // Water safety (5pts)
  max += 5;
  if (em.bodiesOfWaterOnPremises === 'No') pts += 5;
  else if (em.drowningPreventionPlanOnFile === 'Yes') pts += 5;

  return pct(pts, max);
}

// ── Master compliance calculator ─────────────────────────────────────────────
// ── Normalize flat DataEntry data into section-keyed format ──────────────────
// DataEntryTab saves everything flat under data.data.{key}
// compliance engine reads from data.licensing.{key}, data.physical.{key} etc.
// This function merges the flat keys into the right sections.
function normalizeData(data) {
  const flat = data.data || {};
  if (Object.keys(flat).length === 0) return data; // nothing to merge

  return {
    ...data,
    licensing: {
      ...( data.licensing || {} ),
      licenseNumber:       flat.licenseNumber        ?? (data.licensing||{}).licenseNumber,
      licenseExpiry:       flat.licenseExpiry        ?? (data.licensing||{}).licenseExpiry,
      licCertOnFile:       flat.licenseCertOnFile    ?? (data.licensing||{}).licCertOnFile,
      insurancePolicyNum:  flat.glPolicyNumber       ?? (data.licensing||{}).insurancePolicyNum,
      insuranceExpiry:     flat.glExpiry             ?? (data.licensing||{}).insuranceExpiry,
      workersCompExpiry:   flat.workersCompExpiry    ?? (data.licensing||{}).workersCompExpiry,
      workersCompCurrent:  flat.workersCompCurrent   ?? (data.licensing||{}).workersCompCurrent,
      lastInspectionDate:  flat.lastInspectionDate   ?? (data.licensing||{}).lastInspectionDate,
      lastInspectionResult:flat.lastInspectionResult ?? (data.licensing||{}).lastInspectionResult,
      qrisStatus:          flat.qrisEnrolled != null ? (flat.qrisEnrolled === 'Yes' ? 'Enrolled' : flat.qrisEnrolled) : (data.licensing||{}).qrisStatus,
      coiOnFile:           flat.coiOnFile            ?? (data.licensing||{}).coiOnFile,
    },
    physical: {
      ...( data.physical || {} ),
      indoorSqft:             flat.indoorSqFtTotal    ?? (data.physical||{}).indoorSqft,
      outdoorSqft:            flat.outdoorSqFtTotal   ?? (data.physical||{}).outdoorSqft,
      capacity:               flat.licensedCapacity   ?? (data.physical||{}).capacity,
      coDetectorInstalled:    flat.coDetectors        ?? (data.physical||{}).coDetectorInstalled,
      smokeDetectorInstalled: flat.smokeDetectors     ?? (data.physical||{}).smokeDetectorInstalled,
      fireExtinguisherCurrent:flat.fireExtinguishers  ?? (data.physical||{}).fireExtinguisherCurrent,
      firstAidKitPresent:     flat.firstAidKit        ?? (data.physical||{}).firstAidKitPresent,
      hotWaterMaxTemp:        flat.hotWaterTemp        ?? (data.physical||{}).hotWaterMaxTemp,
      fencingEnclosesPlayArea:flat.fencingHeight ? 'Yes' : (data.physical||{}).fencingEnclosesPlayArea,
      fencingHeightFt:        flat.fencingHeight      ?? (data.physical||{}).fencingHeightFt,
    },
    personnel: {
      ...( data.personnel || {} ),
      directorName:            flat.directorName          ?? (data.personnel||{}).directorName,
      directorEduLevel:        flat.directorEducation     ?? (data.personnel||{}).directorEduLevel,
      directorYearsExp:        flat.directorExperience    ?? (data.personnel||{}).directorYearsExp,
      teacherEduMeetsReq:      flat.leadTeacherQualMet    ?? (data.personnel||{}).teacherEduMeetsReq,
      teacherMinAgeCompliant:  flat.aideAgeReq            ?? (data.personnel||{}).teacherMinAgeCompliant,
      fbiClearance:            flat.fbiBgCheckDate ? 'Yes' : (data.personnel||{}).fbiClearance,
      childAbuseRegistryDate:  flat.caRegistryCheck       ?? (data.personnel||{}).childAbuseRegistryDate,
      adminDesignationOnFile:  flat.directorOnDutyPolicy  ?? (data.personnel||{}).adminDesignationOnFile,
    },
    staffCredentials: {
      ...( data.staffCredentials || {} ),
      bgValid:              flat.bgCheckComplete != null ? (flat.bgCheckComplete === 'Yes' ? '1' : '0') : (data.staffCredentials||{}).bgValid,
      bgTotal:              '1',
      trainingHrs:          flat.annualTrainingHrs       ?? (data.staffCredentials||{}).trainingHrs,
      mandatedReporterDone: flat.mrTrainingComplete != null ? (flat.mrTrainingComplete === 'Yes' ? 'All staff completed' : flat.mrTrainingComplete) : (data.staffCredentials||{}).mandatedReporterDone,
      physicalOnFile:       flat.staffPhysicalOnFile != null ? (flat.staffPhysicalOnFile === 'Yes' ? '1' : '0') : (data.staffCredentials||{}).physicalOnFile,
      workforceRegistryDone:flat.workforceRegistryEnrolled != null ? (flat.workforceRegistryEnrolled === 'Yes' ? 'All' : flat.workforceRegistryEnrolled) : (data.staffCredentials||{}).workforceRegistryDone,
    },
    staffHealth: {
      ...( data.staffHealth || {} ),
      cprCertValid:                flat.cprCertOnFile      ?? (data.staffHealth||{}).cprCertValid,
      cprExpiryDate:               flat.cprExpiry          ?? (data.staffHealth||{}).cprExpiryDate,
      firstAidCertValid:           flat.firstAidCurrent    ?? (data.staffHealth||{}).firstAidCertValid,
      tbScreeningAllStaff:         flat.tbScreeningComplete ?? (data.staffHealth||{}).tbScreeningAllStaff,
      physicalExamOnFile:          flat.staffPhysicalOnFile ?? (data.staffHealth||{}).physicalExamOnFile,
      newHireOrientationCompleted: flat.orientationComplete ?? (data.staffHealth||{}).newHireOrientationCompleted,
      trainingLogOnFile:           flat.trainingLogOnFile   ?? (data.staffHealth||{}).trainingLogOnFile,
      tbRenewalDueDate:            flat.tbRenewalDate       ?? (data.staffHealth||{}).tbRenewalDueDate,
    },
    ratios: {
      ...( data.ratios || {} ),
      infant:    { children: flat.infantEnrollment    ?? (data.ratios||{}).infant?.children,    staff: flat.infantStaffCount    ?? (data.ratios||{}).infant?.staff    },
      toddler:   { children: flat.olderToddlerEnrollment ?? flat.toddlerEnrollment ?? (data.ratios||{}).toddler?.children, staff: flat.toddlerStaffCount   ?? (data.ratios||{}).toddler?.staff   },
      preschool: { children: flat.preschoolEnrollment ?? (data.ratios||{}).preschool?.children, staff: flat.preschoolStaffCount ?? (data.ratios||{}).preschool?.staff },
      schoolAge: { children: flat.schoolAgeEnrollment ?? (data.ratios||{}).schoolAge?.children, staff: flat.schoolAgeStaffCount ?? (data.ratios||{}).schoolAge?.staff },
      signinLogMaintained: flat.signInLogMaintained ?? (data.ratios||{}).signinLogMaintained,
      groupSizeInfant:     flat.infantGroupSize      ?? (data.ratios||{}).groupSizeInfant,
      groupSizeToddler:    flat.toddlerGroupSize     ?? (data.ratios||{}).groupSizeToddler,
      groupSizePreschool:  flat.preschoolGroupSize   ?? (data.ratios||{}).groupSizePreschool,
      groupSizeSchoolAge:  flat.schoolAgeGroupSize   ?? (data.ratios||{}).groupSizeSchoolAge,
    },
    children: {
      ...( data.children || {} ),
      childRecordComplete:    flat.enrollRecordComplete  ?? (data.children||{}).childRecordComplete,
      emergencyContactOnFile: flat.emergContactsOnFile   ?? (data.children||{}).emergencyContactOnFile,
      authorizedPickupsOnFile:flat.authPickupOnFile      ?? (data.children||{}).authorizedPickupsOnFile,
      childAllergiesOnFile:   flat.allergyDocOnFile      ?? (data.children||{}).childAllergiesOnFile,
      allergyCarePlanOnFile:  flat.allergyCareplan       ?? (data.children||{}).allergyCarePlanOnFile,
      childImmunizationOnFile:flat.immRecordsOnFile      ?? (data.children||{}).childImmunizationOnFile,
      immRecordsCurrent:      flat.immRecordsCurrent     ?? (data.children||{}).immRecordsCurrent,
      parentAgreementSigned:  flat.parentAgreementSigned ?? (data.children||{}).parentAgreementSigned,
      safeSleepPlanOnFile:    flat.safeSleepPolicy       ?? (data.children||{}).safeSleepPlanOnFile,
      medLogMaintained:       flat.medLogMaintained      ?? (data.children||{}).medLogMaintained,
    },
    emergency: {
      ...( data.emergency || {} ),
      fireEvacPlanOnFile:    flat.fireEvacPlan           ?? (data.emergency||{}).fireEvacPlanOnFile,
      fireEvacPlanPosted:    flat.fireEvacPosted         ?? (data.emergency||{}).fireEvacPlanPosted,
      fireDrillLastDate:     flat.lastFireDrillDate      ?? (data.emergency||{}).fireDrillLastDate,
      fireDrillLog:          flat.fireDrillLog           ?? (data.emergency||{}).fireDrillLog,
      tornadoDrillLastDate:  flat.lastTornadoDrillDate   ?? (data.emergency||{}).tornadoDrillLastDate,
      lockdownDrillLastDate: flat.lastLockdownDate       ?? (data.emergency||{}).lockdownDrillLastDate,
      emergencyPlanOnFile:   flat.emergPlanOnFile        ?? (data.emergency||{}).emergencyPlanOnFile,
      drillLogMaintained:    flat.allDrillLogsRetained   ?? (data.emergency||{}).drillLogMaintained,
      annualFireInspOnFile:  flat.fireDeptInspCurrent    ?? (data.emergency||{}).annualFireInspOnFile,
      annualFireInspDate:    flat.fireDeptInspDate       ?? (data.emergency||{}).annualFireInspDate,
      bodiesOfWaterOnPremises: flat.waterSafetyPlan === 'Not applicable' ? 'No' : (data.emergency||{}).bodiesOfWaterOnPremises,
    },
  };
}

export function calcCompliance(data, state) {
  data = normalizeData(data);
  const reg = getReg(state);

  const d1 = scoreD1(data, reg);
  const d2 = scoreD2(data, reg);
  const d3 = scoreD3(data, reg);
  const d4 = scoreD4(data, reg);
  const d5 = scoreD5(data, reg);
  const d6 = scoreD6(data, reg);
  const d7 = scoreD7(data, reg);

  // Legacy score keys (kept for NetworkTab compat)
  const ratios = d4;
  const staff  = d3 !== null && d5 !== null ? Math.round((d3+d5)/2) : d3 ?? d5;
  const center = d1 !== null && d2 !== null ? Math.round((d1+d2)/2) : d1 ?? d2;
  const family = d6;

  // Overall = weighted average of all 7 domains (equal weight for now)
  const domainScores = [d1,d2,d3,d4,d5,d6,d7].filter(s => s !== null);
  const overall = domainScores.length > 0
    ? Math.round(domainScores.reduce((a,b)=>a+b,0) / domainScores.length)
    : null;

  return { overall, d1, d2, d3, d4, d5, d6, d7, ratios, staff, center, family };
}

// ── Alert builder ────────────────────────────────────────────────────────────
export function buildAlerts(data, state) {
  data = normalizeData(data);
  const reg = getReg(state);
  const rules = reg.rules || {};
  const alerts = [];
  const today = new Date();

  const lic = data.licensing || {};
  const per = data.personnel || {};
  const h   = data.staffHealth || {};
  const cr  = data.staffCredentials || {};
  const em  = data.emergency || {};
  const phy = data.physical || {};
  const ratios = data.ratios || {};

  // ── License expiry ──────────────────────────────────────────────────────────
  if (lic.licenseExpiry) {
    const diff = (new Date(lic.licenseExpiry)-today)/86400000;
    if (diff < 0)   alerts.push({ type:'danger',  title:'License EXPIRED',        detail:`Expired ${Math.abs(Math.round(diff))} days ago — renew immediately` });
    else if (diff<60) alerts.push({ type:'warning', title:'License expiring soon',  detail:`Expires in ${Math.round(diff)} days` });
  }

  // ── Insurance expiry ────────────────────────────────────────────────────────
  [
    { key:'insuranceExpiry',   label:'GL insurance' },
    { key:'workersCompExpiry', label:"Workers' comp" },
  ].forEach(({ key, label }) => {
    const val = lic[key] || data.centerLicensing?.[key === 'insuranceExpiry' ? 'glExpiry' : key];
    if (val) {
      const diff = (new Date(val)-today)/86400000;
      if (diff<0)   alerts.push({ type:'danger',  title:`${label} EXPIRED`,        detail:`Expired ${Math.abs(Math.round(diff))} days ago` });
      else if (diff<60) alerts.push({ type:'warning', title:`${label} expiring soon`, detail:`Expires in ${Math.round(diff)} days` });
    }
  });

  // ── Inspection overdue ──────────────────────────────────────────────────────
  const inspDate = lic.lastInspectionDate || data.centerLicensing?.lastInspection;
  if (inspDate) {
    const d = (today-new Date(inspDate))/86400000;
    const threshold = 365/(reg.inspPerYear||1);
    if (d > threshold+30)  alerts.push({ type:'danger',  title:'Inspection overdue',   detail:`Last inspection was ${Math.round(d)} days ago` });
    else if (d > threshold) alerts.push({ type:'warning', title:'Inspection due soon',  detail:`Last inspection was ${Math.round(d)} days ago` });
  }

  // ── Ratio violations ────────────────────────────────────────────────────────
  [
    { key:'infant',    limit:reg.infant,    label:'Infant' },
    { key:'toddler',   limit:reg.toddler,   label:'Toddler' },
    { key:'preschool', limit:reg.preschool, label:'Preschool' },
    { key:'schoolAge', limit:reg.schoolAge, label:'School-age' },
  ].forEach(({ key, limit, label }) => {
    const g = ratios[key] || {};
    if (g.staff > 0 && parseFloat(g.children)/parseFloat(g.staff) > limit)
      alerts.push({ type:'danger', title:`${label} ratio violation`, detail:`Current: 1:${(parseFloat(g.children)/parseFloat(g.staff)).toFixed(1)} — State max: 1:${limit}` });
  });

  // ── CPR expiry ──────────────────────────────────────────────────────────────
  if (h.cprExpiryDate) {
    const diff = (new Date(h.cprExpiryDate)-today)/86400000;
    if (diff<0)   alerts.push({ type:'danger',  title:'CPR certification EXPIRED', detail:`Expired ${Math.abs(Math.round(diff))} days ago` });
    else if (diff<30) alerts.push({ type:'warning', title:'CPR certification expiring', detail:`Expires in ${Math.round(diff)} days` });
  }

  // ── Fire drill overdue ──────────────────────────────────────────────────────
  if (em.fireDrillLastDate) {
    const d = (today-new Date(em.fireDrillLastDate))/86400000;
    if (d>35) alerts.push({ type:'danger', title:'Fire drill overdue', detail:`Last fire drill was ${Math.round(d)} days ago — monthly required` });
  } else {
    alerts.push({ type:'info', title:'Fire drill date not recorded', detail:`${state} requires fire evacuation drills ${rules.fireDrillFreq||'monthly'}` });
  }

  // ── TB renewal (VA, DC-style states) ───────────────────────────────────────
  if (h.tbRenewalDueDate) {
    const diff = (new Date(h.tbRenewalDueDate)-today)/86400000;
    if (diff<0)   alerts.push({ type:'danger',  title:'TB renewal OVERDUE', detail:`TB re-test required every 2 years in ${state} — renewal overdue` });
    else if (diff<60) alerts.push({ type:'warning', title:'TB renewal due soon', detail:`TB renewal due in ${Math.round(diff)} days` });
  }

  // ── Mandated reporter ───────────────────────────────────────────────────────
  const mrRenewal = rules.mandatedReporterRenewal;
  const mrDone = cr.mandatedReporterDone;
  if (mrRenewal && mrRenewal !== 'No renewal required') {
    if (!mrDone || mrDone === 'some' || mrDone === 'none')
      alerts.push({ type:'warning', title:'Mandated reporter training incomplete', detail:`${state} requires renewal every ${mrRenewal}` });
  }

  // ── CO detector ─────────────────────────────────────────────────────────────
  const coOk = phy.coDetectorInstalled || data.centerFacility?.coDetectorInstalled;
  if (coOk === 'No')
    alerts.push({ type:'danger', title:'CO detector not confirmed', detail:`${state} requires carbon monoxide detectors` });

  // ── Workforce registry ──────────────────────────────────────────────────────
  const wreg = rules.workforceRegistry;
  if (wreg && wreg !== 'No') {
    const wregStatus = cr.workforceRegistryDone || per.workforceRegistryStatus;
    if (!wregStatus || wregStatus === 'some' || wregStatus === 'Not enrolled')
      alerts.push({ type:'info', title:`${wreg} enrollment incomplete`, detail:`${state} maintains a workforce registry — ensure qualifying staff are enrolled` });
  }

  if (alerts.length === 0)
    alerts.push({ type:'success', title:'All checks passed', detail:'No active compliance alerts for this center.' });

  return alerts;
}

export function scoreColor(score) {
  if (score===null || score===undefined) return '#94a3b8';
  if (score>=80) return '#2d7a4f';
  if (score>=60) return '#b45309';
  return '#b91c1c';
}

export function scoreLabel(score) {
  if (score===null || score===undefined) return 'No data';
  if (score>=80) return 'Compliant';
  if (score>=60) return 'At Risk';
  return 'Non-Compliant';
}

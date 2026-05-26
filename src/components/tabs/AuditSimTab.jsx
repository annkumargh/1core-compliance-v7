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

// ── Build compliance checks — all 287 fields from flat liveData ───────────────
function buildAllChecks(center, reg, ld) {
  const rules = reg?.rules || {};
  const today = new Date();

  // Helpers
  const yn    = v => !v || v==='' ? 'not_entered' : v==='Yes' ? 'pass' : 'fail';
  const ynNA  = v => !v || v==='' ? 'not_entered' : (v==='Yes'||v==='Not applicable'||v==='N/A') ? 'pass' : 'fail';
  const future= ds => !ds ? 'not_entered' : (new Date(ds)-today)/86400000>0 ? 'pass' : 'fail';
  const age   = (ds,max) => !ds ? 'not_entered' : (today-new Date(ds))/86400000<=max ? 'pass' : 'fail';
  const has   = v => !v || v==='' ? 'not_entered' : 'pass';
  const num   = (v,min) => !v ? 'not_entered' : parseFloat(v)>=min ? 'pass' : 'fail';
  const sqft  = (total,cap,min) => {
    const t=parseFloat(total),c=parseFloat(cap);
    if(!t||!c) return 'not_entered';
    return t/c>=min ? 'pass' : 'fail';
  };
  const ratio = (enroll,staff,max) => {
    const e=parseFloat(enroll),s=parseFloat(staff);
    if(!e) return 'pass'; // no enrollment = compliant
    if(!s) return 'not_entered';
    return e/s<=max ? 'pass' : 'fail';
  };

  return {
    d1:[
      {fieldNum:'D1-001',label:'License number',critical:true,result:has(ld.licenseNumber)},
      {fieldNum:'D1-002',label:'License expiry date',critical:true,result:future(ld.licenseExpiry)},
      {fieldNum:'D1-003',label:'Licensed capacity',critical:true,result:has(ld.licensedCapacity)},
      {fieldNum:'D1-004',label:'License certificate on file',critical:false,result:yn(ld.licenseCertOnFile)},
      {fieldNum:'D1-005',label:'License class / type',critical:false,result:has(ld.licenseClass)},
      {fieldNum:'D1-006',label:'Facility number',critical:false,result:has(ld.facilityNumber)},
      {fieldNum:'D1-007',label:'License renewal date',critical:false,result:future(ld.licenseRenewalDate)},
      {fieldNum:'D1-008',label:'GL insurance provider',critical:false,result:has(ld.glInsuranceProvider)},
      {fieldNum:'D1-009',label:'GL policy number',critical:true,result:has(ld.glPolicyNumber)},
      {fieldNum:'D1-010',label:'GL coverage expiry',critical:true,result:future(ld.glExpiry)},
      {fieldNum:'D1-011',label:'GL coverage amount',critical:false,result:has(ld.glCoverageAmount)},
      {fieldNum:'D1-012',label:'COI on file',critical:false,result:yn(ld.coiOnFile)},
      {fieldNum:'D1-013',label:'Workers comp current',critical:true,result:yn(ld.workersCompCurrent)},
      {fieldNum:'D1-014',label:'Workers comp expiry',critical:false,result:future(ld.workersCompExpiry)},
      {fieldNum:'D1-015',label:'Property insurance on file',critical:false,result:yn(ld.propertyInsurance)},
      {fieldNum:'D1-016',label:'Last inspection date',critical:true,result:has(ld.lastInspectionDate)},
      {fieldNum:'D1-017',label:'Last inspection result',critical:true,result:has(ld.lastInspectionResult)},
      {fieldNum:'D1-018',label:'Inspection report on file',critical:false,result:yn(ld.inspectionReportOnFile)},
      {fieldNum:'D1-019',label:'Open violations count',critical:false,result:has(ld.openViolationsCount)},
      {fieldNum:'D1-020',label:'Previous inspection date',critical:false,result:has(ld.prevInspectionDate)},
      {fieldNum:'D1-021',label:'Complaint inspections (12 mo)',critical:false,result:has(ld.complaintInspections)},
      {fieldNum:'D1-022',label:'QRIS enrolled',critical:false,result:yn(ld.qrisEnrolled)},
      {fieldNum:'D1-023',label:'QRIS current rating',critical:false,result:has(ld.qrisRating)},
      {fieldNum:'D1-024',label:'QRIS expiry / renewal date',critical:false,result:future(ld.qrisRenewalDate)},
      {fieldNum:'D1-025',label:'Licensing agency name',critical:false,result:has(ld.licensingAgency)},
      {fieldNum:'D1-026',label:'Agency phone number',critical:false,result:has(ld.agencyPhone)},
      {fieldNum:'D1-027',label:'Agency website',critical:false,result:has(ld.agencyWebsite)},
      {fieldNum:'D1-028',label:'Regulatory citation',critical:false,result:has(ld.regulatoryCitation)},
      {fieldNum:'D1-029',label:'Enabling statute',critical:false,result:has(ld.enablingStatute)},
      {fieldNum:'D1-030',label:'State regulation last validated',critical:false,result:has(ld.regLastValidated)},
      {fieldNum:'D1-031',label:'QRIS name',critical:false,result:has(ld.qrisName)},
      {fieldNum:'D1-032',label:'QRIS participation type',critical:false,result:has(ld.qrisType)},
      {fieldNum:'D1-033',label:'Insurance required (state)',critical:false,result:has(ld.insuranceRequired)},
      {fieldNum:'D1-034',label:'Inspections per year (state min)',critical:false,result:has(ld.inspPerYearMin)},
      {fieldNum:'D1-035',label:'Posted notices on file',critical:false,result:yn(ld.postedNotices)},
    ],
    d2:[
      {fieldNum:'D2-001',label:'Total indoor activity sq ft',critical:true,result:has(ld.indoorSqFtTotal)},
      {fieldNum:'D2-002',label:'Indoor sq ft per child (calc)',critical:true,result:has(ld.indoorSqFtPerChild)},
      {fieldNum:'D2-003',label:'State indoor minimum (sq ft)',critical:false,result:has(ld.stateIndoorMin)},
      {fieldNum:'D2-004',label:'Indoor space compliant',critical:true,result:has(ld.indoorSpaceCompliant)},
      {fieldNum:'D2-005',label:'Total outdoor activity sq ft',critical:true,result:has(ld.outdoorSqFtTotal)},
      {fieldNum:'D2-006',label:'Outdoor sq ft per child (calc)',critical:true,result:has(ld.outdoorSqFtPerChild)},
      {fieldNum:'D2-007',label:'State outdoor minimum (sq ft)',critical:false,result:has(ld.stateOutdoorMin)},
      {fieldNum:'D2-008',label:'Outdoor space compliant',critical:true,result:has(ld.outdoorSpaceCompliant)},
      {fieldNum:'D2-009',label:'Licensed room capacity posted',critical:false,result:yn(ld.roomCapacityPosted)},
      {fieldNum:'D2-010',label:'Floor plan on file',critical:false,result:yn(ld.floorPlanOnFile)},
      {fieldNum:'D2-011',label:'Hot water temperature',critical:true,result:has(ld.hotWaterTemp)},
      {fieldNum:'D2-012',label:'Hot water max (state)',critical:false,result:has(ld.stateHotWaterMax)},
      {fieldNum:'D2-013',label:'Hot water compliant',critical:true,result:has(ld.hotWaterCompliant)},
      {fieldNum:'D2-014',label:'Toilet count',critical:false,result:has(ld.toiletCount)},
      {fieldNum:'D2-015',label:'Toilet ratio (calc)',critical:false,result:has(ld.toiletRatioCalc)},
      {fieldNum:'D2-016',label:'State toilet ratio minimum',critical:false,result:has(ld.stateToiletRatio)},
      {fieldNum:'D2-017',label:'Hand-washing sinks (count)',critical:false,result:has(ld.sinkCount)},
      {fieldNum:'D2-018',label:'Safe drinking water accessible',critical:false,result:yn(ld.drinkingWater)},
      {fieldNum:'D2-019',label:'CO detectors installed',critical:true,result:yn(ld.coDetectors)},
      {fieldNum:'D2-020',label:'CO detector test date',critical:false,result:has(ld.coDetectorTestDate)},
      {fieldNum:'D2-021',label:'Smoke detectors installed',critical:true,result:yn(ld.smokeDetectors)},
      {fieldNum:'D2-022',label:'Smoke detector test date',critical:false,result:has(ld.smokeDetectorTestDate)},
      {fieldNum:'D2-023',label:'Fire extinguishers current',critical:true,result:yn(ld.fireExtinguishers)},
      {fieldNum:'D2-024',label:'Fire extinguisher inspection date',critical:false,result:has(ld.fireExtInspDate)},
      {fieldNum:'D2-025',label:'Emergency lighting functional',critical:false,result:yn(ld.emergencyLighting)},
      {fieldNum:'D2-026',label:'Exit signs posted',critical:false,result:yn(ld.exitSigns)},
      {fieldNum:'D2-027',label:'Fencing height (ft)',critical:true,result:has(ld.fencingHeight)},
      {fieldNum:'D2-028',label:'State fencing minimum (ft)',critical:false,result:has(ld.stateFencingMin)},
      {fieldNum:'D2-029',label:'Fencing compliant',critical:true,result:has(ld.fencingCompliant)},
      {fieldNum:'D2-030',label:'Gate self-latching',critical:false,result:yn(ld.gateSelfLatching)},
      {fieldNum:'D2-031',label:'Shade available outdoors',critical:false,result:yn(ld.shadeAvailable)},
      {fieldNum:'D2-032',label:'Resilient surfacing under equipment',critical:false,result:yn(ld.resilientSurfacing)},
      {fieldNum:'D2-033',label:'Equipment age-appropriate',critical:false,result:yn(ld.equipmentAgeAppropriate)},
      {fieldNum:'D2-034',label:'Written space policy on file',critical:false,result:yn(ld.spacePolicyOnFile)},
      {fieldNum:'D2-035',label:'Hazardous materials stored safely',critical:true,result:yn(ld.hazMatStorage)},
      {fieldNum:'D2-036',label:'Choke hazard policy (under 3)',critical:false,result:yn(ld.chokeHazardPolicy)},
      {fieldNum:'D2-037',label:'Sharp tool storage policy',critical:false,result:yn(ld.sharpToolPolicy)},
      {fieldNum:'D2-038',label:'Facility inspection current',critical:true,result:yn(ld.facilityInspCurrent)},
      {fieldNum:'D2-039',label:'Fire department inspection date',critical:false,result:has(ld.fireDeptInspDate)},
      {fieldNum:'D2-040',label:'Health department inspection date',critical:false,result:has(ld.healthDeptInspDate)},
      {fieldNum:'D2-041',label:'ADA accessibility compliant',critical:false,result:yn(ld.adaCompliant)},
    ],
    d3:[
      {fieldNum:'D3-001',label:'Director name',critical:false,result:has(ld.directorName)},
      {fieldNum:'D3-002',label:'Director education level',critical:true,result:has(ld.directorEducation)},
      {fieldNum:'D3-003',label:'Director ECE credit hours',critical:false,result:has(ld.directorECECredits)},
      {fieldNum:'D3-004',label:'Director years experience',critical:false,result:has(ld.directorExperience)},
      {fieldNum:'D3-005',label:'Director qualification pathway',critical:true,result:has(ld.directorQualPathway)},
      {fieldNum:'D3-006',label:'Director credential name',critical:false,result:has(ld.directorCredential)},
      {fieldNum:'D3-007',label:'Director credential expiry',critical:false,result:future(ld.directorCredExpiry)},
      {fieldNum:'D3-008',label:'State director requirement',critical:false,result:has(ld.stateDirReq)},
      {fieldNum:'D3-009',label:'Lead teacher count',critical:false,result:has(ld.leadTeacherCount)},
      {fieldNum:'D3-010',label:'Lead teacher qualification met',critical:true,result:yn(ld.leadTeacherQualMet)},
      {fieldNum:'D3-011',label:'Lead teacher education level',critical:false,result:has(ld.leadTeacherEducation)},
      {fieldNum:'D3-012',label:'Lead teacher orientation complete',critical:false,result:yn(ld.leadTeacherOrientation)},
      {fieldNum:'D3-013',label:'State teacher requirement',critical:false,result:has(ld.stateTeacherReq)},
      {fieldNum:'D3-014',label:'Aide count',critical:false,result:has(ld.aideCount)},
      {fieldNum:'D3-015',label:'Aide age requirement met (18+)',critical:false,result:yn(ld.aideAgeReq)},
      {fieldNum:'D3-016',label:'Aide orientation complete',critical:false,result:yn(ld.aideOrientation)},
      {fieldNum:'D3-017',label:'BG check complete (all staff)',critical:true,result:yn(ld.bgCheckComplete)},
      {fieldNum:'D3-018',label:'State BG check clearance date',critical:true,result:has(ld.stateBgCheckDate)},
      {fieldNum:'D3-019',label:'FBI fingerprint clearance date',critical:true,result:has(ld.fbiBgCheckDate)},
      {fieldNum:'D3-020',label:'Child abuse registry check',critical:true,result:yn(ld.caRegistryCheck)},
      {fieldNum:'D3-021',label:'BG check agency (state)',critical:false,result:has(ld.bgCheckAgency)},
      {fieldNum:'D3-022',label:'BG check type (state)',critical:false,result:has(ld.bgCheckType)},
      {fieldNum:'D3-023',label:'Pre-employment affidavit on file',critical:false,result:yn(ld.preEmpAffidavit)},
      {fieldNum:'D3-024',label:'Workforce registry enrolled',critical:false,result:yn(ld.workforceRegistryEnrolled)},
      {fieldNum:'D3-025',label:'Registry ID / profile number',critical:false,result:has(ld.registryProfileId)},
      {fieldNum:'D3-026',label:'Registry name (state)',critical:false,result:has(ld.stateRegistryName)},
      {fieldNum:'D3-027',label:'Registry training hours current',critical:false,result:yn(ld.registryTrainingCurrent)},
      {fieldNum:'D3-028',label:'Total staff count',critical:false,result:has(ld.totalStaffCount)},
      {fieldNum:'D3-029',label:'Staff-to-child ratio compliant (overall)',critical:false,result:has(ld.overallRatioCompliant)},
      {fieldNum:'D3-030',label:'Volunteer background check policy',critical:false,result:yn(ld.volunteerBgPolicy)},
      {fieldNum:'D3-031',label:'Director on duty policy',critical:false,result:yn(ld.directorOnDutyPolicy)},
      {fieldNum:'D3-032',label:'Lead teacher CPR current (per role)',critical:false,result:yn(ld.ltCPRCurrent)},
      {fieldNum:'D3-033',label:'Aide supervision policy',critical:false,result:yn(ld.aideSuperPolicy)},
      {fieldNum:'D3-034',label:'Assistant director qualified',critical:false,result:yn(ld.asstDirQualified)},
    ],
    d4:[
      {fieldNum:'D4-001',label:'Infant enrollment (0–12 mo)',critical:true,result:has(ld.infantEnrollment)},
      {fieldNum:'D4-002',label:'Young toddler enrollment (12–17 mo)',critical:true,result:has(ld.youngToddlerEnrollment)},
      {fieldNum:'D4-003',label:'Older toddler enrollment (18–35 mo)',critical:true,result:has(ld.olderToddlerEnrollment)},
      {fieldNum:'D4-004',label:'Preschool enrollment (3–5 yr)',critical:true,result:has(ld.preschoolEnrollment)},
      {fieldNum:'D4-005',label:'School-age enrollment (K+)',critical:true,result:has(ld.schoolAgeEnrollment)},
      {fieldNum:'D4-006',label:'Total enrollment',critical:true,result:has(ld.totalEnrollment)},
      {fieldNum:'D4-007',label:'Licensed capacity',critical:true,result:has(ld.licensedCapacity)},
      {fieldNum:'D4-008',label:'Enrollment vs capacity ratio',critical:false,result:has(ld.enrollmentCapacityRatio)},
      {fieldNum:'D4-009',label:'Infant staff count',critical:true,result:has(ld.infantStaffCount)},
      {fieldNum:'D4-010',label:'Infant ratio (calc)',critical:true,result:has(ld.infantRatioCalc)},
      {fieldNum:'D4-011',label:'State infant ratio max',critical:false,result:has(ld.stateInfantRatioMax)},
      {fieldNum:'D4-012',label:'Infant ratio compliant',critical:true,result:has(ld.infantRatioCompliant)},
      {fieldNum:'D4-013',label:'Toddler staff count',critical:true,result:has(ld.toddlerStaffCount)},
      {fieldNum:'D4-014',label:'Toddler ratio (calc)',critical:true,result:has(ld.toddlerRatioCalc)},
      {fieldNum:'D4-015',label:'State toddler ratio max',critical:false,result:has(ld.stateToddlerRatioMax)},
      {fieldNum:'D4-016',label:'Toddler ratio compliant',critical:true,result:has(ld.toddlerRatioCompliant)},
      {fieldNum:'D4-017',label:'Preschool staff count',critical:true,result:has(ld.preschoolStaffCount)},
      {fieldNum:'D4-018',label:'Preschool ratio (calc)',critical:true,result:has(ld.preschoolRatioCalc)},
      {fieldNum:'D4-019',label:'State preschool ratio max',critical:false,result:has(ld.statePreschoolRatioMax)},
      {fieldNum:'D4-020',label:'Preschool ratio compliant',critical:true,result:has(ld.preschoolRatioCompliant)},
      {fieldNum:'D4-021',label:'School-age staff count',critical:true,result:has(ld.schoolAgeStaffCount)},
      {fieldNum:'D4-022',label:'School-age ratio (calc)',critical:true,result:has(ld.schoolAgeRatioCalc)},
      {fieldNum:'D4-023',label:'State school-age ratio max',critical:false,result:has(ld.stateSchoolAgeRatioMax)},
      {fieldNum:'D4-024',label:'School-age ratio compliant',critical:true,result:has(ld.schoolAgeRatioCompliant)},
      {fieldNum:'D4-025',label:'Infant group size',critical:false,result:has(ld.infantGroupSize)},
      {fieldNum:'D4-026',label:'Toddler group size',critical:false,result:has(ld.toddlerGroupSize)},
      {fieldNum:'D4-027',label:'Preschool group size',critical:false,result:has(ld.preschoolGroupSize)},
      {fieldNum:'D4-028',label:'School-age group size',critical:false,result:has(ld.schoolAgeGroupSize)},
      {fieldNum:'D4-029',label:'Mixed-age group present',critical:false,result:yn(ld.mixedAgeGroup)},
      {fieldNum:'D4-030',label:'Naptime ratio adjustment',critical:false,result:yn(ld.naptimeRatioAdj)},
      {fieldNum:'D4-031',label:'Daily sign-in/out log maintained',critical:true,result:yn(ld.signInLogMaintained)},
      {fieldNum:'D4-032',label:'Sign-in log retention period',critical:false,result:has(ld.signInLogRetention)},
      {fieldNum:'D4-033',label:'Authorized pickup list current',critical:false,result:yn(ld.authorizedPickupCurrent)},
      {fieldNum:'D4-034',label:'Minimum staff on duty met',critical:true,result:yn(ld.minStaffOnDuty)},
      {fieldNum:'D4-035',label:'Director or qualified designee on duty',critical:false,result:yn(ld.qualDirOnDuty)},
      {fieldNum:'D4-036',label:'CPR-certified staff on duty',critical:true,result:yn(ld.cprStaffOnDuty)},
      {fieldNum:'D4-037',label:'Staff schedule on file',critical:false,result:yn(ld.staffScheduleOnFile)},
      {fieldNum:'D4-038',label:'Opening/closing ratio compliance',critical:false,result:yn(ld.openCloseRatioCompliant)},
      {fieldNum:'D4-039',label:'Substitute staff policy',critical:false,result:yn(ld.subStaffPolicy)},
    ],
    d5:[
      {fieldNum:'D5-001',label:'Staff physical exam on file',critical:true,result:yn(ld.staffPhysicalOnFile)},
      {fieldNum:'D5-002',label:'Physical exam date',critical:true,result:has(ld.staffPhysicalDate)},
      {fieldNum:'D5-003',label:'Physical exam renewal required',critical:false,result:has(ld.physicalRenewalRequired)},
      {fieldNum:'D5-004',label:'Physical renewal date (DC/state)',critical:false,result:future(ld.physicalRenewalDate)},
      {fieldNum:'D5-005',label:'Staff health statement current',critical:false,result:yn(ld.staffHealthStatement)},
      {fieldNum:'D5-006',label:'Communicable disease policy',critical:false,result:yn(ld.commDiseasePol)},
      {fieldNum:'D5-007',label:'TB screening completed',critical:true,result:yn(ld.tbScreeningComplete)},
      {fieldNum:'D5-008',label:'TB test date',critical:true,result:has(ld.tbTestDate)},
      {fieldNum:'D5-009',label:'TB test result',critical:false,result:has(ld.tbTestResult)},
      {fieldNum:'D5-010',label:'TB renewal required (state)',critical:false,result:has(ld.tbRenewalRequired)},
      {fieldNum:'D5-011',label:'TB renewal date (if applicable)',critical:false,result:future(ld.tbRenewalDate)},
      {fieldNum:'D5-012',label:'CPR certification on file',critical:true,result:yn(ld.cprCertOnFile)},
      {fieldNum:'D5-013',label:'CPR certification date',critical:true,result:has(ld.cprCertDate)},
      {fieldNum:'D5-014',label:'CPR expiry date',critical:true,result:future(ld.cprExpiry)},
      {fieldNum:'D5-015',label:'CPR renewal period (state)',critical:false,result:has(ld.stateCPRRenewal)},
      {fieldNum:'D5-016',label:'CPR certification type',critical:false,result:has(ld.cprCertType)},
      {fieldNum:'D5-017',label:'First aid certification current',critical:false,result:yn(ld.firstAidCurrent)},
      {fieldNum:'D5-018',label:'CPR-certified staff count',critical:true,result:has(ld.cprStaffCount)},
      {fieldNum:'D5-019',label:'Mandated reporter training complete',critical:true,result:yn(ld.mrTrainingComplete)},
      {fieldNum:'D5-020',label:'Mandated reporter training date',critical:true,result:has(ld.mrTrainingDate)},
      {fieldNum:'D5-021',label:'MR renewal required (state)',critical:false,result:has(ld.stateMRRenewal)},
      {fieldNum:'D5-022',label:'MR renewal date (if applicable)',critical:false,result:future(ld.mrRenewalDate)},
      {fieldNum:'D5-023',label:'Abuse reporting procedure posted',critical:false,result:yn(ld.abuseReportingPosted)},
      {fieldNum:'D5-024',label:'Annual training hours completed',critical:true,result:has(ld.annualTrainingHrs)},
      {fieldNum:'D5-025',label:'State training hours minimum',critical:false,result:has(ld.stateTrainingMin)},
      {fieldNum:'D5-026',label:'Training log on file',critical:false,result:yn(ld.trainingLogOnFile)},
      {fieldNum:'D5-027',label:'Training topics documented',critical:false,result:yn(ld.trainingTopicsDocs)},
      {fieldNum:'D5-028',label:'Director-led training approved',critical:false,result:yn(ld.directorLedTraining)},
      {fieldNum:'D5-029',label:'Safe sleep training complete',critical:false,result:yn(ld.safeSleepTraining)},
      {fieldNum:'D5-030',label:'Standard precautions training',critical:false,result:yn(ld.standardPrecautions)},
      {fieldNum:'D5-031',label:'Child abuse recognition training',critical:false,result:yn(ld.childAbuseTraining)},
      {fieldNum:'D5-032',label:'New hire orientation complete',critical:false,result:yn(ld.orientationComplete)},
      {fieldNum:'D5-033',label:'Orientation hours',critical:false,result:has(ld.orientationHours)},
      {fieldNum:'D5-034',label:'Orientation completion date',critical:false,result:has(ld.orientationDate)},
      {fieldNum:'D5-035',label:'Emergency preparedness training',critical:false,result:yn(ld.emergPrepTraining)},
      {fieldNum:'D5-036',label:'Food protection manager on site',critical:false,result:yn(ld.foodProtMgr)},
      {fieldNum:'D5-037',label:'Illness exclusion policy posted',critical:false,result:yn(ld.illnessExclusionPosted)},
      {fieldNum:'D5-038',label:'Staff illness exclusion followed',critical:false,result:yn(ld.staffIllnessExclusion)},
      {fieldNum:'D5-039',label:'Vaccination records (staff)',critical:false,result:yn(ld.staffVaccinationRecs)},
      {fieldNum:'D5-040',label:'AED on premises',critical:false,result:yn(ld.aedOnPremises)},
      {fieldNum:'D5-041',label:'QRIS training requirements met',critical:false,result:yn(ld.qrisTrainingMet)},
      {fieldNum:'D5-042',label:'Volunteer orientation complete',critical:false,result:yn(ld.volunteerOrientation)},
      {fieldNum:'D5-043',label:'Hotline number posted',critical:false,result:yn(ld.hotlinePosted)},
    ],
    d6:[
      {fieldNum:'D6-001',label:'Child name on file',critical:true,result:has(ld.childName)},
      {fieldNum:'D6-002',label:'Child DOB on file',critical:true,result:has(ld.childDOB)},
      {fieldNum:'D6-003',label:'Enrollment date on file',critical:false,result:has(ld.enrollmentDate)},
      {fieldNum:'D6-004',label:'Withdrawal date on file',critical:false,result:has(ld.withdrawalDate)},
      {fieldNum:'D6-005',label:'Child enrollment record complete',critical:true,result:yn(ld.enrollRecordComplete)},
      {fieldNum:'D6-006',label:'Emergency contacts on file',critical:true,result:yn(ld.emergContactsOnFile)},
      {fieldNum:'D6-007',label:'Emergency contact count',critical:false,result:has(ld.emergContactCount)},
      {fieldNum:'D6-008',label:'Authorized pickup list on file',critical:false,result:yn(ld.authPickupOnFile)},
      {fieldNum:'D6-009',label:'Custody orders on file',critical:false,result:yn(ld.custodyOrdersOnFile)},
      {fieldNum:'D6-010',label:'Parent agreement signed',critical:true,result:yn(ld.parentAgreementSigned)},
      {fieldNum:'D6-011',label:'Allergy documentation on file',critical:true,result:yn(ld.allergyDocOnFile)},
      {fieldNum:'D6-012',label:'Allergy care plan on file',critical:true,result:yn(ld.allergyCareplan)},
      {fieldNum:'D6-013',label:'Emergency medication on site (EpiPen)',critical:true,result:yn(ld.epiPenOnSite)},
      {fieldNum:'D6-014',label:'Food allergy policy posted',critical:false,result:yn(ld.foodAllergyPolicy)},
      {fieldNum:'D6-015',label:'Allergy list in kitchen / food prep',critical:false,result:yn(ld.allergyListInKitchen)},
      {fieldNum:'D6-016',label:'Medication administration policy',critical:false,result:yn(ld.medAdminPolicy)},
      {fieldNum:'D6-017',label:'Medication authorization on file',critical:true,result:yn(ld.medAuthOnFile)},
      {fieldNum:'D6-018',label:'Medication log maintained',critical:false,result:yn(ld.medLogMaintained)},
      {fieldNum:'D6-019',label:'Medications stored correctly',critical:true,result:yn(ld.medsStoredCorrectly)},
      {fieldNum:'D6-020',label:'Prescription on file (Rx meds)',critical:false,result:yn(ld.rxOnFile)},
      {fieldNum:'D6-021',label:'Child physical exam on file',critical:false,result:yn(ld.childPhysicalOnFile)},
      {fieldNum:'D6-022',label:'Physical exam date',critical:false,result:has(ld.childPhysicalDate)},
      {fieldNum:'D6-023',label:'Vision and hearing screening',critical:false,result:yn(ld.visionHearingScreen)},
      {fieldNum:'D6-024',label:'Lead testing documentation',critical:false,result:yn(ld.leadTestingDoc)},
      {fieldNum:'D6-025',label:'Immunization records on file',critical:true,result:yn(ld.immRecordsOnFile)},
      {fieldNum:'D6-026',label:'Immunization records current',critical:true,result:yn(ld.immRecordsCurrent)},
      {fieldNum:'D6-027',label:'Immunization exemption type',critical:false,result:has(ld.immExemptionType)},
      {fieldNum:'D6-028',label:'Exemption documentation on file',critical:false,result:yn(ld.immExemptionDoc)},
      {fieldNum:'D6-029',label:'Annual immunization reporting done',critical:false,result:yn(ld.annualImmReporting)},
      {fieldNum:'D6-030',label:'State exemption types permitted',critical:false,result:has(ld.stateImmExemptions)},
      {fieldNum:'D6-031',label:'Written policies acknowledged',critical:false,result:yn(ld.writtenPoliciesAck)},
      {fieldNum:'D6-032',label:'Photo/media release signed',critical:false,result:yn(ld.photoReleaseSign)},
      {fieldNum:'D6-033',label:'Field trip permission on file',critical:false,result:yn(ld.fieldTripPermission)},
      {fieldNum:'D6-034',label:'Transportation permission on file',critical:false,result:yn(ld.transportPermission)},
      {fieldNum:'D6-035',label:'Grievance procedure communicated',critical:false,result:yn(ld.grievanceProcedure)},
      {fieldNum:'D6-036',label:'Safe sleep policy on file',critical:true,result:yn(ld.safeSleepPolicy)},
      {fieldNum:'D6-037',label:'Safe sleep policy communicated',critical:false,result:yn(ld.safeSleepCommun)},
      {fieldNum:'D6-038',label:'Infant sleep environment compliant',critical:true,result:yn(ld.infantSleepEnv)},
      {fieldNum:'D6-039',label:'Safe sleep training (staff)',critical:true,result:yn(ld.safeSleepStaffTrain)},
      {fieldNum:'D6-040',label:'Infant sleep exception documented',critical:false,result:yn(ld.infantSleepException)},
      {fieldNum:'D6-041',label:'Care log / daily log maintained',critical:false,result:yn(ld.careLogMaintained)},
      {fieldNum:'D6-042',label:'Physician contact on file',critical:false,result:yn(ld.physicianContact)},
      {fieldNum:'D6-043',label:'Special care needs plan on file',critical:false,result:yn(ld.specialCareNeedsPlan)},
      {fieldNum:'D6-044',label:'Record retention policy met',critical:false,result:yn(ld.recordRetentionMet)},
      {fieldNum:'D6-045',label:'State record retention period',critical:false,result:has(ld.stateRecordRetention)},
      {fieldNum:'D6-046',label:'Immunization record retention',critical:false,result:yn(ld.immRecordRetention)},
      {fieldNum:'D6-047',label:'Family meeting documentation',critical:false,result:yn(ld.familyMeetingDocs)},
      {fieldNum:'D6-048',label:'Emergency contact update policy',critical:false,result:yn(ld.emergContactUpdatePolicy)},
      {fieldNum:'D6-049',label:'Non-prescription medication policy',critical:false,result:yn(ld.nonRxMedPolicy)},
      {fieldNum:'D6-050',label:'Developmental screening on file',critical:false,result:yn(ld.devScreeningOnFile)},
      {fieldNum:'D6-051',label:'Incident / accident report log',critical:false,result:yn(ld.incidentReportLog)},
    ],
    d7:[
      {fieldNum:'D7-001',label:'Fire evacuation plan on file',critical:true,result:yn(ld.fireEvacPlan)},
      {fieldNum:'D7-002',label:'Fire evacuation plan posted',critical:false,result:yn(ld.fireEvacPosted)},
      {fieldNum:'D7-003',label:'Last fire drill date',critical:true,result:has(ld.lastFireDrillDate)},
      {fieldNum:'D7-004',label:'Fire drill frequency (state)',critical:false,result:has(ld.stateFireDrillFreq)},
      {fieldNum:'D7-005',label:'Fire drills completed (12 mo)',critical:true,result:has(ld.fireDrillsCompleted)},
      {fieldNum:'D7-006',label:'Fire drill log on file',critical:true,result:yn(ld.fireDrillLog)},
      {fieldNum:'D7-007',label:'Fire safety training complete',critical:true,result:yn(ld.fireSafetyTraining)},
      {fieldNum:'D7-008',label:'Fire department inspection current',critical:true,result:yn(ld.fireDeptInspCurrent)},
      {fieldNum:'D7-009',label:'Tornado drill required (state)',critical:false,result:has(ld.tornadoDrillRequired)},
      {fieldNum:'D7-010',label:'Last tornado drill date',critical:false,result:has(ld.lastTornadoDrillDate)},
      {fieldNum:'D7-011',label:'Tornado drill frequency (state)',critical:false,result:has(ld.stateTornadoDrillFreq)},
      {fieldNum:'D7-012',label:'Tornado drills completed (12 mo)',critical:false,result:has(ld.tornadoDrillsCompleted)},
      {fieldNum:'D7-013',label:'Tornado drill log on file',critical:false,result:yn(ld.tornadoDrillLog)},
      {fieldNum:'D7-014',label:'Designated shelter area identified',critical:false,result:yn(ld.shelterAreaIdentified)},
      {fieldNum:'D7-015',label:'Lockdown drill required (state)',critical:false,result:has(ld.lockdownDrillRequired)},
      {fieldNum:'D7-016',label:'Last lockdown drill date',critical:true,result:has(ld.lastLockdownDate)},
      {fieldNum:'D7-017',label:'Lockdown drill frequency (state)',critical:false,result:has(ld.stateLockdownFreq)},
      {fieldNum:'D7-018',label:'Lockdown drills completed (12 mo)',critical:true,result:has(ld.lockdownDrillsCompleted)},
      {fieldNum:'D7-019',label:'Lockdown drill log on file',critical:true,result:yn(ld.lockdownDrillLog)},
      {fieldNum:'D7-020',label:'Lockdown procedure communicated to staff',critical:false,result:yn(ld.lockdownProcComm)},
      {fieldNum:'D7-021',label:'Written emergency plan on file',critical:true,result:yn(ld.emergPlanOnFile)},
      {fieldNum:'D7-022',label:'Emergency plan reviewed annually',critical:false,result:yn(ld.emergPlanReviewed)},
      {fieldNum:'D7-023',label:'Emergency plan communicated to staff',critical:false,result:yn(ld.emergPlanComm)},
      {fieldNum:'D7-024',label:'Emergency contact list current',critical:false,result:yn(ld.emergContactListCurrent)},
      {fieldNum:'D7-025',label:'Emergency plan communicated to families',critical:false,result:yn(ld.emergPlanFamilies)},
      {fieldNum:'D7-026',label:'Relocation site identified',critical:false,result:yn(ld.relocationSite)},
      {fieldNum:'D7-027',label:'Health inspection current',critical:true,result:yn(ld.healthInspCurrent)},
      {fieldNum:'D7-028',label:'Health inspection date',critical:true,result:has(ld.healthInspDate)},
      {fieldNum:'D7-029',label:'Health inspection result',critical:false,result:has(ld.healthInspResult)},
      {fieldNum:'D7-030',label:'Health inspection report on file',critical:false,result:yn(ld.healthInspReportOnFile)},
      {fieldNum:'D7-031',label:'Open health violations',critical:false,result:has(ld.openHealthViolations)},
      {fieldNum:'D7-032',label:'All drill logs retained',critical:false,result:yn(ld.allDrillLogsRetained)},
      {fieldNum:'D7-033',label:'Drill log retention period met',critical:false,result:yn(ld.drillLogRetentionMet)},
      {fieldNum:'D7-034',label:'Inspector drill log access',critical:false,result:yn(ld.drillLogInspAccess)},
      {fieldNum:'D7-035',label:'Electronic drill log used',critical:false,result:yn(ld.electronicDrillLog)},
      {fieldNum:'D7-036',label:'Water safety plan (if pool/water feature)',critical:false,result:yn(ld.waterSafetyPlan)},
      {fieldNum:'D7-037',label:'Lifeguard certification on file',critical:false,result:yn(ld.lifeguardCert)},
      {fieldNum:'D7-038',label:'Water activity permission on file',critical:false,result:yn(ld.waterActivityPermission)},
      {fieldNum:'D7-039',label:'Fire alarm system tested',critical:false,result:yn(ld.fireAlarmTested)},
      {fieldNum:'D7-040',label:'First aid kit accessible',critical:true,result:yn(ld.firstAidKit)},
      {fieldNum:'D7-041',label:'First aid kit contents current',critical:false,result:yn(ld.firstAidKitContents)},
      {fieldNum:'D7-042',label:'Communication device available',critical:false,result:yn(ld.commDeviceAvailable)},
      {fieldNum:'D7-043',label:'Food service permit current',critical:false,result:yn(ld.foodServicePermit)},
      {fieldNum:'D7-044',label:'Severe weather alert system',critical:false,result:yn(ld.severeWeatherAlert)},
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
    const raw       = liveData?.data || liveData || {};
    // Enrich with derived/aliased fields that complianceFields tracks by canonical dataKey
    const rules     = reg?.rules || {};
    const ld        = {
      ...raw,
      // D1-031 qrisName — from reg
      qrisName:               raw.qrisType || rules.qrisName || reg?.qrisType || '',
      // D2-029 fencingCompliant — derived
      fencingCompliant:       !raw.fencingHeight ? '' :
                                parseFloat(raw.fencingHeight) >= (parseFloat(rules.minFencingHeight)||4) ? 'Yes' : 'No',
      // D3-022 bgCheckType — canonical key (same as bgCheckComplete)
      bgCheckType:            raw.bgCheckComplete || '',
      // D4 ratio compliant — use pre-saved values or recalc
      enrollmentCapacityRatio: raw.enrollmentCapacityRatio ||
                                (raw.totalEnrollment && raw.licensedCapacity
                                  ? (parseFloat(raw.totalEnrollment) <= parseFloat(raw.licensedCapacity) ? 'Yes' : 'No') : ''),
      infantRatioCompliant:   raw.infantRatioCompliant ||
                                (!raw.infantEnrollment ? 'Yes' : !raw.infantStaffCount ? '' :
                                  parseFloat(raw.infantEnrollment)/parseFloat(raw.infantStaffCount) <= (reg?.infant||4) ? 'Yes' : 'No'),
      toddlerRatioCompliant:  raw.toddlerRatioCompliant ||
                                (!raw.olderToddlerEnrollment ? 'Yes' : !raw.toddlerStaffCount ? '' :
                                  parseFloat(raw.olderToddlerEnrollment)/parseFloat(raw.toddlerStaffCount) <= (reg?.toddler||9) ? 'Yes' : 'No'),
      preschoolRatioCompliant: raw.preschoolRatioCompliant ||
                                (!raw.preschoolEnrollment ? 'Yes' : !raw.preschoolStaffCount ? '' :
                                  parseFloat(raw.preschoolEnrollment)/parseFloat(raw.preschoolStaffCount) <= (reg?.preschool||15) ? 'Yes' : 'No'),
      schoolAgeRatioCompliant: raw.schoolAgeRatioCompliant ||
                                (!raw.schoolAgeEnrollment ? 'Yes' : !raw.schoolAgeStaffCount ? '' :
                                  parseFloat(raw.schoolAgeEnrollment)/parseFloat(raw.schoolAgeStaffCount) <= (reg?.schoolAge||26) ? 'Yes' : 'No'),
      // D6 canonical aliases
      careLogMaintained:      raw.careLogMaintained || '',
      physicianContact:       raw.physicianContact || '',
      specialCareNeedsPlan:   raw.specialCareNeedsPlan || '',
      incidentReportLog:      raw.incidentReportLog || '',
    };
    const allChecks = buildAllChecks(center,reg,ld);
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
      capId: (() => {
        const y = now.getFullYear();
        const tc = selectedTypeId==='system'?'SYS':selectedTypeId==='center'?'DIR':'REAL';
        const period = selectedTypeId==='system'&&cq ? cq : String(now.getMonth()+1).padStart(2,'0');
        const existing = (getSavedRuns(center.id)||[]).filter(r=>r.capId&&r.capId.startsWith(`CAP-${tc}-${y}-${period}-`));
        const seq = String(existing.length+1).padStart(3,'0');
        return `CAP-${tc}-${y}-${period}-${seq}`;
      })(),
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

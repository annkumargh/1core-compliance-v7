// ── complianceFields.js — SINGLE SOURCE OF TRUTH ──────────────────────────
// Field definitions driven by 1Core_Compliance_Field_Inventory.xlsx
// All dataKeys match exactly. Both InspectionView and OverviewTab import from here.
// NEVER duplicate this logic elsewhere.

function s(val, yes='compliant', no='missing') {
  if (!val || val === '') return 'nodata';
  if (val === 'Yes') return yes;
  if (val === 'No') return no;
  return 'compliant'; // any other entered value = compliant
}

export function getDomainFields(center, reg, liveData = {}) {
  const rules = reg?.rules || {};
  const seed  = center._seed || center;
  const ld    = liveData;

  return [
    // ── D1: Licensing & Administration ─────────────────────────────────────
    {
      id:'d1', label:'Licensing & Administration', dNum:'D1',
      fields: [
        { label:'License number',       requirement:'Required by state',           value: ld.licenseNumber || seed._licenseNumber || seed.licenseNumber || '', status: (ld.licenseNumber || seed._licenseNumber || seed.licenseNumber) ? 'compliant' : 'missing', fieldKey:'licenseNumber', subTab:'licensing' },
        { label:'License expiry date',          requirement:'Must be current',             value: ld.licenseExpiry || '', status: ld.licenseExpiry ? 'compliant' : 'nodata', fieldKey:'licenseExpiry', subTab:'licensing' },
        { label:'Licensed capacity (max children)',    requirement:'Must match state license',    value: ld.licensedCapacity || '', status: ld.licensedCapacity ? 'compliant' : 'nodata', fieldKey:'licensedCapacity', subTab:'licensing' },
        { label:'License certificate on file',  requirement:'Must be displayed',           value: ld.licenseCertOnFile || '', status: s(ld.licenseCertOnFile), fieldKey:'licenseCertOnFile', subTab:'licensing' },
        { label:'Required notices posted visibly',       requirement:'Required notices posted',     value: ld.postedNotices || '', status: s(ld.postedNotices), fieldKey:'postedNotices', subTab:'licensing' },
        { label:'Certificate of Insurance (COI) current',         requirement:'General liability required',  value: ld.coiOnFile || '', status: s(ld.coiOnFile), fieldKey:'gl_coi', subTab:'licensing' },
        { label:'GL coverage expiry',        requirement:'Must be current',             value: ld.glExpiry || '', status: ld.glExpiry ? 'compliant' : 'nodata', fieldKey:'glExpiry', subTab:'licensing' },
        { label:"Workers' comp current",        requirement:'Required in most states',     value: ld.workersCompCurrent || '', status: s(ld.workersCompCurrent), fieldKey:'workersCompCurrent', subTab:'licensing' },
        { label:'Last licensing inspection date',         requirement:'Annual inspection required',  value: ld.lastInspectionDate || center.lastInspection || '', status: (ld.lastInspectionDate || center.lastInspection) ? 'compliant' : 'nodata', fieldKey:'lastInspectionDate', subTab:'licensing' },
        { label:'Last inspection result',       requirement:'No open violations',          value: ld.lastInspectionResult || center.inspResult || '', status: (ld.lastInspectionResult || center.inspResult) ? ((ld.lastInspectionResult || center.inspResult).toLowerCase().includes('violation') || (ld.lastInspectionResult || center.inspResult).toLowerCase().includes('fail') ? 'atrisk' : 'compliant') : 'nodata', fieldKey:'lastInspectionResult', subTab:'licensing' },
        { label:'Licensing inspection report on file',    requirement:'Copy must be retained',       value: ld.inspectionReportOnFile || '', status: s(ld.inspectionReportOnFile), fieldKey:'inspection_report', subTab:'licensing' },
        { label:'Open violations count',        requirement:'Zero open violations',        value: ld.openViolationsCount !== undefined && ld.openViolationsCount !== '' ? `${ld.openViolationsCount}` : '', status: ld.openViolationsCount !== undefined && ld.openViolationsCount !== '' ? (parseInt(ld.openViolationsCount) > 0 ? 'atrisk' : 'compliant') : 'nodata', fieldKey:'openViolationsCount', subTab:'licensing' },
        { label:'QRIS enrolled',              requirement: reg?.qrs ? `${reg.qrs} enrollment` : 'Check state requirement', value: ld.qrisEnrolled || '', status: s(ld.qrisEnrolled, 'compliant', 'nodata'), fieldKey:'qrisStatus', subTab:'licensing' },
        { label:'QRIS current rating',          requirement:'Keep current',                value: ld.qrisRating || '', status: ld.qrisRating ? 'compliant' : 'nodata', fieldKey:'qrisStatus', subTab:'licensing' },
        { label:'Licensing agency contact on file', requirement:'Agency info required',    value: center.agency || reg?.agency || '', status: center.agency ? 'compliant' : 'nodata' },
      ],
    },

    // ── D2: Physical Environment ────────────────────────────────────────────
    {
      id:'d2', label:'Physical Environment', dNum:'D2',
      fields: [
        { label:'Total indoor sq ft',       requirement: rules.indoorSqft ? `Min ${rules.indoorSqft} sq ft per child` : 'Check state minimum', value: ld.indoorSqFtTotal ? `${ld.indoorSqFtTotal} sq ft` : '', status: ld.indoorSqFtTotal ? 'compliant' : 'nodata', fieldKey:'indoorSqft', subTab:'physical' },
        { label:'Total outdoor sq ft',      requirement: rules.outdoorSqft ? `Min ${rules.outdoorSqft} sq ft per child` : 'Check state minimum', value: ld.outdoorSqFtTotal ? `${ld.outdoorSqFtTotal} sq ft` : '', status: ld.outdoorSqFtTotal ? 'compliant' : 'nodata', fieldKey:'outdoorSqft', subTab:'physical' },
        { label:'Room capacity sign posted',         requirement:'Licensed capacity must be posted', value: ld.roomCapacityPosted || '', status: s(ld.roomCapacityPosted), fieldKey:'room_capacity_photo', subTab:'physical' },
        { label:'Floor plan on file',           requirement:'Filed with licensing agency', value: ld.floorPlanOnFile || '', status: s(ld.floorPlanOnFile), fieldKey:'floor_plan', subTab:'physical' },
        { label:'Hot water temperature',        requirement: rules.hotWaterMax ? `Max ${rules.hotWaterMax}°F at tap` : 'Max 120°F at tap', value: ld.hotWaterTemp ? `${ld.hotWaterTemp}°F` : '', status: ld.hotWaterTemp ? (parseFloat(ld.hotWaterTemp) <= (rules.hotWaterMax || 120) ? 'compliant' : 'missing') : 'nodata', fieldKey:'hotWaterTemp', subTab:'physical' },
        { label:'Child-accessible toilets (count)',     requirement: rules.toiletRatio ? `1 per ${rules.toiletRatio} children` : 'Check state ratio', value: ld.toiletCount ? `${ld.toiletCount} toilets` : '', status: ld.toiletCount ? 'compliant' : 'nodata', fieldKey:'toiletCount', subTab:'physical' },
        { label:'Hand-washing sinks (count)', requirement:'Accessible to children & staff', value: ld.sinkCount ? `${ld.sinkCount} sinks` : '', status: ld.sinkCount ? 'compliant' : 'nodata', fieldKey:'sinkCount', subTab:'physical' },
        { label:'Safe drinking water accessible',          requirement:'Accessible to all children',  value: ld.drinkingWater || '', status: s(ld.drinkingWater), fieldKey:'drinkingWater', subTab:'physical' },
        { label:'CO detectors installed',       requirement:'Required — tested monthly',   value: ld.coDetectors || '', status: s(ld.coDetectors), fieldKey:'coDetector', subTab:'physical' },
        { label:'Smoke detectors installed',      requirement:'Required on each level',      value: ld.smokeDetectors || '', status: s(ld.smokeDetectors), fieldKey:'smokeDetectors', subTab:'physical' },
        { label:'Fire extinguishers current',   requirement:'Accessible and inspected',    value: ld.fireExtinguishers || '', status: s(ld.fireExtinguishers), fieldKey:'fireExtinguishers', subTab:'physical' },
        { label:'Emergency lighting functional',requirement:'Required in all classrooms',  value: ld.emergencyLighting || '', status: s(ld.emergencyLighting, 'compliant', 'nodata'), fieldKey:'emergencyLighting', subTab:'physical' },
        { label:'Exit signs posted',            requirement:'At all required exits',       value: ld.exitSigns || '', status: s(ld.exitSigns), fieldKey:'exit_signs_photo', subTab:'physical' },
        { label:'Fencing height (ft)',     requirement: rules.minFencingHeight ? `Min ${rules.minFencingHeight} ft` : 'Required for outdoor areas', value: ld.fencingHeight ? `${ld.fencingHeight} ft` : '', status: ld.fencingHeight ? 'compliant' : 'nodata', fieldKey:'fencingCompliant', subTab:'physical' },
        { label:'Gate self-latching',           requirement:'Self-latching gate required', value: ld.gateSelfLatching || '', status: s(ld.gateSelfLatching), fieldKey:'gate_photo', subTab:'physical' },
        { label:'Resilient surfacing under equipment',requirement:'Under all climbing equipment',value: ld.resilientSurfacing || '', status: s(ld.resilientSurfacing), fieldKey:'surfacing_photo', subTab:'physical' },
        { label:'Equipment age-appropriate and in good repair',    requirement:'Must match enrolled age groups', value: ld.equipmentAgeAppropriate || '', status: s(ld.equipmentAgeAppropriate, 'compliant', 'nodata'), fieldKey:'equipmentAgeAppropriate', subTab:'physical' },
        { label:'Hazardous materials stored safely', requirement:'Locked, inaccessible to children', value: ld.hazMatStorage || '', status: s(ld.hazMatStorage), fieldKey:'hazMatStorage', subTab:'physical' },
        { label:'Facility inspection current',  requirement:'From licensing authority',    value: ld.facilityInspCurrent || '', status: s(ld.facilityInspCurrent), fieldKey:'facility_inspection_report', subTab:'physical' },
      ],
    },

    // ── D3: Personnel & Qualifications ─────────────────────────────────────
    {
      id:'d3', label:'Personnel & Qualifications', dNum:'D3',
      fields: [
        { label:'Director education level',     requirement: reg?.directorReq || 'BA + experience required', value: ld.directorEducation || '', status: ld.directorEducation ? 'compliant' : 'nodata', fieldKey:'directorEducation', subTab:'personnel' },
        { label:'Director qualification pathway', requirement:'Must meet state pathway',  value: ld.directorQualPathway || '', status: ld.directorQualPathway ? 'compliant' : 'nodata', fieldKey:'directorQualPathway', subTab:'personnel' },
        { label:'Director credential on file',  requirement:'Current credential required', value: ld.directorCredential || '', status: ld.directorCredential ? 'compliant' : 'nodata', fieldKey:'directorQualPathway', subTab:'personnel' },
        { label:'Lead teacher qualification met', requirement: reg?.teacherReq || 'CDA or equivalent required', value: ld.leadTeacherQualMet || '', status: s(ld.leadTeacherQualMet), fieldKey:'leadTeacherQualMet', subTab:'personnel' },
        { label:'Lead teacher CPR current',     requirement:'Valid CPR cert on file',      value: ld.ltCPRCurrent || '', status: s(ld.ltCPRCurrent), fieldKey:'cprCertOnFile', subTab:'staffhealth' },
        { label:'BG check complete — all staff', requirement: rules.bgCheckType || 'State + FBI fingerprint', value: ld.bgCheckComplete || '', status: s(ld.bgCheckComplete), fieldKey:'bgCheckType', subTab:'personnel' },
        { label:'State BG check clearance on file', requirement:'State background check cleared', value: ld.stateBgCheckDate || '', status: ld.stateBgCheckDate ? 'compliant' : 'nodata', fieldKey:'bgCheckType', subTab:'personnel' },
        { label:'FBI fingerprint clearance on file', requirement:'FBI fingerprint cleared', value: ld.fbiBgCheckDate || '', status: ld.fbiBgCheckDate ? 'compliant' : 'nodata', fieldKey:'bgCheckType', subTab:'personnel' },
        { label:'Child abuse registry check',   requirement:'Required in most states',     value: ld.caRegistryCheck || '', status: s(ld.caRegistryCheck), fieldKey:'bgCheckType', subTab:'personnel' },
        { label:'Workforce registry enrolled',  requirement: rules.workforceRegistry && rules.workforceRegistry !== 'No' ? rules.workforceRegistry : 'Check state requirement', value: ld.workforceRegistryEnrolled || '', status: rules.workforceRegistry && rules.workforceRegistry !== 'No' ? s(ld.workforceRegistryEnrolled) : 'compliant', fieldKey:'bgCheckType', subTab:'personnel' },
        { label:'Director on duty policy on file', requirement:'Check state requirements', value: ld.directorOnDutyPolicy || '', status: s(ld.directorOnDutyPolicy, 'compliant', 'nodata'), fieldKey:'directorOnDutyPolicy', subTab:'personnel' },
        { label:'Aide age requirement met (18+)', requirement:'Must meet state minimum',   value: ld.aideAgeReq || '', status: s(ld.aideAgeReq), fieldKey:'aideAgeReq', subTab:'personnel' },
        { label:'Volunteer BG check policy',    requirement:'Written policy required',     value: ld.volunteerBgPolicy || '', status: s(ld.volunteerBgPolicy, 'compliant', 'nodata'), fieldKey:'volunteerBgPolicy', subTab:'personnel' },
      ],
    },

    // ── D4: Ratios & Supervision ────────────────────────────────────────────
    {
      id:'d4', label:'Ratios & Supervision', dNum:'D4',
      fields: (center.ratios || []).map(r => {
        const grpLower = (r.group || '').toLowerCase();
        const fk = grpLower.includes('infant') ? 'infantEnrollment'
          : grpLower.includes('toddler') ? 'olderToddlerEnrollment'
          : grpLower.includes('preschool') || grpLower.includes('3') ? 'preschoolEnrollment'
          : 'schoolAgeEnrollment';
        return {
          label: `${r.group} ratio`,
          requirement: `State max: 1:${r.max}`,
          value: `${r.ratio} (${r.children}ch / ${r.staff}st)`,
          status: r.compliant ? 'compliant' : 'missing',
          fieldKey: fk, subTab: 'ratios',
        };
      }).concat([
        { label:'Infant group size compliant',    requirement:'Check state group size cap', value: ld.infantGroupSize ? `${ld.infantGroupSize}` : '', status: ld.infantGroupSize ? 'compliant' : 'nodata', fieldKey:'infantEnrollment', subTab:'ratios' },
        { label:'Preschool group size compliant', requirement:'Check state group size cap', value: ld.preschoolGroupSize ? `${ld.preschoolGroupSize}` : '', status: ld.preschoolGroupSize ? 'compliant' : 'nodata', fieldKey:'preschoolEnrollment', subTab:'ratios' },
        { label:'Sign-in / sign-out log maintained', requirement:'Daily records required', value: ld.signInLogMaintained || '', status: s(ld.signInLogMaintained), fieldKey:'signInLogMaintained', subTab:'ratios' },
        { label:'Minimum staff on duty met',      requirement:'Always maintain minimum',   value: ld.minStaffOnDuty || '', status: s(ld.minStaffOnDuty), fieldKey:'minStaffOnDuty', subTab:'ratios' },
        { label:'CPR-certified staff on duty',    requirement:'Required at all times',     value: ld.cprStaffOnDuty || '', status: s(ld.cprStaffOnDuty), fieldKey:'cprStaffOnDuty', subTab:'ratios' },
        { label:'Staff schedule on file',         requirement:'Record per shift',          value: ld.staffScheduleOnFile || '', status: s(ld.staffScheduleOnFile, 'compliant', 'nodata'), fieldKey:'staffScheduleOnFile', subTab:'ratios' },
      ]),
    },

    // ── D5: Staff Health & Training ─────────────────────────────────────────
    {
      id:'d5', label:'Staff Health & Training', dNum:'D5',
      fields: [
        { label:'Staff physical exam on file — all staff',  requirement:'At hire; renewal per state',  value: ld.staffPhysicalOnFile || '', status: s(ld.staffPhysicalOnFile), fieldKey:'staffPhysicalOnFile', subTab:'staffhealth' },
        { label:'TB screening complete — all staff',        requirement: rules.tbTestReq || 'At hire; renewal varies', value: ld.tbScreeningComplete || ld.tbScreening || '', status: s(ld.tbScreeningComplete || ld.tbScreening), fieldKey:'tbScreening', subTab:'staffhealth' },
        { label:'TB test date on file',         requirement:'Test date must be recorded',  value: ld.tbTestDate || '', status: ld.tbTestDate ? 'compliant' : 'nodata', fieldKey:'tbScreening', subTab:'staffhealth' },
        { label:'CPR certification on file — required staff',  requirement: `Current cert · Renewal: ${rules.cprRenewal || '2 years'}`, value: ld.cprCertOnFile || '', status: s(ld.cprCertOnFile), fieldKey:'cprCertOnFile', subTab:'staffhealth' },
        { label:'CPR certification date on file', requirement:'Date must be recorded',     value: ld.cprCertDate || '', status: ld.cprCertDate ? 'compliant' : 'nodata', fieldKey:'cprCertOnFile', subTab:'staffhealth' },
        { label:'First aid certification current', requirement:'Must be current',          value: ld.firstAidCurrent || '', status: s(ld.firstAidCurrent), fieldKey:'cprCertOnFile', subTab:'staffhealth' },
        { label:'Mandated reporter training complete',   requirement: rules.mandatedReporterRenewal || 'Renewal required', value: ld.mrTrainingComplete || ld.mandatedReporter || '', status: s(ld.mrTrainingComplete || ld.mandatedReporter), fieldKey:'mandatedReporter', subTab:'staffhealth' },
        { label:'Mandated reporter training date', requirement:'Date must be recorded',    value: ld.mrTrainingDate || '', status: ld.mrTrainingDate ? 'compliant' : 'nodata', fieldKey:'mandatedReporter', subTab:'staffhealth' },
        { label:'Annual training hours completed',        requirement: rules.trainingHrs ? `${rules.trainingHrs} hrs/year` : 'Check state requirement', value: ld.annualTrainingHrs ? `${ld.annualTrainingHrs} hrs` : '', status: ld.annualTrainingHrs ? 'compliant' : 'nodata', fieldKey:'trainingHrs', subTab:'staffhealth' },
        { label:'Training log on file',         requirement:'All training documented',     value: ld.trainingLogOnFile || '', status: s(ld.trainingLogOnFile, 'compliant', 'nodata'), fieldKey:'trainingHrs', subTab:'staffhealth' },
        { label:'Safe sleep training — infant staff', requirement:'Required for infant staff',   value: ld.safeSleepTraining || '', status: s(ld.safeSleepTraining), fieldKey:'safeSleepTraining', subTab:'staffhealth' },
        { label:'Standard precautions training current',requirement:'Annual renewal required',     value: ld.standardPrecautions || '', status: s(ld.standardPrecautions), fieldKey:'standardPrecautions', subTab:'staffhealth' },
        { label:'Orientation complete',        requirement:'Prior to working with children', value: ld.orientationComplete || '', status: s(ld.orientationComplete), fieldKey:'orientationComplete', subTab:'staffhealth' },
        { label:'Illness exclusion policy posted', requirement:'Must be visible to parents', value: ld.illnessExclusionPosted || '', status: s(ld.illnessExclusionPosted), fieldKey:'illness_exclusion_posted_photo', subTab:'staffhealth' },
        { label:'Abuse reporting procedure posted', requirement:'Must be visibly posted',  value: ld.abuseReportingPosted || '', status: s(ld.abuseReportingPosted), fieldKey:'abuse_reporting_posted_photo', subTab:'staffhealth' },
        { label:'Hotline number posted',        requirement:'Child abuse hotline visible', value: ld.hotlinePosted || '', status: s(ld.hotlinePosted), fieldKey:'hotline_posted_photo', subTab:'staffhealth' },
        ...(center.staff || []).slice(0, 6).map(s_item => ({
          label: `${s_item.name} — CPR current`,
          requirement: 'Must be valid and on file',
          value: s_item.cpr || '',
          status: s_item.cpr && new Date(s_item.cpr.split(' ')[0]) > new Date() ? 'compliant' : s_item.cpr ? 'missing' : 'nodata',
        })),
      ],
    },

    // ── D6: Children's Records & Health ────────────────────────────────────
    {
      id:'d6', label:"Children's Records & Health", dNum:'D6',
      fields: [
        { label:'Child enrollment record complete — all children', requirement:'Full record per child',  value: ld.enrollRecordComplete || ld.childEnrollmentComplete || '', status: s(ld.enrollRecordComplete || ld.childEnrollmentComplete), fieldKey:'childEnrollmentComplete', subTab:'children' },
        { label:'Emergency contacts on file — all children',   requirement:'Min 2 contacts per child',    value: ld.emergContactsOnFile || ld.emergencyContacts || '', status: s(ld.emergContactsOnFile || ld.emergencyContacts), fieldKey:'emergencyContacts', subTab:'children' },
        { label:'Authorized pickup list on file — all children', requirement:'Written authorization required', value: ld.authPickupOnFile || '', status: s(ld.authPickupOnFile), fieldKey:'authPickupOnFile', subTab:'children' },
        { label:'Parent / guardian agreement signed — all children',      requirement:'Signed copies on file',       value: ld.parentAgreementSigned || '', status: s(ld.parentAgreementSigned), fieldKey:'parentAgreementSigned', subTab:'children' },
        { label:'Custody orders on file',       requirement:'Where applicable',            value: ld.custodyOrdersOnFile || '', status: s(ld.custodyOrdersOnFile, 'compliant', 'nodata'), fieldKey:'custodyOrdersOnFile', subTab:'children' },
        { label:'Allergy documentation on file — all children',requirement:'Required for each child w/ allergy', value: ld.allergyDocOnFile || '', status: s(ld.allergyDocOnFile), fieldKey:'allergyDocOnFile', subTab:'children' },
        { label:'Allergy care plan on file',    requirement:'Required for diagnosed children', value: ld.allergyCareplan || '', status: s(ld.allergyCareplan), fieldKey:'allergyCareplan', subTab:'children' },
        { label:'Emergency medication on site', requirement:'EpiPen if child enrolled w/ allergy', value: ld.epiPenOnSite || '', status: s(ld.epiPenOnSite, 'compliant', 'nodata'), fieldKey:'allergyCareplan', subTab:'children' },
        { label:'Medication administration log maintained', requirement:'Required for administered meds', value: ld.medLogMaintained || ld.medAdminPolicy || '', status: s(ld.medLogMaintained || ld.medAdminPolicy), fieldKey:'medAdminPolicy', subTab:'children' },
        { label:'Medications stored correctly', requirement:'Locked; labeled; temp-controlled', value: ld.medsStoredCorrectly || '', status: s(ld.medsStoredCorrectly), fieldKey:'medAdminPolicy', subTab:'children' },
        { label:'Immunization records on file — all children', requirement: `Up to date · Exemptions: ${rules.immExemptions || 'Medical only'}`, value: ld.immRecordsOnFile || ld.immunizationRecords || '', status: s(ld.immRecordsOnFile || ld.immunizationRecords), fieldKey:'immunizationRecords', subTab:'children' },
        { label:'Immunization records current', requirement:'All children up to date',     value: ld.immRecordsCurrent || '', status: s(ld.immRecordsCurrent), fieldKey:'immunizationRecords', subTab:'children' },
        { label:'Written policies acknowledged',requirement:'Signed by all families',      value: ld.writtenPoliciesAck || '', status: s(ld.writtenPoliciesAck, 'compliant', 'nodata'), fieldKey:'parentAgreementSigned', subTab:'children' },
        { label:'Safe sleep policy on file',    requirement:'Signed by all infant families', value: ld.safeSleepPolicy || '', status: s(ld.safeSleepPolicy), fieldKey:'safeSleepPolicy', subTab:'children' },
        { label:'Infant sleep environment compliant', requirement:'Safe sleep standards met', value: ld.infantSleepEnv || '', status: s(ld.infantSleepEnv), fieldKey:'safeSleepPolicy', subTab:'children' },
        { label:'Daily attendance record on file',     requirement:'Required every operating day', value: ld.attendanceRecordOnFile || '', status: s(ld.attendanceRecordOnFile), fieldKey:'attendanceRecordOnFile', subTab:'children' },
        { label:'Incident / accident log on file', requirement:'All incidents documented', value: ld.incidentReportLog || '', status: s(ld.incidentReportLog, 'compliant', 'nodata'), fieldKey:'incidentReportLog', subTab:'children' },
      ],
    },

    // ── D7: Emergency & Safety ──────────────────────────────────────────────
    {
      id:'d7', label:'Emergency & Safety', dNum:'D7',
      fields: [
        { label:'Fire evacuation plan on file',  requirement:'Current plan required',      value: ld.fireEvacPlan || '', status: s(ld.fireEvacPlan), fieldKey:'fireEvacPlan', subTab:'emergency' },
        { label:'Fire evacuation plan posted visibly',   requirement:'Posted in each classroom',   value: ld.fireEvacPosted || '', status: s(ld.fireEvacPosted), fieldKey:'fire_evac_posted_photo', subTab:'emergency' },
        { label:'Last fire drill date',           requirement: `Required: ${rules.fireDrillFreq || 'Monthly'}`, value: ld.lastFireDrillDate || '', status: ld.lastFireDrillDate ? 'compliant' : 'nodata', fieldKey:'lastFireDrillDate', subTab:'emergency' },
        { label:'Fire drills completed (12 mo)', requirement:'All required drills done',   value: ld.fireDrillsCompleted ? `${ld.fireDrillsCompleted}` : '', status: ld.fireDrillsCompleted ? 'compliant' : 'nodata', fieldKey:'lastFireDrillDate', subTab:'emergency' },
        { label:'Fire drill log on file',        requirement:'All drills must be logged',  value: ld.fireDrillLog || '', status: s(ld.fireDrillLog), fieldKey:'fire_drill_log', subTab:'emergency' },
        { label:'Fire safety training — all staff', requirement:'All staff trained',          value: ld.fireSafetyTraining || '', status: s(ld.fireSafetyTraining), fieldKey:'fireSafetyTraining', subTab:'emergency' },
        { label:'Fire department inspection current',  requirement:'From local fire authority',  value: ld.fireDeptInspCurrent || '', status: s(ld.fireDeptInspCurrent), fieldKey:'fire_dept_inspection_report', subTab:'emergency' },
        { label:'Fire alarm system tested',      requirement:'Must be tested regularly',   value: ld.fireAlarmTested || '', status: s(ld.fireAlarmTested, 'compliant', 'nodata'), fieldKey:'fireAlarmTested', subTab:'emergency' },
        { label:'Last tornado drill date',      requirement: rules.tornadoDrill || '2x per year', value: ld.lastTornadoDrillDate || '', status: ld.lastTornadoDrillDate ? 'compliant' : 'nodata', fieldKey:'lastTornadoDrillDate', subTab:'emergency' },
        { label:'Tornado drill log on file',     requirement:'All drills must be logged',  value: ld.tornadoDrillLog || '', status: s(ld.tornadoDrillLog, 'compliant', 'nodata'), fieldKey:'tornado_drill_log', subTab:'emergency' },
        { label:'Shelter area identified',       requirement:'Designated shelter required', value: ld.shelterAreaIdentified || '', status: s(ld.shelterAreaIdentified), fieldKey:'emergency_plan', subTab:'emergency' },
        { label:'Last lockdown drill date',       requirement: rules.lockdownDrill || '2x per year', value: ld.lastLockdownDate || '', status: ld.lastLockdownDate ? 'compliant' : 'nodata', fieldKey:'lastLockdownDate', subTab:'emergency' },
        { label:'Lockdown drill log on file',    requirement:'All drills must be logged',  value: ld.lockdownDrillLog || '', status: s(ld.lockdownDrillLog), fieldKey:'lockdown_drill_log', subTab:'emergency' },
        { label:'Written emergency plan on file',        requirement:'Annual review required',     value: ld.emergPlanOnFile || '', status: s(ld.emergPlanOnFile), fieldKey:'emergencyPlan', subTab:'emergency' },
        { label:'Emergency plan reviewed annually', requirement:'Must be reviewed yearly', value: ld.emergPlanReviewed || '', status: s(ld.emergPlanReviewed, 'compliant', 'nodata'), fieldKey:'emergencyPlan', subTab:'emergency' },
        { label:'Emergency plan communicated',   requirement:'All staff must know plan',   value: ld.emergPlanComm || '', status: s(ld.emergPlanComm, 'compliant', 'nodata'), fieldKey:'emergencyPlan', subTab:'emergency' },
        { label:'Emergency contact list current',requirement:'Fire, police, poison control, DSS', value: ld.emergContactListCurrent || '', status: s(ld.emergContactListCurrent), fieldKey:'emergency_contacts_photo', subTab:'emergency' },
        { label:'Relocation site identified',    requirement:'Off-site evacuation site named', value: ld.relocationSite || '', status: s(ld.relocationSite), fieldKey:'emergency_plan', subTab:'emergency' },
        { label:'Health department inspection current',     requirement:'From licensing authority',   value: ld.healthInspCurrent || '', status: s(ld.healthInspCurrent), fieldKey:'health_inspection_report', subTab:'emergency' },
        { label:'Open health violations',        requirement:'Zero open violations',       value: ld.openHealthViolations !== undefined && ld.openHealthViolations !== '' ? `${ld.openHealthViolations}` : '', status: ld.openHealthViolations !== undefined && ld.openHealthViolations !== '' ? (parseInt(ld.openHealthViolations) > 0 ? 'atrisk' : 'compliant') : 'nodata', fieldKey:'health_inspection_report', subTab:'emergency' },
        { label:'First aid kit accessible — fully stocked',      requirement:'Must be accessible at all times', value: ld.firstAidKit || '', status: s(ld.firstAidKit), fieldKey:'firstAidKit', subTab:'emergency' },
        { label:'First aid kit contents current — no expired items',requirement:'Contents must be current',   value: ld.firstAidKitContents || '', status: s(ld.firstAidKitContents), fieldKey:'firstAidKitContents', subTab:'emergency' },
        { label:'Communication device available',requirement:'Phone or radio available',   value: ld.commDeviceAvailable || '', status: s(ld.commDeviceAvailable), fieldKey:'emergency_plan', subTab:'emergency' },
        { label:'Water safety plan on file (if pool / water feature)',     requirement:'Required where applicable',  value: ld.waterSafetyPlan || '', status: s(ld.waterSafetyPlan, 'compliant', 'nodata'), fieldKey:'waterSafetyPlan', subTab:'emergency' },
        { label:'Food service permit current',   requirement:'Required if meals served',   value: ld.foodServicePermit || '', status: s(ld.foodServicePermit), fieldKey:'food_service_permit', subTab:'emergency' },
        { label:'All drill logs retained',       requirement:'Required for inspection',    value: ld.allDrillLogsRetained || '', status: s(ld.allDrillLogsRetained, 'compliant', 'nodata'), fieldKey:'fire_drill_log', subTab:'emergency' },
      ],
    },
  ];
}

// Compute per-domain { issues, nodata, met, topIssue } from getDomainFields
export function getDomainCounts(center, reg, liveData = {}) {
  return getDomainFields(center, reg, liveData).map(d => {
    const issues = d.fields.filter(f => f.status === 'missing' || f.status === 'atrisk');
    const nodata = d.fields.filter(f => f.status === 'nodata');
    const met    = d.fields.filter(f => f.status === 'compliant');
    return { issues, nodata, met, topIssue: issues[0] || nodata[0] || null };
  });
}

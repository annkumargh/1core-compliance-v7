import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getReg } from '../regulations';
import { LIONHEART_SEED } from '../lionheartSeed';
import { CENTERS } from '../centers';
import StateRulesTab from './tabs/StateRulesTab';
import ChangeLogTab  from './tabs/ChangeLogTab';
import InspectionReportExport from './tabs/InspectionReportExport';

const SESSION_HOURS=8, LS_KEY_MAIN='1core_compliance_v6', LS_KEY_FINDINGS='1core_compliance_v6_inspector_findings', LS_KEY_PHOTOS='1core_compliance_v6_inspector_photos', LS_KEY_FIELDCFG='1core_compliance_v6_inspector_fieldcfg', DEFAULT_CENTER_ID='1292_Lionheart_-_RCCO';

function Icon({name,size=14,color='currentColor',style:x}){
  const s={width:size,height:size,flexShrink:0,...x};
  const p={fill:'none',stroke:color,strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round'};
  const ic={
    eye:<svg {...s} viewBox="0 0 24 24" {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    map:<svg {...s} viewBox="0 0 24 24" {...p}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
    history:<svg {...s} viewBox="0 0 24 24" {...p}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>,
    clipboard:<svg {...s} viewBox="0 0 24 24" {...p}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>,
    folder:<svg {...s} viewBox="0 0 24 24" {...p}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
    building:<svg {...s} viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>,
    check:<svg {...s} viewBox="0 0 24 24" {...p}><polyline points="20 6 9 17 4 12"/></svg>,
    x:<svg {...s} viewBox="0 0 24 24" {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    alert:<svg {...s} viewBox="0 0 24 24" {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    edit:<svg {...s} viewBox="0 0 24 24" {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    mic:<svg {...s} viewBox="0 0 24 24" {...p}><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
    stop:<svg {...s} viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="18" height="18" rx="2"/></svg>,
    camera:<svg {...s} viewBox="0 0 24 24" {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    chevron:<svg {...s} viewBox="0 0 24 24" {...p}><polyline points="6 9 12 15 18 9"/></svg>,
    shield:<svg {...s} viewBox="0 0 24 24" {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    clock:<svg {...s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    file:<svg {...s} viewBox="0 0 24 24" {...p}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
    printer:<svg {...s} viewBox="0 0 24 24" {...p}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
    settings:<svg {...s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    lock:<svg {...s} viewBox="0 0 24 24" {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    arrow:<svg {...s} viewBox="0 0 24 24" {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
    plus:<svg {...s} viewBox="0 0 24 24" {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    info:<svg {...s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    user:<svg {...s} viewBox="0 0 24 24" {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    minus:<svg {...s} viewBox="0 0 24 24" {...p}><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  };
  return ic[name]||null;
}

const INSP_TYPES=[
  {id:'real',      label:'Real Inspection',  icon:'shield',   desc:'State-appointed inspector — official licensing inspection',color:'#b91c1c',bg:'#fdf1f1',bd:'#e8a0a0',subset:false,configurable:false},
  {id:'center-sim',label:'Center-Simulated', icon:'building', desc:'Director or owner configures which fields to assess',      color:'#b45309',bg:'#fdf4e7',bd:'#e6b87a',subset:true, configurable:true },
  {id:'system-sim',label:'System-Simulated', icon:'settings', desc:'Automated — random 15% of controls selected by system',   color:'#4f5fa8',bg:'#eef4fc',bd:'#a8c4e0',subset:true, configurable:false},
];

const FIELD_STATUSES=[
  {id:'compliant',   label:'Compliant',    icon:'check', bg:'var(--compliant-bg)', bd:'var(--compliant-border)',color:'var(--compliant-text)'},
  {id:'noncompliant',label:'Non-Compliant',icon:'x',     bg:'var(--critical-bg)',  bd:'var(--critical-border)', color:'var(--critical-text)'},
  {id:'atrisk',      label:'At Risk',      icon:'alert', bg:'var(--atrisk-bg)',    bd:'var(--atrisk-border)',   color:'var(--atrisk-text)'},
  {id:'corrected',   label:'Corrected',    icon:'edit',  bg:'var(--info-bg)',      bd:'var(--info-border)',     color:'var(--info-text)'},
  {id:'notobserved', label:'Not Observed', icon:'eye',   bg:'#f1f5f9',             bd:'#cbd5e1',                color:'#475569'},
];
const STATUS_IDS=FIELD_STATUSES.map(s=>s.id);
const STATUS_MAP=Object.fromEntries(FIELD_STATUSES.map(s=>[s.id,s]));
const KEY_MAP={c:'compliant',n:'noncompliant',a:'atrisk',x:'notobserved',r:'corrected'};
const D_COLORS=['#4f5fa8','#0891b2','#7c3aed','#b45309','#15803d','#be185d','#0f766e'];
const FIELD_REF_MAP={licenseNumber:'ratios',licenseExpiry:'ratios',licCertOnFile:'ratios',indoorSqft:'indoorSqft',outdoorSqft:'outdoorSqft',hotWaterMaxTemp:'hotWaterMax',fencingHeightFt:'fencingMin',fencingEnclosesPlayArea:'fencingMin',toiletCompliant:'toiletRatio',directorName:'directorReq',directorEduLevel:'directorReq',directorYearsExp:'directorReq',teacherEduMeetsReq:'teacherReq',teacherMinAgeCompliant:'teacherReq',bgCheckType:'bgCheckType',bgValid:'bgCheckType',fbiClearance:'bgCheckType',childAbuseRegistry:'bgCheckType',workforceRegistry:'workforceRegistry',cprCertValid:'cprRenewal',cprExpiryDate:'cprRenewal',firstAidCertValid:'cprRenewal',tbScreeningAllStaff:'tbTestReq',trainingHrs:'trainingHrs',mandatedReporterDone:'mandatedReporter',lastFireDrillDate:'fireDrill',fireDrillLog:'fireDrill',fireSafetyTraining:'fireDrill'};

function loadFindings(id){try{return JSON.parse(localStorage.getItem(LS_KEY_FINDINGS))?.[id]||{};}catch{return {};}}
function saveFindings(id,d){try{const a=JSON.parse(localStorage.getItem(LS_KEY_FINDINGS))||{};a[id]=d;localStorage.setItem(LS_KEY_FINDINGS,JSON.stringify(a));}catch{}}
function loadCenterData(id){try{return JSON.parse(localStorage.getItem(LS_KEY_MAIN))?.[id]||{};}catch{return {};}}
function loadPhotos(id){try{return JSON.parse(localStorage.getItem(LS_KEY_PHOTOS))?.[id]||{};}catch{return {};}}
function savePhotos(id,d){try{const a=JSON.parse(localStorage.getItem(LS_KEY_PHOTOS))||{};a[id]=d;localStorage.setItem(LS_KEY_PHOTOS,JSON.stringify(a));}catch{}}
function loadFieldCfg(id){try{return JSON.parse(localStorage.getItem(LS_KEY_FIELDCFG))?.[id]||null;}catch{return null;}}
function saveFieldCfg(id,d){try{const a=JSON.parse(localStorage.getItem(LS_KEY_FIELDCFG))||{};a[id]=d;localStorage.setItem(LS_KEY_FIELDCFG,JSON.stringify(a));}catch{}}
function selectSubset(domains,pct=0.15){const s=new Set();domains.forEach(d=>{const sh=[...d.fields].sort(()=>Math.random()-0.5);sh.slice(0,Math.max(1,Math.round(d.fields.length*pct))).forEach(f=>s.add(f.id));});return s;}
function getDomainFields(center,reg,liveData){
  // Reads from flat liveData (DataEntryTab storage format)
  // liveData may be nested {data:{...}} or flat
  const ld=liveData?.data||liveData||{};
  const rules=reg?.rules||{};
  const seed=LIONHEART_SEED[center.id]||{};
  const v=x=>(x&&x!=='')?x:'—';
  return [
    {id:'d1',label:'Licensing & Administration',dNum:'D1',color:D_COLORS[0],fields:[
      {id:'licenseNumber',label:'License number',value:v(ld.licenseNumber||seed._licenseNumber)},
      {id:'licenseIssueDate',label:'License issue date',fieldNum:'D1-036',value:v(ld.licenseIssueDate)},
      {id:'licenseClass',label:'License class / type',value:v(ld.licenseClass)},
      {id:'licenseExpiry',label:'License expiry date',value:v(ld.licenseExpiry)},
      {id:'licenseRenewalDate',label:'License renewal date',value:v(ld.licenseRenewalDate)},
      {id:'licensedCapacity',label:'Licensed capacity (max children)',value:v(ld.licensedCapacity)},
      {id:'facilityNumber',label:'Facility / permit number',value:v(ld.facilityNumber)},
      {id:'licenseCertOnFile',label:'License certificate on file',value:v(ld.licenseCertOnFile)},
      {id:'postedNotices',label:'Required notices posted visibly',value:v(ld.postedNotices)},
      {id:'glInsuranceProvider',label:'GL insurance carrier name',value:v(ld.glInsuranceProvider)},
      {id:'glPolicyNumber',label:'GL policy number',value:v(ld.glPolicyNumber)},
      {id:'glCoverageAmount',label:'GL coverage amount',value:v(ld.glCoverageAmount)},
      {id:'glExpiry',label:'GL coverage expiry',value:v(ld.glExpiry)},
      {id:'workersCompExpiry',label:"Workers' comp expiry",value:v(ld.workersCompExpiry)},
      {id:'workersCompCurrent',label:"Workers' comp current",value:v(ld.workersCompCurrent)},
      {id:'coiOnFile',label:'Certificate of Insurance (COI) current',value:v(ld.coiOnFile)},
      {id:'propertyInsurance',label:'Property insurance on file',value:v(ld.propertyInsurance)},
      {id:'lastInspectionDate',label:'Last licensing inspection date',value:v(ld.lastInspectionDate)},
      {id:'lastInspectionResult',label:'Last inspection result',value:v(ld.lastInspectionResult)},
      {id:'openViolationsCount',label:'Open violations count',value:v(ld.openViolationsCount)},
      {id:'prevInspectionDate',label:'Previous inspection date',value:v(ld.prevInspectionDate)},
      {id:'complaintInspections',label:'Complaint inspections (12 mo)',value:v(ld.complaintInspections)},
      {id:'inspectionReportOnFile',label:'Licensing inspection report on file',value:v(ld.inspectionReportOnFile)},
      {id:'qrisEnrolled',label:'QRIS enrolled',value:v(ld.qrisEnrolled),note:reg?.qrs||rules.qrisName||''},{id:'qrisRating',label:'QRIS current rating / level',value:v(ld.qrisRating)},
      {id:'qrisRenewalDate',label:'QRIS expiry / renewal date',value:v(ld.qrisRenewalDate)},
      {id:'licensingAgency',label:'Licensing agency name',value:v(ld.licensingAgency||reg?.agency)},
      {id:'agencyPhone',label:'Agency phone number',value:v(ld.agencyPhone||reg?.agencyPhone)},
      {id:'agencyWebsite',label:'Agency website',value:v(ld.agencyWebsite||reg?.agencyWebsite)},
      {id:'regulatoryCitation',label:'Regulatory citation',value:v(ld.regulatoryCitation||reg?.citation)},
      {id:'enablingStatute',label:'Enabling statute',value:v(ld.enablingStatute||reg?.enablingStatute)},
      {id:'regLastValidated',label:'State regulation last validated',value:v(ld.regLastValidated)},
      {id:'qrisType',label:'QRIS participation type',value:v(ld.qrisType||rules.qrisName)},
      {id:'insuranceRequired',label:'Insurance required (state)',value:v(ld.insuranceRequired||reg?.insuranceRequired)},
      {id:'inspPerYearMin',label:'Inspections per year (state min)',value:v(ld.inspPerYearMin||reg?.inspPerYear)},
    ]},
    {id:'d2',label:'Physical Environment',dNum:'D2',color:D_COLORS[1],fields:[
      {id:'indoorSqFtTotal',label:'Total indoor sq ft',value:v(ld.indoorSqFtTotal),note:`Req: ${reg?.indoorSqft||'?'}sq ft/child`},
      {id:'indoorSqFtPerChild',label:'Indoor sq ft per child (calc)',value:v(ld.indoorSqFtPerChild)},
      {id:'stateIndoorMin',label:'State indoor minimum (sq ft)',value:v(ld.stateIndoorMin||reg?.indoorSqft)},
      {id:'indoorSpaceCompliant',label:'Indoor space compliant',value:v(ld.indoorSpaceCompliant)},
      {id:'outdoorSqFtTotal',label:'Total outdoor sq ft',value:v(ld.outdoorSqFtTotal),note:`Req: ${reg?.outdoorSqft||'?'}sq ft/child`},
      {id:'outdoorSqFtPerChild',label:'Outdoor sq ft per child (calc)',value:v(ld.outdoorSqFtPerChild)},
      {id:'stateOutdoorMin',label:'State outdoor minimum (sq ft)',value:v(ld.stateOutdoorMin||reg?.outdoorSqft)},
      {id:'outdoorSpaceCompliant',label:'Outdoor space compliant',value:v(ld.outdoorSpaceCompliant)},
      {id:'roomCapacityPosted',label:'Room capacity sign posted',value:v(ld.roomCapacityPosted)},
      {id:'floorPlanOnFile',label:'Floor plan on file',value:v(ld.floorPlanOnFile)},
      {id:'hotWaterTemp',label:'Hot water temperature',value:v(ld.hotWaterTemp),note:`Max ${rules.hotWaterMax||110}°F`},
      {id:'stateHotWaterMax',label:'Hot water max (state)',value:v(ld.stateHotWaterMax||rules.hotWaterMax)},
      {id:'hotWaterCompliant',label:'Hot water compliant',value:v(ld.hotWaterCompliant)},
      {id:'toiletCount',label:'Child-accessible toilets (count)',value:v(ld.toiletCount),note:rules.toiletRatio?`1:${rules.toiletRatio}`:''},{id:'toiletRatioCalc',label:'Toilet ratio (calc)',value:v(ld.toiletRatioCalc)},
      {id:'stateToiletRatio',label:'State toilet ratio minimum',value:v(ld.stateToiletRatio||rules.toiletRatio)},
      {id:'sinkCount',label:'Hand-washing sinks (count)',value:v(ld.sinkCount)},
      {id:'drinkingWater',label:'Safe drinking water accessible',value:v(ld.drinkingWater)},
      {id:'hazMatStorage',label:'Hazardous materials stored safely',value:v(ld.hazMatStorage)},
      {id:'chokeHazardPolicy',label:'Choke hazard policy (under 3)',value:v(ld.chokeHazardPolicy)},
      {id:'sharpToolPolicy',label:'Sharp tool storage policy',value:v(ld.sharpToolPolicy)},
      {id:'spacePolicyOnFile',label:'Written space policy on file',value:v(ld.spacePolicyOnFile)},
      {id:'adaCompliant',label:'ADA accessibility compliant',value:v(ld.adaCompliant)},
      {id:'smokeDetectors',label:'Smoke detectors installed',value:v(ld.smokeDetectors)},
      {id:'smokeDetectorTestDate',label:'Smoke detector test date',value:v(ld.smokeDetectorTestDate)},
      {id:'coDetectors',label:'CO detectors installed',value:v(ld.coDetectors)},
      {id:'coDetectorTestDate',label:'CO detector test date',value:v(ld.coDetectorTestDate)},
      {id:'stateFencingMin',label:'State fencing minimum (ft)',value:v(ld.stateFencingMin||rules.minFencingHeight)},
      {id:'fencingHeight',label:'Fencing height (ft)',value:v(ld.fencingHeight),note:`Min ${rules.minFencingHeight||'4'} ft`},
      {id:'fencingCompliant',label:'Fencing compliant',value:v(!ld.fencingHeight ? '' : parseFloat(ld.fencingHeight) >= (parseFloat(rules.minFencingHeight)||4) ? 'Yes' : 'No')},
      {id:'gateSelfLatching',label:'Gate self-latching',value:v(ld.gateSelfLatching)},
      {id:'shadeAvailable',label:'Shade available outdoors',value:v(ld.shadeAvailable)},
      {id:'resilientSurfacing',label:'Resilient surfacing under equipment',value:v(ld.resilientSurfacing)},
      {id:'equipmentAgeAppropriate',label:'Equipment age-appropriate and in good repair',value:v(ld.equipmentAgeAppropriate)},
      {id:'fireExtinguishers',label:'Fire extinguishers current',value:v(ld.fireExtinguishers)},
      {id:'fireExtInspDate',label:'Fire extinguisher inspection date',value:v(ld.fireExtInspDate)},
      {id:'emergencyLighting',label:'Emergency lighting functional',value:v(ld.emergencyLighting)},
      {id:'exitSigns',label:'Exit signs posted',value:v(ld.exitSigns)},
      {id:'facilityInspCurrent',label:'Facility inspection current',value:v(ld.facilityInspCurrent)},
      {id:'fireDeptInspDate',label:'Fire department inspection date',value:v(ld.fireDeptInspDate)},
      {id:'healthDeptInspDate',label:'Health department inspection date',value:v(ld.healthDeptInspDate)},
      {id:'firstAidKit',label:'First aid kit accessible — fully stocked',value:v(ld.firstAidKit)},
    ]},
    {id:'d3',label:'Personnel & Qualifications',dNum:'D3',color:D_COLORS[2],fields:[
      {id:'totalStaffCount',label:'Total staff count',value:v(ld.totalStaffCount)},
      {id:'leadTeacherCount',label:'Lead teacher count',value:v(ld.leadTeacherCount)},
      {id:'aideCount',label:'Aide count',value:v(ld.aideCount)},
      {id:'directorName',label:'Director full name',value:v(ld.directorName)},
      {id:'directorEducation',label:'Director education level',value:v(ld.directorEducation)},
      {id:'directorECECredits',label:'Director ECE credit hours',value:v(ld.directorECECredits)},
      {id:'directorExperience',label:'Director years experience',value:v(ld.directorExperience)},
      {id:'directorQualPathway',label:'Director qualification pathway',value:v(ld.directorQualPathway),note:reg?.directorReq||''},{id:'directorCredential',label:'Director credential name',value:v(ld.directorCredential)},
      {id:'directorCredExpiry',label:'Director credential expiry',value:v(ld.directorCredExpiry)},
      {id:'stateDirReq',label:'State director requirement',value:v(ld.stateDirReq||reg?.directorReq)},
      {id:'leadTeacherQualMet',label:'Lead teacher qualification met',value:v(ld.leadTeacherQualMet),note:reg?.teacherReq||''},{id:'leadTeacherEducation',label:'Lead teacher education level',value:v(ld.leadTeacherEducation)},
      {id:'leadTeacherOrientation',label:'Lead teacher orientation complete',value:v(ld.leadTeacherOrientation)},
      {id:'ltCPRCurrent',label:'Lead teacher CPR current',value:v(ld.ltCPRCurrent)},
      {id:'stateTeacherReq',label:'State teacher requirement',value:v(ld.stateTeacherReq||reg?.teacherReq)},
      {id:'aideAgeReq',label:'Aide age requirement met (18+)',value:v(ld.aideAgeReq)},
      {id:'aideOrientation',label:'Aide orientation complete',value:v(ld.aideOrientation)},
      {id:'aideSuperPolicy',label:'Aide supervision policy on file',value:v(ld.aideSuperPolicy)},
      {id:'bgCheckComplete',label:'BG check complete — all staff',value:v(ld.bgCheckComplete),note:rules.bgCheckType||''},{id:'stateBgCheckDate',label:'State BG check clearance date',value:v(ld.stateBgCheckDate)},
      {id:'fbiBgCheckDate',label:'FBI fingerprint clearance date',value:v(ld.fbiBgCheckDate)},
      {id:'bgCheckAgency',label:'BG check agency (state)',value:v(ld.bgCheckAgency||rules.bgCheckType)},
      {id:'caRegistryCheck',label:'Child abuse registry check',value:v(ld.caRegistryCheck)},
      {id:'preEmpAffidavit',label:'Pre-employment affidavit on file',value:v(ld.preEmpAffidavit)},
      {id:'volunteerBgPolicy',label:'Volunteer BG check policy',value:v(ld.volunteerBgPolicy)},
      {id:'workforceRegistryEnrolled',label:'Workforce registry enrolled',value:v(ld.workforceRegistryEnrolled),note:rules.workforceRegistry||''},{id:'stateRegistryName',label:'Registry name (state)',value:v(ld.stateRegistryName||rules.workforceRegistry)},
      {id:'registryProfileId',label:'Registry profile ID',value:v(ld.registryProfileId)},
      {id:'registryTrainingCurrent',label:'Registry training hours current',value:v(ld.registryTrainingCurrent)},
      {id:'overallRatioCompliant',label:'Staff-to-child ratio compliant (overall)',value:v(ld.overallRatioCompliant)},
      {id:'directorOnDutyPolicy',label:'Director on duty policy on file',value:v(ld.directorOnDutyPolicy)},
      {id:'asstDirQualified',label:'Assistant director qualified',value:v(ld.asstDirQualified)},
    ]},
    {id:'d4',label:'Ratios & Supervision',dNum:'D4',color:D_COLORS[3],isRatios:true,fields:[
      {id:'totalEnrollment',label:'Total enrollment',value:v(ld.totalEnrollment)},
      {id:'licensedCapacity',label:'Licensed capacity (max children)',value:v(ld.licensedCapacity)},
      {id:'enrollmentCapacityRatio',label:'Enrollment vs capacity ratio',value:v(ld.enrollmentCapacityRatio)},
      {id:'infantEnrollment',label:'Infant enrollment (0–12 mo)',value:v(ld.infantEnrollment),note:`Max 1:${reg?.infant||'?'}`,ratioGroup:'Infant',ratioType:'children'},{id:'infantStaffCount',label:'Infant — staff on duty',value:v(ld.infantStaffCount),ratioGroup:'Infant',ratioType:'staff'},
      {id:'infantRatioCalc',label:'Infant ratio (calc)',value:v(ld.infantRatioCalc)},
      {id:'stateInfantRatioMax',label:'State infant ratio max',value:v(ld.stateInfantRatioMax||reg?.infant)},
      {id:'infantRatioCompliant',label:'Infant ratio compliant',value:v(ld.infantRatioCompliant)},
      {id:'youngToddlerEnrollment',label:'Young toddler enrollment (12–17 mo)',value:v(ld.youngToddlerEnrollment)},
      {id:'olderToddlerEnrollment',label:'Older toddler enrollment (18–35 mo)',value:v(ld.olderToddlerEnrollment),note:`Max 1:${reg?.toddler||'?'}`,ratioGroup:'Toddler',ratioType:'children'},{id:'toddlerStaffCount',label:'Toddler — staff on duty',value:v(ld.toddlerStaffCount),ratioGroup:'Toddler',ratioType:'staff'},
      {id:'toddlerRatioCalc',label:'Toddler ratio (calc)',value:v(ld.toddlerRatioCalc)},
      {id:'stateToddlerRatioMax',label:'State toddler ratio max',value:v(ld.stateToddlerRatioMax||reg?.toddler)},
      {id:'toddlerRatioCompliant',label:'Toddler ratio compliant',value:v(ld.toddlerRatioCompliant)},
      {id:'preschoolEnrollment',label:'Preschool enrollment (3–5 yr)',value:v(ld.preschoolEnrollment),note:`Max 1:${reg?.preschool||'?'}`,ratioGroup:'Preschool',ratioType:'children'},{id:'preschoolStaffCount',label:'Preschool — staff on duty',value:v(ld.preschoolStaffCount),ratioGroup:'Preschool',ratioType:'staff'},
      {id:'preschoolRatioCalc',label:'Preschool ratio (calc)',value:v(ld.preschoolRatioCalc)},
      {id:'statePreschoolRatioMax',label:'State preschool ratio max',value:v(ld.statePreschoolRatioMax||reg?.preschool)},
      {id:'preschoolRatioCompliant',label:'Preschool ratio compliant',value:v(ld.preschoolRatioCompliant)},
      {id:'schoolAgeEnrollment',label:'School-age enrollment (K+)',value:v(ld.schoolAgeEnrollment),note:`Max 1:${reg?.schoolAge||'?'}`,ratioGroup:'School-age',ratioType:'children'},{id:'schoolAgeStaffCount',label:'School-age — staff on duty',value:v(ld.schoolAgeStaffCount),ratioGroup:'School-age',ratioType:'staff'},
      {id:'schoolAgeRatioCalc',label:'School-age ratio (calc)',value:v(ld.schoolAgeRatioCalc)},
      {id:'stateSchoolAgeRatioMax',label:'State school-age ratio max',value:v(ld.stateSchoolAgeRatioMax||reg?.schoolAge)},
      {id:'schoolAgeRatioCompliant',label:'School-age ratio compliant',value:v(ld.schoolAgeRatioCompliant)},
      {id:'infantGroupSize',label:'Infant group size',value:v(ld.infantGroupSize)},
      {id:'toddlerGroupSize',label:'Toddler group size',value:v(ld.toddlerGroupSize)},
      {id:'preschoolGroupSize',label:'Preschool group size',value:v(ld.preschoolGroupSize)},
      {id:'schoolAgeGroupSize',label:'School-age group size',value:v(ld.schoolAgeGroupSize)},
      {id:'mixedAgeGroup',label:'Mixed-age group present',value:v(ld.mixedAgeGroup)},
      {id:'naptimeRatioAdj',label:'Naptime ratio adjustment applied',value:v(ld.naptimeRatioAdj)},
      {id:'signInLogMaintained',label:'Daily sign-in/out log maintained',value:v(ld.signInLogMaintained)},
      {id:'signInLogRetention',label:'Sign-in log retention period',value:v(ld.signInLogRetention)},
      {id:'minStaffOnDuty',label:'Minimum staff on duty met',value:v(ld.minStaffOnDuty)},
      {id:'qualDirOnDuty',label:'Director or qualified designee on duty',value:v(ld.qualDirOnDuty)},
      {id:'cprStaffOnDuty',label:'CPR-certified staff on duty',value:v(ld.cprStaffOnDuty)},
      {id:'staffScheduleOnFile',label:'Staff schedule on file',value:v(ld.staffScheduleOnFile)},
      {id:'openCloseRatioCompliant',label:'Opening/closing ratio compliance',value:v(ld.openCloseRatioCompliant)},
      {id:'subStaffPolicy',label:'Substitute staff policy on file',value:v(ld.subStaffPolicy)},
      {id:'authorizedPickupCurrent',label:'Authorized pickup list current',value:v(ld.authorizedPickupCurrent)},
    ]},
    {id:'d5',label:'Staff Health & Training',dNum:'D5',color:D_COLORS[4],fields:[
      {id:'staffPhysicalOnFile',label:'Staff physical exam on file — all staff',value:v(ld.staffPhysicalOnFile)},
      {id:'staffPhysicalDate',label:'Most recent staff physical date',value:v(ld.staffPhysicalDate)},
      {id:'physicalRenewalRequired',label:'Physical exam renewal required (state)',value:v(ld.physicalRenewalRequired||rules.physicalRenewal)},
      {id:'physicalRenewalDate',label:'Physical renewal date',value:v(ld.physicalRenewalDate)},
      {id:'staffHealthStatement',label:'Staff health statement current',value:v(ld.staffHealthStatement)},
      {id:'commDiseasePol',label:'Communicable disease policy on file',value:v(ld.commDiseasePol)},
      {id:'illnessExclusionPosted',label:'Illness exclusion policy posted',value:v(ld.illnessExclusionPosted)},
      {id:'staffIllnessExclusion',label:'Staff illness exclusion followed',value:v(ld.staffIllnessExclusion)},
      {id:'staffVaccinationRecs',label:'Staff vaccination records on file',value:v(ld.staffVaccinationRecs)},
      {id:'tbRenewalRequired',label:'TB renewal required (state)',value:v(ld.tbRenewalRequired||rules.tbTestReq)},
      {id:'tbScreeningComplete',label:'TB screening complete — all staff',value:v(ld.tbScreeningComplete),note:rules.tbTestReq||''},{id:'tbTestDate',label:'Most recent TB test date',value:v(ld.tbTestDate)},
      {id:'tbTestResult',label:'TB test result',value:v(ld.tbTestResult)},
      {id:'tbRenewalDate',label:'TB renewal date',value:v(ld.tbRenewalDate)},
      {id:'stateCPRRenewal',label:'CPR renewal period (state)',value:v(ld.stateCPRRenewal||rules.cprRenewal)},
      {id:'cprCertOnFile',label:'CPR certification on file — required staff',value:v(ld.cprCertOnFile),note:`Renewal: ${rules.cprRenewal||'2 years'}`},{id:'cprCertType',label:'CPR certification type',value:v(ld.cprCertType)},
      {id:'cprCertDate',label:'CPR certification date',value:v(ld.cprCertDate)},
      {id:'cprExpiry',label:'CPR expiry date',value:v(ld.cprExpiry)},
      {id:'firstAidCurrent',label:'First aid certification current',value:v(ld.firstAidCurrent)},
      {id:'stateMRRenewal',label:'MR renewal required (state)',value:v(ld.stateMRRenewal||rules.mandatedReporterRenewal)},
      {id:'mrTrainingComplete',label:'Mandated reporter training — all staff',value:v(ld.mrTrainingComplete),note:rules.mandatedReporterRenewal||''},{id:'mrTrainingDate',label:'Mandated reporter training date',value:v(ld.mrTrainingDate)},
      {id:'mrRenewalDate',label:'MR renewal date',value:v(ld.mrRenewalDate)},
      {id:'stateTrainingMin',label:'State training hours minimum',value:v(ld.stateTrainingMin||reg?.trainingHrs)},
      {id:'annualTrainingHrs',label:'Annual training hours completed',value:v(ld.annualTrainingHrs),note:`Req: ${reg?.trainingHrs||'?'}hrs/yr`},{id:'trainingLogOnFile',label:'Training log on file',value:v(ld.trainingLogOnFile)},
      {id:'trainingTopicsDocs',label:'Training topics documented',value:v(ld.trainingTopicsDocs)},
      {id:'standardPrecautions',label:'Standard precautions training current',value:v(ld.standardPrecautions)},
      {id:'safeSleepTraining',label:'Safe sleep training — infant staff',value:v(ld.safeSleepTraining)},
      {id:'childAbuseTraining',label:'Child abuse recognition training',value:v(ld.childAbuseTraining)},
      {id:'cprStaffCount',label:'CPR-certified staff count',value:v(ld.cprStaffCount)},
      {id:'foodProtMgr',label:'Food Protection Manager on site',value:v(ld.foodProtMgr)},
      {id:'aedOnPremises',label:'AED on premises',value:v(ld.aedOnPremises)},
      {id:'abuseReportingPosted',label:'Abuse reporting procedure posted',value:v(ld.abuseReportingPosted)},
      {id:'hotlinePosted',label:'Child abuse hotline number posted',value:v(ld.hotlinePosted)},
      {id:'orientationComplete',label:'New hire orientation complete — all staff',value:v(ld.orientationComplete)},
      {id:'orientationHours',label:'Orientation hours completed',value:v(ld.orientationHours)},
      {id:'orientationDate',label:'Orientation completion date',value:v(ld.orientationDate)},
      {id:'emergPrepTraining',label:'Emergency preparedness training',value:v(ld.emergPrepTraining)},
      {id:'volunteerOrientation',label:'Volunteer orientation complete',value:v(ld.volunteerOrientation)},
      {id:'directorLedTraining',label:'Director-led training approved',value:v(ld.directorLedTraining)},
      {id:'qrisTrainingMet',label:'QRIS training requirements met',value:v(ld.qrisTrainingMet)},
    ]},
    {id:'d6',label:"Children's Records & Health",dNum:'D6',color:D_COLORS[5],fields:[
      {id:'childName',label:'Child name on file — all children',value:v(ld.childName)},
      {id:'childDOB',label:'Child DOB on file — all children',value:v(ld.childDOB)},
      {id:'enrollmentDate',label:'Enrollment date on file — all children',value:v(ld.enrollmentDate)},
      {id:'withdrawalDate',label:'Withdrawal date on file',value:v(ld.withdrawalDate)},
      {id:'enrollRecordComplete',label:'Child enrollment record complete — all children',value:v(ld.enrollRecordComplete)},
      {id:'incidentReportLog',label:'Incident / accident report log',value:v(ld.incidentReportLog)},
      {id:'careLogMaintained',label:'Care log / daily log maintained',value:v(ld.careLogMaintained)},
      {id:'physicianContact',label:'Physician contact on file',value:v(ld.physicianContact)},
      {id:'specialCareNeedsPlan',label:'Special care needs plan on file',value:v(ld.specialCareNeedsPlan)},
      {id:'custodyOrdersOnFile',label:'Custody orders on file',value:v(ld.custodyOrdersOnFile)},
      {id:'emergContactCount',label:'Emergency contact count',value:v(ld.emergContactCount)},
      {id:'emergContactsOnFile',label:'Emergency contacts on file — all children',value:v(ld.emergContactsOnFile)},
      {id:'authPickupOnFile',label:'Authorized pickup list on file — all children',value:v(ld.authPickupOnFile)},
      {id:'emergContactUpdatePolicy',label:'Emergency contact update policy',value:v(ld.emergContactUpdatePolicy)},
      {id:'allergyDocOnFile',label:'Allergy documentation on file — all children with allergies',value:v(ld.allergyDocOnFile)},
      {id:'allergyCareplan',label:'Allergy care plan on file',value:v(ld.allergyCareplan)},
      {id:'epiPenOnSite',label:'EpiPen / emergency medication on site',value:v(ld.epiPenOnSite)},
      {id:'foodAllergyPolicy',label:'Food allergy policy posted',value:v(ld.foodAllergyPolicy)},
      {id:'allergyListInKitchen',label:'Allergy list posted in kitchen',value:v(ld.allergyListInKitchen)},
      {id:'medAdminPolicy',label:'Medication administration policy on file',value:v(ld.medAdminPolicy)},
      {id:'medAuthOnFile',label:'Medication authorization on file — all receiving meds',value:v(ld.medAuthOnFile)},
      {id:'medLogMaintained',label:'Medication log maintained',value:v(ld.medLogMaintained)},
      {id:'medsStoredCorrectly',label:'Medications stored correctly — locked & labeled',value:v(ld.medsStoredCorrectly)},
      {id:'rxOnFile',label:'Prescription on file for Rx medications',value:v(ld.rxOnFile)},
      {id:'nonRxMedPolicy',label:'Non-prescription medication policy',value:v(ld.nonRxMedPolicy)},
      {id:'childPhysicalOnFile',label:'Child physical exam on file — all children',value:v(ld.childPhysicalOnFile)},
      {id:'devScreeningOnFile',label:'Developmental screening on file',value:v(ld.devScreeningOnFile)},
      {id:'childPhysicalDate',label:'Most recent child physical date',value:v(ld.childPhysicalDate)},
      {id:'visionHearingScreen',label:'Vision and hearing screening',value:v(ld.visionHearingScreen)},
      {id:'leadTestingDoc',label:'Lead testing documentation',value:v(ld.leadTestingDoc)},
      {id:'immRecordsOnFile',label:'Immunization records on file — all children',value:v(ld.immRecordsOnFile),note:`Exemptions: ${rules.immExemptions||'Medical only'}`},{id:'immRecordsCurrent',label:'Immunization records current',value:v(ld.immRecordsCurrent)},
      {id:'immExemptionType',label:'Immunization exemption type',value:v(ld.immExemptionType)},
      {id:'stateImmExemptions',label:'State exemption types permitted',value:v(ld.stateImmExemptions||rules.immExemptions)},
      {id:'immExemptionDoc',label:'Exemption documentation on file',value:v(ld.immExemptionDoc)},
      {id:'annualImmReporting',label:'Annual immunization report submitted to state',value:v(ld.annualImmReporting)},
      {id:'immRecordRetention',label:'Immunization record retention compliant',value:v(ld.immRecordRetention)},
      {id:'safeSleepPolicy',label:'Safe sleep policy on file',value:v(ld.safeSleepPolicy)},
      {id:'safeSleepCommun',label:'Safe sleep policy communicated to parents',value:v(ld.safeSleepCommun)},
      {id:'infantSleepEnv',label:'Infant sleep environment compliant',value:v(ld.infantSleepEnv)},
      {id:'safeSleepStaffTrain',label:'Safe sleep training — all infant room staff',value:v(ld.safeSleepStaffTrain)},
      {id:'infantSleepException',label:'Infant sleep position exception documented',value:v(ld.infantSleepException)},
      {id:'parentAgreementSigned',label:'Parent / guardian agreement signed — all children',value:v(ld.parentAgreementSigned)},
      {id:'writtenPoliciesAck',label:'Written policies acknowledged by parent',value:v(ld.writtenPoliciesAck)},
      {id:'photoReleaseSign',label:'Photo / media release signed',value:v(ld.photoReleaseSign)},
      {id:'fieldTripPermission',label:'Field trip permission on file',value:v(ld.fieldTripPermission)},
      {id:'transportPermission',label:'Transportation permission on file',value:v(ld.transportPermission)},
      {id:'grievanceProcedure',label:'Grievance procedure communicated to families',value:v(ld.grievanceProcedure)},
      {id:'stateRecordRetention',label:'State record retention period',value:v(ld.stateRecordRetention||rules.recordRetention)},
      {id:'recordRetentionMet',label:'Record retention policy met',value:v(ld.recordRetentionMet)},
      {id:'familyMeetingDocs',label:'Family meeting documentation on file',value:v(ld.familyMeetingDocs)},
      {id:'attendanceRecordOnFile',label:'Daily attendance record on file',value:v(ld.attendanceRecordOnFile)},
      {id:'attendanceSignInLog',label:'Sign-in/sign-out log maintained',value:v(ld.attendanceSignInLog)},
      {id:'attendanceRetentionMet',label:'Attendance retention period met',value:v(ld.attendanceRetentionMet),note:`Retain ${rules.recordRetention||'3'}years`},{id:'attendanceLastDate',label:'Most recent sign-in log date',value:v(ld.attendanceLastDate)},
      {id:'attendanceStoredSecurely',label:'Attendance records stored securely',value:v(ld.attendanceStoredSecurely)},
    ]},
    {id:'d7',label:'Emergency & Safety',dNum:'D7',color:D_COLORS[6],fields:[
      {id:'stateFireDrillFreq',label:'Fire drill frequency (state)',value:v(ld.stateFireDrillFreq||rules.fireDrillFreq)},
      {id:'fireEvacPlan',label:'Fire evacuation plan on file',value:v(ld.fireEvacPlan)},
      {id:'fireEvacPosted',label:'Fire evacuation plan posted visibly',value:v(ld.fireEvacPosted)},
      {id:'lastFireDrillDate',label:'Last fire drill date',value:v(ld.lastFireDrillDate),note:`Req: ${rules.fireDrillFreq||'Monthly'}`},{id:'fireDrillsCompleted',label:'Fire drills completed (12 mo)',value:v(ld.fireDrillsCompleted)},
      {id:'fireDrillLog',label:'Fire drill log on file',value:v(ld.fireDrillLog)},
      {id:'fireSafetyTraining',label:'Fire safety training — all staff',value:v(ld.fireSafetyTraining)},
      {id:'fireDeptInspCurrent',label:'Fire department inspection current',value:v(ld.fireDeptInspCurrent)},
      {id:'fireAlarmTested',label:'Fire alarm system tested',value:v(ld.fireAlarmTested)},
      {id:'tornadoDrillRequired',label:'Tornado drill required (state)',value:v(ld.tornadoDrillRequired||rules.tornadoDrill)},
      {id:'lastTornadoDrillDate',label:'Last tornado drill date',value:v(ld.lastTornadoDrillDate),note:rules.tornadoDrill||'Check state'},{id:'stateTornadoDrillFreq',label:'Tornado drill frequency (state)',value:v(ld.stateTornadoDrillFreq||rules.tornadoDrill)},
      {id:'tornadoDrillsCompleted',label:'Tornado drills completed (12 mo)',value:v(ld.tornadoDrillsCompleted)},
      {id:'tornadoDrillLog',label:'Tornado drill log on file',value:v(ld.tornadoDrillLog)},
      {id:'shelterAreaIdentified',label:'Designated shelter area identified',value:v(ld.shelterAreaIdentified)},
      {id:'severeWeatherAlert',label:'Severe weather alert system available',value:v(ld.severeWeatherAlert)},
      {id:'lockdownDrillRequired',label:'Lockdown drill required (state)',value:v(ld.lockdownDrillRequired||rules.lockdownDrill)},
      {id:'lastLockdownDate',label:'Last lockdown drill date',value:v(ld.lastLockdownDate),note:rules.lockdownDrill||'2x/year'},{id:'stateLockdownFreq',label:'Lockdown drill frequency (state)',value:v(ld.stateLockdownFreq||rules.lockdownDrill)},
      {id:'lockdownDrillsCompleted',label:'Lockdown drills completed (12 mo)',value:v(ld.lockdownDrillsCompleted)},
      {id:'lockdownDrillLog',label:'Lockdown drill log on file',value:v(ld.lockdownDrillLog)},
      {id:'lockdownProcComm',label:'Lockdown procedure communicated to all staff',value:v(ld.lockdownProcComm)},
      {id:'commDeviceAvailable',label:'Communication device available during lockdown',value:v(ld.commDeviceAvailable)},
      {id:'emergPlanOnFile',label:'Written emergency plan on file',value:v(ld.emergPlanOnFile)},
      {id:'emergPlanReviewed',label:'Emergency plan reviewed annually',value:v(ld.emergPlanReviewed)},
      {id:'emergPlanComm',label:'Emergency plan communicated to staff',value:v(ld.emergPlanComm)},
      {id:'emergPlanFamilies',label:'Emergency plan communicated to families',value:v(ld.emergPlanFamilies)},
      {id:'emergContactListCurrent',label:'Emergency contact list current',value:v(ld.emergContactListCurrent)},
      {id:'relocationSite',label:'Off-site relocation meeting point identified',value:v(ld.relocationSite)},
      {id:'firstAidKit',label:'First aid kit accessible — fully stocked',value:v(ld.firstAidKit)},
      {id:'firstAidKitContents',label:'First aid kit contents current',value:v(ld.firstAidKitContents)},
      {id:'healthInspCurrent',label:'Health department inspection current',value:v(ld.healthInspCurrent)},
      {id:'healthInspDate',label:'Health inspection date',value:v(ld.healthInspDate)},
      {id:'healthInspResult',label:'Health inspection result',value:v(ld.healthInspResult)},
      {id:'healthInspReportOnFile',label:'Health inspection report on file',value:v(ld.healthInspReportOnFile)},
      {id:'openHealthViolations',label:'Open health violations count',value:v(ld.openHealthViolations)},
      {id:'foodServicePermit',label:'Food service permit current',value:v(ld.foodServicePermit)},
      {id:'allDrillLogsRetained',label:'All drill logs retained',value:v(ld.allDrillLogsRetained)},
      {id:'drillLogRetentionMet',label:'Drill log retention period met',value:v(ld.drillLogRetentionMet)},
      {id:'drillLogInspAccess',label:'Drill logs available for inspector review',value:v(ld.drillLogInspAccess)},
      {id:'electronicDrillLog',label:'Electronic drill log in use',value:v(ld.electronicDrillLog)},
      {id:'waterSafetyPlan',label:'Water safety plan on file (if pool / water feature)',value:v(ld.waterSafetyPlan)},
      {id:'lifeguardCert',label:'Lifeguard certification on file',value:v(ld.lifeguardCert)},
      {id:'waterActivityPermission',label:'Water activity permission on file — all children',value:v(ld.waterActivityPermission)},
    ]},
  ];
}
function StatusPill({statusId,small}){
  const cfg=STATUS_MAP[statusId]; if(!cfg)return null;
  return <span style={{fontSize:small?10:11,fontWeight:600,padding:small?'2px 7px':'3px 10px',borderRadius:20,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.bd}`,whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',gap:4}}><Icon name={cfg.icon} size={small?9:10} color={cfg.color}/>{cfg.label}</span>;
}

function ProgressRing({tagged,total,color,size=36}){
  const r=(size-4)/2,circ=2*Math.PI*r,pct=total>0?tagged/total:0;
  return(<svg width={size} height={size} style={{flexShrink:0}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={3}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3} strokeDasharray={`${circ*pct} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}/><text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight={700} fill={tagged===total&&total>0?color:'#94a3b8'}>{tagged}/{total}</text></svg>);
}

function OverallProgress({domains,findings,subset}){
  const allF=domains.reduce((s,d)=>s+(subset?d.fields.filter(f=>subset.has(f.id)).length:d.fields.length),0);
  const tagged=domains.reduce((s,d)=>s+d.fields.filter(f=>(!subset||subset.has(f.id))&&!!findings[f.id]?.status).length,0);
  const pct=allF>0?Math.round((tagged/allF)*100):0;
  return(<div style={{display:'flex',alignItems:'center',gap:10,flex:1}}><div style={{flex:1,height:6,background:'#e2e8f0',borderRadius:3,overflow:'hidden',minWidth:60}}><div style={{height:'100%',width:`${pct}%`,borderRadius:3,background:pct===100?'var(--green)':'var(--teal)',transition:'width 0.4s'}}/></div><span style={{fontSize:12,fontWeight:700,color:pct===100?'var(--green)':'var(--teal)',whiteSpace:'nowrap'}}>{tagged}/{allF} fields</span></div>);
}

function TapCycleStatus({statusId,fieldId,onUpdate}){
  const idx=STATUS_IDS.indexOf(statusId),cfg=STATUS_MAP[statusId];
  const cycle=()=>{const n=idx===-1?0:(idx+1)%STATUS_IDS.length;onUpdate(fieldId,{status:STATUS_IDS[n]});};
  const clear=e=>{e.stopPropagation();onUpdate(fieldId,{status:''}); };
  return(<div style={{display:'flex',alignItems:'center',gap:6}}>
    <button onClick={cycle} style={{minHeight:38,padding:'5px 13px',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:12.5,fontWeight:600,transition:'all 0.12s',display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap',background:cfg?cfg.bg:'#f1f5f9',color:cfg?cfg.color:'var(--muted)',border:cfg?`1.5px solid ${cfg.bd}`:'1.5px solid var(--border)'}}>
      {cfg?<><Icon name={cfg.icon} size={11} color={cfg.color}/>{cfg.label}</>:<span style={{color:'var(--muted)'}}>Tap to set status</span>}
      <Icon name="chevron" size={10} color={cfg?cfg.color:'var(--muted)'} style={{transform:'rotate(-90deg)'}}/>
    </button>
    {statusId&&<button onClick={clear} title="Clear" style={{width:22,height:22,borderRadius:'50%',border:'1px solid var(--border)',background:'#f8fafc',color:'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Icon name="x" size={10}/></button>}
  </div>);
}

function VoiceBtn({onTranscript,label='Dictate'}){
  const [on,setOn]=useState(false),ref=useRef();
  const supported=typeof window!=='undefined'&&('SpeechRecognition' in window||'webkitSpeechRecognition' in window);
  const toggle=()=>{
    if(!supported){alert('Voice input requires Chrome on Android or iOS Safari.');return;}
    if(on){ref.current?.stop();setOn(false);return;}
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition,r=new SR();
    r.continuous=false;r.interimResults=false;r.lang='en-US';
    r.onresult=e=>{onTranscript(e.results[0][0].transcript);setOn(false);};
    r.onerror=()=>setOn(false);r.onend=()=>setOn(false);
    r.start();ref.current=r;setOn(true);
  };
  return(<button onClick={toggle} title={on?'Stop recording':label} style={{height:28,padding:'0 8px',borderRadius:6,border:'none',cursor:'pointer',background:on?'#fdf1f1':'#f1f5f9',color:on?'var(--red)':'var(--muted)',display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,transition:'all 0.15s',boxShadow:on?'0 0 0 3px rgba(185,28,28,0.15)':'none'}}><Icon name={on?'stop':'mic'} size={12} color={on?'var(--red)':'var(--muted)'}/>{on?'Stop':label}</button>);
}

function PhotoAttachment({fieldId,photos,onPhotosChange}){
  const fileRef=useRef(),list=photos[fieldId]||[];
  const handleAdd=e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>onPhotosChange(fieldId,[...list,{id:Date.now(),name:file.name,dataUrl:ev.target.result,takenAt:new Date().toISOString()}]);reader.readAsDataURL(file);e.target.value='';};
  return(<div style={{marginTop:6}}>
    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
      {list.map(p=>(
        <div key={p.id} style={{position:'relative'}}>
          <img src={p.dataUrl} alt={p.name} style={{width:50,height:50,objectFit:'cover',borderRadius:6,border:'1px solid var(--border)',display:'block'}}/>
          <button onClick={()=>onPhotosChange(fieldId,list.filter(x=>x.id!==p.id))} style={{position:'absolute',top:-5,right:-5,width:16,height:16,borderRadius:'50%',background:'var(--red)',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Icon name="x" size={9} color="#fff"/></button>
          <div style={{fontSize:9,color:'var(--muted)',marginTop:1}}>{new Date(p.takenAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      ))}
      <button onClick={()=>fileRef.current?.click()} title="Attach photo evidence" style={{width:50,height:50,borderRadius:6,border:'1.5px dashed var(--border)',background:'#f8fafc',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,transition:'all 0.12s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--teal)';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';}}>
        <Icon name="camera" size={16} color="var(--muted)"/><span style={{fontSize:9,fontWeight:600,color:'var(--muted)'}}>Add</span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handleAdd}/>
    </div>
    {list.length>0&&<div style={{fontSize:10,color:'var(--muted)',marginTop:3}}>{list.length} photo{list.length!==1?'s':''} · evidence on file</div>}
  </div>);
}

function NotesPanel({fieldId,finding,onUpdate,readOnly,photos,onPhotosChange}){
  return(<div style={{display:'flex',flexDirection:'column',gap:11}}>
    <div>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
        <label style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em'}}>Observation Notes</label>
        {!readOnly&&<VoiceBtn onTranscript={t=>onUpdate(fieldId,{notes:(finding?.notes?finding.notes+' ':'')+t})} label="Dictate"/>}
      </div>
      {readOnly?<p style={{fontSize:12.5,color:'var(--text)',margin:0}}>{finding?.notes||'—'}</p>:<textarea rows={2} value={finding?.notes||''} placeholder="Notes — or click Dictate to use voice..." onChange={e=>onUpdate(fieldId,{notes:e.target.value})} style={{width:'100%',fontSize:13,padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',resize:'vertical',outline:'none',fontFamily:'inherit'}}/>}
    </div>
    <div>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
        <label style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em'}}>Corrective Action Required</label>
        {!readOnly&&<VoiceBtn onTranscript={t=>onUpdate(fieldId,{correctiveAction:(finding?.correctiveAction?finding.correctiveAction+' ':'')+t})} label="Dictate"/>}
      </div>
      {readOnly?<p style={{fontSize:12.5,color:'var(--text)',margin:0}}>{finding?.correctiveAction||'—'}</p>:<textarea rows={2} value={finding?.correctiveAction||''} placeholder="Describe correction — or click Dictate..." onChange={e=>onUpdate(fieldId,{correctiveAction:e.target.value})} style={{width:'100%',fontSize:13,padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',resize:'vertical',outline:'none',fontFamily:'inherit'}}/>}
    </div>
    <div style={{display:'flex',gap:14,flexWrap:'wrap',alignItems:'flex-start'}}>
      <div>
        <label style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em',display:'block',marginBottom:4}}>Follow-up Due</label>
        {readOnly?<p style={{fontSize:12.5,color:'var(--text)',margin:0}}>{finding?.followUpDate||'—'}</p>:<input type="date" value={finding?.followUpDate||''} onChange={e=>onUpdate(fieldId,{followUpDate:e.target.value})} style={{padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',fontSize:13,outline:'none',minHeight:38}}/>}
      </div>
      {!readOnly&&<div style={{flex:1,minWidth:160}}><label style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em',display:'block',marginBottom:4}}>Photo Evidence</label><PhotoAttachment fieldId={fieldId} photos={photos} onPhotosChange={onPhotosChange}/></div>}
      {readOnly&&(photos[fieldId]||[]).length>0&&<div><label style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em',display:'block',marginBottom:4}}>Evidence Photos</label><div style={{display:'flex',gap:5}}>{(photos[fieldId]||[]).map(p=><img key={p.id} src={p.dataUrl} alt="" style={{width:42,height:42,objectFit:'cover',borderRadius:6,border:'1px solid var(--border)'}}/>)}</div></div>}
    </div>
  </div>);
}
function FindingRow({fieldId,label,value,note,liveValue,finding,onUpdate,readOnly,photos,onPhotosChange,citation,focused,onFocus,showLiveCol}){
  const [open,setOpen]=useState(false);
  const statusId=finding?.status||'';
  const hasDetail=finding?.notes||finding?.correctiveAction||finding?.followUpDate||(photos[fieldId]||[]).length>0;
  useEffect(()=>{
    if(!focused||readOnly)return;
    const h=e=>{if(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT')return;const m=KEY_MAP[e.key.toLowerCase()];if(m)onUpdate(fieldId,{status:m});};
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);
  },[focused,fieldId,onUpdate,readOnly]);
  const cols=showLiveCol?5:4;
  return(<React.Fragment>
    <tr onClick={onFocus} style={{borderBottom:'1px solid #f1f5f9',background:focused?'rgba(0,169,157,0.03)':'transparent',cursor:'default'}}>
      <td style={{padding:'9px 13px',fontSize:13,color:'var(--text)',fontWeight:500,width:showLiveCol?'22%':'26%'}}>
        {label}
        {note&&<div style={{fontSize:11,color:'var(--muted)',marginTop:1}}>{note}</div>}
        {citation&&<div style={{fontSize:10,color:'#4f5fa8',marginTop:2,fontStyle:'italic'}}>{citation}</div>}
      </td>
      <td style={{padding:'9px 13px',fontSize:13,color:value&&value!=='—'?'var(--text)':'var(--muted)',width:'14%'}}>{value}</td>
      {showLiveCol&&<td style={{padding:'9px 13px',width:'12%'}}>
        {liveValue!=null?<span style={{fontSize:13,fontWeight:700,color:liveValue!==value&&value!=='—'?'var(--red)':'var(--green)'}}>{liveValue}</span>:<span style={{fontSize:11,color:'var(--muted)'}}>—</span>}
      </td>}
      <td style={{padding:'9px 13px',width:showLiveCol?'36%':'42%'}}>
        {readOnly?(statusId?<StatusPill statusId={statusId}/>:<span style={{color:'var(--muted)',fontSize:12}}>—</span>):<TapCycleStatus statusId={statusId} fieldId={fieldId} onUpdate={onUpdate}/>}
      </td>
      <td style={{padding:'9px 13px',textAlign:'right',width:'16%'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:5}}>
          {(photos[fieldId]||[]).length>0&&<Icon name="camera" size={13} color="var(--muted)"/>}
          {(!readOnly||hasDetail)&&<button onClick={e=>{e.stopPropagation();setOpen(o=>!o);}} style={{fontSize:11.5,padding:'3px 9px',borderRadius:6,cursor:'pointer',border:'1px solid var(--border)',background:'#f8fafc',color:'var(--muted)',display:'inline-flex',alignItems:'center',gap:4}}>
            <Icon name={open?'chevron':'edit'} size={11} style={{transform:open?'rotate(180deg)':'none'}}/>
            {open?'Close':(readOnly?'Detail':'Notes')}
            {!open&&hasDetail&&<span style={{width:5,height:5,borderRadius:'50%',background:'var(--teal)',display:'inline-block'}}/>}
          </button>}
        </div>
      </td>
    </tr>
    {open&&<tr style={{background:'#f8fafc'}}><td colSpan={cols} style={{padding:'13px 15px',borderBottom:'1px solid var(--border)'}}><NotesPanel fieldId={fieldId} finding={finding} onUpdate={onUpdate} readOnly={readOnly} photos={photos} onPhotosChange={onPhotosChange}/></td></tr>}
  </React.Fragment>);
}

function FindingCard({fieldId,label,value,note,liveValue,finding,onUpdate,readOnly,photos,onPhotosChange,citation}){
  const [open,setOpen]=useState(false);
  const statusId=finding?.status||'',cfg=STATUS_MAP[statusId];
  const hasDetail=finding?.notes||finding?.correctiveAction||finding?.followUpDate||(photos[fieldId]||[]).length>0;
  return(<div style={{background:'#fff',border:`1px solid ${cfg?cfg.bd:'var(--border)'}`,borderLeft:`3px solid ${cfg?cfg.color:'#e2e8f0'}`,borderRadius:10,marginBottom:10,overflow:'hidden'}}>
    <div style={{padding:'12px 14px'}}>
      <div style={{marginBottom:10}}>
        <div style={{fontSize:13,fontWeight:600,color:'var(--text)',lineHeight:1.3}}>{label}</div>
        {note&&<div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{note}</div>}
        {citation&&<div style={{fontSize:10,color:'#4f5fa8',marginTop:2,fontStyle:'italic'}}>{citation}</div>}
        <div style={{display:'flex',gap:8,marginTop:6,flexWrap:'wrap'}}>
          {value&&value!=='—'&&<div style={{fontSize:12,color:'var(--slate)',background:'#f8fafc',padding:'3px 8px',borderRadius:6}}>Stored: {value}</div>}
          {liveValue!=null&&<div style={{fontSize:12,fontWeight:700,color:liveValue!==value&&value!=='—'?'var(--red)':'var(--green)',background:liveValue!==value&&value!=='—'?'var(--critical-bg)':'var(--compliant-bg)',padding:'3px 8px',borderRadius:6,border:`1px solid ${liveValue!==value&&value!=='—'?'var(--critical-border)':'var(--compliant-border)'}`}}>Live: {liveValue}</div>}
        </div>
      </div>
      {!readOnly&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
        {FIELD_STATUSES.map(s=><button key={s.id} onClick={()=>onUpdate(fieldId,{status:statusId===s.id?'':s.id})} style={{padding:'10px 8px',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:12,minHeight:44,textAlign:'center',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:5,background:statusId===s.id?s.bg:'#f8fafc',color:statusId===s.id?s.color:'var(--muted)',border:statusId===s.id?`1.5px solid ${s.bd}`:'1px solid var(--border)',transition:'all 0.12s'}}><Icon name={s.icon} size={11} color={statusId===s.id?s.color:'var(--muted)'}/>{s.label}</button>)}
      </div>}
      {readOnly&&statusId&&<StatusPill statusId={statusId}/>}
    </div>
    {(!readOnly||hasDetail)&&<>
      <button onClick={()=>setOpen(o=>!o)} style={{width:'100%',padding:'8px 14px',background:'#f8fafc',border:'none',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',fontFamily:'inherit',fontSize:12,color:'var(--muted)'}}>
        <span style={{display:'flex',alignItems:'center',gap:6}}><Icon name={readOnly?'eye':'edit'} size={12}/>{readOnly?'View notes':'Notes / evidence'}{hasDetail&&!open&&<span style={{width:5,height:5,borderRadius:'50%',background:'var(--teal)',display:'inline-block'}}/>}</span>
        <Icon name="chevron" size={12} style={{transform:open?'rotate(180deg)':'none',transition:'transform 0.2s'}}/>
      </button>
      {open&&<div style={{padding:'12px 14px',borderTop:'1px solid var(--border)',background:'#fafafa'}}><NotesPanel fieldId={fieldId} finding={finding} onUpdate={onUpdate} readOnly={readOnly} photos={photos} onPhotosChange={onPhotosChange}/></div>}
    </>}
  </div>);
}

function RatioCounter({reg,onCountsChange}){
  const groups=[{id:'Infant',max:reg?.infant||4},{id:'Toddler',max:reg?.toddler||6},{id:'Preschool',max:reg?.preschool||10},{id:'School-age',max:reg?.schoolAge||15}];
  const [counts,setCounts]=useState(()=>Object.fromEntries(groups.map(g=>[g.id,{children:0,staff:0}])));
  const adj=(group,key,delta)=>{setCounts(prev=>{const next={...prev,[group]:{...prev[group],[key]:Math.max(0,(prev[group][key]||0)+delta)}};onCountsChange&&onCountsChange(next);return next;});};
  return(<div style={{padding:'12px 16px',background:'#f8fafc',borderBottom:'1px solid var(--border)'}}>
    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
      <Icon name="user" size={13} color="var(--muted)"/>
      <span style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em'}}>Live Headcount Counter</span>
      <span style={{fontSize:10,color:'var(--muted)',fontStyle:'italic'}}>Updates "Live count" column above</span>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
      {groups.map(g=>{
        const c=counts[g.id].children,s=counts[g.id].staff,req=s>0?Math.ceil(c/g.max):0,ok=s>=req,clr=c===0?'var(--muted)':ok?'var(--green)':'var(--red)';
        const Btn=({onClick,icon})=><button onClick={onClick} style={{width:28,height:28,borderRadius:6,border:'1px solid var(--border)',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Icon name={icon} size={13}/></button>;
        return(<div key={g.id} style={{background:'#fff',border:`1.5px solid ${c===0?'var(--border)':ok?'var(--compliant-border)':'var(--critical-border)'}`,borderRadius:10,padding:'10px 12px'}}>
          <div style={{fontSize:10.5,fontWeight:700,color:'var(--muted)',marginBottom:8}}>{g.id} · max 1:{g.max}</div>
          <div style={{display:'flex',gap:10}}>
            <div style={{flex:1}}><div style={{fontSize:10,color:'var(--muted)',marginBottom:4}}>Children</div><div style={{display:'flex',alignItems:'center',gap:4}}><Btn onClick={()=>adj(g.id,'children',-1)} icon="minus"/><span style={{fontSize:18,fontWeight:800,color:clr,minWidth:26,textAlign:'center'}}>{c}</span><Btn onClick={()=>adj(g.id,'children',1)} icon="plus"/></div></div>
            <div style={{flex:1}}><div style={{fontSize:10,color:'var(--muted)',marginBottom:4}}>Staff</div><div style={{display:'flex',alignItems:'center',gap:4}}><Btn onClick={()=>adj(g.id,'staff',-1)} icon="minus"/><span style={{fontSize:18,fontWeight:800,color:clr,minWidth:26,textAlign:'center'}}>{s}</span><Btn onClick={()=>adj(g.id,'staff',1)} icon="plus"/></div></div>
          </div>
          {c>0&&<div style={{marginTop:6,fontSize:11,fontWeight:600,color:clr,display:'flex',alignItems:'center',gap:4}}><Icon name={ok?'check':'alert'} size={11} color={clr}/>{ok?`OK — need ${req}, have ${s}`:`Need ${req} staff, have ${s}`}</div>}
        </div>);
      })}
    </div>
  </div>);
}
function FieldConfigModal({domains,savedCfg,onSave,onCancel}){
  const [selected,setSelected]=useState(()=>{if(savedCfg)return new Set(savedCfg);const s=new Set();domains.forEach(d=>d.fields.forEach(f=>s.add(f.id)));return s;});
  const toggle=id=>setSelected(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});
  const toggleDomain=d=>{const allOn=d.fields.every(f=>selected.has(f.id));setSelected(prev=>{const n=new Set(prev);d.fields.forEach(f=>allOn?n.delete(f.id):n.add(f.id));return n;});};
  const total=domains.reduce((s,d)=>s+d.fields.length,0);
  return(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
    <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:680,maxHeight:'85vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'18px 22px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:'var(--text)'}}>Configure Inspection Fields</div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{selected.size} of {total} fields selected</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={onCancel} style={{padding:'7px 14px',borderRadius:8,border:'1px solid var(--border)',background:'#fff',color:'var(--muted)',fontSize:12,fontWeight:600,cursor:'pointer'}}>Cancel</button>
          <button onClick={()=>onSave([...selected])} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'var(--teal)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>Begin with {selected.size} fields</button>
        </div>
      </div>
      <div style={{overflowY:'auto',padding:'14px 22px',flex:1}}>
        {domains.map(d=>{
          const allOn=d.fields.every(f=>selected.has(f.id)),someOn=d.fields.some(f=>selected.has(f.id));
          return(<div key={d.id} style={{marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,paddingBottom:6,borderBottom:'1px solid #f1f5f9'}}>
              <input type="checkbox" checked={allOn} ref={el=>{if(el)el.indeterminate=!allOn&&someOn;}} onChange={()=>toggleDomain(d)} style={{width:15,height:15,accentColor:d.color,cursor:'pointer'}}/>
              <span style={{fontSize:11,fontWeight:800,color:d.color,background:d.color+'14',padding:'1px 6px',borderRadius:4}}>{d.dNum}</span>
              <span style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>{d.label}</span>
              <span style={{fontSize:11,color:'var(--muted)',marginLeft:'auto'}}>{d.fields.filter(f=>selected.has(f.id)).length}/{d.fields.length}</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,paddingLeft:8}}>
              {d.fields.map(f=><label key={f.id} style={{display:'flex',alignItems:'center',gap:7,fontSize:12,color:'var(--text)',cursor:'pointer',padding:'3px 0'}}><input type="checkbox" checked={selected.has(f.id)} onChange={()=>toggle(f.id)} style={{width:13,height:13,accentColor:d.color,cursor:'pointer',flexShrink:0}}/>{f.label}</label>)}
            </div>
          </div>);
        })}
      </div>
    </div>
  </div>);
}

function InspectionHistoryTab({centerName,centerState,reg}){
  const history=[
    {date:'2024-09-14',type:'Real Inspection',result:'Passed',violations:3,inspector:'Jane Morrow'},
    {date:'2024-04-02',type:'Real Inspection',result:'Passed',violations:5,inspector:'Jane Morrow'},
    {date:'2023-09-20',type:'Real Inspection',result:'Passed with conditions',violations:8,inspector:'Thomas Reed'},
  ];
  return(<div style={{padding:'20px'}}>
    <div style={{marginBottom:16}}><div style={{fontSize:15,fontWeight:700,color:'var(--text)',marginBottom:2}}>Inspection History</div><div style={{fontSize:12,color:'var(--muted)'}}>{centerName} · {centerState}</div></div>
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {history.map((h,i)=>{
        const ok=h.result==='Passed',clr=ok?'var(--compliant-text)':h.violations>5?'var(--critical-text)':'var(--atrisk-text)';
        return(<div key={i} style={{background:'#fff',border:'1px solid var(--border)',borderLeft:`3px solid ${ok?'var(--compliant-dot)':h.violations>5?'var(--critical-dot)':'var(--atrisk-dot)'}`,borderRadius:10,padding:'14px 16px'}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
            <div><div style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>{new Date(h.date).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div><div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{h.type} · {h.inspector}</div></div>
            <span style={{fontSize:11,fontWeight:700,color:clr,padding:'2px 8px',borderRadius:20,background:ok?'var(--compliant-bg)':h.violations>5?'var(--critical-bg)':'var(--atrisk-bg)',border:`1px solid ${ok?'var(--compliant-border)':h.violations>5?'var(--critical-border)':'var(--atrisk-border)'}`}}>{h.result}</span>
          </div>
          <div style={{marginTop:10,display:'flex',gap:10}}><div style={{fontSize:12,color:'var(--text)'}}><strong>{h.violations}</strong> <span style={{color:'var(--muted)'}}>violations cited</span></div><div style={{fontSize:12,color:'var(--muted)'}}>{reg?.agency||'State Agency'}</div></div>
        </div>);
      })}
    </div>
    <div style={{marginTop:14,padding:'12px 14px',background:'var(--atrisk-bg)',border:'1px solid var(--atrisk-border)',borderRadius:10,fontSize:12,color:'var(--atrisk-text)',display:'flex',alignItems:'center',gap:8}}><Icon name="info" size={14} color="var(--atrisk-text)"/>History shown is mock data. Real reports will populate once scraping integration is complete.</div>
  </div>);
}

function OpenCAPTab({centerName,findings}){
  const open=Object.entries(findings).filter(([,f])=>f.status==='noncompliant'||f.status==='atrisk');
  return(<div style={{padding:'20px'}}>
    <div style={{marginBottom:16}}><div style={{fontSize:15,fontWeight:700,color:'var(--text)',marginBottom:2}}>Open Corrective Actions</div><div style={{fontSize:12,color:'var(--muted)'}}>{centerName}</div></div>
    {open.length===0?(<div style={{background:'var(--compliant-bg)',border:'1px solid var(--compliant-border)',borderRadius:12,padding:'24px',textAlign:'center'}}><Icon name="check" size={28} color="var(--compliant-dot)" style={{margin:'0 auto 10px'}}/><div style={{fontSize:14,fontWeight:700,color:'var(--compliant-text)'}}>No open corrective actions</div></div>):(
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {open.map(([id,f])=>{const cfg=STATUS_MAP[f.status];return(<div key={id} style={{background:'#fff',border:`1px solid ${cfg.bd}`,borderLeft:`3px solid ${cfg.color}`,borderRadius:10,padding:'12px 14px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}><div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{id.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase())}</div><StatusPill statusId={f.status} small/></div>
          {f.correctiveAction&&<div style={{fontSize:12,color:'var(--text)',marginTop:6,background:'#f8fafc',padding:'6px 10px',borderRadius:6}}>{f.correctiveAction}</div>}
          {f.followUpDate&&<div style={{fontSize:11,color:'var(--muted)',marginTop:5,display:'flex',alignItems:'center',gap:4}}><Icon name="clock" size={11}/>Due: <strong>{f.followUpDate}</strong></div>}
        </div>);})}
      </div>
    )}
  </div>);
}

function DocumentsTab({centerName}){
  const docs=[
    {name:'Operating License',status:'Current',expiry:'2025-09-01',domain:'D1'},
    {name:'GL Insurance Certificate',status:'Current',expiry:'2025-12-31',domain:'D1'},
    {name:"Workers' Comp Certificate",status:'Expiring soon',expiry:'2025-07-15',domain:'D1'},
    {name:'Fire Inspection Report',status:'Current',expiry:'2025-03-20',domain:'D7'},
    {name:'Health Inspection Report',status:'Current',expiry:'2025-02-10',domain:'D7'},
  ];
  const st=s=>s==='Current'?{color:'var(--compliant-text)',bg:'var(--compliant-bg)',bd:'var(--compliant-border)'}:s==='Expiring soon'?{color:'var(--atrisk-text)',bg:'var(--atrisk-bg)',bd:'var(--atrisk-border)'}:{color:'var(--critical-text)',bg:'var(--critical-bg)',bd:'var(--critical-border)'};
  return(<div style={{padding:'20px'}}>
    <div style={{marginBottom:16}}><div style={{fontSize:15,fontWeight:700,color:'var(--text)',marginBottom:2}}>Documents on File</div><div style={{fontSize:12,color:'var(--muted)'}}>{centerName}</div></div>
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {docs.map((d,i)=>{const s=st(d.status);return(<div key={i} style={{background:'#fff',border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px',display:'flex',alignItems:'center',gap:12}}><Icon name="file" size={20} color="var(--muted)"/><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{d.name}</div><div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{d.domain} · Expires {new Date(d.expiry).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div></div><span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,background:s.bg,color:s.color,border:`1px solid ${s.bd}`,whiteSpace:'nowrap'}}>{d.status}</span></div>);})}
    </div>
    <div style={{marginTop:14,padding:'12px 14px',background:'var(--info-bg)',border:'1px solid var(--info-border)',borderRadius:10,fontSize:12,color:'var(--info-text)',display:'flex',alignItems:'center',gap:8}}><Icon name="info" size={14} color="var(--info-text)"/>Document upload and version history coming in Phase 2.</div>
  </div>);
}

function CenterProfileTab({centerName,centerCity,centerState,reg,liveData}){
  const lic=liveData?.licensing||{},per=liveData?.personnel||{},phy=liveData?.physical||{};
  const rows=[['Director',per.directorName||'—'],['Licensed capacity',phy.capacity||'—'],['License number',lic.licenseNumber||'—'],['License issue date',lic.licenseIssueDate||'—'],['License expiry',lic.licenseExpiry||'—'],['Licensing agency',reg?.agency||'—'],['State',centerState],['City',centerCity],['Infant ratio max',`1:${reg?.infant||'?'}`],['Preschool ratio max',`1:${reg?.preschool||'?'}`],['Training requirement',`${reg?.trainingHrs||'?'} hrs/year`],['BG check type',reg?.rules?.bgCheckType||'—']];
  return(<div style={{padding:'20px'}}>
    <div style={{marginBottom:16}}><div style={{fontSize:15,fontWeight:700,color:'var(--text)',marginBottom:2}}>{centerName}</div><div style={{fontSize:12,color:'var(--muted)'}}>Center Profile · {centerCity}, {centerState}</div></div>
    <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
      {rows.map(([l,v],i)=><div key={l} style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',borderBottom:i<rows.length-1?'1px solid #f1f5f9':'none',background:i%2===0?'#fff':'#fafafa'}}><span style={{fontSize:12,color:'var(--muted)'}}>{l}</span><span style={{fontSize:12,fontWeight:600,color:'var(--text)',textAlign:'right',maxWidth:'55%'}}>{v}</span></div>)}
    </div>
  </div>);
}
function PrepScreen({centerName,locationLabel,reg,lastFindings,onStart,domains,resolvedId,userRole}){
  const [inspType,setInspType]=useState('real'),[notes,setNotes]=useState(''),[showCfg,setShowCfg]=useState(false),[savedCfg,setSavedCfg]=useState(()=>loadFieldCfg(resolvedId));
  const prevFlags=Object.values(lastFindings).filter(f=>f.status==='noncompliant'||f.status==='atrisk').length;
  const selType=INSP_TYPES.find(t=>t.id===inspType);
  const canCfg=selType?.configurable&&(userRole==='director'||userRole==='owner'||userRole==='inspector');
  const doStart=()=>{
    const def=INSP_TYPES.find(t=>t.id===inspType);
    if(def?.configurable&&!savedCfg){setShowCfg(true);return;}
    const sub=def?.subset?(savedCfg?new Set(savedCfg):selectSubset(domains)):null;
    onStart(inspType,notes,sub);
  };
  return(<div style={{flex:1,overflowY:'auto',background:'var(--bg)',padding:'20px'}}>
    {showCfg&&<FieldConfigModal domains={domains} savedCfg={savedCfg} onCancel={()=>setShowCfg(false)} onSave={cfg=>{setSavedCfg(cfg);saveFieldCfg(resolvedId,cfg);setShowCfg(false);onStart(inspType,notes,new Set(cfg));}}/>}
    <div style={{background:'var(--navy)',borderRadius:14,padding:'20px 24px',marginBottom:14,display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
      <div><div style={{fontSize:11,fontWeight:700,color:'var(--teal2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>Inspection Preparation</div><div style={{fontSize:18,fontWeight:800,color:'#fff',marginBottom:3}}>{centerName}</div><div style={{fontSize:12,color:'#94a3b8'}}>{locationLabel} · {reg?.agency||'State Licensing Agency'}</div></div>
      <div style={{textAlign:'right'}}><div style={{fontSize:10,color:'#64748b'}}>Today</div><div style={{fontSize:14,fontWeight:700,color:'#e2e8f0'}}>{new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div></div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}} className="insp-prep-grid">
      <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'14px 16px'}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:10}}>Prior Visit</div>
        {prevFlags>0?(<><div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}><div style={{width:32,height:32,borderRadius:7,background:'var(--critical-bg)',border:'1px solid var(--critical-border)',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:14,fontWeight:800,color:'var(--critical-text)'}}>{prevFlags}</span></div><div><div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>Open items from last visit</div><div style={{fontSize:11,color:'var(--muted)'}}>Pre-loaded as At Risk</div></div></div><div style={{fontSize:11.5,color:'var(--atrisk-text)',background:'var(--atrisk-bg)',border:'1px solid var(--atrisk-border)',borderRadius:7,padding:'6px 10px',display:'flex',alignItems:'center',gap:6}}><Icon name="alert" size={12} color="var(--atrisk-text)"/>Review these items early</div></>)
        :(<div style={{fontSize:13,color:'var(--muted)',display:'flex',alignItems:'center',gap:6}}><Icon name="check" size={14} color="var(--compliant-dot)"/>No open items from prior visit</div>)}
      </div>
      <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'14px 16px'}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:10}}>State Requirements</div>
        {[['Infant ratio',`1:${reg?.infant||'?'}`],['Hot water max',`${reg?.rules?.hotWaterMax||110}°F`],['Training hrs',`${reg?.trainingHrs||'?'} hrs/yr`],['BG check',reg?.rules?.bgCheckType||'State + FBI']].map(([l,v])=><div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}><span style={{color:'var(--muted)'}}>{l}</span><span style={{fontWeight:600,color:'var(--text)'}}>{v}</span></div>)}
      </div>
    </div>
    <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'14px 16px',marginBottom:12}}>
      <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:12}}>Inspection Type</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10}}>
        {INSP_TYPES.map(t=><button key={t.id} onClick={()=>setInspType(t.id)} style={{padding:'12px 13px',borderRadius:10,cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'all 0.12s',background:inspType===t.id?t.bg:'#f8fafc',border:inspType===t.id?`2px solid ${t.color}`:'1.5px solid var(--border)'}}>
          <div style={{marginBottom:5}}><Icon name={t.icon} size={18} color={inspType===t.id?t.color:'var(--muted)'}/></div>
          <div style={{fontSize:13,fontWeight:700,color:inspType===t.id?t.color:'var(--text)',marginBottom:2}}>{t.label}</div>
          <div style={{fontSize:11,color:'var(--muted)',lineHeight:1.4}}>{t.desc}</div>
          {t.subset&&!t.configurable&&<div style={{fontSize:10.5,color:t.color,marginTop:4,fontWeight:600}}>~15% of fields selected randomly</div>}
          {t.configurable&&<div style={{fontSize:10.5,color:t.color,marginTop:4,fontWeight:600,display:'flex',alignItems:'center',gap:4}}><Icon name="settings" size={10} color={t.color}/>You choose which fields</div>}
        </button>)}
      </div>
    </div>
    <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'14px 16px',marginBottom:18}}>
      <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:8}}>Pre-Inspection Notes</div>
      <textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Prior complaints, items to prioritise, context from last visit..." style={{width:'100%',fontSize:13,padding:'9px 12px',borderRadius:8,border:'1px solid var(--border)',resize:'vertical',outline:'none',fontFamily:'inherit',color:'var(--text)',lineHeight:1.5}}/>
    </div>
    <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
      {canCfg&&<button onClick={()=>setShowCfg(true)} style={{padding:'11px 18px',borderRadius:10,border:'1px solid var(--teal)',background:'rgba(0,169,157,0.07)',color:'var(--teal)',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:7}}><Icon name="settings" size={14} color="var(--teal)"/>Configure Fields{savedCfg?` (${savedCfg.length} saved)`:''}</button>}
      <button onClick={doStart} style={{padding:'11px 26px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:8}} onMouseEnter={e=>e.currentTarget.style.background='var(--teal2)'} onMouseLeave={e=>e.currentTarget.style.background='var(--teal)'}><Icon name="arrow" size={15} color="#fff"/>Begin Inspection</button>
    </div>
  </div>);
}
function ExitConferenceScreen({domains,findings,photos,centerName,locationLabel,reg,inspType,onBack,onFinish}){
  const [dirName,setDirName]=useState(''),[ack,setAck]=useState(false),[done,setDone]=useState(false);
  const tc=INSP_TYPES.find(t=>t.id===inspType)||INSP_TYPES[0];
  const cite=reg?.inspectionCiteFormat||'';
  const flagged=[];
  domains.forEach(d=>d.fields.forEach(f=>{const fi=findings[f.id];if(fi?.status&&fi.status!=='compliant'&&fi.status!=='notobserved'){const rk=FIELD_REF_MAP[f.id];flagged.push({...f,domain:d.label,dNum:d.dNum,dColor:d.color,finding:fi,citation:rk?reg?.refs?.[rk]:null});}}));
  const totalF=domains.reduce((s,d)=>s+d.fields.length,0);
  const taggedF=domains.reduce((s,d)=>s+d.fields.filter(f=>!!findings[f.id]?.status).length,0);
  const ncC=flagged.filter(f=>f.finding.status==='noncompliant').length,arC=flagged.filter(f=>f.finding.status==='atrisk').length,coC=flagged.filter(f=>f.finding.status==='corrected').length;
  if(done)return(<div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',padding:24}}>
    <div style={{background:'#fff',borderRadius:16,padding:'44px 36px',maxWidth:420,textAlign:'center',border:'1px solid var(--border)'}}>
      <div style={{width:58,height:58,borderRadius:'50%',background:'var(--compliant-bg)',border:'2px solid var(--compliant-border)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}><Icon name="check" size={26} color="var(--compliant-dot)"/></div>
      <div style={{fontSize:19,fontWeight:800,color:'var(--text)',marginBottom:6}}>Inspection Complete</div>
      <div style={{marginBottom:6}}><span style={{padding:'2px 8px',borderRadius:20,background:tc.bg,color:tc.color,border:`1px solid ${tc.bd}`,fontWeight:600,fontSize:12,display:'inline-flex',alignItems:'center',gap:5}}><Icon name={tc.icon} size={11} color={tc.color}/>{tc.label}</span></div>
      <div style={{fontSize:13,color:'var(--muted)',marginBottom:20,lineHeight:1.6,marginTop:10}}>Findings acknowledged by <strong>{dirName}</strong><br/>{new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div>
      <button onClick={onFinish} style={{padding:'10px 26px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:7,margin:'0 auto'}}><Icon name="printer" size={14} color="#fff"/>Export Report & Close</button>
    </div>
  </div>);
  return(<div style={{flex:1,overflowY:'auto',background:'var(--bg)',padding:'20px'}}>
    <div style={{background:'var(--navy)',borderRadius:14,padding:'17px 22px',marginBottom:14,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
      <div><div style={{fontSize:11,fontWeight:700,color:'var(--teal2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:3}}>Exit Conference</div><div style={{fontSize:16,fontWeight:800,color:'#fff'}}>{centerName}</div><div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}><span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:tc.bg,color:tc.color,border:`1px solid ${tc.bd}`,fontWeight:600,display:'inline-flex',alignItems:'center',gap:4}}><Icon name={tc.icon} size={10} color={tc.color}/>{tc.label}</span><span style={{fontSize:11,color:'#94a3b8'}}>{taggedF}/{totalF} reviewed</span></div></div>
      <button onClick={onBack} style={{padding:'6px 13px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:8,color:'#94a3b8',fontSize:12,fontWeight:600,cursor:'pointer'}}>← Back</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:10,marginBottom:14}}>
      {[['Non-Compliant',ncC,'var(--critical-bg)','var(--critical-border)','var(--critical-text)'],['At Risk',arC,'var(--atrisk-bg)','var(--atrisk-border)','var(--atrisk-text)'],['Corrected',coC,'var(--info-bg)','var(--info-border)','var(--info-text)'],['Tagged',taggedF,'#f8fafc','var(--border)','var(--text)']].map(([l,c,bg,bd,cl])=>(
        <div key={l} style={{background:bg,border:`1px solid ${bd}`,borderRadius:10,padding:'11px 13px',textAlign:'center'}}><div style={{fontSize:22,fontWeight:800,color:cl,lineHeight:1}}>{c}</div><div style={{fontSize:10.5,fontWeight:600,color:cl,marginTop:4}}>{l}</div></div>
      ))}
    </div>
    {flagged.length>0?(<div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'15px 17px',marginBottom:13}}>
      <div style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:4}}>{flagged.length} item{flagged.length!==1?'s':''} to review with director</div>
      {cite&&<div style={{fontSize:11,color:'var(--muted)',marginBottom:12}}>Citation format: {cite}</div>}
      <div style={{display:'flex',flexDirection:'column',gap:9}}>
        {flagged.map(f=>{const sc=STATUS_MAP[f.finding.status],pc=(photos[f.id]||[]).length;return(<div key={f.id} style={{border:`1px solid ${sc.bd}`,borderLeft:`3px solid ${sc.color}`,borderRadius:8,padding:'10px 13px',background:sc.bg}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
            <div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:5,marginBottom:2}}><span style={{fontSize:10,fontWeight:700,color:f.dColor,background:f.dColor+'18',padding:'1px 5px',borderRadius:4}}>{f.dNum}</span><span style={{fontSize:11,color:'var(--muted)'}}>{f.domain}</span>{pc>0&&<span style={{fontSize:11,display:'flex',alignItems:'center',gap:3,color:'var(--muted)'}}><Icon name="camera" size={11}/>x{pc}</span>}</div>
            <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{f.label}</div>
            {f.citation&&<div style={{fontSize:10.5,color:'#4f5fa8',marginTop:2,fontStyle:'italic'}}>Reg: {f.citation}</div>}
            {f.finding.notes&&<div style={{fontSize:12,color:'var(--muted)',marginTop:3}}>{f.finding.notes}</div>}</div>
            <StatusPill statusId={f.finding.status} small/>
          </div>
          {f.finding.correctiveAction&&<div style={{marginTop:7,fontSize:12,color:'var(--text)',background:'rgba(255,255,255,0.6)',borderRadius:6,padding:'5px 9px'}}><strong>Action:</strong> {f.finding.correctiveAction}</div>}
          {f.finding.followUpDate&&<div style={{marginTop:4,fontSize:11,color:'var(--muted)',display:'flex',alignItems:'center',gap:4}}><Icon name="clock" size={11}/>Follow-up: <strong>{f.finding.followUpDate}</strong></div>}
        </div>);})}
      </div>
    </div>):(<div style={{background:'var(--compliant-bg)',border:'1px solid var(--compliant-border)',borderRadius:12,padding:'18px 22px',marginBottom:13,textAlign:'center'}}><Icon name="check" size={28} color="var(--compliant-dot)" style={{margin:'0 auto 8px'}}/><div style={{fontSize:14,fontWeight:700,color:'var(--compliant-text)'}}>No issues found</div></div>)}
    <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'15px 17px',marginBottom:16}}>
      <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:11}}>Director Acknowledgement</div>
      <div style={{marginBottom:12}}><label style={{fontSize:12,fontWeight:600,color:'var(--text)',display:'block',marginBottom:5}}>Director name</label><input type="text" value={dirName} onChange={e=>setDirName(e.target.value)} placeholder="Type director's full name..." style={{width:'100%',maxWidth:340,padding:'9px 12px',borderRadius:8,border:'1px solid var(--border)',fontSize:13,outline:'none',fontFamily:'inherit',minHeight:42}} onFocus={e=>e.target.style.borderColor='var(--teal)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
      <label style={{display:'flex',alignItems:'flex-start',gap:10,cursor:'pointer'}}><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)} style={{marginTop:3,width:18,height:18,accentColor:'var(--teal)',cursor:'pointer',flexShrink:0}}/><span style={{fontSize:13,color:'var(--text)',lineHeight:1.5}}>I acknowledge that the <strong>{tc.label}</strong> findings listed above have been reviewed with me today, <strong>{new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</strong>. I understand the corrective actions required and follow-up dates.</span></label>
    </div>
    <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
      <button onClick={onBack} style={{padding:'9px 17px',background:'transparent',border:'1px solid var(--border)',borderRadius:8,fontSize:13,fontWeight:600,color:'var(--muted)',cursor:'pointer'}}>← Back</button>
      <button onClick={()=>{if(dirName.trim()&&ack)setDone(true);}} disabled={!dirName.trim()||!ack} style={{padding:'9px 22px',borderRadius:8,border:'none',fontSize:13,fontWeight:700,transition:'all 0.15s',cursor:(dirName.trim()&&ack)?'pointer':'not-allowed',background:(dirName.trim()&&ack)?'var(--teal)':'#e2e8f0',color:(dirName.trim()&&ack)?'#fff':'var(--muted)'}}>Complete Inspection</button>
    </div>
  </div>);
}
export default function InspectorView({activeTab='overview',userRole='inspector',centerId,center,reg:regProp,liveData:liveDataProp}){
  const [loginTime]=useState(Date.now());
  const [now,setNow]=useState(Date.now());
  const [screen,setScreen]=useState('overview');
  const [inspType,setInspType]=useState('real');
  const [subset,setSubset]=useState(null);
  const [expanded,setExpanded]=useState({});
  const [findings,setFindings]=useState(()=>loadFindings(centerId||DEFAULT_CENTER_ID));
  const [photos,setPhotos]=useState(()=>loadPhotos(centerId||DEFAULT_CENTER_ID));
  const [filterStatus,setFilter]=useState('all');
  const [focusedField,setFocusedField]=useState(null);
  const [saved,setSaved]=useState(false);
  const [showReport,setShowReport]=useState(false);
  const [showShortcuts,setShowShortcuts]=useState(false);
  const [ratioCounts,setRatioCounts]=useState({});

  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(t);},[]);

  const elapsed=(now-loginTime)/1000/3600,remaining=Math.max(0,SESSION_HOURS-elapsed);
  const hh=Math.floor(remaining),mm=Math.round((remaining-hh)*60),timerUrgent=remaining<1;

  const resolvedId=centerId||DEFAULT_CENTER_ID;
  const centerEntry=CENTERS.find(c=>c.id===resolvedId)||CENTERS.find(c=>c.companyId===1292)||CENTERS[0];
  const seedData=LIONHEART_SEED[resolvedId]||LIONHEART_SEED[DEFAULT_CENTER_ID]||{};
  const liveData=liveDataProp?.data||loadCenterData(resolvedId);
  const reg=regProp||getReg(centerEntry?.state||'CO');
  const domains=getDomainFields({id:resolvedId,...centerEntry},reg,liveData);
  const centerName=seedData._centerName||centerEntry?.centerName||'Lionheart RCCO';
  const centerCity=centerEntry?.city||'';
  const centerState=centerEntry?.state||'CO';
  const locationLabel=[centerCity,centerState].filter(Boolean).join(', ');
  const centerForTabs=center||{id:resolvedId,name:centerName,city:centerCity,state:centerState,zip:seedData._zip||centerEntry?.zip||'',agency:seedData._agency||reg?.agency||'',ratios:seedData._ratios||[],staff:seedData._staff||[],history:seedData._history||[],scores:{},alerts:[]};

  const updateFinding=useCallback((fieldId,patch)=>{
    setFindings(prev=>{
      const merged={...(prev[fieldId]||{}),...patch};
      if(patch.status==='')delete merged.status;
      const next={...prev};
      if(Object.keys(merged).length===0)delete next[fieldId];else next[fieldId]=merged;
      saveFindings(resolvedId,next);return next;
    });
  },[resolvedId]);

  const updatePhotos=useCallback((fieldId,np)=>{setPhotos(prev=>{const n={...prev,[fieldId]:np};savePhotos(resolvedId,n);return n;});},[resolvedId]);
  const handleSave=()=>{saveFindings(resolvedId,findings);setSaved(true);setTimeout(()=>setSaved(false),2500);};

  const allF=Object.values(findings);
  const fc={noncompliant:allF.filter(f=>f.status==='noncompliant').length,atrisk:allF.filter(f=>f.status==='atrisk').length,corrected:allF.filter(f=>f.status==='corrected').length,compliant:allF.filter(f=>f.status==='compliant').length};
  const isReadOnly=userRole!=='inspector';
  const getLiveValue=field=>{if(!field.ratioGroup||!ratioCounts[field.ratioGroup])return null;const g=ratioCounts[field.ratioGroup];return field.ratioType==='children'?g.children:field.ratioType==='staff'?g.staff:null;};

  if(userRole==='inspector'&&remaining<=0)return(<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',background:'var(--bg)'}}><div style={{textAlign:'center',background:'#fff',border:'1px solid var(--critical-border)',borderRadius:16,padding:'40px 48px',maxWidth:400}}><Icon name="lock" size={48} color="var(--red)" style={{margin:'0 auto 16px'}}/><h2 style={{fontSize:20,fontWeight:700,color:'var(--red)',marginBottom:8}}>Session Expired</h2><p style={{fontSize:14,color:'var(--muted)'}}>Your 8-hour inspection session has ended. Contact BUSoft to request a new access link.</p></div></div>);

  // ── When sidebar Overview tab is clicked, reset screen to overview ──────────
  useEffect(() => {
    if (activeTab === 'overview') setScreen('overview');
  }, [activeTab]);

  // ── Sidebar tab routing — checked before screen state so sidebar always works ──
  if(activeTab==='staterules')   return <div className="content"><StateRulesTab center={centerForTabs} reg={reg} userRole="inspector"/></div>;
  if(activeTab==='insphistory')  return <InspectionHistoryTab centerName={centerName} centerState={centerState} reg={reg}/>;
  if(activeTab==='opencap')      return <OpenCAPTab centerName={centerName} findings={findings}/>;
  if(activeTab==='documents')    return <DocumentsTab centerName={centerName}/>;
  if(activeTab==='changelog')    return <ChangeLogTab center={centerForTabs} userRole="inspector"/>;
  if(activeTab==='centerprofile')return <CenterProfileTab centerName={centerName} centerCity={centerCity} centerState={centerState} reg={reg} liveData={liveData}/>;

  // ── Screen routing ───────────────────────────────────────────────────────────
  if(screen==='overview') {
    // Count domain completion for the rings
    const domainStats = domains.map(d => {
      const fields = d.fields;
      const tagged = fields.filter(f=>!!findings[f.id]?.status).length;
      const nc  = fields.filter(f=>findings[f.id]?.status==='noncompliant').length;
      const ar  = fields.filter(f=>findings[f.id]?.status==='atrisk').length;
      const co  = fields.filter(f=>findings[f.id]?.status==='corrected').length;
      const cmp = fields.filter(f=>findings[f.id]?.status==='compliant').length;
      return { ...d, tagged, nc, ar, co, cmp, total: fields.length };
    });
    const totalTagged = domainStats.reduce((s,d)=>s+d.tagged,0);
    const totalFields = domainStats.reduce((s,d)=>s+d.total,0);
    const totalNC = domainStats.reduce((s,d)=>s+d.nc,0);
    const totalAR = domainStats.reduce((s,d)=>s+d.ar,0);
    const inspInProgress = totalTagged > 0;
    const openCAP = Object.entries(findings).filter(([,f])=>f.status==='noncompliant'||f.status==='atrisk');

    // Doc expiry checks from liveData
    const today = new Date();
    const daysUntil = d => d ? Math.round((new Date(d)-today)/86400000) : null;
    const docChecks = [
      { label:'Operating License',   date: liveData?.licensing?.licenseExpiry,   domain:'D1' },
      { label:'GL Insurance',        date: liveData?.licensing?.insuranceExpiry,  domain:'D1' },
      { label:"Workers' Comp",       date: liveData?.licensing?.workersCompExpiry,domain:'D1' },
      { label:'CPR Certification',   date: liveData?.staffHealth?.cprExpiryDate,  domain:'D5' },
    ].map(d=>({...d, days:daysUntil(d.date)})).filter(d=>d.days!==null&&d.days<60);

    return(
      <div style={{display:'flex',flexDirection:'column',height:'100%',overflowY:'auto',background:'var(--bg)'}}>
        {/* Hero */}
        <div style={{background:'var(--navy)',padding:'20px 22px',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:'var(--teal2)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>
                {isReadOnly?'Inspector View':'Inspection Overview'}
              </div>
              <div style={{fontSize:19,fontWeight:800,color:'#fff',marginBottom:2}}>{centerName}</div>
              <div style={{fontSize:12,color:'#94a3b8'}}>{locationLabel} · {reg?.agency||'State Licensing Agency'}</div>
            </div>
            {/* Session timer in hero */}
            {userRole==='inspector'&&(
              <div style={{background:timerUrgent?'rgba(185,28,28,0.3)':'rgba(255,255,255,0.08)',border:`1px solid ${timerUrgent?'#e8a0a0':'rgba(255,255,255,0.15)'}`,borderRadius:10,padding:'10px 16px',textAlign:'center'}}>
                <div style={{fontSize:10,fontWeight:700,color:timerUrgent?'#fca5a5':'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em',display:'flex',alignItems:'center',gap:5,justifyContent:'center'}}><Icon name="clock" size={11} color={timerUrgent?'#fca5a5':'#94a3b8'}/>Session remaining</div>
                <div style={{fontSize:22,fontWeight:800,color:timerUrgent?'#fca5a5':'#e2e8f0',lineHeight:1.2,marginTop:2}}>{hh}h {mm}m</div>
              </div>
            )}
          </div>

          {/* Inspection status bar */}
          <div style={{marginTop:14,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            {inspInProgress?(
              <>
                <span style={{fontSize:11,fontWeight:700,color:'var(--teal2)',display:'flex',alignItems:'center',gap:5}}><Icon name="check" size={12} color="var(--teal2)"/>Inspection in progress</span>
                <div style={{flex:1,height:5,background:'rgba(255,255,255,0.1)',borderRadius:3,minWidth:80,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${Math.round((totalTagged/totalFields)*100)}%`,background:'var(--teal)',borderRadius:3,transition:'width 0.4s'}}/>
                </div>
                <span style={{fontSize:11,color:'#94a3b8',whiteSpace:'nowrap'}}>{totalTagged}/{totalFields} fields tagged</span>
                {totalNC>0&&<span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,background:'rgba(185,28,28,0.25)',color:'#fca5a5',border:'1px solid rgba(185,28,28,0.4)'}}>{totalNC} Non-Compliant</span>}
                {totalAR>0&&<span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,background:'rgba(217,119,6,0.25)',color:'#fbbf24',border:'1px solid rgba(217,119,6,0.4)'}}>{totalAR} At Risk</span>}
              </>
            ):(
              <span style={{fontSize:12,color:'#64748b'}}>No inspection started yet — click Begin Inspection to start</span>
            )}
          </div>
        </div>

        <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:14}}>

          {/* Action buttons */}
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {!isReadOnly&&(
              <button onClick={()=>setScreen('prep')} style={{padding:'10px 20px',background:'var(--teal)',color:'#fff',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:7,transition:'background 0.15s'}} onMouseEnter={e=>e.currentTarget.style.background='var(--teal2)'} onMouseLeave={e=>e.currentTarget.style.background='var(--teal)'}>
                <Icon name="arrow" size={14} color="#fff"/>
                {inspInProgress?'Continue Inspection':'Begin Inspection'}
              </button>
            )}
            {inspInProgress&&!isReadOnly&&(
              <button onClick={()=>setScreen('inspection')} style={{padding:'10px 16px',background:'rgba(0,169,157,0.08)',color:'var(--teal)',border:'1px solid var(--teal)',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:7}}>
                <Icon name="edit" size={14} color="var(--teal)"/>Resume Findings
              </button>
            )}
            {inspInProgress&&!isReadOnly&&(
              <button onClick={()=>{handleSave();setScreen('exit');}} style={{padding:'10px 16px',background:'transparent',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:7}}>
                <Icon name="clipboard" size={14}/>Exit Conference
              </button>
            )}
          </div>

          {/* Domain completion grid */}
          <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'15px 17px'}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:13}}>Domain Coverage</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
              {domainStats.map(d=>{
                const accent=d.nc>0?'var(--red)':d.ar>0?'var(--amber)':d.tagged===d.total&&d.total>0?'var(--green)':d.tagged>0?d.color:'#cbd5e1';
                return(
                  <div key={d.id} onClick={()=>{if(!isReadOnly){setScreen('inspection');setExpanded(p=>({...p,[d.id]:true}));}}} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',border:`1px solid ${accent}30`,borderLeft:`3px solid ${accent}`,borderRadius:9,background:d.nc>0?'var(--critical-bg)':d.ar>0?'var(--atrisk-bg)':'#fafafa',cursor:isReadOnly?'default':'pointer'}}>
                    <ProgressRing tagged={d.tagged} total={d.total} color={d.color} size={34}/>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:10,fontWeight:800,color:d.color,marginBottom:1}}>{d.dNum}</div>
                      <div style={{fontSize:11,fontWeight:600,color:'var(--text)',lineHeight:1.2}}>{d.label.split(' ')[0]}</div>
                      {d.nc>0&&<div style={{fontSize:10,color:'var(--critical-text)',marginTop:2}}>{d.nc} NC</div>}
                      {d.ar>0&&!d.nc&&<div style={{fontSize:10,color:'var(--atrisk-text)',marginTop:2}}>{d.ar} at risk</div>}
                      {d.nc===0&&d.ar===0&&d.tagged>0&&<div style={{fontSize:10,color:'var(--muted)',marginTop:2}}>{d.tagged}/{d.total}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}} className="insp-prep-grid">
            {/* Open corrections */}
            <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'15px 17px'}}>
              <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:11,display:'flex',alignItems:'center',gap:7}}><Icon name="clipboard" size={13} color="var(--muted)"/>Open Corrections</div>
              {openCAP.length===0?(
                <div style={{fontSize:13,color:'var(--muted)',display:'flex',alignItems:'center',gap:6}}><Icon name="check" size={14} color="var(--compliant-dot)"/>No open items</div>
              ):(
                <>
                  <div style={{display:'flex',flexDirection:'column',gap:7}}>
                    {openCAP.slice(0,4).map(([id,f])=>{const cfg=STATUS_MAP[f.status];return(
                      <div key={id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'7px 10px',background:cfg.bg,border:`1px solid ${cfg.bd}`,borderRadius:7}}>
                        <div style={{fontSize:12,color:'var(--text)',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{id.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase())}</div>
                        <StatusPill statusId={f.status} small/>
                      </div>
                    );})}
                  </div>
                  {openCAP.length>4&&<div style={{fontSize:11,color:'var(--muted)',marginTop:6,textAlign:'right'}}>{openCAP.length-4} more — see Open Corrections tab</div>}
                </>
              )}
            </div>

            {/* Document expiry watch */}
            <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'15px 17px'}}>
              <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:11,display:'flex',alignItems:'center',gap:7}}><Icon name="clock" size={13} color="var(--muted)"/>Expiring Soon</div>
              {docChecks.length===0?(
                <div style={{fontSize:13,color:'var(--muted)',display:'flex',alignItems:'center',gap:6}}><Icon name="check" size={14} color="var(--compliant-dot)"/>No documents expiring within 60 days</div>
              ):(
                <div style={{display:'flex',flexDirection:'column',gap:7}}>
                  {docChecks.map((d,i)=>{
                    const urgent=d.days<0,warn=d.days<30;
                    return(
                      <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'7px 10px',background:urgent?'var(--critical-bg)':warn?'var(--atrisk-bg)':'#f8fafc',border:`1px solid ${urgent?'var(--critical-border)':warn?'var(--atrisk-border)':'var(--border)'}`,borderRadius:7}}>
                        <div style={{fontSize:12,color:'var(--text)',fontWeight:500}}>{d.label}</div>
                        <div style={{fontSize:11,fontWeight:700,color:urgent?'var(--critical-text)':warn?'var(--atrisk-text)':'var(--muted)',whiteSpace:'nowrap'}}>
                          {urgent?`${Math.abs(d.days)}d overdue`:d.days===0?'Today':`${d.days}d`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Past inspection history */}
          <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'15px 17px'}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:11,display:'flex',alignItems:'center',gap:7}}><Icon name="history" size={13} color="var(--muted)"/>Past Inspection Results</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[
                {date:'2024-09-14',type:'Real Inspection',result:'Passed',violations:3,inspector:'Jane Morrow'},
                {date:'2024-04-02',type:'Real Inspection',result:'Passed',violations:5,inspector:'Jane Morrow'},
                {date:'2023-09-20',type:'Real Inspection',result:'Passed with conditions',violations:8,inspector:'Thomas Reed'},
              ].map((h,i)=>{
                const ok=h.result==='Passed';
                return(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'9px 12px',background:'#fafafa',border:'1px solid #f1f5f9',borderRadius:8,flexWrap:'wrap'}}>
                    <div style={{display:'flex',flexDirection:'column',flex:1,minWidth:120}}>
                      <div style={{fontSize:12,fontWeight:700,color:'var(--text)'}}>{new Date(h.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{h.type} · {h.inspector}</div>
                    </div>
                    <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,background:ok?'var(--compliant-bg)':h.violations>5?'var(--critical-bg)':'var(--atrisk-bg)',color:ok?'var(--compliant-text)':h.violations>5?'var(--critical-text)':'var(--atrisk-text)',border:`1px solid ${ok?'var(--compliant-border)':h.violations>5?'var(--critical-border)':'var(--atrisk-border)'}`}}>{h.result}</span>
                    <div style={{fontSize:12,color:'var(--muted)',whiteSpace:'nowrap'}}><strong style={{color:'var(--text)'}}>{h.violations}</strong> violations</div>
                  </div>
                );
              })}
            </div>
            <div style={{marginTop:10,padding:'9px 12px',background:'var(--atrisk-bg)',border:'1px solid var(--atrisk-border)',borderRadius:8,fontSize:11,color:'var(--atrisk-text)',display:'flex',alignItems:'center',gap:7}}><Icon name="info" size={12} color="var(--atrisk-text)"/>Mock data — real inspection history will populate once the state licensing data integration is complete.</div>
          </div>

          {/* State requirements snapshot */}
          <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'15px 17px'}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:11,display:'flex',alignItems:'center',gap:7}}><Icon name="map" size={13} color="var(--muted)"/>State Requirements — {centerState}</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:8}}>
              {[
                ['Infant ratio',      reg?.rules?.infantRatio    || `1:${reg?.infant||'?'}`],
                ['Toddler ratio',     reg?.rules?.toddlerRatio   || `1:${reg?.toddler||'?'}`],
                ['Preschool ratio',   reg?.rules?.preschoolRatio || `1:${reg?.preschool||'?'}`],
                ['School-age ratio',  reg?.rules?.schoolAgeRatio || `1:${reg?.schoolAge||'?'}`],
                ['Indoor sq ft/child',reg?.rules?.indoorSqft     ? `${reg.rules.indoorSqft} sq ft` : reg?.indoorSqft ? `${reg.indoorSqft} sq ft` : '—'],
                ['Outdoor sq ft/child',reg?.rules?.outdoorSqft   ? `${reg.rules.outdoorSqft} sq ft` : reg?.outdoorSqft ? `${reg.outdoorSqft} sq ft` : '—'],
                ['Training hours/yr', reg?.rules?.trainingHours  ? `${reg.rules.trainingHours} hrs` : reg?.trainingHrs ? `${reg.trainingHrs} hrs` : '—'],
                ['Hot water max',     reg?.rules?.hotWaterMax    ? `${reg.rules.hotWaterMax}°F` : '110°F'],
                ['BG check type',     reg?.rules?.bgCheck        || reg?.rules?.bgCheckType || '—'],
                ['Director requirement', reg?.directorReq        || '—'],
              ].map(([l,v])=>(
                <div key={l} style={{display:'flex',flexDirection:'column',gap:2,padding:'9px 11px',background:'#f8fafc',borderRadius:7,border:'1px solid #f1f5f9'}}>
                  <span style={{fontSize:10.5,color:'var(--muted)'}}>{l}</span>
                  <span style={{fontSize:13,fontWeight:700,color:v==='—'||v===''?'var(--muted)':'var(--text)'}}>{v||'—'}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    );
  }

  if(!isReadOnly&&screen==='prep')return(<div style={{display:'flex',flexDirection:'column',height:'100%',overflowY:'auto',background:'var(--bg)'}}><PrepScreen centerName={centerName} locationLabel={locationLabel} reg={reg} lastFindings={findings} domains={domains} resolvedId={resolvedId} userRole={userRole} onStart={(type,notes,sub)=>{setInspType(type);setSubset(sub||null);setScreen('inspection');}}/></div>);

  if(!isReadOnly&&screen==='exit')return(<div style={{display:'flex',flexDirection:'column',height:'100%',overflowY:'auto',background:'var(--bg)'}}><ExitConferenceScreen domains={domains} findings={findings} photos={photos} centerName={centerName} locationLabel={locationLabel} reg={reg} inspType={inspType} onBack={()=>setScreen('inspection')} onFinish={()=>setShowReport(true)}/>{showReport&&<InspectionReportExport center={centerForTabs} onClose={()=>setShowReport(false)}/>}</div>);

  const typeCfg=INSP_TYPES.find(t=>t.id===inspType)||INSP_TYPES[0];
  return(<div style={{display:'flex',flexDirection:'column',height:'100%',overflowY:'auto',background:'var(--bg)'}}>
    <div style={{background:'#fff',borderBottom:'1px solid var(--border)',flexShrink:0}}>
      <div style={{padding:'12px 18px 10px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:180}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4,flexWrap:'wrap'}}>
            <span style={{fontSize:10.5,fontWeight:700,padding:'2px 8px',borderRadius:20,background:typeCfg.bg,color:typeCfg.color,border:`1px solid ${typeCfg.bd}`,textTransform:'uppercase',letterSpacing:'0.05em',display:'inline-flex',alignItems:'center',gap:5}}><Icon name={typeCfg.icon} size={10} color={typeCfg.color}/>{isReadOnly?'Read-only':typeCfg.label}</span>
            {subset&&<span style={{fontSize:11,color:'var(--muted)'}}>Subset · {subset.size} fields</span>}
          </div>
          <h2 style={{fontSize:17,fontWeight:800,color:'var(--text)',margin:'0 0 2px'}}>{centerName}</h2>
          <p style={{fontSize:12,color:'var(--muted)',margin:0}}>{locationLabel} · {reg?.agency||'State Licensing Agency'}</p>
        </div>
        <div style={{display:'flex',gap:7,alignItems:'center',flexWrap:'wrap'}}>
          {[{key:'noncompliant',label:'NC',...STATUS_MAP.noncompliant},{key:'atrisk',label:'Risk',...STATUS_MAP.atrisk},{key:'corrected',label:'Corr',...STATUS_MAP.corrected}].filter(({key})=>fc[key]>0).map(({key,label,bg,bd,color})=>(
            <div key={key} style={{background:bg,border:`1px solid ${bd}`,borderRadius:8,padding:'4px 9px',textAlign:'center',minWidth:46}}><div style={{fontSize:16,fontWeight:800,color,lineHeight:1}}>{fc[key]}</div><div style={{fontSize:9.5,color,fontWeight:700,marginTop:1}}>{label}</div></div>
          ))}
          {userRole==='inspector'&&(<div style={{background:timerUrgent?'var(--critical-bg)':'#fefce8',border:`1px solid ${timerUrgent?'var(--critical-border)':'#fde047'}`,borderRadius:8,padding:'4px 10px',textAlign:'center',minWidth:64}}>
            <div style={{fontSize:9.5,fontWeight:700,color:timerUrgent?'var(--critical-text)':'#92400e',textTransform:'uppercase',letterSpacing:'0.04em',display:'flex',alignItems:'center',gap:4,justifyContent:'center'}}><Icon name="clock" size={10} color={timerUrgent?'var(--critical-text)':'#92400e'}/>Session</div>
            <div style={{fontSize:16,fontWeight:800,color:timerUrgent?'var(--red)':'#92400e',lineHeight:1.2}}>{hh}h {mm}m</div>
          </div>)}
          <button onClick={()=>setShowReport(true)} style={{padding:'6px 11px',borderRadius:8,border:'1px solid var(--border)',background:'#fff',color:'var(--text)',fontSize:12,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',gap:5,minHeight:36}}><Icon name="printer" size={12}/>Export</button>
          {!isReadOnly&&<>
            <button onClick={handleSave} style={{padding:'6px 13px',borderRadius:8,border:'none',cursor:'pointer',minHeight:36,background:saved?'var(--green)':'var(--navy)',color:'#fff',fontSize:12,fontWeight:600,display:'flex',alignItems:'center',gap:5}}><Icon name="check" size={12} color="#fff"/>{saved?'Saved':'Save'}</button>
            <button onClick={()=>{handleSave();setScreen('exit');}} style={{padding:'6px 13px',borderRadius:8,border:'none',cursor:'pointer',minHeight:36,background:'var(--teal)',color:'#fff',fontSize:12,fontWeight:600,display:'flex',alignItems:'center',gap:5}}>Exit Conf<Icon name="arrow" size={12} color="#fff"/></button>
          </>}
        </div>
      </div>
      {showReport&&<InspectionReportExport center={centerForTabs} onClose={()=>setShowReport(false)}/>}
      <div style={{padding:'6px 18px 8px',display:'flex',alignItems:'center',gap:10,borderTop:'1px solid #f1f5f9'}}>
        <span style={{fontSize:10.5,fontWeight:700,color:'var(--muted)',whiteSpace:'nowrap',textTransform:'uppercase',letterSpacing:'0.04em'}}>Progress</span>
        <OverallProgress domains={domains} findings={findings} subset={subset}/>
        {!isReadOnly&&<button onClick={()=>setScreen('prep')} style={{fontSize:11,padding:'2px 8px',borderRadius:20,border:'1px solid var(--border)',background:'#f8fafc',color:'var(--muted)',cursor:'pointer',whiteSpace:'nowrap'}}>← Prep</button>}
      </div>
    </div>

    <div style={{background:'#fff',borderBottom:'1px solid var(--border)',padding:'6px 18px',display:'flex',gap:5,alignItems:'center',flexShrink:0,flexWrap:'wrap'}}>
      <span style={{fontSize:10.5,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.04em',marginRight:2}}>Show</span>
      {[{id:'all',label:'All'},{id:'noncompliant',label:'Non-Compliant'},{id:'atrisk',label:'At Risk'},{id:'corrected',label:'Corrected'},{id:'flagged',label:'All flagged'},{id:'untagged',label:'Untagged'}].map(f=>(
        <button key={f.id} onClick={()=>setFilter(f.id)} style={{padding:'3px 10px',borderRadius:20,fontSize:11.5,fontWeight:600,cursor:'pointer',minHeight:28,background:filterStatus===f.id?'var(--navy)':'#f1f5f9',color:filterStatus===f.id?'#fff':'var(--muted)',border:filterStatus===f.id?'none':'1px solid var(--border)'}}>
          {f.label}{f.id!=='all'&&f.id!=='flagged'&&f.id!=='untagged'&&fc[f.id]>0&&<span style={{marginLeft:3,fontSize:10,opacity:0.8}}>{fc[f.id]}</span>}
        </button>
      ))}
      {!isReadOnly&&<button onClick={()=>setShowShortcuts(s=>!s)} style={{marginLeft:'auto',fontSize:11,padding:'2px 8px',borderRadius:20,border:`1px solid ${showShortcuts?'var(--teal)':'var(--border)'}`,background:showShortcuts?'rgba(0,169,157,0.08)':'#f8fafc',color:showShortcuts?'var(--teal)':'var(--muted)',cursor:'pointer',display:'flex',alignItems:'center',gap:5}}><Icon name="settings" size={11} color={showShortcuts?'var(--teal)':'var(--muted)'}/>Shortcuts</button>}
    </div>

    {showShortcuts&&!isReadOnly&&(
      <div style={{background:'var(--navy)',padding:'10px 18px',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap',flexShrink:0,borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
        <span style={{fontSize:11,color:'#94a3b8',fontWeight:600}}>Click any row to focus, then press:</span>
        {[['C','Compliant','check'],['N','Non-Compliant','x'],['A','At Risk','alert'],['R','Corrected','edit'],['X','Not Observed','eye']].map(([k,l,ic])=>(
          <span key={k} style={{fontSize:11,color:'#e2e8f0',display:'flex',alignItems:'center',gap:5}}>
            <span style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:5,padding:'2px 7px',fontWeight:800,fontFamily:'monospace',fontSize:12}}>{k}</span>
            <Icon name={ic} size={11} color="#94a3b8"/>
            <span style={{color:'#94a3b8'}}>{l}</span>
          </span>
        ))}
        <button onClick={()=>setShowShortcuts(false)} style={{marginLeft:'auto',background:'none',border:'none',color:'#64748b',cursor:'pointer',display:'flex',alignItems:'center'}}><Icon name="x" size={14} color="#64748b"/></button>
      </div>
    )}

    <div style={{padding:'12px 18px',flex:1}}>
      {domains.map(domain=>{
        const isOpen=!!expanded[domain.id];
        const domainFields=subset?domain.fields.filter(f=>subset.has(f.id)):domain.fields;
        if(domainFields.length===0&&subset)return null;
        const sorted=isOpen?[...domainFields].sort((a,b)=>{const o={noncompliant:0,atrisk:1,corrected:2,compliant:3,notobserved:4,'':5};return(o[findings[a.id]?.status||'']??5)-(o[findings[b.id]?.status||'']??5);}):domainFields;
        const visibleFields=filterStatus==='all'?sorted:sorted.filter(f=>{const s=findings[f.id]?.status;if(filterStatus==='flagged')return s&&s!=='compliant'&&s!=='notobserved';if(filterStatus==='untagged')return !s;return s===filterStatus;});
        if(filterStatus!=='all'&&visibleFields.length===0)return null;
        const tagged=domainFields.filter(f=>!!findings[f.id]?.status).length;
        const dF=domainFields.map(f=>findings[f.id]?.status).filter(Boolean);
        const dNC=dF.filter(s=>s==='noncompliant').length,dAR=dF.filter(s=>s==='atrisk').length,dCO=dF.filter(s=>s==='corrected').length,dCMP=dF.filter(s=>s==='compliant').length;
        const accent=dNC>0?'var(--red)':dAR>0?'var(--amber)':dCO>0?'var(--info-dot)':tagged>0?domain.color:'#cbd5e1';
        const showLiveCol=!!domain.isRatios;
        return(<div key={domain.id} style={{background:'#fff',border:`1px solid ${isOpen?accent+'50':'var(--border)'}`,borderLeft:`3px solid ${accent}`,borderRadius:10,marginBottom:10,overflow:'hidden',transition:'border-color 0.2s'}}>
          <button onClick={()=>setExpanded(p=>({...p,[domain.id]:!p[domain.id]}))} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'11px 14px',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
            <ProgressRing tagged={tagged} total={domainFields.length} color={domain.color} size={33}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap'}}>
                <span style={{fontSize:10.5,fontWeight:800,color:domain.color,background:domain.color+'14',padding:'1px 5px',borderRadius:4}}>{domain.dNum}</span>
                <span style={{fontSize:13.5,fontWeight:700,color:'var(--text)'}}>{domain.label}</span>
                <span style={{fontSize:11,color:'var(--muted)'}}>{domainFields.length}{subset?' selected':' fields'}</span>
              </div>
              <div style={{display:'flex',gap:5,marginTop:3,flexWrap:'wrap'}}>
                {dNC>0&&<span style={{fontSize:10.5,fontWeight:600,padding:'1px 6px',borderRadius:20,background:'var(--critical-bg)',color:'var(--critical-text)',border:'1px solid var(--critical-border)'}}>{dNC} NC</span>}
                {dAR>0&&<span style={{fontSize:10.5,fontWeight:600,padding:'1px 6px',borderRadius:20,background:'var(--atrisk-bg)',color:'var(--atrisk-text)',border:'1px solid var(--atrisk-border)'}}>{dAR} at risk</span>}
                {dCO>0&&<span style={{fontSize:10.5,fontWeight:600,padding:'1px 6px',borderRadius:20,background:'var(--info-bg)',color:'var(--info-text)',border:'1px solid var(--info-border)'}}>{dCO} corrected</span>}
                {dCMP>0&&<span style={{fontSize:10.5,fontWeight:600,padding:'1px 6px',borderRadius:20,background:'var(--compliant-bg)',color:'var(--compliant-text)',border:'1px solid var(--compliant-border)'}}>{dCMP} compliant</span>}
              </div>
            </div>
            <Icon name="chevron" size={15} color="var(--muted)" style={{transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s',flexShrink:0}}/>
          </button>
          {isOpen&&(<div style={{borderTop:'1px solid #f1f5f9'}}>
            {domain.isRatios&&!isReadOnly&&<RatioCounter reg={reg} onCountsChange={setRatioCounts}/>}
            <div className="inspector-table-wrap">
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:'#f8fafc'}}>
                  <th style={{textAlign:'left',padding:'7px 13px',fontSize:10.5,fontWeight:700,color:'var(--muted)',letterSpacing:'0.04em',textTransform:'uppercase'}}>Field</th>
                  <th style={{textAlign:'left',padding:'7px 13px',fontSize:10.5,fontWeight:700,color:'var(--muted)',letterSpacing:'0.04em',textTransform:'uppercase'}}>Center data</th>
                  {showLiveCol&&<th style={{textAlign:'left',padding:'7px 13px',fontSize:10.5,fontWeight:700,color:'var(--teal)',letterSpacing:'0.04em',textTransform:'uppercase'}}>Live count</th>}
                  <th style={{textAlign:'left',padding:'7px 13px',fontSize:10.5,fontWeight:700,color:'var(--muted)',letterSpacing:'0.04em',textTransform:'uppercase'}}>{isReadOnly?'Finding':'Status'}</th>
                  <th style={{padding:'7px 13px',width:110}}></th>
                </tr></thead>
                <tbody>
                  {(filterStatus==='all'?sorted:visibleFields).map(f=>{const rk=FIELD_REF_MAP[f.id];return(<FindingRow key={f.id} fieldId={f.id} label={f.label} value={f.value} note={f.note} liveValue={getLiveValue(f)} finding={findings[f.id]} onUpdate={updateFinding} readOnly={isReadOnly} photos={photos} onPhotosChange={updatePhotos} citation={rk?reg?.refs?.[rk]:null} focused={focusedField===f.id} onFocus={()=>setFocusedField(f.id)} showLiveCol={showLiveCol}/>);})}
                </tbody>
              </table>
            </div>
            <div className="inspector-cards-wrap" style={{padding:'10px 12px'}}>
              {(filterStatus==='all'?sorted:visibleFields).map(f=>{const rk=FIELD_REF_MAP[f.id];return(<FindingCard key={f.id} fieldId={f.id} label={f.label} value={f.value} note={f.note} liveValue={getLiveValue(f)} finding={findings[f.id]} onUpdate={updateFinding} readOnly={isReadOnly} photos={photos} onPhotosChange={updatePhotos} citation={rk?reg?.refs?.[rk]:null}/>);})}
            </div>
          </div>)}
        </div>);
      })}
      {!isReadOnly&&(<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:10,paddingBottom:10,flexWrap:'wrap',gap:10}}>
        <button onClick={()=>{handleSave();setScreen('exit');}} style={{padding:'9px 17px',borderRadius:8,border:'1px solid var(--teal)',background:'rgba(0,169,157,0.08)',color:'var(--teal)',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:7}}>Proceed to Exit Conference<Icon name="arrow" size={14} color="var(--teal)"/></button>
        <button onClick={handleSave} style={{padding:'9px 20px',borderRadius:8,border:'none',cursor:'pointer',background:saved?'var(--green)':'var(--navy)',color:'#fff',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:6}}><Icon name="check" size={13} color="#fff"/>{saved?'Findings Saved':'Save All Findings'}</button>
      </div>)}
    </div>
  </div>);
}

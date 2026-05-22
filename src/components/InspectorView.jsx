import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getReg } from '../regulations';
import { LIONHEART_SEED } from '../lionheartSeed';
import { CENTERS } from '../centers';
import StateRulesTab from './tabs/StateRulesTab';
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
  const rules=reg?.rules||{},seed=LIONHEART_SEED[center.id]||{};
  const lic=liveData.licensing||{},phy=liveData.physical||{},per=liveData.personnel||{};
  const cr=liveData.staffCredentials||{},h=liveData.staffHealth||{},ch=liveData.children||{},em=liveData.emergency||{},rat=liveData.ratios||{};
  const v=x=>(x&&x!=='')?x:'—';
  return [
    {id:'d1',label:'Licensing & Administration',dNum:'D1',color:D_COLORS[0],fields:[
      {id:'licenseNumber',label:'License number',value:v(lic.licenseNumber||seed._licenseNumber)},
      {id:'licenseExpiry',label:'License expiry date',value:v(lic.licenseExpiry)},
      {id:'licCertOnFile',label:'License certificate on file',value:v(lic.licCertOnFile)},
      {id:'insurancePolicyNum',label:'GL insurance policy number',value:v(lic.insurancePolicyNum)},
      {id:'insuranceExpiry',label:'GL insurance expiry',value:v(lic.insuranceExpiry)},
      {id:'workersCompExpiry',label:"Workers' comp expiry",value:v(lic.workersCompExpiry)},
      {id:'lastInspectionDate',label:'Last inspection date',value:v(lic.lastInspectionDate)},
      {id:'lastInspectionResult',label:'Last inspection result',value:v(lic.lastInspectionResult)},
      {id:'qrisStatus',label:'QRIS enrollment status',value:v(lic.qrisStatus),note:reg?.qrs||''},
      {id:'coiOnFile',label:'Certificate of insurance on file',value:v(lic.coiOnFile)},
    ]},
    {id:'d2',label:'Physical Environment',dNum:'D2',color:D_COLORS[1],fields:[
      {id:'indoorSqft',label:'Indoor sq ft (total)',value:v(phy.indoorSqft),note:`Req: ${reg?.indoorSqft||'?'} sq ft/child`},
      {id:'outdoorSqft',label:'Outdoor sq ft (total)',value:v(phy.outdoorSqft),note:`Req: ${reg?.outdoorSqft||'?'} sq ft/child`},
      {id:'capacity',label:'Licensed capacity',value:v(phy.capacity)},
      {id:'coDetectorInstalled',label:'CO detector installed',value:v(phy.coDetectorInstalled)},
      {id:'smokeDetectorInstalled',label:'Smoke detectors present',value:v(phy.smokeDetectorInstalled)},
      {id:'fireExtinguisherCurrent',label:'Fire extinguisher current',value:v(phy.fireExtinguisherCurrent)},
      {id:'firstAidKitPresent',label:'First aid kit present',value:v(phy.firstAidKitPresent)},
      {id:'hotWaterMaxTemp',label:'Hot water temp (°F)',value:v(phy.hotWaterMaxTemp),note:`Max ${rules.hotWaterMax||110}°F`},
      {id:'fencingEnclosesPlayArea',label:'Fencing encloses play area',value:v(phy.fencingEnclosesPlayArea)},
      {id:'fencingHeightFt',label:'Fence height (ft)',value:v(phy.fencingHeightFt),note:`Min ${rules.minFencingHeight||'4 ft'}`},
      {id:'toiletCompliant',label:'Toilet ratio compliant',value:v(phy.toiletCompliant),note:rules.toiletRatio?`1:${rules.toiletRatio}`:''},
    ]},
    {id:'d3',label:'Personnel & Qualifications',dNum:'D3',color:D_COLORS[2],fields:[
      {id:'directorName',label:'Director name on file',value:v(per.directorName)},
      {id:'directorEduLevel',label:'Director education level',value:v(per.directorEduLevel),note:reg?.directorReq||''},
      {id:'directorYearsExp',label:'Director years of experience',value:v(per.directorYearsExp)},
      {id:'teacherEduMeetsReq',label:'Teacher qualifications met',value:v(per.teacherEduMeetsReq),note:reg?.teacherReq||''},
      {id:'teacherMinAgeCompliant',label:'Teacher min age compliant',value:v(per.teacherMinAgeCompliant)},
      {id:'bgCheckType',label:'Background check type',value:v(rules.bgCheckType)},
      {id:'bgValid',label:'Staff with valid BG check',value:v(cr.bgValid),note:`of ${cr.bgTotal||'?'} total staff`},
      {id:'fbiClearance',label:'FBI fingerprint clearance',value:v(per.fbiClearance)},
      {id:'childAbuseRegistry',label:'Child abuse registry check',value:v(per.childAbuseRegistryDate)},
      {id:'adminDesignationOnFile',label:'Admin designation on file',value:v(per.adminDesignationOnFile)},
      {id:'workforceRegistry',label:'Workforce registry enrollment',value:v(cr.workforceRegistryDone),note:rules.workforceRegistry||''},
    ]},
    {id:'d4',label:'Ratios & Supervision',dNum:'D4',color:D_COLORS[3],isRatios:true,fields:[
      {id:'infantChildren',label:'Infant — enrolled',value:v((rat.infant||{}).children),note:`Max 1:${reg?.infant||'?'}`,ratioGroup:'Infant',ratioType:'children'},
      {id:'infantStaff',label:'Infant — staff on duty',value:v((rat.infant||{}).staff),ratioGroup:'Infant',ratioType:'staff'},
      {id:'toddlerChildren',label:'Toddler — enrolled',value:v((rat.toddler||{}).children),note:`Max 1:${reg?.toddler||'?'}`,ratioGroup:'Toddler',ratioType:'children'},
      {id:'toddlerStaff',label:'Toddler — staff on duty',value:v((rat.toddler||{}).staff),ratioGroup:'Toddler',ratioType:'staff'},
      {id:'preschoolChildren',label:'Preschool — enrolled',value:v((rat.preschool||{}).children),note:`Max 1:${reg?.preschool||'?'}`,ratioGroup:'Preschool',ratioType:'children'},
      {id:'preschoolStaff',label:'Preschool — staff on duty',value:v((rat.preschool||{}).staff),ratioGroup:'Preschool',ratioType:'staff'},
      {id:'schoolAgeChildren',label:'School-age — enrolled',value:v((rat.schoolAge||{}).children),note:`Max 1:${reg?.schoolAge||'?'}`,ratioGroup:'School-age',ratioType:'children'},
      {id:'schoolAgeStaff',label:'School-age — staff on duty',value:v((rat.schoolAge||{}).staff),ratioGroup:'School-age',ratioType:'staff'},
      {id:'signinLogMaintained',label:'Sign-in/sign-out log',value:v(rat.signinLogMaintained)},
      {id:'supervisionPlan',label:'Supervision plan on file',value:v(liveData.supervisionPlan)},
    ]},
    {id:'d5',label:'Staff Health & Training',dNum:'D5',color:D_COLORS[4],fields:[
      {id:'cprCertValid',label:'CPR certification — all staff',value:v(h.cprCertValid),note:`Renewal: ${rules.cprRenewal||'2 years'}`},
      {id:'cprExpiryDate',label:'CPR expiry date',value:v(h.cprExpiryDate)},
      {id:'firstAidCertValid',label:'First Aid — all staff',value:v(h.firstAidCertValid)},
      {id:'tbScreeningAllStaff',label:'TB screening — all staff',value:v(h.tbScreeningAllStaff),note:rules.tbTestReq||''},
      {id:'physicalExamOnFile',label:'Physical exam on file — all staff',value:v(h.physicalExamOnFile)},
      {id:'trainingHrs',label:'Annual training hours (avg)',value:v(cr.trainingHrs),note:`Req: ${reg?.trainingHrs||'?'} hrs/yr`},
      {id:'mandatedReporterDone',label:'Mandated reporter training',value:v(cr.mandatedReporterDone),note:rules.mandatedReporterRenewal||''},
      {id:'newHireOrientation',label:'New hire orientation completed',value:v(h.newHireOrientationCompleted)},
      {id:'trainingLogOnFile',label:'Training log on file',value:v(h.trainingLogOnFile)},
      {id:'tbRenewalDueDate',label:'TB renewal due date',value:v(h.tbRenewalDueDate)},
    ]},
    {id:'d6',label:"Children's Records & Health",dNum:'D6',color:D_COLORS[5],fields:[
      {id:'childRecordComplete',label:'Child enrollment records complete',value:v(ch.childRecordComplete)},
      {id:'emergContactsOnFile',label:'Emergency contacts on file',value:v(ch.emergContactsOnFile)},
      {id:'authPickupOnFile',label:'Authorized pickup list on file',value:v(ch.authPickupOnFile)},
      {id:'allergyDocOnFile',label:'Allergy documentation on file',value:v(ch.allergyDocOnFile)},
      {id:'allergyCareplan',label:'Allergy care plans on file',value:v(ch.allergyCareplan)},
      {id:'medLogMaintained',label:'Medication log maintained',value:v(ch.medLogMaintained)},
      {id:'medsStoredCorrectly',label:'Medications stored correctly',value:v(ch.medsStoredCorrectly)},
      {id:'immRecordsOnFile',label:'Immunization records on file',value:v(ch.immRecordsOnFile),note:`Exemptions: ${rules.immExemptions||'Medical only'}`},
      {id:'immRecordsCurrent',label:'Immunization records current',value:v(ch.immRecordsCurrent)},
      {id:'parentAgreementSigned',label:'Parent agreements signed',value:v(ch.parentAgreementSigned)},
      {id:'safeSleepPolicy',label:'Safe sleep policy on file',value:v(ch.safeSleepPolicy)},
      {id:'attendanceRecordOnFile',label:'Daily attendance record on file',value:v(ch.attendanceRecordOnFile)},
      {id:'attendanceSignInLog',label:'Sign-in/sign-out log maintained',value:v(ch.attendanceSignInLog)},
      {id:'attendanceRetentionMet',label:'Attendance retention period met',value:v(ch.attendanceRetentionMet),note:`Retain ${rules.recordRetention||'3 years'}`},
    ]},
    {id:'d7',label:'Emergency & Safety',dNum:'D7',color:D_COLORS[6],fields:[
      {id:'fireEvacPlan',label:'Fire evacuation plan on file',value:v(em.fireEvacPlan)},
      {id:'fireEvacPosted',label:'Fire evacuation plan posted',value:v(em.fireEvacPosted)},
      {id:'lastFireDrillDate',label:'Last fire drill date',value:v(em.lastFireDrillDate),note:`Req: ${rules.fireDrillFreq||'Monthly'}`},
      {id:'fireDrillLog',label:'Fire drill log on file',value:v(em.fireDrillLog)},
      {id:'fireSafetyTraining',label:'Fire safety training — all staff',value:v(em.fireSafetyTraining)},
      {id:'fireDeptInspCurrent',label:'Fire dept inspection current',value:v(em.fireDeptInspCurrent)},
      {id:'tornadoDrillDate',label:'Last tornado/weather drill',value:v(em.tornadoDrillDate),note:rules.tornadoDrill||'Check state'},
      {id:'lockdownDrillDate',label:'Last lockdown drill',value:v(em.lockdownDrillDate),note:rules.lockdownDrill||'2x/year'},
      {id:'emergencyPlanOnFile',label:'Emergency plan on file',value:v(em.emergencyPlanOnFile)},
      {id:'emergencyPlanPosted',label:'Emergency plan posted',value:v(em.emergencyPlanPosted)},
      {id:'drillLogMaintained',label:'Drill log maintained',value:v(em.drillLogMaintained)},
      {id:'annualHealthInsp',label:'Annual health inspection on file',value:v(em.annualFireInspOnFile)},
      {id:'bodiesOfWater',label:'Bodies of water on premises',value:v(em.bodiesOfWaterOnPremises)},
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
  const rows=[['Director',per.directorName||'—'],['Licensed capacity',phy.capacity||'—'],['License number',lic.licenseNumber||'—'],['License expiry',lic.licenseExpiry||'—'],['Licensing agency',reg?.agency||'—'],['State',centerState],['City',centerCity],['Infant ratio max',`1:${reg?.infant||'?'}`],['Preschool ratio max',`1:${reg?.preschool||'?'}`],['Training requirement',`${reg?.trainingHrs||'?'} hrs/year`],['BG check type',reg?.rules?.bgCheckType||'—']];
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
  const [screen,setScreen]=useState('prep');
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

  if(activeTab==='staterules')   return <div className="content"><StateRulesTab center={centerForTabs} reg={reg} userRole="inspector"/></div>;
  if(activeTab==='insphistory')  return <InspectionHistoryTab centerName={centerName} centerState={centerState} reg={reg}/>;
  if(activeTab==='opencap')      return <OpenCAPTab centerName={centerName} findings={findings}/>;
  if(activeTab==='documents')    return <DocumentsTab centerName={centerName}/>;
  if(activeTab==='centerprofile')return <CenterProfileTab centerName={centerName} centerCity={centerCity} centerState={centerState} reg={reg} liveData={liveData}/>;

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

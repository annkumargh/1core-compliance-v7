import React, { useEffect } from 'react';

const LS_KEY_FINDINGS = '1core_compliance_v6_inspector_findings';

const STATUS_CFG = {
  noncompliant: { label:'Non-Compliant', color:'#7f1d1d', bg:'#fdf1f1', bd:'#e8a0a0' },
  atrisk:       { label:'At Risk',       color:'#7c4a00', bg:'#fdf4e7', bd:'#e6b87a' },
  corrected:    { label:'Corrected on Site', color:'#1e5c38', bg:'#eef7f2', bd:'#a7d4ba' },
  compliant:    { label:'Compliant',     color:'#1e5c38', bg:'#eef7f2', bd:'#a7d4ba' },
  notobserved:  { label:'Not Observed',  color:'#475569', bg:'#f1f5f9', bd:'#cbd5e1' },
};

const DOMAIN_LABELS = {
  d1:'Licensing & Administration', d2:'Physical Environment', d3:'Personnel & Qualifications',
  d4:'Ratios & Supervision', d5:'Staff Health & Training', d6:"Children's Records & Health",
  d7:'Emergency & Safety',
};

const FIELD_LABEL_MAP = {
  licenseNumber:'License number', licenseExpiry:'License expiry date', licCertOnFile:'License certificate on file',
  insurancePolicyNum:'GL insurance policy number', insuranceExpiry:'GL insurance expiry',
  workersCompExpiry:"Workers' comp expiry", lastInspectionDate:'Last inspection date',
  lastInspectionResult:'Last inspection result', qrisStatus:'QRIS enrollment status',
  coiOnFile:'Certificate of insurance on file', indoorSqft:'Indoor sq ft', outdoorSqft:'Outdoor sq ft',
  capacity:'Licensed capacity', coDetectorInstalled:'CO detector installed',
  smokeDetectorInstalled:'Smoke detectors present', fireExtinguisherCurrent:'Fire extinguisher current',
  firstAidKitPresent:'First aid kit present', hotWaterMaxTemp:'Hot water temperature',
  fencingEnclosesPlayArea:'Fencing encloses play area', fencingHeightFt:'Fence height',
  toiletCompliant:'Toilet ratio compliant', directorName:'Director name on file',
  directorEduLevel:'Director education level', directorYearsExp:'Director years of experience',
  teacherEduMeetsReq:'Teacher qualifications met', teacherMinAgeCompliant:'Teacher min age compliant',
  bgCheckType:'Background check type', bgValid:'Staff with valid BG check',
  fbiClearance:'FBI fingerprint clearance', childAbuseRegistry:'Child abuse registry check',
  adminDesignationOnFile:'Admin designation on file', workforceRegistry:'Workforce registry enrollment',
  infantChildren:'Infant — enrolled children', infantStaff:'Infant — staff on duty',
  toddlerChildren:'Toddler — enrolled children', toddlerStaff:'Toddler — staff on duty',
  preschoolChildren:'Preschool — enrolled', preschoolStaff:'Preschool — staff on duty',
  schoolAgeChildren:'School-age — enrolled', schoolAgeStaff:'School-age — staff on duty',
  signinLogMaintained:'Sign-in/sign-out log', supervisionPlan:'Supervision plan on file',
  cprCertValid:'CPR certification', cprExpiryDate:'CPR expiry date',
  firstAidCertValid:'First Aid certification', tbScreeningAllStaff:'TB screening',
  physicalExamOnFile:'Physical exam on file', trainingHrs:'Annual training hours',
  mandatedReporterDone:'Mandated reporter training', newHireOrientation:'New hire orientation',
  trainingLogOnFile:'Training log on file', tbRenewalDueDate:'TB renewal due date',
  childRecordComplete:'Child enrollment records complete', emergContactsOnFile:'Emergency contacts on file',
  authPickupOnFile:'Authorized pickup list', allergyDocOnFile:'Allergy documentation',
  allergyCareplan:'Allergy care plans', medLogMaintained:'Medication log',
  medsStoredCorrectly:'Medications stored correctly', immRecordsOnFile:'Immunization records on file',
  immRecordsCurrent:'Immunization records current', parentAgreementSigned:'Parent agreements signed',
  safeSleepPolicy:'Safe sleep policy', attendanceRecordOnFile:'Attendance record on file',
  attendanceSignInLog:'Sign-in/sign-out log', attendanceRetentionMet:'Attendance retention period met',
  fireEvacPlan:'Fire evacuation plan', fireEvacPosted:'Fire evacuation plan posted',
  lastFireDrillDate:'Last fire drill date', fireDrillLog:'Fire drill log',
  fireSafetyTraining:'Fire safety training', fireDeptInspCurrent:'Fire dept inspection current',
  tornadoDrillDate:'Tornado/weather drill', lockdownDrillDate:'Lockdown drill',
  emergencyPlanOnFile:'Emergency plan on file', emergencyPlanPosted:'Emergency plan posted',
  drillLogMaintained:'Drill log maintained', annualHealthInsp:'Annual health inspection',
  bodiesOfWater:'Bodies of water on premises',
};

function fieldLabel(id) {
  return FIELD_LABEL_MAP[id] || id.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase());
}

// Group findings by domain prefix
const DOMAIN_FIELD_MAP = {
  d1:['licenseNumber','licenseExpiry','licCertOnFile','insurancePolicyNum','insuranceExpiry','workersCompExpiry','lastInspectionDate','lastInspectionResult','qrisStatus','coiOnFile'],
  d2:['indoorSqft','outdoorSqft','capacity','coDetectorInstalled','smokeDetectorInstalled','fireExtinguisherCurrent','firstAidKitPresent','hotWaterMaxTemp','fencingEnclosesPlayArea','fencingHeightFt','toiletCompliant'],
  d3:['directorName','directorEduLevel','directorYearsExp','teacherEduMeetsReq','teacherMinAgeCompliant','bgCheckType','bgValid','fbiClearance','childAbuseRegistry','adminDesignationOnFile','workforceRegistry'],
  d4:['infantChildren','infantStaff','toddlerChildren','toddlerStaff','preschoolChildren','preschoolStaff','schoolAgeChildren','schoolAgeStaff','signinLogMaintained','supervisionPlan'],
  d5:['cprCertValid','cprExpiryDate','firstAidCertValid','tbScreeningAllStaff','physicalExamOnFile','trainingHrs','mandatedReporterDone','newHireOrientation','trainingLogOnFile','tbRenewalDueDate'],
  d6:['childRecordComplete','emergContactsOnFile','authPickupOnFile','allergyDocOnFile','allergyCareplan','medLogMaintained','medsStoredCorrectly','immRecordsOnFile','immRecordsCurrent','parentAgreementSigned','safeSleepPolicy','attendanceRecordOnFile','attendanceSignInLog','attendanceRetentionMet'],
  d7:['fireEvacPlan','fireEvacPosted','lastFireDrillDate','fireDrillLog','fireSafetyTraining','fireDeptInspCurrent','tornadoDrillDate','lockdownDrillDate','emergencyPlanOnFile','emergencyPlanPosted','drillLogMaintained','annualHealthInsp','bodiesOfWater'],
};

function fieldToDomain(fieldId) {
  for (const [dom, fields] of Object.entries(DOMAIN_FIELD_MAP)) {
    if (fields.includes(fieldId)) return dom;
  }
  return 'd1';
}

const PRINT_STYLE = `
@media print {
  body > * { display: none !important; }
  #inspection-report-print-layer { display: block !important; position: static !important; left: 0 !important; top: 0 !important; }
  .report-no-print { display: none !important; }
  .report-page-break { page-break-before: always; }
}
@media screen {
  #inspection-report-print-layer { display: none !important; }
}
`;

export default function InspectionReportExport({ center, onClose }) {
  const centerId = center?.id || '1292_Lionheart_-_RCCO';

  // Load findings
  let findings = {};
  try {
    findings = JSON.parse(localStorage.getItem(LS_KEY_FINDINGS))?.[centerId] || {};
  } catch {}

  const allEntries = Object.entries(findings);
  const flagged = allEntries.filter(([, f]) => f.status && f.status !== 'notobserved');
  const nc      = flagged.filter(([, f]) => f.status === 'noncompliant');
  const atrisk  = flagged.filter(([, f]) => f.status === 'atrisk');
  const corrected = flagged.filter(([, f]) => f.status === 'corrected');
  const compliant = flagged.filter(([, f]) => f.status === 'compliant');
  const totalObserved = flagged.length;

  // Group by domain
  const byDomain = {};
  for (const [fieldId, f] of flagged) {
    const dom = fieldToDomain(fieldId);
    if (!byDomain[dom]) byDomain[dom] = [];
    byDomain[dom].push([fieldId, f]);
  }

  useEffect(() => {
    if (!document.getElementById('inspection-report-style')) {
      const s = document.createElement('style');
      s.id = 'inspection-report-style';
      s.textContent = PRINT_STYLE;
      document.head.appendChild(s);
    }
    // Create a top-level print layer if it doesn't exist
    if (!document.getElementById('inspection-report-print-layer')) {
      const layer = document.createElement('div');
      layer.id = 'inspection-report-print-layer';
      document.body.appendChild(layer);
    }
    return () => {
      // Clean up print layer on unmount
      const layer = document.getElementById('inspection-report-print-layer');
      if (layer) layer.innerHTML = '';
    };
  }, []);

  const handlePrint = () => {
    // Clone report content into top-level print layer so it's not inside the fixed modal
    const source = document.getElementById('inspection-report-content');
    const layer  = document.getElementById('inspection-report-print-layer');
    if (source && layer) {
      layer.innerHTML = source.innerHTML;
    }
    window.print();
  };

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }) : '—';
  const now = new Date();

  const StatusTag = ({ statusId }) => {
    const cfg = STATUS_CFG[statusId] || STATUS_CFG.notobserved;
    return (
      <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:12,
        background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.bd}`, whiteSpace:'nowrap' }}>
        {cfg.label}
      </span>
    );
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000,
      display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'40px 20px' }}
      className="report-no-print">

      <div id="inspection-report-root" style={{ background:'#fff', borderRadius:12, maxWidth:900,
        width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', overflow:'hidden' }}>

        {/* Modal toolbar — hidden on print */}
        <div className="report-no-print" style={{ display:'flex', justifyContent:'space-between',
          alignItems:'center', padding:'14px 20px', background:'#0f172a', borderBottom:'1px solid #1e293b' }}>
          <span style={{ fontSize:14, fontWeight:600, color:'#e2e8f0' }}>
            Inspection Report — {center?.name || 'Center'}
          </span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={handlePrint} style={{
              display:'flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:8,
              border:'none', background:'#2d7a4f', color:'#fff', fontSize:13, fontWeight:600,
              cursor:'pointer', fontFamily:'inherit' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print / Export PDF
            </button>
            <button onClick={onClose} style={{ padding:'7px 14px', borderRadius:8,
              border:'1px solid #334155', background:'transparent', color:'#94a3b8',
              fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
              Close
            </button>
          </div>
        </div>

        <div id="inspection-report-content" style={{ padding:'32px 40px' }}>

          {/* Report header */}
          <div style={{ borderBottom:'2px solid #0f172a', paddingBottom:20, marginBottom:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.1em',
                  textTransform:'uppercase', marginBottom:6 }}>
                  Licensing Inspection Report
                </div>
                <h1 style={{ fontSize:22, fontWeight:700, color:'#0f172a', margin:'0 0 6px' }}>
                  {center?.name || 'Center Name'}
                </h1>
                <div style={{ fontSize:13, color:'#64748b' }}>
                  {[center?.address, center?.city, center?.state, center?.zip].filter(Boolean).join(', ')}
                </div>
                <div style={{ fontSize:12.5, color:'#94a3b8', marginTop:3 }}>
                  {center?.agency}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:11, color:'#94a3b8', textTransform:'uppercase',
                  letterSpacing:'0.06em', marginBottom:4 }}>Report generated</div>
                <div style={{ fontSize:14, fontWeight:600, color:'#0f172a' }}>
                  {fmtDate(now.toISOString())}
                </div>
                <div style={{ fontSize:12.5, color:'#64748b', marginTop:2 }}>
                  {now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })}
                </div>
              </div>
            </div>
          </div>

          {/* Summary counts */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:12, marginBottom:28 }}>
            {[
              { label:'Fields observed', val:totalObserved, color:'#475569', bg:'#f1f5f9', bd:'#cbd5e1' },
              { label:'Non-Compliant',   val:nc.length,     color:'#7f1d1d', bg:'#fdf1f1', bd:'#e8a0a0' },
              { label:'At Risk',         val:atrisk.length, color:'#7c4a00', bg:'#fdf4e7', bd:'#e6b87a' },
              { label:'Corrected on Site', val:corrected.length, color:'#1e5c38', bg:'#eef7f2', bd:'#a7d4ba' },
              { label:'Compliant',       val:compliant.length, color:'#1e5c38', bg:'#eef7f2', bd:'#a7d4ba' },
            ].map(({ label, val, color, bg, bd }) => (
              <div key={label} style={{ background:bg, border:`1px solid ${bd}`, borderRadius:8,
                padding:'12px 14px', textAlign:'center' }}>
                <div style={{ fontSize:24, fontWeight:700, color, lineHeight:1 }}>{val}</div>
                <div style={{ fontSize:11, color, marginTop:4, fontWeight:500 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Domains */}
          {allEntries.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px', color:'#94a3b8', fontSize:14 }}>
              No inspector findings recorded yet. Complete an inspection session first.
            </div>
          ) : (
            Object.entries(byDomain).sort().map(([domId, domFindings]) => {
              const domNC      = domFindings.filter(([, f]) => f.status === 'noncompliant');
              const domAtRisk  = domFindings.filter(([, f]) => f.status === 'atrisk');
              const domCorrected = domFindings.filter(([, f]) => f.status === 'corrected');
              const domCompliant = domFindings.filter(([, f]) => f.status === 'compliant');
              const dNum = domId.replace('d','D');

              // Sort: NC first, then At Risk, then Corrected, then Compliant
              const sorted = [
                ...domNC, ...domAtRisk, ...domCorrected, ...domCompliant,
                ...domFindings.filter(([, f]) => !['noncompliant','atrisk','corrected','compliant'].includes(f.status))
              ];

              return (
                <div key={domId} style={{ marginBottom:24 }}>
                  {/* Domain header */}
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10,
                    padding:'8px 12px', background:'#f8fafc', borderRadius:8,
                    borderLeft:'3px solid #0f172a' }}>
                    <span style={{ fontSize:11.5, fontWeight:700, color:'#94a3b8' }}>{dNum}</span>
                    <span style={{ fontSize:14, fontWeight:600, color:'#0f172a', flex:1 }}>
                      {DOMAIN_LABELS[domId]}
                    </span>
                    <div style={{ display:'flex', gap:6 }}>
                      {domNC.length > 0 && (
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10,
                          background:'#fdf1f1', color:'#7f1d1d', border:'1px solid #e8a0a0', fontWeight:600 }}>
                          {domNC.length} NC
                        </span>
                      )}
                      {domAtRisk.length > 0 && (
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10,
                          background:'#fdf4e7', color:'#7c4a00', border:'1px solid #e6b87a', fontWeight:600 }}>
                          {domAtRisk.length} At Risk
                        </span>
                      )}
                      {domCorrected.length > 0 && (
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10,
                          background:'#eef7f2', color:'#1e5c38', border:'1px solid #a7d4ba', fontWeight:600 }}>
                          {domCorrected.length} Corrected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Findings table */}
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
                    <thead>
                      <tr style={{ background:'#f1f5f9', borderBottom:'1px solid #e2e8f0' }}>
                        <th style={{ textAlign:'left', padding:'8px 12px', fontSize:11, fontWeight:700,
                          color:'#94a3b8', letterSpacing:'0.04em', width:'22%' }}>FIELD</th>
                        <th style={{ textAlign:'left', padding:'8px 12px', fontSize:11, fontWeight:700,
                          color:'#94a3b8', letterSpacing:'0.04em', width:'12%' }}>STATUS</th>
                        <th style={{ textAlign:'left', padding:'8px 12px', fontSize:11, fontWeight:700,
                          color:'#94a3b8', letterSpacing:'0.04em', width:'24%' }}>OBSERVATION NOTES</th>
                        <th style={{ textAlign:'left', padding:'8px 12px', fontSize:11, fontWeight:700,
                          color:'#94a3b8', letterSpacing:'0.04em', width:'27%' }}>CORRECTIVE ACTION REQUIRED</th>
                        <th style={{ textAlign:'left', padding:'8px 12px', fontSize:11, fontWeight:700,
                          color:'#94a3b8', letterSpacing:'0.04em', width:'15%' }}>FOLLOW-UP DATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map(([fieldId, f], i) => (
                        <tr key={fieldId} style={{
                          borderBottom:'1px solid #f1f5f9',
                          background: f.status === 'noncompliant' ? '#fff9f9' :
                                      f.status === 'atrisk'       ? '#fffbf5' : '#fff',
                        }}>
                          <td style={{ padding:'10px 12px', fontWeight:500, color:'#1e293b', verticalAlign:'top' }}>
                            {fieldLabel(fieldId)}
                          </td>
                          <td style={{ padding:'10px 12px', verticalAlign:'top' }}>
                            <StatusTag statusId={f.status} />
                          </td>
                          <td style={{ padding:'10px 12px', color:'#374151', verticalAlign:'top', lineHeight:1.5 }}>
                            {f.notes || <span style={{ color:'#94a3b8' }}>—</span>}
                          </td>
                          <td style={{ padding:'10px 12px', color:'#374151', verticalAlign:'top', lineHeight:1.5 }}>
                            {f.correctiveAction || <span style={{ color:'#94a3b8' }}>—</span>}
                          </td>
                          <td style={{ padding:'10px 12px', color: f.followUpDate ? '#374151' : '#94a3b8', verticalAlign:'top' }}>
                            {f.followUpDate ? fmtDate(f.followUpDate) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })
          )}

          {/* Signature block */}
          <div style={{ marginTop:40, paddingTop:24, borderTop:'1px solid #e2e8f0',
            display:'grid', gridTemplateColumns:'1fr 1fr', gap:32 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
                letterSpacing:'0.06em', marginBottom:16 }}>Inspector signature</div>
              <div style={{ height:1, background:'#cbd5e1', marginBottom:8 }}/>
              <div style={{ fontSize:12, color:'#94a3b8' }}>Inspector name &amp; license number</div>
              <div style={{ height:1, background:'#cbd5e1', margin:'24px 0 8px' }}/>
              <div style={{ fontSize:12, color:'#94a3b8' }}>Date of inspection</div>
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
                letterSpacing:'0.06em', marginBottom:16 }}>Director / designee signature</div>
              <div style={{ height:1, background:'#cbd5e1', marginBottom:8 }}/>
              <div style={{ fontSize:12, color:'#94a3b8' }}>Acknowledged by</div>
              <div style={{ height:1, background:'#cbd5e1', margin:'24px 0 8px' }}/>
              <div style={{ fontSize:12, color:'#94a3b8' }}>Date received</div>
            </div>
          </div>

          <div style={{ marginTop:24, fontSize:11, color:'#94a3b8', textAlign:'center' }}>
            1Core Compliance Module · {center?.name} · Report generated {fmtDate(now.toISOString())} · Page 1
          </div>
        </div>
      </div>
    </div>
  );
}

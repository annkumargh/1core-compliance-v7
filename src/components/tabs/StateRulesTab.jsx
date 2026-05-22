import React, { useState } from 'react';

// Roles that can see statutory section references
const CAN_SEE_REFS = ['owner', 'superadmin', 'inspector'];

export default function StateRulesTab({ center, reg = {}, userRole = 'director' }) {
  const [showRefs, setShowRefs] = useState(false);
  const rules = reg.rules || {};
  const refs  = reg.refs  || {};
  const state = center.state;
  const canToggle = CAN_SEE_REFS.includes(userRole);
  const hasRefs   = Object.keys(refs).length > 0;

  // Map rule keys to their refs
  const REF_MAP = {
    infantRatio:    refs.ratios,
    toddlerRatio:   refs.ratios,
    preschoolRatio: refs.ratios,
    schoolAgeRatio: refs.ratios,
    indoorSqft:     refs.indoorSqft,
    outdoorSqft:    refs.outdoorSqft,
    toiletRatio:    refs.toiletRatio,
    fencingMin:     refs.outdoorSpace || refs.indoorSqft,
    hotWaterMax:    refs.hotWaterMax,
    trainingHours:  refs.trainingHrs,
    inspPerYear:    refs.inspections,
    bgCheck:        refs.bgCheckType,
    cprRenewal:     refs.cprRenewal,
    mandatedReporterRenewal: refs.mandatedReporter,
    workforceRegistry: refs.workforceRegistry,
    fireDrillFreq:  refs.fireDrill,
    tornadoDrillFreq: refs.tornadoDrill || refs.fireDrill,
    coDetector:     refs.coDetector,
    recordRetention: refs.personnelRecords || refs.childRecords,
  };

  function RefChip({ ruleKey }) {
    if (!showRefs || !canToggle) return null;
    const ref = REF_MAP[ruleKey];
    if (!ref) return null;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        marginLeft: 8, fontSize: 10, fontWeight: 600,
        padding: '2px 7px', borderRadius: 20,
        background: '#eff6ff', color: '#1d4ed8',
        border: '1px solid #bfdbfe', whiteSpace: 'nowrap',
      }}>
        §&nbsp;{ref}
      </span>
    );
  }

  function RuleRow({ label, val, ruleKey }) {
    return (
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #f1f5f9', flexWrap:'wrap', gap:4 }}>
        <span style={{ fontSize:13.5, color:'#374151' }}>{label}</span>
        <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', justifyContent:'flex-end', gap:4 }}>
          <span style={{ fontSize:13.5, fontWeight:600, color:'#1e293b', textAlign:'right' }}>{val}</span>
          {ruleKey && <RefChip ruleKey={ruleKey} />}
        </div>
      </div>
    );
  }

  const sections = [
    { title: 'Ratios & Space', rows: [
      { label:'Infant ratio max',        val:rules.infantRatio    ||'Check state', key:'infantRatio'     },
      { label:'Toddler ratio max',       val:rules.toddlerRatio   ||'Check state', key:'toddlerRatio'    },
      { label:'Preschool ratio max',     val:rules.preschoolRatio ||'Check state', key:'preschoolRatio'  },
      { label:'School-age ratio max',    val:rules.schoolAgeRatio ||'Check state', key:'schoolAgeRatio'  },
      { label:'Indoor space minimum',    val:rules.indoorSqft?`${rules.indoorSqft} sq ft/child`:'Check state', key:'indoorSqft' },
      { label:'Outdoor space minimum',   val:rules.outdoorSqft?`${rules.outdoorSqft} sq ft/child`:'Check state', key:'outdoorSqft' },
      { label:'Toilet ratio',            val:rules.toiletRatio?`1 per ${rules.toiletRatio} children`:'Check state', key:'toiletRatio' },
      { label:'Min fencing height',      val:rules.fencingMin?`${rules.fencingMin} ft`:'Check state', key:'fencingMin' },
      { label:'Hot water max temp',      val:rules.hotWaterMax?`${rules.hotWaterMax}°F`:'Check state', key:'hotWaterMax' },
    ]},
    { title: 'Staff Requirements', rows: [
      { label:'Annual training hours',          val:rules.trainingHours?`${rules.trainingHours} hrs/yr`:'Check state', key:'trainingHours' },
      { label:'Inspections per year',           val:rules.inspPerYear?`${rules.inspPerYear} per year`:'Check state',   key:'inspPerYear'   },
      { label:'Background check type',          val:rules.bgCheck||'State + FBI', key:'bgCheck' },
      { label:'CPR renewal frequency',          val:rules.cprRenewal||'Every 2 years', key:'cprRenewal' },
      { label:'Staff physical exam',            val:'Required at hire',           key:null },
      { label:'Mandated reporter training',     val:rules.mandatedReporterRenewal||'Required', key:'mandatedReporterRenewal' },
      { label:'Workforce registry',             val:rules.workforceRegistry||'Check state', key:'workforceRegistry' },
      { label:'QRIS program',                   val:rules.qrisName||reg.qrisName||'Check state', key:null },
      { label:'Record retention',               val:rules.recordRetention?`${rules.recordRetention} years`:'Check state', key:'recordRetention' },
    ]},
    { title: 'Safety & Emergency', rows: [
      { label:'Fire drill frequency',    val:rules.fireDrillFreq||'Monthly', key:'fireDrillFreq' },
      { label:'Tornado / weather drill', val:rules.tornadoDrillFreq||'Monthly', key:'tornadoDrillFreq' },
      { label:'Lockdown drill',          val:'2x / year',    key:null },
      { label:'CO detector',             val:'Required',     key:'coDetector' },
      { label:'Smoke detectors',         val:'Required',     key:null },
    ]},
  ];

  return (
    <>
      {/* Header bar */}
      <div style={{ background:'#0a1628', borderRadius:12, padding:'16px 20px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{state} Licensing Requirements</div>
          <div style={{ fontSize:12.5, color:'#64748b', marginTop:2 }}>
            {reg.agency||'State Childcare Licensing'} — {reg.citation||state}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          {/* Toggle — only shown to owner, inspector, superadmin */}
          {canToggle && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {/* Toggle pill */}
              <button
                onClick={() => setShowRefs(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: showRefs ? 'rgba(29,78,216,0.25)' : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${showRefs ? '#3b82f6' : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: 20, padding: '6px 14px', cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                {/* Toggle switch */}
                <div style={{
                  width: 28, height: 16, borderRadius: 8,
                  background: showRefs ? '#3b82f6' : '#475569',
                  position: 'relative', transition: 'background 0.15s',
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: showRefs ? 14 : 2,
                    width: 12, height: 12, borderRadius: '50%',
                    background: '#fff', transition: 'left 0.15s',
                  }}/>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: showRefs ? '#93c5fd' : '#94a3b8' }}>
                  Show §§ references
                </span>
              </button>
              {!hasRefs && showRefs && (
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  (refs available for CA, DC, TX, FL, NJ, VA)
                </span>
              )}
            </div>
          )}
          <div style={{ textAlign:'right', fontSize:12, color:'#64748b' }}>
            <div style={{ color:'#00a99d' }}>{reg.agency}</div>
            <div style={{ marginTop:2 }}>{reg.agencyPhone}</div>
          </div>
        </div>
      </div>

      {/* 3-column rule cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
        {sections.map(sec => (
          <div key={sec.title} className="card">
            <h3 style={{ marginBottom:14 }}>{sec.title}</h3>
            {sec.rows.map(r => (
              <RuleRow key={r.label} label={r.label} val={r.val} ruleKey={r.key} />
            ))}
          </div>
        ))}
      </div>

      {/* Info note for roles that can't see refs */}
      {!canToggle && (
        <div style={{ marginTop:16, padding:'10px 14px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, fontSize:12.5, color:'#94a3b8', textAlign:'center' }}>
          Statutory section references are available to Business Owners, Inspectors, and Super Admins.
        </div>
      )}
    </>
  );
}

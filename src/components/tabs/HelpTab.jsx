import React, { useState } from 'react';

const DOMAINS = [
  {
    num:'D1', label:'Licensing & Admin', color:'#0ea5e9',
    desc:'Tracks the center\'s state childcare license status, general liability and workers\' comp insurance, last inspection date and result, and QRIS program enrollment.',
    fields:['License number & expiry date','Insurance expiry dates (GL + workers\' comp)','Last inspection date & result','QRIS enrollment status','Inspection frequency required by state'],
    tip:'License and insurance expiry dates drive the most common critical alerts. Enter these first to get accurate scoring.',
  },
  {
    num:'D2', label:'Physical Environment', color:'#8b5cf6',
    desc:'Verifies the facility meets state minimums for indoor and outdoor space per child, safety equipment (CO detectors, smoke detectors), fencing height, hot water temperature limits, and toilet ratios.',
    fields:['Indoor square footage','Outdoor play area square footage','CO and smoke detector installation','Fencing height (outdoor areas)','Hot water temperature at child-accessible fixtures','Toilet-to-child ratio'],
    tip:'Space measurements and safety equipment are among the most commonly cited inspection violations. Confirm fencing height and CO detector placement.',
  },
  {
    num:'D3', label:'Personnel & Qualifications', color:'#ec4899',
    desc:'Confirms that the director, lead teachers, and aides meet state education and experience requirements. Tracks background check completion, workforce registry enrollment, and qualification documentation on file.',
    fields:['Director education & experience credentials','Lead teacher qualification pathway','Background check type and clearance','Workforce registry enrollment status','Degree or credential on file with licensing'],
    tip:'Background check requirements vary significantly by state — some require FBI fingerprinting, state CBI check, and child abuse registry check. The State Rules tab shows your specific state\'s requirement.',
  },
  {
    num:'D4', label:'Ratios & Supervision', color:'#f59e0b',
    desc:'Calculates real-time staff-to-child ratios for each age group and compares them against state maximums. Tracks group size limits and supervision requirements.',
    fields:['Children enrolled per age group (Infant, Toddler, Preschool, School-age)','Staff on duty per age group','Calculated ratio vs state maximum','Group size compliance'],
    tip:'Enter the number of children and staff per age group in the Ratios tab. The system calculates the ratio and flags violations automatically.',
  },
  {
    num:'D5', label:'Staff Health & Training', color:'#10b981',
    desc:'Tracks CPR/First Aid certification expiry for all staff, annual training hours completed vs state minimum, TB screening, physical exam on file, and mandated reporter training completion.',
    fields:['CPR certification expiry (per staff member)','Annual training hours completed','TB test / screening date','Physical exam on file','Mandated reporter training completion','Immunization records (where required)'],
    tip:'CPR expiry is the most common cause of critical alerts. The state-specific renewal period is shown in the State Rules tab — most states require renewal every 2 years.',
  },
  {
    num:'D6', label:"Children's Records & Health", color:'#3b82f6',
    desc:'Ensures each enrolled child has complete records on file: emergency contacts, authorized pickups, allergy care plans, immunization records, parental agreements, and safe sleep policy acknowledgment.',
    fields:['Child enrollment records','Emergency contacts & authorized pickups','Allergy and medication care plans','Immunization records (state-specific exemptions tracked)','Parental agreements','Safe sleep policy acknowledgment'],
    tip:'Immunization exemption types allowed vary by state (Medical only / Medical + Religious / All three). The State Rules tab shows what your state permits.',
  },
  {
    num:'D7', label:'Emergency & Safety', color:'#ef4444',
    desc:'Tracks fire evacuation drill frequency and log dates, tornado/severe weather drills, lockdown drills, emergency plan on file, and annual health inspection documentation.',
    fields:['Fire evacuation drill log (date of last drill)','Tornado / severe weather drill log','Lockdown drill log','Emergency plan on file and current','Annual health inspection documentation'],
    tip:'Drill frequency requirements vary by state. Texas requires monthly fire and tornado drills. Ohio requires monthly fire drills. Check your State Rules tab for exact requirements.',
  },
];

const GLOSSARY = [
  { term:'QRIS', def:'Quality Rating and Improvement System. A state-run tiered rating system for childcare programs. Higher QRIS ratings often qualify centers for enhanced CCDF reimbursement rates. Each state has its own QRIS name (e.g., Texas Rising Star in TX, Step Up to Quality in OH).' },
  { term:'CCDF', def:'Child Care and Development Fund. Federal and state funding that subsidizes childcare costs for eligible low-income families. Centers with higher QRIS ratings typically receive enhanced reimbursement rates.' },
  { term:'CBI', def:'Colorado Bureau of Investigation — used in the context of background checks. Many states require a State Bureau of Investigation check, an FBI fingerprint check, and a child abuse registry check for all childcare staff.' },
  { term:'CDA', def:'Child Development Associate credential. A nationally recognized entry-level credential for childcare workers, issued by the Council for Professional Recognition. Many states accept a CDA as a qualifying credential for lead teacher positions.' },
  { term:'Compliance score', def:'A percentage score calculated from the data entered across the 7 compliance domains. Domains with no data entered are excluded from the calculation — a center with no data shows "—" not 0%. Scores above 80% = Compliant, 60–79% = At Risk, below 60% = Non-Compliant.' },
  { term:'Director qualification', def:'The education and experience required to serve as a childcare center director, as defined by state regulation. Requirements vary from a high school diploma + 2 years experience (some states) to a bachelor\'s degree in ECE or related field (others).' },
  { term:'Mandated reporter', def:'A person legally required to report suspected child abuse or neglect to authorities. All childcare staff in every US state are mandated reporters. Many states require periodic training on mandated reporter obligations.' },
  { term:'Workforce registry', def:'A state-maintained database of childcare professionals, tracking credentials, training hours, and career progression. States with registries include TX (Texas Workforce Registry), CO (PDIS), OH (OPIN), IN (Indiana Registry), and others.' },
  { term:'Staff-to-child ratio', def:'The maximum number of children that one staff member may supervise, by age group. Ratios are set by state regulation and vary by age: infants require the lowest ratio (most supervision), school-age children the highest.' },
  { term:'Group size limit', def:'The maximum total number of children permitted in a single classroom or group, regardless of staffing. Some states have both ratio requirements AND group size limits. A classroom can comply with the ratio but still violate the group size limit.' },
  { term:'TB screening', def:'Tuberculosis screening required at hire for all childcare staff in most states. Most states require an initial screening only (no periodic renewal). A few states (VA, DC) require periodic re-testing. Results documented in the staff record.' },
  { term:'At Risk', def:'A compliance status assigned when the overall compliance score is between 60% and 79%. Centers in At Risk status should take action to address gaps before the next inspection.' },
  { term:'Critical / Non-Compliant', def:'A compliance status assigned when the overall compliance score falls below 60%. Centers in this status have significant compliance gaps and require immediate attention.' },
];

export default function HelpTab() {
  const [activeSection, setActiveSection] = useState('domains');
  const [expandedDomain, setExpandedDomain] = useState(null);
  const [expandedTerm, setExpandedTerm] = useState(null);
  const [search, setSearch] = useState('');

  const filteredGlossary = GLOSSARY.filter(g =>
    !search || g.term.toLowerCase().includes(search.toLowerCase()) || g.def.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'20px 24px', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00a99d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span style={{ fontSize:13, fontWeight:600, color:'#00a99d' }}>Help & Glossary</span>
        </div>
        <h2 style={{ fontSize:20, fontWeight:700, color:'#0f172a', margin:'0 0 6px' }}>Help Center</h2>
        <p style={{ fontSize:13.5, color:'#64748b', margin:0 }}>Understanding the 7 compliance domains, scoring, and regulatory terms</p>

        {/* Section tabs */}
        <div style={{ display:'flex', gap:8, marginTop:16 }}>
          {[['domains','7 Compliance Domains'],['glossary','Glossary'],['scoring','How Scoring Works']].map(([id,label]) => (
            <button key={id} onClick={() => setActiveSection(id)} style={{
              padding:'7px 16px', borderRadius:8, border:'1px solid',
              background: activeSection===id ? '#0f172a' : '#fff',
              color: activeSection===id ? '#fff' : '#64748b',
              borderColor: activeSection===id ? '#0f172a' : '#e2e8f0',
              fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── 7 DOMAINS ── */}
      {activeSection === 'domains' && (
        <div>
          <p style={{ fontSize:13, color:'#64748b', marginBottom:16 }}>
            Every compliance field in the module traces back to one of these 7 domains — the same 7 domains used in every US state's childcare licensing regulation.
          </p>
          {DOMAINS.map((d, i) => (
            <div key={i} style={{ background:'#fff', border:'1px solid #e2e8f0', borderLeft:`3px solid ${d.color}`,
              borderRadius:10, marginBottom:10, overflow:'hidden' }}>
              <button onClick={() => setExpandedDomain(expandedDomain === i ? null : i)} style={{
                width:'100%', padding:'16px 20px', display:'flex', alignItems:'center', gap:12,
                background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left',
              }}>
                <span style={{ fontSize:12, color:"#94a3b8", fontWeight:700, flexShrink:0, minWidth:28 }}>{d.num}</span>
                <span style={{ fontSize:14, fontWeight:600, color:'#0f172a', flex:1 }}>{d.label}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: expandedDomain===i ? 'rotate(180deg)' : 'none', transition:'transform 0.2s', flexShrink:0 }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {expandedDomain === i && (
                <div style={{ padding:'0 20px 18px', borderTop:'1px solid #f1f5f9' }}>
                  <p style={{ fontSize:13.5, color:'#374151', lineHeight:1.7, margin:'14px 0 14px' }}>{d.desc}</p>
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:12.5, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Fields tracked</div>
                    {d.fields.map((f, fi) => (
                      <div key={fi} style={{ display:'flex', gap:8, padding:'5px 0', borderBottom:'1px solid #f8fafc' }}>
                        <span style={{ color:d.color, fontSize:13, fontWeight:700, flexShrink:0 }}>·</span>
                        <span style={{ fontSize:13.5, color:'#374151' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background:`${d.color}0d`, border:`1px solid ${d.color}33`, borderRadius:8, padding:'12px 14px' }}>
                    <span style={{ fontSize:12.5, fontWeight:700, color:d.color }}>💡 Tip: </span>
                    <span style={{ fontSize:13, color:'#374151' }}>{d.tip}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── GLOSSARY ── */}
      {activeSection === 'glossary' && (
        <div>
          <input
            placeholder="Search terms..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width:'100%', padding:'10px 14px', border:'1px solid #e2e8f0', borderRadius:8,
              fontSize:13.5, marginBottom:14, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
          />
          {filteredGlossary.map((g, i) => (
            <div key={i} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, marginBottom:8, overflow:'hidden' }}>
              <button onClick={() => setExpandedTerm(expandedTerm === i ? null : i)} style={{
                width:'100%', padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between',
                background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left',
              }}>
                <span style={{ fontSize:14, fontWeight:600, color:'#0f172a' }}>{g.term}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: expandedTerm===i ? 'rotate(180deg)' : 'none', transition:'transform 0.2s', flexShrink:0 }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {expandedTerm === i && (
                <div style={{ padding:'0 18px 14px', borderTop:'1px solid #f1f5f9' }}>
                  <p style={{ fontSize:13.5, color:'#374151', lineHeight:1.7, margin:'10px 0 0' }}>{g.def}</p>
                </div>
              )}
            </div>
          ))}
          {filteredGlossary.length === 0 && (
            <div style={{ fontSize:13.5, color:'#94a3b8', textAlign:'center', padding:'24px' }}>No matching terms found.</div>
          )}
        </div>
      )}

      {/* ── HOW SCORING WORKS ── */}
      {activeSection === 'scoring' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {[
            { title:'7 independent domain scores', icon:'①–⑦',
              body:'Each of the 7 domains is scored independently from 0–100%. A domain with no data entered is excluded from the overall calculation — it contributes neither points nor zeroes.' },
            { title:'Overall score = mean of domains with data', icon:'∑÷n',
              body:'The overall score is the simple average of all domains that have at least one field entered. A center that has only entered Domain 1 (Licensing) will show a score based on that domain alone, not a zero for the other 6.' },
            { title:'Compliant / At Risk / Non-Compliant thresholds', icon:'%',
              body:'Compliant: 80% or above. At Risk: 60–79%. Non-Compliant (Critical): below 60%. These thresholds apply to both domain scores and the overall score.' },
            { title:'Alerts are generated independently of scores', icon:'🔔',
              body:'Critical alerts (expired CPR, overdue drills, lapsed insurance) are generated from specific fields regardless of the score. A center can score 85% and still have a critical alert if, for example, one staff member\'s CPR just expired.' },
            { title:'Live data overrides seed data', icon:'→',
              body:'Each center starts with pre-seeded mock scores for demo purposes. As real data is entered via the Data Entry tab, the system recalculates scores from the live data. The seed scores are only shown until real data exists.' },
            { title:'State-specific rules apply automatically', icon:'📋',
              body:'The scoring engine uses the regulations for each center\'s state. A Texas center is scored against TX HHSC requirements; an Ohio center against ODJFS requirements. The State Rules tab shows the exact requirements in effect for the selected center.' },
          ].map((item, i) => (
            <div key={i} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'18px 20px', display:'flex', gap:16 }}>
              <div style={{ width:44, height:44, borderRadius:10, background:'#f0f2ff', border:'1px solid #c5cbee',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'#4f5fa8', flexShrink:0 }}>
                {item.icon}
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:5 }}>{item.title}</div>
                <div style={{ fontSize:13.5, color:'#374151', lineHeight:1.7 }}>{item.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef, useCallback, useEffect } from 'react';

// ─── Attachment + Notes storage ──────────────────────────────────────────────
const CENTER_ATTACH_KEY = '1core_compliance_v6_center_attachments';
const CENTER_NOTES_KEY  = '1core_compliance_v6_center_notes';

function loadCenterAttachments() {
  try { return JSON.parse(localStorage.getItem(CENTER_ATTACH_KEY) || '{}'); } catch { return {}; }
}
function saveCenterAttachments(data) {
  try { localStorage.setItem(CENTER_ATTACH_KEY, JSON.stringify(data)); } catch {}
}
function loadCenterNotes() {
  try { return JSON.parse(localStorage.getItem(CENTER_NOTES_KEY) || '{}'); } catch { return {}; }
}
function saveCenterNotes(data) {
  try { localStorage.setItem(CENTER_NOTES_KEY, JSON.stringify(data)); } catch {}
}

// ─── NoteToggle ───────────────────────────────────────────────────────────────
// Collapsible "Add note +" that expands to a textarea, persists to localStorage
function NoteToggle({ fieldKey, entityId, storageLoader, storageSaver }) {
  const noteId = `${entityId}__${fieldKey}`;
  const [open, setOpen]   = useState(() => { const n = storageLoader(); return !!(n[noteId]); });
  const [text, setText]   = useState(() => { const n = storageLoader(); return n[noteId] || ''; });

  const handleChange = (val) => {
    setText(val);
    const all = storageLoader();
    if (val.trim()) { all[noteId] = val; } else { delete all[noteId]; }
    storageSaver(all);
  };

  return (
    <div style={{ marginTop: 6 }}>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:6, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#64748b', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add note
        </button>
      )}
      {open && (
        <div style={{ border:'1px solid #e2e8f0', borderRadius:8, overflow:'hidden', background:'#fff' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 10px', background:'#f8fafc', borderBottom:'1px solid #f1f5f9' }}>
            <span style={{ fontSize:11.5, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.04em' }}>Note</span>
            <button
              onClick={() => setOpen(false)}
              style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'2px 8px', borderRadius:5, border:'none', background:'transparent', color:'#94a3b8', fontSize:11.5, cursor:'pointer', fontFamily:'inherit' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Collapse
            </button>
          </div>
          <textarea
            value={text}
            onChange={e => handleChange(e.target.value)}
            placeholder="Add a note for this field — visible to directors and inspectors..."
            rows={3}
            style={{ width:'100%', padding:'10px 12px', border:'none', outline:'none', fontSize:13, color:'#374151', fontFamily:'inherit', resize:'vertical', boxSizing:'border-box', background:'#fff', lineHeight:1.6 }}
          />
          {text.trim() && (
            <div style={{ padding:'4px 10px 6px', display:'flex', justifyContent:'flex-end' }}>
              <button
                onClick={() => { handleChange(''); setOpen(false); }}
                style={{ padding:'2px 8px', borderRadius:5, border:'1px solid #e8a0a0', background:'#fdf1f1', color:'#b91c1c', fontSize:11.5, cursor:'pointer', fontFamily:'inherit' }}>
                Clear note
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CenterFileUpload ─────────────────────────────────────────────────────────
function CenterFileUpload({ fieldKey, centerId = 'default', label, hint, accept = '.pdf,.jpg,.jpeg,.png', isPhoto = false }) {
  const inputRef = useRef();
  const [attachments, setAttachments] = useState(() => loadCenterAttachments());
  const stored = attachments[centerId]?.[fieldKey];

  const handleFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert('File exceeds 5 MB limit. Please compress and try again.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const all = loadCenterAttachments();
      if (!all[centerId]) all[centerId] = {};
      all[centerId][fieldKey] = {
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        data: ev.target.result,
      };
      saveCenterAttachments(all);
      setAttachments({ ...all });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [fieldKey, centerId]);

  const handleRemove = useCallback(() => {
    const all = loadCenterAttachments();
    if (all[centerId]) delete all[centerId][fieldKey];
    saveCenterAttachments(all);
    setAttachments({ ...all });
  }, [fieldKey, centerId]);

  const isImage = stored?.type?.startsWith('image/');
  const fmtSize = s => s < 1024 * 1024 ? `${Math.round(s / 1024)} KB` : `${(s / 1024 / 1024).toFixed(1)} MB`;
  const fmtDate = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const noteToggle = (
    <NoteToggle
      fieldKey={fieldKey}
      entityId={centerId}
      storageLoader={loadCenterNotes}
      storageSaver={saveCenterNotes}
    />
  );

  if (stored) {
    return (
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', border:'1px solid #a7d4ba', borderRadius:8, background:'#eef7f2', marginTop:4 }}>
          {isImage
            ? <img src={stored.data} alt={stored.name} style={{ width:32, height:32, objectFit:'cover', borderRadius:4, border:'1px solid #a7d4ba', flexShrink:0 }} />
            : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d7a4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          }
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12.5, fontWeight:600, color:'#1e5c38', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{stored.name}</div>
            <div style={{ fontSize:11.5, color:'#2d7a4f' }}>Uploaded {fmtDate(stored.uploadedAt)} · {fmtSize(stored.size)}</div>
          </div>
          <a href={stored.data} download={stored.name} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #a7d4ba', background:'#fff', color:'#2d7a4f', fontSize:12, fontWeight:500, textDecoration:'none', whiteSpace:'nowrap' }}>Download</a>
          <button onClick={handleRemove} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #e8a0a0', background:'#fdf1f1', color:'#b91c1c', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>Remove</button>
          <input ref={inputRef} type="file" accept={accept} onChange={handleFile} style={{ display:'none' }} />
        </div>
        {noteToggle}
      </div>
    );
  }

  const defaultHint = isPhoto
    ? 'JPG or PNG · Max 5 MB · Min 800×600 px recommended'
    : 'PDF, JPG, or PNG · Max 5 MB';

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', border:'1.5px dashed #cbd5e1', borderRadius:8, background:'#f8fafc', cursor:'pointer', marginTop:4, transition:'border-color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#00a99d'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#cbd5e1'}
      >
        {isPhoto
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
        }
        <div>
          <div style={{ fontSize:12.5, color:'#374151', fontWeight:500 }}>{label || (isPhoto ? 'Click to upload photo' : 'Click to upload')}</div>
          <div style={{ fontSize:11.5, color:'#94a3b8' }}>{hint || defaultHint}</div>
        </div>
      </div>
      <input ref={inputRef} type="file" accept={accept} onChange={handleFile} style={{ display:'none' }} />
      {noteToggle}
    </div>
  );
}

// UploadRow: half-width upload slot + note inline beside it
function UploadRow({ fieldKey, centerId, label, hint, isPhoto = false }) {
  return (
    <div style={{ gridColumn:'1/-1' }} id={fieldKey ? `field-${fieldKey}` : undefined}>
      <div style={{ display:'flex', alignItems:'center', gap:8, margin:'4px 0 6px' }}>
        <div style={{ flex:1, height:1, background:'#f1f5f9' }} />
        <span style={{ fontSize:11, fontWeight:600, color:'#94a3b8', letterSpacing:'0.05em', textTransform:'uppercase', whiteSpace:'nowrap' }}>
          {isPhoto ? '📷' : '📎'} {label}
        </span>
        <div style={{ flex:1, height:1, background:'#f1f5f9' }} />
      </div>
      <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
        <div style={{ flex:'0 0 50%', minWidth:0 }}>
          <CenterFileUpload fieldKey={fieldKey} centerId={centerId} label={isPhoto ? 'Click to upload photo' : 'Click to upload document'} hint={hint} isPhoto={isPhoto} />
        </div>
        <div style={{ flex:1, minWidth:0, paddingTop:4 }}>
          <NoteToggle
            fieldKey={`note_upload_${fieldKey}`}
            entityId={centerId}
            storageLoader={loadCenterNotes}
            storageSaver={saveCenterNotes}
          />
        </div>
      </div>
    </div>
  );
}

// NoteField: standalone notes-only field for fields that need context but no attachment
// Sits inside the form-grid, spans both columns
function NoteField({ fieldKey, centerId, placeholder }) {
  return (
    <div style={{ gridColumn:'1/-1' }}>
      <NoteToggle
        fieldKey={`note_${fieldKey}`}
        entityId={centerId}
        storageLoader={loadCenterNotes}
        storageSaver={saveCenterNotes}
      />
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────
function YesNo({ value, onChange, opts = ['Yes','No','N/A'] }) {
  return (
    <div className="yn-group">
      {opts.map(o => (
        <button key={o} className={`yn-btn ${value===o?(o==='Yes'?'sel-yes':o==='No'?'sel-no':o==='N/A'||o==='Not applicable'?'sel-na':'sel-prog'):''}`}
          onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}

function Chip({ text }) {
  return <span className="state-chip">{text}</span>;
}

function Section({ title, sub, children }) {
  return (
    <div className="form-section">
      <h4>{title}{sub && <span style={{ fontWeight:400, color:'#64748b', fontSize:12, marginLeft:8 }}>{sub}</span>}</h4>
      <div className="form-grid">{children}</div>
    </div>
  );
}

function Field({ label, hint, children, chip, required, fieldKey }) {
  return (
    <div className="field" id={fieldKey ? `field-${fieldKey}` : undefined}>
      <label>
        {required && <span style={{ color:'#b91c1c', marginRight:3 }}>*</span>}
        {label}{chip && <Chip text={chip}/>}
      </label>
      {children}
      {hint && <span className="hint" style={{ color: hint.color || '#94a3b8' }}>{hint.text}</span>}
    </div>
  );
}

function expiryHint(dateStr) {
  if (!dateStr) return null;
  const diff = Math.round((new Date(dateStr) - new Date()) / 86400000);
  if (diff < 0)   return { text: `EXPIRED ${Math.abs(diff)} days ago`, color: '#b91c1c' };
  if (diff < 30)  return { text: `Expires in ${diff} days — renew immediately`, color: '#b91c1c' };
  if (diff < 90)  return { text: `Expires in ${diff} days`, color: '#b45309' };
  return { text: `Valid — ${diff} days remaining`, color: '#2d7a4f' };
}

function pastDrillHint(dateStr, freqDays = 35) {
  if (!dateStr) return null;
  const days = Math.round((new Date() - new Date(dateStr)) / 86400000);
  if (days > freqDays) return { text: `Overdue — ${days} days ago`, color: '#b91c1c' };
  return { text: `Last drill ${days} days ago ✓`, color: '#2d7a4f' };
}

const SUB_TABS = [
  { id: 'licensing',   label: 'Licensing & Admin' },
  { id: 'physical',    label: 'Facility & Space' },
  { id: 'personnel',   label: 'Personnel' },
  { id: 'staffhealth', label: 'Staff Health & Training' },
  { id: 'ratios',      label: 'Ratios & Enrollment' },
  { id: 'children',    label: "Children's Records" },
  { id: 'emergency',   label: 'Safety & Emergency' },
];

export default function DataEntryTab({ center, liveData = {}, updateData, reg = {}, highlightField, initialSub }) {
  const centerId = center?.id || center?.centerKey || 'default';
  const [sub, setSub] = useState(initialSub || 'licensing');
  const [saved, setSaved] = useState(false);
  const [highlighted, setHighlighted] = useState(highlightField || null);

  // Scroll to and highlight target field when arriving from Fix button
  useEffect(() => {
    if (!highlightField) return;
    setSub(initialSub || 'licensing');
    const tryScroll = (attempts = 0) => {
      const el = document.getElementById(`field-${highlightField}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlighted(highlightField);
        setTimeout(() => setHighlighted(null), 3000);
      } else if (attempts < 10) {
        setTimeout(() => tryScroll(attempts + 1), 80);
      }
    };
    setTimeout(() => tryScroll(), 100);
  }, [highlightField, initialSub]);

  const state = center.state;
  const rules = reg.rules || {};

  // All 287 fields stored flat under canonical dataKey — updateData(key, value)
  const set = (key, val) => updateData(key, val);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  function RatioRow({ label, enrollKey, staffKey, maxRatio }) {
    const maxNum = parseInt((maxRatio || '1:99').split(':')[1]);
    const children = parseFloat(liveData[enrollKey]) || 0;
    const staff    = parseFloat(liveData[staffKey])  || 0;
    const actual   = staff > 0 ? (children / staff).toFixed(1) : null;
    const compliant = actual !== null && parseFloat(actual) <= maxNum;
    return (
      <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 90px 90px auto', gap: 12, alignItems: 'end', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>State max: {maxRatio}</div>
        </div>
        <Field label="Enrolled">
          <input type="number" min="0" placeholder="0" value={liveData[enrollKey] || ''} onChange={e => set(enrollKey, e.target.value)} />
        </Field>
        <Field label="Staff">
          <input type="number" min="1" placeholder="1" value={liveData[staffKey] || ''} onChange={e => set(staffKey, e.target.value)} />
        </Field>
        <div style={{ paddingBottom: 4 }}>
          {actual !== null
            ? <span style={{ fontWeight: 700, fontSize: 14, padding: '6px 12px', borderRadius: 8, display: 'inline-block',
                background: compliant ? '#eef7f2' : '#fdf1f1', color: compliant ? '#2d7a4f' : '#b91c1c',
                border: `1px solid ${compliant ? '#a7d4ba' : '#e8a0a0'}` }}>
                1:{actual} {compliant ? '✓' : '✗'}
              </span>
            : <span style={{ color: '#94a3b8', fontSize: 12 }}>Enter values</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {highlighted && (
        <style>{`#field-${highlighted} { box-shadow: 0 0 0 1.5px #c9a227, 0 0 12px 3px rgba(201,162,39,0.22); border-radius: 8px; transition: box-shadow 0.3s; }`}</style>
      )}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
        <h3>Data Entry — {center.name}</h3>
        <p className="card-sub" style={{ marginBottom: 0 }}>
          7 domains · 287 fields · All data saves automatically and updates compliance scores in real time.
          <strong style={{ color: '#00a99d' }}> Scores update as you type.</strong>
        </p>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#b91c1c', fontWeight: 700, fontSize: 13 }}>*</span>
          <span style={{ fontSize: 12, color: '#64748b' }}>Required for compliance score — missing or failed values will reduce your domain score</span>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', overflowX: 'auto' }}>
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)} style={{
            padding: '10px 16px', border: 'none', background: 'transparent', fontSize: 12.5,
            fontWeight: sub === t.id ? 700 : 500, color: sub === t.id ? '#00a99d' : '#64748b',
            borderBottom: sub === t.id ? '2px solid #00a99d' : '2px solid transparent',
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: '20px' }}>

        {/* ── D1: LICENSING & ADMIN (35 fields) ── */}
        {sub === 'licensing' && (<>
          <Section title="Operating License">
            <Field label="License number" required chip={`${state}`} fieldKey="licenseNumber">
              <input placeholder="e.g. TX-123456789" value={liveData.licenseNumber || ''} onChange={e => set('licenseNumber', e.target.value)} />
            </Field>
            <Field label="License class / type" fieldKey="licenseClass">
              <select value={liveData.licenseClass || ''} onChange={e => set('licenseClass', e.target.value)}>
                <option value="">Select...</option>
                {['Full license','Provisional license','Conditional license','Exempt'].map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <NoteField fieldKey="licenseClass" centerId={centerId} />
            <Field label="License expiry date" required hint={expiryHint(liveData.licenseExpiry)} fieldKey="licenseExpiry">
              <input type="date" value={liveData.licenseExpiry || ''} onChange={e => set('licenseExpiry', e.target.value)} />
            </Field>
            <Field label="License renewal date">
              <input type="date" value={liveData.licenseRenewalDate || ''} onChange={e => set('licenseRenewalDate', e.target.value)} />
            </Field>
            <Field label="Licensed capacity (max children)" required fieldKey="licensedCapacity">
              <input type="number" min="0" value={liveData.licensedCapacity || ''} onChange={e => set('licensedCapacity', e.target.value)} />
            </Field>
            <Field label="Facility / permit number">
              <input placeholder="State-assigned facility number" value={liveData.facilityNumber || ''} onChange={e => set('facilityNumber', e.target.value)} />
            </Field>
            <Field label="License certificate on file" required fieldKey="licenseCertOnFile">
              <YesNo value={liveData.licenseCertOnFile || ''} onChange={v => set('licenseCertOnFile', v)} />
            </Field>
            <Field label="Required notices posted visibly" fieldKey="postedNotices">
              <YesNo value={liveData.postedNotices || ''} onChange={v => set('postedNotices', v)} />
            </Field>
            <UploadRow fieldKey="license_cert" centerId={centerId} label="License certificate" hint="Upload scan of state-issued license certificate · PDF or JPG · Max 5 MB" />
            <UploadRow fieldKey="posted_notices_photo" centerId={centerId} label="Posted notices photo" hint="Photo showing required notices posted in center · JPG or PNG · Min 800×600 px · Max 5 MB" isPhoto />
          </Section>

          <Section title="Insurance">
            <Field label="GL insurance carrier name">
              <input placeholder="e.g. Philadelphia Indemnity" value={liveData.glInsuranceProvider || ''} onChange={e => set('glInsuranceProvider', e.target.value)} />
            </Field>
            <Field label="GL policy number" required>
              <input placeholder="Policy #" value={liveData.glPolicyNumber || ''} onChange={e => set('glPolicyNumber', e.target.value)} />
            </Field>
            <Field label="GL coverage amount">
              <input placeholder="e.g. $1,000,000" value={liveData.glCoverageAmount || ''} onChange={e => set('glCoverageAmount', e.target.value)} />
            </Field>
            <Field label="GL coverage expiry" required hint={expiryHint(liveData.glExpiry)} fieldKey="glExpiry">
              <input type="date" value={liveData.glExpiry || ''} onChange={e => set('glExpiry', e.target.value)} />
            </Field>
            <Field label="Workers comp expiry" hint={expiryHint(liveData.workersCompExpiry)}>
              <input type="date" value={liveData.workersCompExpiry || ''} onChange={e => set('workersCompExpiry', e.target.value)} />
            </Field>
            <Field label="Workers comp current" required fieldKey="workersCompCurrent">
              <YesNo value={liveData.workersCompCurrent || ''} onChange={v => set('workersCompCurrent', v)} />
            </Field>
            <Field label="COI on file">
              <YesNo value={liveData.coiOnFile || ''} onChange={v => set('coiOnFile', v)} />
            </Field>
            <Field label="Property insurance on file">
              <YesNo value={liveData.propertyInsurance || ''} onChange={v => set('propertyInsurance', v)} />
            </Field>
            <UploadRow fieldKey="gl_coi" centerId={centerId} label="Certificate of Insurance (COI)" hint="Upload current Certificate of Insurance · PDF · Max 5 MB" />
            <UploadRow fieldKey="workers_comp_cert" centerId={centerId} label="Workers comp certificate" hint="Upload workers compensation certificate or policy proof · PDF · Max 5 MB" />
          </Section>

          <Section title="Inspections">
            <Field label="Last licensing inspection date" required fieldKey="lastInspectionDate">
              <input type="date" value={liveData.lastInspectionDate || ''} onChange={e => set('lastInspectionDate', e.target.value)} />
            </Field>
            <Field label="Last inspection result" required fieldKey="lastInspectionResult">
              <select value={liveData.lastInspectionResult || ''} onChange={e => set('lastInspectionResult', e.target.value)}>
                <option value="">Select...</option>
                {['Pass','Pass with conditions','Fail'].map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <NoteField fieldKey="lastInspectionResult" centerId={centerId} />
            <Field label="Open violations count" fieldKey="openViolationsCount">
              <input type="number" min="0" value={liveData.openViolationsCount || ''} onChange={e => set('openViolationsCount', e.target.value)} />
            </Field>
            <NoteField fieldKey="openViolationsCount" centerId={centerId} />
            <Field label="Previous inspection date">
              <input type="date" value={liveData.prevInspectionDate || ''} onChange={e => set('prevInspectionDate', e.target.value)} />
            </Field>
            <Field label="Complaint inspections (12 mo)">
              <input type="number" min="0" value={liveData.complaintInspections || ''} onChange={e => set('complaintInspections', e.target.value)} />
            </Field>
            <Field label="Inspection report on file" required>
              <YesNo value={liveData.inspectionReportOnFile || ''} onChange={v => set('inspectionReportOnFile', v)} />
            </Field>
            <UploadRow fieldKey="inspection_report" centerId={centerId} label="Licensing inspection report" hint="Upload most recent state licensing inspection report · PDF · Max 5 MB" />
          </Section>

          <Section title="QRIS & Agency" sub={`${rules.qrisName || 'State Quality Rating System'}`}>
            <Field label="QRIS enrolled" chip={`${state}: ${rules.qrisName || 'QRIS'}`} fieldKey="qrisStatus">
              <YesNo value={liveData.qrisEnrolled || ''} onChange={v => set('qrisEnrolled', v)} opts={['Yes','No','In progress']} />
            </Field>
            <Field label="QRIS current rating / level">
              <select value={liveData.qrisRating || ''} onChange={e => set('qrisRating', e.target.value)}>
                <option value="">Select...</option>
                {['Not enrolled','1 star','2 stars','3 stars','4 stars','5 stars','Level 1','Level 2','Level 3','Level 4'].map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="QRIS expiry / renewal date" hint={expiryHint(liveData.qrisRenewalDate)}>
              <input type="date" value={liveData.qrisRenewalDate || ''} onChange={e => set('qrisRenewalDate', e.target.value)} />
            </Field>
            <UploadRow fieldKey="qris_certificate" centerId={centerId} label="QRIS certificate or award letter" hint="Upload QRIS rating certificate · PDF or JPG · Max 5 MB" />
          </Section>
        </>)}

        {/* ── D2: PHYSICAL ENVIRONMENT (41 fields) ── */}
        {sub === 'physical' && (<>
          <Section title="Space Measurements" sub={`${state} min: ${reg.indoorSqft || 35} sq ft indoor · ${reg.outdoorSqft || 75} sq ft outdoor per child`}>
            <Field label="Total indoor activity sq ft" required chip={`min ${reg.indoorSqft || 35} sq ft/child`} fieldKey="indoorSqft">
              <input type="number" min="0" placeholder="e.g. 4500" value={liveData.indoorSqFtTotal || ''} onChange={e => set('indoorSqFtTotal', e.target.value)} />
              {liveData.indoorSqFtTotal && liveData.licensedCapacity && (() => {
                const per = (parseFloat(liveData.indoorSqFtTotal) / parseFloat(liveData.licensedCapacity)).toFixed(1);
                const ok = parseFloat(per) >= (reg.indoorSqft || 35);
                return <span className={`hint ${ok ? 'ok' : 'bad'}`}>{per} sq ft/child — state min {reg.indoorSqft || 35}</span>;
              })()}
            </Field>
            <Field label="Total outdoor activity sq ft" required chip={`min ${reg.outdoorSqft || 75} sq ft/child`} fieldKey="outdoorSqft">
              <input type="number" min="0" placeholder="e.g. 8000" value={liveData.outdoorSqFtTotal || ''} onChange={e => set('outdoorSqFtTotal', e.target.value)} />
              {liveData.outdoorSqFtTotal && liveData.licensedCapacity && (() => {
                const per = (parseFloat(liveData.outdoorSqFtTotal) / parseFloat(liveData.licensedCapacity)).toFixed(1);
                const ok = parseFloat(per) >= (reg.outdoorSqft || 75);
                return <span className={`hint ${ok ? 'ok' : 'bad'}`}>{per} sq ft/child — state min {reg.outdoorSqft || 75}</span>;
              })()}
            </Field>
            <Field label="Licensed room capacity posted">
              <YesNo value={liveData.roomCapacityPosted || ''} onChange={v => set('roomCapacityPosted', v)} />
            </Field>
            <Field label="Floor plan on file">
              <YesNo value={liveData.floorPlanOnFile || ''} onChange={v => set('floorPlanOnFile', v)} />
            </Field>
            <UploadRow fieldKey="room_capacity_photo" centerId={centerId} label="Room capacity sign photo" hint="Photo of posted capacity sign in each room · JPG or PNG · Min 800×600 px · Max 5 MB" isPhoto />
            <UploadRow fieldKey="floor_plan" centerId={centerId} label="Floor plan" hint="Upload current floor plan filed with licensing agency · PDF or JPG · Max 5 MB" />
          </Section>

          <Section title="Fixtures & Environment">
            <Field label="Hot water temperature (°F)" required chip={`${state} max: ${rules.hotWaterMax || 110}°F`} fieldKey="hotWaterTemp">
              <input type="number" placeholder="Measure at child fixture" value={liveData.hotWaterTemp || ''} onChange={e => set('hotWaterTemp', e.target.value)} />
              {liveData.hotWaterTemp && <span className={`hint ${parseFloat(liveData.hotWaterTemp) <= (parseInt(rules.hotWaterMax) || 110) ? 'ok' : 'bad'}`}>
                State max: {rules.hotWaterMax || 110}°F
              </span>}
            </Field>
            <Field label="Child-accessible toilets (count)" chip={`${state}: ${rules.toiletRatio || '1:15'}`} fieldKey="toiletCount">
              <input type="number" min="0" placeholder="e.g. 7" value={liveData.toiletCount || ''} onChange={e => set('toiletCount', e.target.value)} />
            </Field>
            <Field label="Hand-washing sinks (count)" fieldKey="sinkCount">
              <input type="number" min="0" value={liveData.sinkCount || ''} onChange={e => set('sinkCount', e.target.value)} />
            </Field>
            <Field label="Safe drinking water accessible" fieldKey="drinkingWater">
              <YesNo value={liveData.drinkingWater || ''} onChange={v => set('drinkingWater', v)} />
            </Field>
          </Section>

          <Section title="Outdoor Safety">
            <Field label="Fencing height (ft)" chip={`${state} min: ${rules.minFencingHeight || 4} ft`} fieldKey="fencingCompliant">
              <input type="number" step="0.5" placeholder="e.g. 5" value={liveData.fencingHeight || ''} onChange={e => set('fencingHeight', e.target.value)} />
            </Field>
            <Field label="Gate self-latching">
              <YesNo value={liveData.gateSelfLatching || ''} onChange={v => set('gateSelfLatching', v)} />
            </Field>
            <Field label="Shade available outdoors">
              <YesNo value={liveData.shadeAvailable || ''} onChange={v => set('shadeAvailable', v)} />
            </Field>
            <Field label="Resilient surfacing under equipment">
              <YesNo value={liveData.resilientSurfacing || ''} onChange={v => set('resilientSurfacing', v)} />
            </Field>
            <Field label="Equipment age-appropriate and in good repair" fieldKey="equipmentAgeAppropriate">
              <YesNo value={liveData.equipmentAgeAppropriate || ''} onChange={v => set('equipmentAgeAppropriate', v)} />
            </Field>
            <NoteField fieldKey="equipmentAgeAppropriate" centerId={centerId} />
            <UploadRow fieldKey="gate_photo" centerId={centerId} label="Self-latching gate photo" hint="Photo showing self-latching mechanism on outdoor gate · JPG or PNG · Min 800×600 px · Max 5 MB" isPhoto />
            <UploadRow fieldKey="surfacing_photo" centerId={centerId} label="Resilient surfacing photo" hint="Photo of playground surfacing material under climbing equipment · JPG or PNG · Min 800×600 px · Max 5 MB" isPhoto />
          </Section>

          <Section title="Safety & Hazards">
            <Field label="Hazardous materials stored safely" required fieldKey="hazMatStorage">
              <YesNo value={liveData.hazMatStorage || ''} onChange={v => set('hazMatStorage', v)} />
            </Field>
            <Field label="Choke hazard policy (under 3)">
              <YesNo value={liveData.chokeHazardPolicy || ''} onChange={v => set('chokeHazardPolicy', v)} />
            </Field>
            <Field label="Sharp tool storage policy">
              <YesNo value={liveData.sharpToolPolicy || ''} onChange={v => set('sharpToolPolicy', v)} />
            </Field>
            <Field label="Written space policy on file">
              <YesNo value={liveData.spacePolicyOnFile || ''} onChange={v => set('spacePolicyOnFile', v)} />
            </Field>
            <Field label="ADA accessibility compliant">
              <YesNo value={liveData.adaCompliant || ''} onChange={v => set('adaCompliant', v)} />
            </Field>
            <NoteField fieldKey="adaCompliant" centerId={centerId} />
          </Section>

          <Section title="Detectors & Building Inspections">
            <Field label="Smoke detectors installed" required fieldKey="smokeDetectors">
              <YesNo value={liveData.smokeDetectors || ''} onChange={v => set('smokeDetectors', v)} />
            </Field>
            <Field label="Smoke detector test date">
              <input type="date" value={liveData.smokeDetectorTestDate || ''} onChange={e => set('smokeDetectorTestDate', e.target.value)} />
            </Field>
            <Field label="CO detectors installed" required chip={`${state}: Required`} fieldKey="coDetector">
              <YesNo value={liveData.coDetectors || ''} onChange={v => set('coDetectors', v)} opts={['Yes','Partial','No','Not applicable']} />
            </Field>
            <Field label="CO detector test date" chip="DC: every 6 months">
              <input type="date" value={liveData.coDetectorTestDate || ''} onChange={e => set('coDetectorTestDate', e.target.value)} />
            </Field>
            <Field label="Fire extinguishers current" required fieldKey="fireExtinguishers">
              <YesNo value={liveData.fireExtinguishers || ''} onChange={v => set('fireExtinguishers', v)} />
            </Field>
            <Field label="Fire extinguisher inspection date">
              <input type="date" value={liveData.fireExtInspDate || ''} onChange={e => set('fireExtInspDate', e.target.value)} />
            </Field>
            <Field label="Emergency lighting functional" fieldKey="emergencyLighting">
              <YesNo value={liveData.emergencyLighting || ''} onChange={v => set('emergencyLighting', v)} />
            </Field>
            <Field label="Exit signs posted">
              <YesNo value={liveData.exitSigns || ''} onChange={v => set('exitSigns', v)} />
            </Field>
            <Field label="Facility inspection current" required>
              <YesNo value={liveData.facilityInspCurrent || ''} onChange={v => set('facilityInspCurrent', v)} />
            </Field>
            <Field label="Fire department inspection date">
              <input type="date" value={liveData.fireDeptInspDate || ''} onChange={e => set('fireDeptInspDate', e.target.value)} />
            </Field>
            <Field label="Health department inspection date">
              <input type="date" value={liveData.healthDeptInspDate || ''} onChange={e => set('healthDeptInspDate', e.target.value)} />
            </Field>
            <UploadRow fieldKey="fire_ext_tag_photo" centerId={centerId} label="Fire extinguisher inspection tag photo" hint="Photo of fire extinguisher inspection tag · JPG or PNG · Min 800×600 px · Max 5 MB" isPhoto />
            <UploadRow fieldKey="exit_signs_photo" centerId={centerId} label="Exit signs photo" hint="Photo of posted exit signage at required exits · JPG or PNG · Min 800×600 px · Max 5 MB" isPhoto />
            <UploadRow fieldKey="facility_inspection_report" centerId={centerId} label="Facility inspection report" hint="Upload health or fire department facility inspection report · PDF · Max 5 MB" />
          </Section>
        </>)}

        {/* ── D3: PERSONNEL & QUALIFICATIONS (34 fields) ── */}
        {sub === 'personnel' && (<>
          <div style={{ background: '#eef4fc', border: '1px solid #a8c4e0', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#1d4ed8' }}>
            <strong>{state} director requirement:</strong> {reg.directorReq || 'See state regulations'}<br />
            <strong>{state} teacher requirement:</strong> {reg.teacherReq || 'See state regulations'}
          </div>

          <Section title="Director Qualifications">
            <Field label="Director full name" required>
              <input placeholder="Full legal name" value={liveData.directorName || ''} onChange={e => set('directorName', e.target.value)} />
            </Field>
            <Field label="Director education level" required fieldKey="directorEducation">
              <select value={liveData.directorEducation || ''} onChange={e => set('directorEducation', e.target.value)}>
                <option value="">Select...</option>
                {['High school diploma / GED','CDA credential',"Associate's — ECE or child development","Bachelor's — ECE or child development","Bachelor's — related field","Master's degree or higher"].map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Director ECE credit hours">
              <input type="number" min="0" placeholder="e.g. 18" value={liveData.directorECECredits || ''} onChange={e => set('directorECECredits', e.target.value)} />
            </Field>
            <Field label="Director years experience" required>
              <input type="number" min="0" step="0.5" value={liveData.directorExperience || ''} onChange={e => set('directorExperience', e.target.value)} />
            </Field>
            <Field label="Director qualification pathway" required fieldKey="directorQualPathway">
              <select value={liveData.directorQualPathway || ''} onChange={e => set('directorQualPathway', e.target.value)}>
                <option value="">Select...</option>
                {['CDA — Child Development Associate','State director credential','NAEYC certification','Colorado Shines credential','Other state credential','None required'].map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <NoteField fieldKey="directorQualPathway" centerId={centerId} />
            <Field label="Director credential name">
              <input placeholder="e.g. FL Director Credential" value={liveData.directorCredential || ''} onChange={e => set('directorCredential', e.target.value)} />
            </Field>
            <Field label="Director credential expiry" hint={expiryHint(liveData.directorCredExpiry)}>
              <input type="date" value={liveData.directorCredExpiry || ''} onChange={e => set('directorCredExpiry', e.target.value)} />
            </Field>
            <Field label="Director on duty policy on file" fieldKey="directorOnDutyPolicy">
              <YesNo value={liveData.directorOnDutyPolicy || ''} onChange={v => set('directorOnDutyPolicy', v)} />
            </Field>
            <Field label="Assistant director qualified">
              <YesNo value={liveData.asstDirQualified || ''} onChange={v => set('asstDirQualified', v)} opts={['Yes','No','Not applicable']} />
            </Field>
          </Section>

          <Section title="Lead Teacher Qualifications">
            <Field label="Lead teacher qualification met" required fieldKey="leadTeacherQualMet">
              <YesNo value={liveData.leadTeacherQualMet || ''} onChange={v => set('leadTeacherQualMet', v)} />
            </Field>
            <Field label="Lead teacher education level">
              <select value={liveData.leadTeacherEducation || ''} onChange={e => set('leadTeacherEducation', e.target.value)}>
                <option value="">Select...</option>
                {['High school diploma / GED','CDA credential','AA/BA in ECE','12+ ECE credit hours','HS diploma + orientation'].map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Lead teacher orientation complete">
              <YesNo value={liveData.leadTeacherOrientation || ''} onChange={v => set('leadTeacherOrientation', v)} />
            </Field>
            <Field label="Lead teacher CPR current">
              <YesNo value={liveData.ltCPRCurrent || ''} onChange={v => set('ltCPRCurrent', v)} />
            </Field>
          </Section>

          <Section title="Aide Qualifications">
            <Field label="Aide age requirement met (18+)" required fieldKey="aideAgeReq">
              <YesNo value={liveData.aideAgeReq || ''} onChange={v => set('aideAgeReq', v)} />
            </Field>
            <Field label="Aide orientation complete">
              <YesNo value={liveData.aideOrientation || ''} onChange={v => set('aideOrientation', v)} />
            </Field>
            <Field label="Aide supervision policy on file">
              <YesNo value={liveData.aideSuperPolicy || ''} onChange={v => set('aideSuperPolicy', v)} />
            </Field>
          </Section>

          <Section title="Background Checks" sub={`${state}: ${rules.bgCheckType || 'State + FBI fingerprint'}`}>
            <Field label="BG check complete — all staff" required chip={rules.bgCheckType || ''} fieldKey="bgCheckType">
              <YesNo value={liveData.bgCheckComplete || ''} onChange={v => set('bgCheckComplete', v)} />
            </Field>
            <NoteField fieldKey="bgCheckComplete" centerId={centerId} />
            <Field label="State BG check clearance date" required>
              <input type="date" value={liveData.stateBgCheckDate || ''} onChange={e => set('stateBgCheckDate', e.target.value)} />
            </Field>
            <Field label="FBI fingerprint clearance date" required>
              <input type="date" value={liveData.fbiBgCheckDate || ''} onChange={e => set('fbiBgCheckDate', e.target.value)} />
            </Field>
            <Field label="Child abuse registry check" required>
              <YesNo value={liveData.caRegistryCheck || ''} onChange={v => set('caRegistryCheck', v)} />
            </Field>
            <Field label="Pre-employment affidavit on file">
              <YesNo value={liveData.preEmpAffidavit || ''} onChange={v => set('preEmpAffidavit', v)} />
            </Field>
            <Field label="Volunteer BG check policy" fieldKey="volunteerBgPolicy">
              <YesNo value={liveData.volunteerBgPolicy || ''} onChange={v => set('volunteerBgPolicy', v)} />
            </Field>
            <NoteField fieldKey="volunteerBgPolicy" centerId={centerId} />
          </Section>

          <Section title="Workforce Registry" sub={rules.workforceRegistry || ''}>
            <Field label="Workforce registry enrolled">
              <YesNo value={liveData.workforceRegistryEnrolled || ''} onChange={v => set('workforceRegistryEnrolled', v)} opts={['Yes','No','Not required']} />
            </Field>
            <Field label="Registry profile ID">
              <input placeholder="Registry ID number" value={liveData.registryProfileId || ''} onChange={e => set('registryProfileId', e.target.value)} />
            </Field>
            <Field label="Registry training hours current">
              <YesNo value={liveData.registryTrainingCurrent || ''} onChange={v => set('registryTrainingCurrent', v)} />
            </Field>
          </Section>
        </>)}

        {/* ── D5: STAFF HEALTH & TRAINING (44 fields) ── */}
        {sub === 'staffhealth' && (<>
          <Section title="Staff Physical Examinations">
            <Field label="Staff physical exam on file — all staff" required fieldKey="staffPhysicalOnFile">
              <YesNo value={liveData.staffPhysicalOnFile || ''} onChange={v => set('staffPhysicalOnFile', v)} />
            </Field>
            <Field label="Most recent staff physical date">
              <input type="date" value={liveData.staffPhysicalDate || ''} onChange={e => set('staffPhysicalDate', e.target.value)} />
            </Field>
            <Field label="Physical renewal date (DC/state)" chip="DC: annual renewal required">
              <input type="date" value={liveData.physicalRenewalDate || ''} onChange={e => set('physicalRenewalDate', e.target.value)} />
            </Field>
            <Field label="Staff health statement current" chip="CO: annual self-report required">
              <YesNo value={liveData.staffHealthStatement || ''} onChange={v => set('staffHealthStatement', v)} opts={['Yes','No','Not required']} />
            </Field>
            <Field label="Communicable disease policy on file">
              <YesNo value={liveData.commDiseasePol || ''} onChange={v => set('commDiseasePol', v)} />
            </Field>
            <Field label="Illness exclusion policy posted">
              <YesNo value={liveData.illnessExclusionPosted || ''} onChange={v => set('illnessExclusionPosted', v)} />
            </Field>
            <Field label="Staff illness exclusion followed">
              <YesNo value={liveData.staffIllnessExclusion || ''} onChange={v => set('staffIllnessExclusion', v)} />
            </Field>
            <Field label="Staff vaccination records on file">
              <YesNo value={liveData.staffVaccinationRecs || ''} onChange={v => set('staffVaccinationRecs', v)} opts={['Yes','No','Not required']} />
            </Field>
            <UploadRow fieldKey="illness_exclusion_posted_photo" centerId={centerId} label="Illness exclusion policy posted (photo)" hint="Photo of illness exclusion policy posted for parent and staff viewing · JPG or PNG · Min 800×600 px · Max 5 MB" isPhoto />
          </Section>

          <Section title="TB Screening" sub={`${state}: ${rules.tbTestReq || 'Initial at hire'}`}>
            <Field label="TB screening complete — all staff" required fieldKey="tbScreening">
              <YesNo value={liveData.tbScreeningComplete || ''} onChange={v => set('tbScreeningComplete', v)} />
            </Field>
            <Field label="Most recent TB test date" required>
              <input type="date" value={liveData.tbTestDate || ''} onChange={e => set('tbTestDate', e.target.value)} />
            </Field>
            <Field label="TB test result">
              <select value={liveData.tbTestResult || ''} onChange={e => set('tbTestResult', e.target.value)}>
                <option value="">Select...</option>
                {['Negative','Positive (managed)','Risk assessment only'].map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="TB renewal date (if applicable)" hint={expiryHint(liveData.tbRenewalDate)}>
              <input type="date" value={liveData.tbRenewalDate || ''} onChange={e => set('tbRenewalDate', e.target.value)} />
            </Field>
          </Section>

          <Section title="CPR & First Aid" sub={`${state}: renewal every ${rules.cprRenewal || '2 years'}`}>
            <Field label="CPR certification on file — required staff" required fieldKey="cprCertOnFile">
              <YesNo value={liveData.cprCertOnFile || ''} onChange={v => set('cprCertOnFile', v)} />
            </Field>
            <Field label="CPR certification type">
              <select value={liveData.cprCertType || ''} onChange={e => set('cprCertType', e.target.value)}>
                <option value="">Select...</option>
                {['Pediatric CPR + AED + First Aid','Adult + Pediatric CPR + First Aid','BLS','CPR only'].map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="CPR certification date">
              <input type="date" value={liveData.cprCertDate || ''} onChange={e => set('cprCertDate', e.target.value)} />
            </Field>
            <Field label="CPR expiry date" required hint={expiryHint(liveData.cprExpiry)}>
              <input type="date" value={liveData.cprExpiry || ''} onChange={e => set('cprExpiry', e.target.value)} />
            </Field>
            <Field label="First aid certification current" required>
              <YesNo value={liveData.firstAidCurrent || ''} onChange={v => set('firstAidCurrent', v)} />
            </Field>
            <Field label="CPR-certified staff count" required>
              <input type="number" min="0" value={liveData.cprStaffCount || ''} onChange={e => set('cprStaffCount', e.target.value)} />
            </Field>
            <Field label="Food Protection Manager on site" chip="DC: §155.4 required">
              <YesNo value={liveData.foodProtMgr || ''} onChange={v => set('foodProtMgr', v)} opts={['Yes','No','Not required']} />
            </Field>
            <Field label="AED on premises">
              <YesNo value={liveData.aedOnPremises || ''} onChange={v => set('aedOnPremises', v)} opts={['Yes','No','Not required']} />
            </Field>
            <UploadRow fieldKey="food_prot_mgr_cert" centerId={centerId} label="Food Protection Manager certificate" hint="Upload Food Protection Manager certification (required in DC) · PDF or JPG · Max 5 MB" />
          </Section>

          <Section title="Mandated Reporter Training" sub={`${state}: ${rules.mandatedReporterRenewal || 'Required at hire'}`}>
            <Field label="Mandated reporter training — all staff" required fieldKey="mandatedReporter">
              <YesNo value={liveData.mrTrainingComplete || ''} onChange={v => set('mrTrainingComplete', v)} />
            </Field>
            <Field label="Mandated reporter training date" fieldKey="mandatedReporter">
              <input type="date" value={liveData.mrTrainingDate || ''} onChange={e => set('mrTrainingDate', e.target.value)} />
            </Field>
            <Field label="MR renewal date (if applicable)" hint={expiryHint(liveData.mrRenewalDate)}>
              <input type="date" value={liveData.mrRenewalDate || ''} onChange={e => set('mrRenewalDate', e.target.value)} />
            </Field>
            <Field label="Abuse reporting procedure posted">
              <YesNo value={liveData.abuseReportingPosted || ''} onChange={v => set('abuseReportingPosted', v)} />
            </Field>
            <Field label="Child abuse hotline number posted">
              <YesNo value={liveData.hotlinePosted || ''} onChange={v => set('hotlinePosted', v)} />
            </Field>
            <UploadRow fieldKey="abuse_reporting_posted_photo" centerId={centerId} label="Abuse reporting procedure posted (photo)" hint="Photo of child abuse reporting procedure posted visibly in center · JPG or PNG · Min 800×600 px · Max 5 MB" isPhoto />
            <UploadRow fieldKey="hotline_posted_photo" centerId={centerId} label="Hotline number posted (photo)" hint="Photo of posted child abuse hotline number · JPG or PNG · Min 800×600 px · Max 5 MB" isPhoto />
          </Section>

          <Section title="Annual Training" sub={`${state} requires ${reg.trainingHrs || 12} hrs/yr for all direct-care staff`}>
            <Field label="Annual training hours completed" required chip={`${state} min: ${reg.trainingHrs || 12} hrs/yr`} fieldKey="trainingHrs">
              <input type="number" min="0" step="0.5" placeholder="e.g. 14" value={liveData.annualTrainingHrs || ''} onChange={e => set('annualTrainingHrs', e.target.value)} />
              {liveData.annualTrainingHrs && (() => {
                const hrs = parseFloat(liveData.annualTrainingHrs);
                const req = parseFloat(reg.trainingHrs || 12);
                const ok = hrs >= req;
                return <span className={`hint ${ok ? 'ok' : 'bad'}`}>
                  {ok ? `✓ Meets ${req} hr requirement` : `${(req - hrs).toFixed(1)} hrs still needed`}
                </span>;
              })()}
            </Field>
            <Field label="Training log on file">
              <YesNo value={liveData.trainingLogOnFile || ''} onChange={v => set('trainingLogOnFile', v)} />
            </Field>
            <Field label="Training topics documented">
              <YesNo value={liveData.trainingTopicsDocs || ''} onChange={v => set('trainingTopicsDocs', v)} />
            </Field>
            <NoteField fieldKey="trainingTopicsDocs" centerId={centerId} />
            <Field label="Standard precautions training current" chip="CO: annual renewal required" fieldKey="standardPrecautions">
              <YesNo value={liveData.standardPrecautions || ''} onChange={v => set('standardPrecautions', v)} />
            </Field>
            <Field label="Safe sleep training — infant staff" chip="CO: annual renewal required" fieldKey="safeSleepTraining">
              <YesNo value={liveData.safeSleepTraining || ''} onChange={v => set('safeSleepTraining', v)} />
            </Field>
            <Field label="Child abuse recognition training" chip="CO: within 30 days of hire">
              <YesNo value={liveData.childAbuseTraining || ''} onChange={v => set('childAbuseTraining', v)} />
            </Field>
            <Field label="Director-led training approved" chip="TX: from Aug 2024">
              <YesNo value={liveData.directorLedTraining || ''} onChange={v => set('directorLedTraining', v)} opts={['Yes','No','Not applicable']} />
            </Field>
            <Field label="QRIS training requirements met">
              <YesNo value={liveData.qrisTrainingMet || ''} onChange={v => set('qrisTrainingMet', v)} opts={['Yes','No','Not applicable']} />
            </Field>
          </Section>

          <Section title="Orientation">
            <Field label="New hire orientation complete — all staff">
              <YesNo value={liveData.orientationComplete || ''} onChange={v => set('orientationComplete', v)} />
            </Field>
            <Field label="Orientation hours completed" fieldKey="orientationComplete">
              <input type="number" min="0" placeholder="e.g. 8" value={liveData.orientationHours || ''} onChange={e => set('orientationHours', e.target.value)} />
            </Field>
            <Field label="Orientation completion date">
              <input type="date" value={liveData.orientationDate || ''} onChange={e => set('orientationDate', e.target.value)} />
            </Field>
            <Field label="Emergency preparedness training" chip="CO: required before working with children">
              <YesNo value={liveData.emergPrepTraining || ''} onChange={v => set('emergPrepTraining', v)} />
            </Field>
            <Field label="Volunteer orientation complete">
              <YesNo value={liveData.volunteerOrientation || ''} onChange={v => set('volunteerOrientation', v)} opts={['Yes','No','Not applicable']} />
            </Field>
          </Section>
        </>)}

        {/* ── D4: RATIOS & SUPERVISION (39 fields) ── */}
        {sub === 'ratios' && (<>
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#0369a1' }}>
            <strong>{state} ratio rules:</strong> Infant {reg.infant ? `1:${reg.infant}` : 'see regs'} ·
            Toddler {reg.toddler ? `1:${reg.toddler}` : 'see regs'} ·
            Preschool {reg.preschool ? `1:${reg.preschool}` : 'see regs'} ·
            School-age {reg.schoolAge ? `1:${reg.schoolAge}` : 'see regs'}
            {reg.infantLabel && <div style={{ marginTop: 4, color: '#0369a1' }}>⚠ {reg.infantLabel}</div>}
          </div>

          <Section title="Enrollment by Age Group">
            <Field label="Infant enrollment (0–12 mo)" fieldKey="infantEnrollment">
              <input type="number" min="0" value={liveData.infantEnrollment || ''} onChange={e => set('infantEnrollment', e.target.value)} />
            </Field>
            <Field label="Young toddler enrollment (12–17 mo)">
              <input type="number" min="0" value={liveData.youngToddlerEnrollment || ''} onChange={e => set('youngToddlerEnrollment', e.target.value)} />
            </Field>
            <Field label="Older toddler enrollment (18–35 mo)">
              <input type="number" min="0" value={liveData.olderToddlerEnrollment || ''} onChange={e => set('olderToddlerEnrollment', e.target.value)} />
            </Field>
            <Field label="Preschool enrollment (3–5 yr)" fieldKey="preschoolEnrollment">
              <input type="number" min="0" value={liveData.preschoolEnrollment || ''} onChange={e => set('preschoolEnrollment', e.target.value)} />
            </Field>
            <Field label="School-age enrollment (K+)">
              <input type="number" min="0" value={liveData.schoolAgeEnrollment || ''} onChange={e => set('schoolAgeEnrollment', e.target.value)} />
            </Field>
            <Field label="Total enrollment">
              <input type="number" min="0" value={liveData.totalEnrollment || ''} onChange={e => set('totalEnrollment', e.target.value)} />
            </Field>
          </Section>

          <Section title="Calculated Ratios">
            <RatioRow label="Infants (0–18 months)"   enrollKey="infantEnrollment"      staffKey="infantStaffCount"    maxRatio={`1:${reg.infant || 4}`} />
            <RatioRow label="Toddlers (18–36 months)" enrollKey="olderToddlerEnrollment" staffKey="toddlerStaffCount"   maxRatio={`1:${reg.toddler || 9}`} />
            <RatioRow label="Preschool (3–5 years)"   enrollKey="preschoolEnrollment"   staffKey="preschoolStaffCount" maxRatio={`1:${reg.preschool || 15}`} />
            <RatioRow label="School-age (6+)"         enrollKey="schoolAgeEnrollment"   staffKey="schoolAgeStaffCount" maxRatio={`1:${reg.schoolAge || 26}`} />
          </Section>

          <Section title="Group Sizes">
            <Field label="Infant group size">
              <input type="number" min="0" value={liveData.infantGroupSize || ''} onChange={e => set('infantGroupSize', e.target.value)} />
            </Field>
            <Field label="Toddler group size">
              <input type="number" min="0" value={liveData.toddlerGroupSize || ''} onChange={e => set('toddlerGroupSize', e.target.value)} />
            </Field>
            <Field label="Preschool group size">
              <input type="number" min="0" value={liveData.preschoolGroupSize || ''} onChange={e => set('preschoolGroupSize', e.target.value)} />
            </Field>
            <Field label="School-age group size">
              <input type="number" min="0" value={liveData.schoolAgeGroupSize || ''} onChange={e => set('schoolAgeGroupSize', e.target.value)} />
            </Field>
            <Field label="Mixed-age group present">
              <YesNo value={liveData.mixedAgeGroup || ''} onChange={v => set('mixedAgeGroup', v)} />
            </Field>
            <NoteField fieldKey="mixedAgeGroup" centerId={centerId} />
            <Field label="Naptime ratio adjustment applied">
              <YesNo value={liveData.naptimeRatioAdj || ''} onChange={v => set('naptimeRatioAdj', v)} opts={['Yes','No','Not applicable']} />
            </Field>
          </Section>

          <Section title="Sign-in Logs">
            <Field label="Daily sign-in/out log maintained" required chip="DC: §130.8(b)">
              <YesNo value={liveData.signInLogMaintained || ''} onChange={v => set('signInLogMaintained', v)} />
            </Field>
            <Field label="Sign-in log retention period">
              <input placeholder="e.g. 2 years" value={liveData.signInLogRetention || ''} onChange={e => set('signInLogRetention', e.target.value)} />
            </Field>
          </Section>

          <Section title="Staff on Duty">
            <Field label="Minimum staff on duty met" required fieldKey="minStaffOnDuty">
              <YesNo value={liveData.minStaffOnDuty || ''} onChange={v => set('minStaffOnDuty', v)} />
            </Field>
            <Field label="Director or qualified designee on duty">
              <YesNo value={liveData.qualDirOnDuty || ''} onChange={v => set('qualDirOnDuty', v)} />
            </Field>
            <Field label="CPR-certified staff on duty" required fieldKey="cprStaffOnDuty">
              <YesNo value={liveData.cprStaffOnDuty || ''} onChange={v => set('cprStaffOnDuty', v)} />
            </Field>
            <Field label="Staff schedule on file" fieldKey="staffScheduleOnFile">
              <YesNo value={liveData.staffScheduleOnFile || ''} onChange={v => set('staffScheduleOnFile', v)} />
            </Field>
            <Field label="Opening/closing ratio compliance">
              <YesNo value={liveData.openCloseRatioCompliant || ''} onChange={v => set('openCloseRatioCompliant', v)} />
            </Field>
            <NoteField fieldKey="openCloseRatioCompliant" centerId={centerId} />
            <Field label="Substitute staff policy on file">
              <YesNo value={liveData.subStaffPolicy || ''} onChange={v => set('subStaffPolicy', v)} />
            </Field>
          </Section>
        </>)}

        {/* ── D6: CHILDREN'S RECORDS & HEALTH (50 fields) ── */}
        {sub === 'children' && (<>
          <Section title="Enrollment Records">
            <Field label="Child enrollment record complete — all children" required fieldKey="childEnrollmentComplete">
              <YesNo value={liveData.enrollRecordComplete || ''} onChange={v => set('enrollRecordComplete', v)} />
            </Field>
            <NoteField fieldKey="enrollRecordComplete" centerId={centerId} />
            <Field label="Custody orders on file (where applicable)" fieldKey="custodyOrdersOnFile">
              <YesNo value={liveData.custodyOrdersOnFile || ''} onChange={v => set('custodyOrdersOnFile', v)} opts={['Yes','No','Not applicable']} />
            </Field>
            <Field label="Record retention policy met" chip={`${state}: ${rules.recordRetention || '1–3'} yr min`}>
              <YesNo value={liveData.recordRetentionMet || ''} onChange={v => set('recordRetentionMet', v)} />
            </Field>
            <Field label="Incident / accident report log maintained" required>
              <YesNo value={liveData.incidentReportLog || ''} onChange={v => set('incidentReportLog', v)} />
            </Field>
            <NoteField fieldKey="incidentReportLog" centerId={centerId} />
            <Field label="Daily care log maintained">
              <YesNo value={liveData.careLogMaintained || ''} onChange={v => set('careLogMaintained', v)} />
            </Field>
            <Field label="Child physician contact on file">
              <YesNo value={liveData.physicianContact || ''} onChange={v => set('physicianContact', v)} />
            </Field>
            <Field label="Special care needs plan on file">
              <YesNo value={liveData.specialCareNeedsPlan || ''} onChange={v => set('specialCareNeedsPlan', v)} opts={['Yes','No','Not applicable']} />
            </Field>
          </Section>

          <Section title="Emergency Contacts">
            <Field label="Emergency contacts on file — all children" required fieldKey="emergencyContacts">
              <YesNo value={liveData.emergContactsOnFile || ''} onChange={v => set('emergContactsOnFile', v)} />
            </Field>
            <Field label="Authorized pickup list on file — all children" required fieldKey="authPickupOnFile">
              <YesNo value={liveData.authPickupOnFile || ''} onChange={v => set('authPickupOnFile', v)} />
            </Field>
            <Field label="Emergency contact update policy">
              <YesNo value={liveData.emergContactUpdatePolicy || ''} onChange={v => set('emergContactUpdatePolicy', v)} />
            </Field>
          </Section>

          <Section title="Allergies & Care Plans">
            <Field label="Allergy documentation on file — all children with allergies" required fieldKey="allergyDocOnFile">
              <YesNo value={liveData.allergyDocOnFile || ''} onChange={v => set('allergyDocOnFile', v)} />
            </Field>
            <Field label="Allergy care plan on file" required fieldKey="allergyCareplan">
              <YesNo value={liveData.allergyCareplan || ''} onChange={v => set('allergyCareplan', v)} />
            </Field>
            <Field label="EpiPen / emergency medication on site">
              <YesNo value={liveData.epiPenOnSite || ''} onChange={v => set('epiPenOnSite', v)} opts={['Yes','No','Not applicable']} />
            </Field>
            <Field label="Food allergy policy posted">
              <YesNo value={liveData.foodAllergyPolicy || ''} onChange={v => set('foodAllergyPolicy', v)} />
            </Field>
            <Field label="Allergy list posted in kitchen">
              <YesNo value={liveData.allergyListInKitchen || ''} onChange={v => set('allergyListInKitchen', v)} />
            </Field>
          </Section>

          <Section title="Medication Administration">
            <Field label="Medication administration policy on file" fieldKey="medAdminPolicy">
              <YesNo value={liveData.medAdminPolicy || ''} onChange={v => set('medAdminPolicy', v)} />
            </Field>
            <Field label="Medication authorization on file — all receiving meds" required>
              <YesNo value={liveData.medAuthOnFile || ''} onChange={v => set('medAuthOnFile', v)} />
            </Field>
            <Field label="Medication log maintained" required>
              <YesNo value={liveData.medLogMaintained || ''} onChange={v => set('medLogMaintained', v)} />
            </Field>
            <Field label="Medications stored correctly — locked & labeled" required>
              <YesNo value={liveData.medsStoredCorrectly || ''} onChange={v => set('medsStoredCorrectly', v)} />
            </Field>
            <Field label="Prescription on file for Rx medications">
              <YesNo value={liveData.rxOnFile || ''} onChange={v => set('rxOnFile', v)} opts={['Yes','No','Not applicable']} />
            </Field>
            <Field label="Non-prescription medication policy">
              <YesNo value={liveData.nonRxMedPolicy || ''} onChange={v => set('nonRxMedPolicy', v)} />
            </Field>
          </Section>

          <Section title="Child Physical Exams">
            <Field label="Child physical exam on file — all children">
              <YesNo value={liveData.childPhysicalOnFile || ''} onChange={v => set('childPhysicalOnFile', v)} opts={['Yes','No','Not applicable']} />
            </Field>
            <Field label="Developmental screening on file" fieldKey="devScreeningOnFile">
              <YesNo value={liveData.devScreeningOnFile || ''} onChange={v => set('devScreeningOnFile', v)} opts={['Yes','No','Not applicable']}/>
            </Field>
            <Field label="Most recent child physical date">
              <input type="date" value={liveData.childPhysicalDate || ''} onChange={e => set('childPhysicalDate', e.target.value)} />
            </Field>
            <Field label="Vision and hearing screening">
              <YesNo value={liveData.visionHearingScreen || ''} onChange={v => set('visionHearingScreen', v)} opts={['Yes','No','Not required']} />
            </Field>
            <Field label="Lead testing documentation" chip="VA: from Jan 2025">
              <YesNo value={liveData.leadTestingDoc || ''} onChange={v => set('leadTestingDoc', v)} opts={['Yes','No','Not required']} />
            </Field>
          </Section>

          <Section title="Immunizations" sub={`${state} exemptions: ${rules.immExemptions || 'Medical + Religious'}`}>
            <div style={{ background: rules.immExemptions === 'Medical only' ? '#fdf1f1' : '#eef7f2',
              border: `1px solid ${rules.immExemptions === 'Medical only' ? '#e8a0a0' : '#a7d4ba'}`,
              borderRadius: 8, padding: '10px 14px', marginBottom: 16, gridColumn: '1/-1' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: rules.immExemptions === 'Medical only' ? '#b91c1c' : '#2d7a4f' }}>
                {state} immunization exemptions: {rules.immExemptions || 'Medical + Religious'}
              </div>
            </div>
            <Field label="Immunization records on file — all children" required fieldKey="immunizationRecords">
              <YesNo value={liveData.immRecordsOnFile || ''} onChange={v => set('immRecordsOnFile', v)} />
            </Field>
            <Field label="Immunization records current" required>
              <YesNo value={liveData.immRecordsCurrent || ''} onChange={v => set('immRecordsCurrent', v)} />
            </Field>
            <NoteField fieldKey="immRecordsCurrent" centerId={centerId} />
            <Field label="Immunization exemption type">
              <select value={liveData.immExemptionType || ''} onChange={e => set('immExemptionType', e.target.value)}>
                <option value="">Select...</option>
                {['None','Medical','Religious','Philosophical'].map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Exemption documentation on file">
              <YesNo value={liveData.immExemptionDoc || ''} onChange={v => set('immExemptionDoc', v)} opts={['Yes','No','Not applicable']} />
            </Field>
            <Field label="Annual immunization report submitted to state">
              <YesNo value={liveData.annualImmReporting || ''} onChange={v => set('annualImmReporting', v)} opts={['Yes','No','Not required']} />
            </Field>
            <Field label="Immunization record retention compliant">
              <YesNo value={liveData.immRecordRetention || ''} onChange={v => set('immRecordRetention', v)} />
            </Field>
          </Section>

          <Section title="Safe Sleep">
            <Field label="Safe sleep policy on file" required chip="Required for centers serving infants under 2" fieldKey="safeSleepPolicy">
              <YesNo value={liveData.safeSleepPolicy || ''} onChange={v => set('safeSleepPolicy', v)} opts={['Yes','No','Not applicable']} />
            </Field>
            <Field label="Safe sleep policy communicated to parents">
              <YesNo value={liveData.safeSleepCommun || ''} onChange={v => set('safeSleepCommun', v)} opts={['Yes','No','Not applicable']} />
            </Field>
            <Field label="Infant sleep environment compliant" required>
              <YesNo value={liveData.infantSleepEnv || ''} onChange={v => set('infantSleepEnv', v)} opts={['Yes','No','Not applicable']} />
            </Field>
            <Field label="Safe sleep training — all infant room staff" required>
              <YesNo value={liveData.safeSleepStaffTrain || ''} onChange={v => set('safeSleepStaffTrain', v)} opts={['Yes','No','Not applicable']} />
            </Field>
            <Field label="Infant sleep position exception documented">
              <YesNo value={liveData.infantSleepException || ''} onChange={v => set('infantSleepException', v)} opts={['Yes','No','Not applicable']} />
            </Field>
          </Section>

          <Section title="Parental Agreements">
            <Field label="Parent / guardian agreement signed — all children" required fieldKey="parentAgreementSigned">
              <YesNo value={liveData.parentAgreementSigned || ''} onChange={v => set('parentAgreementSigned', v)} />
            </Field>
            <Field label="Written policies acknowledged by parent">
              <YesNo value={liveData.writtenPoliciesAck || ''} onChange={v => set('writtenPoliciesAck', v)} />
            </Field>
            <Field label="Photo / media release signed">
              <YesNo value={liveData.photoReleaseSign || ''} onChange={v => set('photoReleaseSign', v)} />
            </Field>
            <Field label="Field trip permission on file">
              <YesNo value={liveData.fieldTripPermission || ''} onChange={v => set('fieldTripPermission', v)} opts={['Yes','No','Not applicable']} />
            </Field>
            <Field label="Transportation permission on file">
              <YesNo value={liveData.transportPermission || ''} onChange={v => set('transportPermission', v)} opts={['Yes','No','Not applicable']} />
            </Field>
            <Field label="Grievance procedure communicated to families">
              <YesNo value={liveData.grievanceProcedure || ''} onChange={v => set('grievanceProcedure', v)} />
            </Field>
          </Section>

          <Section title="Attendance Records" sub={`${state}: retain ${rules.recordRetention || '3'} years`}>
            <Field label="Daily attendance record on file" required fieldKey="attendanceRecordOnFile">
              <YesNo value={liveData.attendanceRecordOnFile || ''} onChange={v => set('attendanceRecordOnFile', v)} />
            </Field>
            <Field label="Sign-in/sign-out log maintained" required fieldKey="signInLogMaintained">
              <YesNo value={liveData.attendanceSignInLog || ''} onChange={v => set('attendanceSignInLog', v)} />
            </Field>
            <Field label="Attendance retention period met" chip={`${state}: ${rules.recordRetention || '3'} yr min`} required>
              <YesNo value={liveData.attendanceRetentionMet || ''} onChange={v => set('attendanceRetentionMet', v)} />
            </Field>
            <Field label="Most recent sign-in log date">
              <input type="date" value={liveData.attendanceLastDate || ''} onChange={e => set('attendanceLastDate', e.target.value)} />
            </Field>
            <Field label="Attendance records stored securely">
              <YesNo value={liveData.attendanceStoredSecurely || ''} onChange={v => set('attendanceStoredSecurely', v)} />
            </Field>
          </Section>
        </>)}

        {/* ── D7: EMERGENCY & SAFETY (44 fields) ── */}
        {sub === 'emergency' && (<>
          <Section title="Fire Safety" sub={`${state}: fire evacuation drill required ${rules.fireDrillFreq || 'monthly'}`}>
            <Field label="Fire evacuation plan on file" required fieldKey="fireEvacPlan">
              <YesNo value={liveData.fireEvacPlan || ''} onChange={v => set('fireEvacPlan', v)} />
            </Field>
            <Field label="Fire evacuation plan posted visibly" required>
              <YesNo value={liveData.fireEvacPosted || ''} onChange={v => set('fireEvacPosted', v)} />
            </Field>
            <Field label="Last fire drill date" required hint={pastDrillHint(liveData.lastFireDrillDate, 35)} fieldKey="lastFireDrillDate">
              <input type="date" value={liveData.lastFireDrillDate || ''} onChange={e => set('lastFireDrillDate', e.target.value)} />
            </Field>
            <Field label="Fire drills completed (12 mo)" required>
              <input type="number" min="0" value={liveData.fireDrillsCompleted || ''} onChange={e => set('fireDrillsCompleted', e.target.value)} />
            </Field>
            <Field label="Fire drill log on file" required fieldKey="fire_drill_log">
              <YesNo value={liveData.fireDrillLog || ''} onChange={v => set('fireDrillLog', v)} />
            </Field>
            <Field label="Fire safety training — all staff" required fieldKey="fireSafetyTraining">
              <YesNo value={liveData.fireSafetyTraining || ''} onChange={v => set('fireSafetyTraining', v)} />
            </Field>
            <Field label="Fire department inspection current" required fieldKey="fire_dept_inspection_report">
              <YesNo value={liveData.fireDeptInspCurrent || ''} onChange={v => set('fireDeptInspCurrent', v)} />
            </Field>
            <Field label="Fire alarm system tested" fieldKey="fireAlarmTested">
              <YesNo value={liveData.fireAlarmTested || ''} onChange={v => set('fireAlarmTested', v)} />
            </Field>
            <UploadRow fieldKey="fire_evac_plan" centerId={centerId} label="Fire evacuation plan" hint="Upload written fire evacuation plan · PDF · Max 5 MB" />
            <UploadRow fieldKey="fire_evac_posted_photo" centerId={centerId} label="Evacuation route map photo" hint="Photo of posted evacuation map in a classroom or hallway · JPG or PNG · Min 800×600 px · Max 5 MB" isPhoto />
            <UploadRow fieldKey="fire_drill_log" centerId={centerId} label="Fire drill log" hint="Upload fire drill log showing dates, times, evacuation times, and counts · PDF or JPG · Max 5 MB" />
            <UploadRow fieldKey="fire_dept_inspection_report" centerId={centerId} label="Fire department inspection report" hint="Upload current fire department facility inspection report · PDF · Max 5 MB" />
          </Section>

          <Section title="Tornado / Severe Weather" sub={`${state}: ${rules.tornadoDrill || 'See state requirement'}`}>
            {rules.tornadoDrill === 'Not required'
              ? <div style={{ gridColumn:'1/-1', background:'#eef7f2', border:'1px solid #a7d4ba', borderRadius:8, padding:'12px', fontSize:13, color:'#166534' }}>
                  Tornado drills not required in {state} — this section marked compliant automatically.
                </div>
              : <>
                <Field label="Last tornado drill date" required hint={pastDrillHint(liveData.lastTornadoDrillDate, rules.tornadoDrill?.includes('Monthly') ? 35 : 200)} fieldKey="lastTornadoDrillDate">
                  <input type="date" value={liveData.lastTornadoDrillDate || ''} onChange={e => set('lastTornadoDrillDate', e.target.value)} />
                </Field>
                <Field label="Tornado drills completed (12 mo)">
                  <input type="number" min="0" value={liveData.tornadoDrillsCompleted || ''} onChange={e => set('tornadoDrillsCompleted', e.target.value)} />
                </Field>
                <Field label="Tornado drill log on file">
                  <YesNo value={liveData.tornadoDrillLog || ''} onChange={v => set('tornadoDrillLog', v)} />
                </Field>
                <Field label="Designated shelter area identified">
                  <YesNo value={liveData.shelterAreaIdentified || ''} onChange={v => set('shelterAreaIdentified', v)} />
                </Field>
                <Field label="Severe weather alert system available">
                  <YesNo value={liveData.severeWeatherAlert || ''} onChange={v => set('severeWeatherAlert', v)} />
                </Field>
                <UploadRow fieldKey="tornado_drill_log" centerId={centerId} label="Tornado drill log" hint="Upload tornado drill log with date, time, shelter location, and staff count · PDF or JPG · Max 5 MB" />
              </>
            }
          </Section>

          <Section title="Lockdown / Active Threat" sub={`${state}: lockdown drill ${rules.lockdownDrill || '2x/year'}`}>
            <Field label="Last lockdown drill date" required fieldKey="lastLockdownDate">
              <input type="date" value={liveData.lastLockdownDate || ''} onChange={e => set('lastLockdownDate', e.target.value)} />
            </Field>
            <Field label="Lockdown drills completed (12 mo — typically 2)" required>
              <input type="number" min="0" value={liveData.lockdownDrillsCompleted || ''} onChange={e => set('lockdownDrillsCompleted', e.target.value)} />
            </Field>
            <Field label="Lockdown drill log on file" required>
              <YesNo value={liveData.lockdownDrillLog || ''} onChange={v => set('lockdownDrillLog', v)} />
            </Field>
            <Field label="Lockdown procedure communicated to all staff">
              <YesNo value={liveData.lockdownProcComm || ''} onChange={v => set('lockdownProcComm', v)} />
            </Field>
            <Field label="Communication device available during lockdown">
              <YesNo value={liveData.commDeviceAvailable || ''} onChange={v => set('commDeviceAvailable', v)} />
            </Field>
            <UploadRow fieldKey="lockdown_drill_log" centerId={centerId} label="Lockdown drill log" hint="Upload lockdown drill log with date, time, procedures, and staff count · PDF or JPG · Max 5 MB" />
          </Section>

          <Section title="Emergency Plans & Records">
            <Field label="Written emergency plan on file" required fieldKey="emergencyPlan">
              <YesNo value={liveData.emergPlanOnFile || ''} onChange={v => set('emergPlanOnFile', v)} />
            </Field>
            <Field label="Emergency plan reviewed annually">
              <YesNo value={liveData.emergPlanReviewed || ''} onChange={v => set('emergPlanReviewed', v)} />
            </Field>
            <NoteField fieldKey="emergPlanReviewed" centerId={centerId} />
            <Field label="Emergency plan communicated to staff">
              <YesNo value={liveData.emergPlanComm || ''} onChange={v => set('emergPlanComm', v)} />
            </Field>
            <Field label="Emergency plan communicated to families">
              <YesNo value={liveData.emergPlanFamilies || ''} onChange={v => set('emergPlanFamilies', v)} />
            </Field>
            <Field label="Emergency contact list current (fire, police, poison control, DSS)">
              <YesNo value={liveData.emergContactListCurrent || ''} onChange={v => set('emergContactListCurrent', v)} />
            </Field>
            <Field label="Off-site relocation meeting point identified">
              <YesNo value={liveData.relocationSite || ''} onChange={v => set('relocationSite', v)} />
            </Field>
            <Field label="First aid kit accessible — fully stocked" required fieldKey="firstAidKit">
              <YesNo value={liveData.firstAidKit || ''} onChange={v => set('firstAidKit', v)} />
            </Field>
            <Field label="First aid kit contents current — no expired items" fieldKey="firstAidKitContents">
              <YesNo value={liveData.firstAidKitContents || ''} onChange={v => set('firstAidKitContents', v)} />
            </Field>
            <UploadRow fieldKey="emergency_plan" centerId={centerId} label="Written emergency plan" hint="Upload comprehensive written emergency plan document · PDF · Max 5 MB" />
            <UploadRow fieldKey="emergency_contacts_photo" centerId={centerId} label="Emergency contact list photo" hint="Photo of posted emergency contact list (fire, police, poison control, DSS, hospital) · JPG or PNG · Min 800×600 px · Max 5 MB" isPhoto />
            <UploadRow fieldKey="first_aid_kit_photo" centerId={centerId} label="First aid kit contents photo" hint="Photo of first aid kit with contents visible · JPG or PNG · Min 800×600 px · Max 5 MB" isPhoto />
          </Section>

          <Section title="Health Inspection">
            <Field label="Health department inspection current" required fieldKey="health_inspection_report">
              <YesNo value={liveData.healthInspCurrent || ''} onChange={v => set('healthInspCurrent', v)} />
            </Field>
            <Field label="Health inspection date" required>
              <input type="date" value={liveData.healthInspDate || ''} onChange={e => set('healthInspDate', e.target.value)} />
            </Field>
            <Field label="Health inspection result">
              <select value={liveData.healthInspResult || ''} onChange={e => set('healthInspResult', e.target.value)}>
                <option value="">Select...</option>
                {['Pass','Pass with conditions','Fail'].map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Health inspection report on file">
              <YesNo value={liveData.healthInspReportOnFile || ''} onChange={v => set('healthInspReportOnFile', v)} />
            </Field>
            <Field label="Open health violations count">
              <input type="number" min="0" value={liveData.openHealthViolations || ''} onChange={e => set('openHealthViolations', e.target.value)} />
            </Field>
            <NoteField fieldKey="openHealthViolations" centerId={centerId} />
            <Field label="Food service permit current">
              <YesNo value={liveData.foodServicePermit || ''} onChange={v => set('foodServicePermit', v)} opts={['Yes','No','Not applicable']} />
            </Field>
            <UploadRow fieldKey="health_inspection_report" centerId={centerId} label="Health inspection report" hint="Upload most recent health department inspection report · PDF · Max 5 MB" />
            <UploadRow fieldKey="food_service_permit" centerId={centerId} label="Food service permit" hint="Upload current food service or kitchen permit · PDF · Max 5 MB" />
          </Section>

          <Section title="Drill Log Retention">
            <Field label="All drill logs retained (fire, tornado, lockdown)" chip="DC: 5 years">
              <YesNo value={liveData.allDrillLogsRetained || ''} onChange={v => set('allDrillLogsRetained', v)} />
            </Field>
            <NoteField fieldKey="allDrillLogsRetained" centerId={centerId} />
            <Field label="Drill log retention period met">
              <YesNo value={liveData.drillLogRetentionMet || ''} onChange={v => set('drillLogRetentionMet', v)} />
            </Field>
            <Field label="Drill logs available for inspector review">
              <YesNo value={liveData.drillLogInspAccess || ''} onChange={v => set('drillLogInspAccess', v)} />
            </Field>
            <Field label="Electronic drill log in use">
              <YesNo value={liveData.electronicDrillLog || ''} onChange={v => set('electronicDrillLog', v)} opts={['Yes','No']} />
            </Field>
          </Section>

          <Section title="Water Safety">
            <Field label="Water safety plan on file (if pool / water feature)" fieldKey="waterSafetyPlan">
              <YesNo value={liveData.waterSafetyPlan || ''} onChange={v => set('waterSafetyPlan', v)} opts={['Yes','No','Not applicable']} />
            </Field>
            <Field label="Lifeguard certification on file">
              <YesNo value={liveData.lifeguardCert || ''} onChange={v => set('lifeguardCert', v)} opts={['Yes','No','Not applicable']} />
            </Field>
            <Field label="Water activity permission on file — all children">
              <YesNo value={liveData.waterActivityPermission || ''} onChange={v => set('waterActivityPermission', v)} opts={['Yes','No','Not applicable']} />
            </Field>
          </Section>
        </>)}

        {saved && (
          <div style={{ background: '#eef7f2', border: '1px solid #a7d4ba', borderRadius: 8, padding: '10px 16px', marginBottom: 12, color: '#2d7a4f', fontSize: 13, fontWeight: 600 }}>
            ✓ Snapshot saved
          </div>
        )}

        <div className="save-bar">
          <div style={{ fontSize: 13, color: '#2d7a4f', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2d7a4f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Auto-saves · Score updates in real time
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost">Reset section</button>
            <button className="btn btn-primary" onClick={handleSave}>Save Snapshot</button>
          </div>
        </div>
      </div>
    </div>
  );
}

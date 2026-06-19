import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MOCK_STAFF_SARAH } from '../mockData';

/* ── Palette ─────────────────────────────────────────────────────────────── */
const C  = { expired:'#b91c1c', current:'#2d7a4f', valid:'#2d7a4f', met:'#2d7a4f', onfile:'#2d7a4f', warning:'#b45309' };
const BG = { expired:'#fdf1f1', current:'#eef7f2', valid:'#eef7f2', met:'#eef7f2', onfile:'#eef7f2', warning:'#fdf4e7' };
const BD = { expired:'#e8a0a0', current:'#a7d4ba', valid:'#a7d4ba', met:'#a7d4ba', onfile:'#a7d4ba', warning:'#e6b87a' };

const ATTACH_LEGACY_KEY  = '1core_compliance_v6_staff_attachments';
const ATTACH_VERSION_KEY = '1core_compliance_v7_staff_docversions';
const STAFF_NOTES_KEY    = '1core_compliance_v6_staff_notes';

/* ── Attachment storage helpers ──────────────────────────────────────────── */
function loadLegacyStaffAttachments() {
  try { return JSON.parse(localStorage.getItem(ATTACH_LEGACY_KEY) || '{}'); } catch { return {}; }
}
function loadDocVersions() {
  try { return JSON.parse(localStorage.getItem(ATTACH_VERSION_KEY) || '{}'); } catch { return {}; }
}
function saveDocVersions(data) {
  try { localStorage.setItem(ATTACH_VERSION_KEY, JSON.stringify(data)); } catch {}
}
function migrateIfNeeded(staffId, fieldKey) {
  const all = loadDocVersions();
  if (all[staffId]?.[fieldKey]) return;
  const legacy = loadLegacyStaffAttachments();
  const old = legacy[staffId]?.[fieldKey];
  if (!old) return;
  if (!all[staffId]) all[staffId] = {};
  all[staffId][fieldKey] = [{
    id: 'v_migrated_' + Date.now(),
    name: old.name, size: old.size, type: old.type,
    uploadedAt: old.uploadedAt || new Date().toISOString(),
    data: old.data,
  }];
  saveDocVersions(all);
}
function loadStaffNotes() {
  try { return JSON.parse(localStorage.getItem(STAFF_NOTES_KEY) || '{}'); } catch { return {}; }
}
function saveStaffNotes(data) {
  try { localStorage.setItem(STAFF_NOTES_KEY, JSON.stringify(data)); } catch {}
}

/* ── NoteToggle ──────────────────────────────────────────────────────────── */
function NoteToggle({ fieldKey, staffId }) {
  const noteId = `${staffId}__${fieldKey}`;
  const [open, setOpen] = useState(() => { const n = loadStaffNotes(); return !!(n[noteId]); });
  const [text, setText] = useState(() => { const n = loadStaffNotes(); return n[noteId] || ''; });

  const handleChange = (val) => {
    setText(val);
    const all = loadStaffNotes();
    if (val.trim()) { all[noteId] = val; } else { delete all[noteId]; }
    saveStaffNotes(all);
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
            placeholder="Add a note for this field — visible to your director..."
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

/* ── FileUpload component (versioned) ────────────────────────────────────── */
// Uploading a new file prepends to the version stack — nothing is ever overwritten.
// versions[0] is always the current version. All past versions are preserved.
function FileUpload({ fieldKey, label, hint, accept = '.pdf,.jpg,.jpeg,.png', staffId = 'sarah', userRole = 'Staff Member' }) {
  const inputRef = useRef();

  useEffect(() => { migrateIfNeeded(staffId, fieldKey); }, [staffId, fieldKey]); // eslint-disable-line

  const [versions, setVersions] = useState(() => {
    migrateIfNeeded(staffId, fieldKey);
    return loadDocVersions()[staffId]?.[fieldKey] || [];
  });
  const [historyOpen, setHistoryOpen] = useState(false);

  const current = versions[0] || null;
  const past    = versions.slice(1);

  const fmtSize     = s => s < 1024 * 1024 ? `${Math.round(s / 1024)} KB` : `${(s / 1024 / 1024).toFixed(1)} MB`;
  const fmtDate     = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtDateTime = d => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  const handleFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File exceeds 5 MB limit. Please compress and try again.'); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const newVersion = {
        id: 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        name: file.name, size: file.size, type: file.type,
        uploadedAt: new Date().toISOString(),
        uploadedBy: userRole,
        data: ev.target.result,
      };
      const all = loadDocVersions();
      if (!all[staffId]) all[staffId] = {};
      const next = [newVersion, ...(all[staffId][fieldKey] || [])];
      all[staffId][fieldKey] = next;
      saveDocVersions(all);
      setVersions(next);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [fieldKey, staffId, userRole]);

  const handleRemoveCurrent = useCallback(() => {
    if (!window.confirm('Remove this version? Previous versions (if any) will remain accessible.')) return;
    const all = loadDocVersions();
    if (!all[staffId]?.[fieldKey]) return;
    const next = all[staffId][fieldKey].slice(1);
    if (next.length === 0) { delete all[staffId][fieldKey]; } else { all[staffId][fieldKey] = next; }
    saveDocVersions(all);
    setVersions(next);
  }, [fieldKey, staffId]);

  const handleRemovePast = useCallback((id) => {
    if (!window.confirm('Permanently delete this version?')) return;
    const all = loadDocVersions();
    if (!all[staffId]?.[fieldKey]) return;
    const next = all[staffId][fieldKey].filter(v => v.id !== id);
    if (next.length === 0) { delete all[staffId][fieldKey]; } else { all[staffId][fieldKey] = next; }
    saveDocVersions(all);
    setVersions(next);
  }, [fieldKey, staffId]);

  const noteToggle = <NoteToggle fieldKey={fieldKey} staffId={staffId} />;

  if (!current) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        <label style={{ fontSize:12.5, fontWeight:600, color:'#374151' }}>{label}</label>
        {hint && <span style={{ fontSize:11.5, color:'#00a99d', marginBottom:2 }}>{hint}</span>}
        <div
          onClick={() => inputRef.current?.click()}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', border:'1.5px dashed #cbd5e1', borderRadius:8, background:'#f8fafc', cursor:'pointer', transition:'border-color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#00a99d'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#cbd5e1'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
          <div>
            <div style={{ fontSize:13, color:'#374151', fontWeight:500 }}>Click to upload</div>
            <div style={{ fontSize:11.5, color:'#94a3b8' }}>PDF, JPG, or PNG · Max 5 MB</div>
          </div>
        </div>
        {noteToggle}
        <input ref={inputRef} type="file" accept={accept} onChange={handleFile} style={{ display:'none' }} />
      </div>
    );
  }

  const isImage = current.type?.startsWith('image/');
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:12.5, fontWeight:600, color:'#374151' }}>{label}</label>
      {hint && <span style={{ fontSize:11.5, color:'#00a99d', marginBottom:2 }}>{hint}</span>}

      {/* Current version row */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', border:'1px solid #a7d4ba', borderRadius:8, background:'#eef7f2' }}>
        {isImage
          ? <img src={current.data} alt={current.name} style={{ width:32, height:32, objectFit:'cover', borderRadius:4, border:'1px solid #a7d4ba', flexShrink:0 }} />
          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d7a4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        }
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
            <span style={{ fontSize:10.5, fontWeight:700, color:'#fff', background:'#2d7a4f', borderRadius:3, padding:'1px 5px', flexShrink:0 }}>CURRENT</span>
            <span style={{ fontSize:12.5, fontWeight:600, color:'#1e5c38', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{current.name}</span>
          </div>
          <div style={{ fontSize:11.5, color:'#2d7a4f', marginTop:2 }}>{fmtDate(current.uploadedAt)} &middot; {fmtSize(current.size)}</div>
        </div>
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          <a href={current.data} download={current.name} style={{ padding:'5px 10px', borderRadius:6, border:'1px solid #a7d4ba', background:'#fff', color:'#2d7a4f', fontSize:12, fontWeight:500, textDecoration:'none' }}>Download</a>
          <button onClick={() => inputRef.current?.click()} style={{ padding:'5px 10px', borderRadius:6, border:'1px solid #93c5fd', background:'#eff6ff', color:'#1d4ed8', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>Replace</button>
          <button onClick={handleRemoveCurrent} style={{ padding:'5px 10px', borderRadius:6, border:'1px solid #e8a0a0', background:'#fdf1f1', color:'#b91c1c', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>Remove</button>
        </div>
        <input ref={inputRef} type="file" accept={accept} onChange={handleFile} style={{ display:'none' }} />
      </div>

      {/* Version history drawer */}
      {past.length > 0 && (
        <div>
          <button
            onClick={() => setHistoryOpen(o => !o)}
            style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:6, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#64748b', fontSize:11.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: historyOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.15s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            {historyOpen ? 'Hide' : 'Show'} version history &middot; {past.length} older {past.length === 1 ? 'version' : 'versions'}
          </button>
          {historyOpen && (
            <div style={{ marginTop:5, border:'1px solid #e2e8f0', borderRadius:8, overflow:'hidden' }}>
              <div style={{ padding:'6px 12px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', gap:6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span style={{ fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em' }}>Version History</span>
                <span style={{ fontSize:11, color:'#94a3b8' }}>&mdash; all previous uploads preserved &amp; downloadable</span>
              </div>
              {past.map((v, idx) => {
                const vIsImg = v.type?.startsWith('image/');
                return (
                  <div key={v.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderBottom: idx < past.length - 1 ? '1px solid #f1f5f9' : 'none', background:'#fff' }}>
                    {vIsImg
                      ? <img src={v.data} alt={v.name} style={{ width:24, height:24, objectFit:'cover', borderRadius:3, border:'1px solid #e2e8f0', flexShrink:0 }} />
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    }
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:500, color:'#475569', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.name}</div>
                      <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{fmtDateTime(v.uploadedAt)} &middot; {fmtSize(v.size)}</div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:600, color:'#94a3b8', background:'#f1f5f9', borderRadius:3, padding:'1px 6px', whiteSpace:'nowrap', flexShrink:0 }}>v{past.length - idx}</span>
                    <a href={v.data} download={v.name} style={{ padding:'3px 8px', borderRadius:5, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#64748b', fontSize:11.5, fontWeight:500, textDecoration:'none', whiteSpace:'nowrap', flexShrink:0 }}>Download</a>
                    <button onClick={() => handleRemovePast(v.id)} style={{ padding:'3px 8px', borderRadius:5, border:'1px solid #f3c6c6', background:'#fdf1f1', color:'#b91c1c', fontSize:11.5, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', flexShrink:0 }}>Delete</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {noteToggle}
    </div>
  );
}

/* ── Shared primitives ───────────────────────────────────────────────────── */
function StatusPill({ status, text }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px',
      borderRadius:20, fontSize:12, fontWeight:600,
      color:C[status]||'#64748b', background:BG[status]||'#f1f5f9', border:`1px solid ${BD[status]||'#e2e8f0'}` }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:C[status]||'#94a3b8', flexShrink:0 }}/>
      {text}
    </span>
  );
}

function InfoBanner({ children }) {
  return (
    <div style={{ display:'flex', gap:10, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'14px 18px', marginBottom:20 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00a99d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      <p style={{ fontSize:13.5, color:'#374151', lineHeight:1.6, margin:0 }}>{children}</p>
    </div>
  );
}

function SectionCard({ title, subtitle, children, footer }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, marginBottom:16, overflow:'hidden' }}>
      {(title||subtitle) && (
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:14.5, fontWeight:700, color:'#0f172a' }}>{title}</div>
            {subtitle && <div style={{ fontSize:12.5, color:'#64748b', marginTop:3 }}>{subtitle}</div>}
          </div>
        </div>
      )}
      <div style={{ padding:'20px' }}>{children}</div>
      {footer && (
        <div style={{ padding:'14px 20px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fafafa' }}>
          <span style={{ fontSize:12.5, color:'#94a3b8' }}>Submitted records are reviewed by your center director</span>
          {footer}
        </div>
      )}
    </div>
  );
}

function FormGrid({ children, cols=2 }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:16, marginBottom:4 }}>
      {children}
    </div>
  );
}

function Field({ label, hint, children, span }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5, gridColumn: span===2?'1/-1':undefined }}>
      <label style={{ fontSize:12.5, fontWeight:600, color:'#374151' }}>{label}</label>
      {children}
      {hint && <span style={{ fontSize:11.5, color:'#00a99d' }}>{hint}</span>}
    </div>
  );
}

/* thin horizontal divider inside a SectionCard */
function Divider({ label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, margin:'20px 0 16px' }}>
      <div style={{ flex:1, height:1, background:'#f1f5f9' }}/>
      {label && <span style={{ fontSize:11.5, fontWeight:600, color:'#94a3b8', letterSpacing:'0.05em', textTransform:'uppercase' }}>{label}</span>}
      <div style={{ flex:1, height:1, background:'#f1f5f9' }}/>
    </div>
  );
}

const inputStyle = {
  padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:8,
  fontSize:13.5, color:'#1e293b', background:'#fff', outline:'none',
  fontFamily:'inherit', width:'100%', boxSizing:'border-box',
};
const selectStyle = { ...inputStyle, appearance:'none' };

function YesNoGroup({ value, onChange, opts=['Yes','No'] }) {
  const colors = { Yes:{ sel:'#eef7f2', bc:'#a7d4ba', tc:'#1e5c38' }, No:{ sel:'#fdf1f1', bc:'#e8a0a0', tc:'#7f1d1d' }, 'In progress':{ sel:'#fdf4e7', bc:'#e6b87a', tc:'#7c4a00' }, 'Not provided':{ sel:'#f1f5f9', bc:'#cbd5e1', tc:'#475569' } };
  return (
    <div style={{ display:'flex', gap:6 }}>
      {opts.map(o => {
        const sel = value===o;
        const c = colors[o]||{ sel:'#f0f2ff', bc:'#c5cbee', tc:'#4f5fa8' };
        return (
          <button key={o} onClick={()=>onChange(o)} style={{
            padding:'7px 16px', borderRadius:8, border:`1px solid ${sel?c.bc:'#e2e8f0'}`,
            background:sel?c.sel:'#fff', color:sel?c.tc:'#64748b',
            fontWeight:sel?700:500, fontSize:13, cursor:'pointer', fontFamily:'inherit', transition:'all 0.12s',
          }}>{o}</button>
        );
      })}
    </div>
  );
}

function SubmitFooter({ onClear, onSubmit, submitted }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <button onClick={onClear} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', color:'#64748b', fontWeight:500, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Clear</button>
      <button onClick={onSubmit} style={{ padding:'8px 20px', borderRadius:8, border:'none', background: submitted?'#2d7a4f':'#0f172a', color:'#fff', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s' }}>
        {submitted ? '✓ Submitted for review' : 'Submit Update'}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function StaffView({ activeTab='status', staffData={}, onStaffUpdate, onTabChange, pendingUpdates=[] }) {
  const s = MOCK_STAFF_SARAH;

  /* ── Local form state ── */
  const [cpr, setCpr] = useState({
    status:'', certDate:'', expiryDate:'', provider:'', certNum:'', format:'', type:'', notes:'',
  });
  const [fa, setFa] = useState({
    certDate:'14/11/2025', expiryDate:'14/11/2026', provider:'American Red Cross', certNum:'',
  });
  const [cprSubmitted, setCprSubmitted] = useState(false);

  const [sessions, setSessions] = useState([
    { date:'Mar 15, 2026', course:'Child Abuse Recognition & Prevention', type:'Mandated Reporter', provider:'TX HHS Online', hours:3.0, ce:true },
    { date:'Feb 8, 2026',  course:'Safe Sleep & SIDS Prevention',         type:'Health & Safety',  provider:'AHA Online',     hours:2.0, ce:true },
    { date:'Jan 22, 2026', course:'Child Development Ages 0–3',           type:'ECE / Professional',provider:'NAEYC Webinar', hours:4.0, ce:true },
    { date:'Jan 10, 2026', course:'Nutrition & Food Safety in Childcare', type:'Health & Safety',  provider:'TX HHS Online',  hours:3.0, ce:true },
  ]);
  const [newSession, setNewSession] = useState({ date:'', hours:'', course:'', type:'', provider:'', format:'', certNum:'', certOnFile:'', notes:'' });
  const [trainingSubmitted, setTrainingSubmitted] = useState(false);

  const [health, setHealth] = useState({
    physicalDone:'Yes', physicalDate:'10/01/2026', physician:'', physicalSubmitted:'Yes',
    tbDone:'Yes', tbDate:'10/01/2026', tbResult:'Negative',
    hepB:'', hepBStatus:'Up to date',
    mmr:'', mmrStatus:'Up to date',
    varicella:'', varicellaStatus:'Up to date',
    tdap:'', tdapStatus:'Up to date',
    flu:'', fluStatus:'Up to date',
    tb2:'10/01/2026', tb2Status:'Negative',
    allergies:'No', epipen:'No', conditions:'',
    emergName:'James Mitchell', emergPhone:'(817) 555-0142', emergRel:'Spouse',
  });
  const [healthSubmitted, setHealthSubmitted] = useState(false);

  const [profile, setProfile] = useState({
    education:'Bachelor\'s degree in ECE', institution:'Texas Woman\'s University',
    gradYear:'2020', degreeOnFile:'Yes',
    cdaNum:'', cdaExpiry:'',
    registryEnrolled:'Yes', registryId:'', registryDate:'', careerLevel:'',
    mandatedDone:'Yes', mandatedDate:'12/03/2025', mandatedProvider:'TX HHS Online Portal',
    mandatedCertNum:'', mandatedSubmitted:'Yes',
    naeyc:'No', additionalCerts:'', notes:'',
    /* orientation */
    orientationComplete:'Yes', orientationDate:'', orientationHours:'', orientationFormat:'',
    emergPrepTraining:'Yes',
    safeSleepTraining:'', standardPrecautions:'',
  });
  const [profileSubmitted, setProfileSubmitted] = useState(false);

  const totalHrs = sessions.reduce((t,s)=>t+s.hours,0);
  const txReq    = 12;
  const hrsLeft  = Math.max(0, txReq - totalHrs);

  const tabLabel = {
    status:'My Compliance Status', cpr:'CPR & First Aid',
    training:'Training Log', health:'Health & Immunizations', profile:'Profile & Credentials',
  }[activeTab] || 'My Compliance';

  const header = (
    <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'20px 28px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00a99d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span style={{ fontSize:13.5, fontWeight:600, color:'#00a99d' }}>My Records — {tabLabel}</span>
      </div>
      <h2 style={{ fontSize:22, fontWeight:700, color:'#0f172a', margin:0 }}>{tabLabel}</h2>
      <p style={{ fontSize:13.5, color:'#64748b', margin:'5px 0 0' }}>Lionheart 121CC — {s.city}, {s.state}</p>
    </div>
  );

  /* ══ STATUS tab ══════════════════════════════════════════════════════════ */
  if (activeTab === 'status') return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#f8fafc', overflowY:'auto' }}>
      {header}
      <div style={{ padding:'24px 28px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
          {[
            { label:'Urgent Action', val:s.urgentCount,   sub:'CPR expired',           color:'#b91c1c', bg:'#fdf1f1', border:'#e8a0a0',
              icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
            { label:'Review Soon',   val:s.reviewCount,   sub:'Training hours',         color:'#b45309', bg:'#fdf4e7', border:'#e6b87a',
              icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
            { label:'Up to Date',    val:s.upToDateCount, sub:'Certifications current', color:'#2d7a4f', bg:'#eef7f2', border:'#a7d4ba',
              icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2d7a4f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
            { label:'My Center',     val:'121CC',          sub:`${s.city}, ${s.state}`, color:'#1e5c8a', bg:'#eef4fc', border:'#a8c4e0',
              icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e5c8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg> },
          ].map((k,i) => (
            <div key={i} style={{ background:'#fff', border:`1px solid ${k.border}`, borderTop:`3px solid ${k.color}`, borderRadius:12, padding:'18px 20px', display:'flex', flexDirection:'column', gap:4 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ fontSize:36, fontWeight:800, color:k.color, lineHeight:1 }}>{k.val}</div>
                {k.icon}
              </div>
              <div style={{ fontSize:13.5, fontWeight:600, color:'#374151' }}>{k.label}</div>
              <div style={{ fontSize:12, color:'#64748b' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {s.actionItems.map((a,i) => {
          const jumpTab = a.tab || (a.title?.toLowerCase().includes('cpr') || a.title?.toLowerCase().includes('first aid') ? 'cpr'
            : a.title?.toLowerCase().includes('training') ? 'training'
            : a.title?.toLowerCase().includes('health') || a.title?.toLowerCase().includes('immuniz') ? 'health'
            : a.title?.toLowerCase().includes('profile') || a.title?.toLowerCase().includes('credential') ? 'profile'
            : null);
          return (
          <div key={i} style={{ background:'#fdf1f1', border:'1px solid #e8a0a0', borderLeft:'4px solid #b91c1c', borderRadius:10, padding:'16px 20px', marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13.5, fontWeight:700, color:'#7f1d1d', marginBottom:5 }}>{a.title}</div>
                <div style={{ fontSize:13, color:'#7f1d1d', marginBottom:8 }}>{a.detail}</div>
                {a.links && <div style={{ fontSize:12.5, color:'#b91c1c' }}><strong>Renewal:</strong> {a.links}</div>}
              </div>
              {jumpTab && onTabChange && (
                <button
                  onClick={() => onTabChange(jumpTab)}
                  style={{ flexShrink:0, display:'inline-flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:8, border:'1px solid #e8a0a0', background:'#fff', color:'#b91c1c', fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}
                >
                  Update record
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
              )}
            </div>
          </div>
          );
        })}

        {pendingUpdates.length > 0 && (
          <div style={{ background:'#fdf4e7', border:'1px solid #e6b87a', borderRadius:10, padding:'14px 18px', marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#7c4a00', marginBottom:6 }}>
              {pendingUpdates.length} update{pendingUpdates.length>1?'s':''} pending director review
            </div>
            {pendingUpdates.map((u,i) => (
              <div key={i} style={{ fontSize:12.5, color:'#92400e', marginTop:3 }}>• {u.tab} — submitted {u.timestamp}</div>
            ))}
          </div>
        )}

        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9' }}>
            <div style={{ fontSize:15, fontWeight:700, color:'#0f172a' }}>My Certifications & Status</div>
          </div>
          {s.certs.map((c,i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', borderBottom:i<s.certs.length-1?'1px solid #f8fafc':'none' }}>
              <div>
                <div style={{ fontSize:13.5, fontWeight:600, color:'#1e293b' }}>{c.label}</div>
                <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>{c.sub}</div>
              </div>
              <StatusPill status={c.status} text={c.statusText}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* ══ CPR & FIRST AID tab ═════════════════════════════════════════════════ */
  if (activeTab === 'cpr') return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#f8fafc', overflowY:'auto' }}>
      {header}
      <div style={{ padding:'24px 28px' }}>
        <InfoBanner>
          Update your CPR and First Aid certification details here after completing or renewing a course.
          Your center director will be notified when you submit an update. Texas requires CPR renewal every 2 years.
        </InfoBanner>

        <div style={{ background:'#fdf1f1', border:'1px solid #e8a0a0', borderRadius:10, padding:'14px 18px', marginBottom:20 }}>
          <div style={{ fontSize:13.5, fontWeight:700, color:'#7f1d1d', marginBottom:4 }}>CPR Certification Expired — Action Required</div>
          <div style={{ fontSize:13, color:'#7f1d1d' }}>
            Your CPR certification expired May 1, 2026. Please renew immediately and update your record below.
            You cannot provide direct care until this is renewed.
          </div>
        </div>

        <SectionCard
          title="CPR Certification"
          subtitle="Texas requires renewal every 2 years for all direct-care staff"
          footer={<SubmitFooter
            onClear={() => { setCpr({status:'',certDate:'',expiryDate:'',provider:'',certNum:'',format:'',type:'',notes:''}); setCprSubmitted(false); }}
            onSubmit={() => { setCprSubmitted(true); onStaffUpdate && onStaffUpdate('CPR & First Aid', { cpr }); }}
            submitted={cprSubmitted}
          />}
        >
          <FormGrid>
            <Field label="Certification status">
              <select value={cpr.status} onChange={e=>setCpr(p=>({...p,status:e.target.value}))} style={selectStyle}>
                <option value="">Select...</option>
                <option>Current / Valid</option>
                <option>Expired — Renewal in progress</option>
                <option>Expired — Not yet renewed</option>
              </select>
            </Field>
            <Field label="Certification type" hint="Pediatric CPR required for infant/toddler rooms">
              <select value={cpr.type} onChange={e=>setCpr(p=>({...p,type:e.target.value}))} style={selectStyle}>
                <option value="">Select...</option>
                <option>Pediatric CPR / First Aid</option>
                <option>BLS (Basic Life Support) — includes infant/child</option>
                <option>BLS — adult only</option>
                <option>CPR / AED — includes pediatric</option>
                <option>Other</option>
              </select>
            </Field>
            <div style={{ gridColumn:'1/-1' }}><NoteToggle fieldKey="cprCertType" staffId="sarah" /></div>
            <Field label="Certification date (completed)">
              <input type="date" value={cpr.certDate} onChange={e=>setCpr(p=>({...p,certDate:e.target.value}))} style={inputStyle}/>
            </Field>
            <Field label="Expiry date" hint="TX: Must be renewed every 2 years">
              <input type="date" value={cpr.expiryDate} onChange={e=>setCpr(p=>({...p,expiryDate:e.target.value}))} style={inputStyle}/>
            </Field>
            <Field label="Certification provider">
              <select value={cpr.provider} onChange={e=>setCpr(p=>({...p,provider:e.target.value}))} style={selectStyle}>
                <option value="">Select...</option>
                <option>American Heart Association</option>
                <option>American Red Cross</option>
                <option>National Safety Council</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Certificate number">
              <input placeholder="e.g. AHA-2026-XXXXX" value={cpr.certNum} onChange={e=>setCpr(p=>({...p,certNum:e.target.value}))} style={inputStyle}/>
            </Field>
            <Field label="Training format">
              <select value={cpr.format} onChange={e=>setCpr(p=>({...p,format:e.target.value}))} style={selectStyle}>
                <option value="">Select...</option>
                <option>In-person</option>
                <option>Blended (online + skills check)</option>
                <option>Online only</option>
              </select>
            </Field>
          </FormGrid>

          <Divider label="Certificate upload" />
          <FormGrid cols={1}>
            <FileUpload
              fieldKey="cpr_cert"
              label="Upload CPR certificate"
              hint="Upload your completion certificate — PDF or photo. Your director will see this when you submit."
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </FormGrid>

          <div style={{ marginTop:16 }}>
            <Field label="Notes (optional)">
              <textarea placeholder="e.g. Renewal class scheduled for June 3 at Grapevine Fire Station" value={cpr.notes} onChange={e=>setCpr(p=>({...p,notes:e.target.value}))} rows={2} style={{ ...inputStyle, resize:'vertical' }}/>
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="First Aid Certification"
          footer={<SubmitFooter
            onClear={() => setFa({certDate:'',expiryDate:'',provider:'',certNum:''})}
            onSubmit={() => { onStaffUpdate && onStaffUpdate('CPR & First Aid', { fa }); }}
            submitted={false}
          />}
        >
          <FormGrid>
            <Field label="Certification date">
              <input type="text" placeholder="dd/mm/yyyy" value={fa.certDate} onChange={e=>setFa(p=>({...p,certDate:e.target.value}))} style={inputStyle}/>
            </Field>
            <Field label="Expiry date">
              <input type="text" placeholder="dd/mm/yyyy" value={fa.expiryDate} onChange={e=>setFa(p=>({...p,expiryDate:e.target.value}))} style={inputStyle}/>
            </Field>
            <Field label="Certification provider">
              <input value={fa.provider} onChange={e=>setFa(p=>({...p,provider:e.target.value}))} style={inputStyle}/>
            </Field>
            <Field label="Certificate number">
              <input value={fa.certNum} onChange={e=>setFa(p=>({...p,certNum:e.target.value}))} style={inputStyle}/>
            </Field>
          </FormGrid>
          <Divider label="Certificate upload" />
          <FormGrid cols={1}>
            <FileUpload
              fieldKey="first_aid_cert"
              label="Upload First Aid certificate"
              hint="Upload your First Aid completion certificate — PDF or photo."
            />
          </FormGrid>
        </SectionCard>

        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'18px 20px' }}>
          <div style={{ fontSize:13.5, fontWeight:700, color:'#00a99d', marginBottom:10 }}>Where to renew your CPR certification</div>
          {[
            ['American Heart Association', 'heart.org/cpr'],
            ['American Red Cross', 'redcross.org/cpr'],
            ['National Safety Council', 'nsc.org/firstaid'],
          ].map(([org,url])=>(
            <div key={org} style={{ fontSize:13.5, color:'#374151', marginBottom:6 }}>
              {org} — <strong style={{ color:'#00a99d' }}>{url}</strong>
            </div>
          ))}
          <div style={{ fontSize:12.5, color:'#94a3b8', marginTop:8 }}>Contact your center director to schedule a group renewal session.</div>
        </div>
      </div>
    </div>
  );

  /* ══ TRAINING LOG tab ════════════════════════════════════════════════════ */
  if (activeTab === 'training') {
    const addSession = () => {
      if (!newSession.date || !newSession.course || !newSession.hours) return;
      setSessions(p => [{ ...newSession, hours:parseFloat(newSession.hours)||0, ce:false }, ...p]);
      setNewSession({ date:'', hours:'', course:'', type:'', provider:'', format:'', certNum:'', certOnFile:'', notes:'' });
    };
    const pct = Math.min(100, Math.round(totalHrs/txReq*100));
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#f8fafc', overflowY:'auto' }}>
        {header}
        <div style={{ padding:'24px 28px' }}>
          <InfoBanner>
            Log each training session you complete. Texas requires 12 hours of training per year.
            Your running total is calculated automatically as you add sessions.
          </InfoBanner>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
            {[
              { icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2d7a4f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>, val:totalHrs, label:'Hours completed', sub:'2026 training year', color:'#2d7a4f', border:'#a7d4ba', bg:'#eef7f2' },
              { icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e5c8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, val:txReq, label:'TX requirement', sub:'Hours per year', color:'#1e5c8a', border:'#a8c4e0', bg:'#eef4fc' },
              { icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={hrsLeft>0?'#b45309':'#2d7a4f'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, val:hrsLeft, label:'Hours remaining', sub:hrsLeft===0?'Requirement met':'Still needed', color:hrsLeft>0?'#b45309':'#2d7a4f', border:hrsLeft>0?'#e6b87a':'#a7d4ba', bg:hrsLeft>0?'#fdf4e7':'#eef7f2' },
            ].map((k,i)=>(
              <div key={i} style={{ background:k.bg, border:`1px solid ${k.border}`, borderRadius:12, padding:'18px 20px', display:'flex', alignItems:'center', gap:16 }}>
                {k.icon}
                <div>
                  <div style={{ fontSize:32, fontWeight:800, color:k.color, lineHeight:1 }}>{k.val}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginTop:4 }}>{k.label}</div>
                  <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{k.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <SectionCard
            title="Log a New Training Session"
            footer={
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <button onClick={()=>setNewSession({ date:'', hours:'', course:'', type:'', provider:'', format:'', certNum:'', certOnFile:'', notes:'' })}
                  style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', color:'#64748b', fontWeight:500, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>Clear</button>
                <button onClick={()=>{ addSession(); setTrainingSubmitted(true); onStaffUpdate && onStaffUpdate('Training Log', { newSession }); }}
                  style={{ padding:'8px 20px', borderRadius:8, border:'none', background: trainingSubmitted?'#2d7a4f':'#0f172a', color:'#fff', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                  {trainingSubmitted ? '✓ Added' : 'Add to Training Log'}
                </button>
              </div>
            }
          >
            <div style={{ fontSize:12.5, color:'#64748b', marginBottom:14 }}>Training log is shared with your center director</div>
            <FormGrid>
              <Field label="Training date">
                <input type="date" value={newSession.date} onChange={e=>setNewSession(p=>({...p,date:e.target.value}))} style={inputStyle}/>
              </Field>
              <Field label="Hours completed">
                <input type="number" step="0.5" min="0" placeholder="e.g. 2.0" value={newSession.hours} onChange={e=>setNewSession(p=>({...p,hours:e.target.value}))} style={inputStyle}/>
              </Field>
              <Field label="Topic / course name" span={2}>
                <input placeholder="e.g. Emergency Preparedness for Childcare" value={newSession.course} onChange={e=>setNewSession(p=>({...p,course:e.target.value}))} style={inputStyle}/>
              </Field>
              <Field label="Training type">
                <select value={newSession.type} onChange={e=>setNewSession(p=>({...p,type:e.target.value}))} style={selectStyle}>
                  <option value="">Select...</option>
                  <option>Health &amp; Safety</option>
                  <option>ECE / Professional</option>
                  <option>Mandated Reporter</option>
                  <option>Child Abuse Prevention</option>
                  <option>QRIS / Rating</option>
                  <option>Other</option>
                </select>
              </Field>
              <Field label="Training provider">
                <input placeholder="e.g. Texas HHS Online, NAEYC" value={newSession.provider} onChange={e=>setNewSession(p=>({...p,provider:e.target.value}))} style={inputStyle}/>
              </Field>
              <Field label="Delivery format">
                <select value={newSession.format} onChange={e=>setNewSession(p=>({...p,format:e.target.value}))} style={selectStyle}>
                  <option value="">Select...</option>
                  <option>In-person</option>
                  <option>Online</option>
                  <option>Webinar</option>
                  <option>Blended</option>
                </select>
              </Field>
              <Field label="Certificate / completion number">
                <input placeholder="Optional — for your record" value={newSession.certNum} onChange={e=>setNewSession(p=>({...p,certNum:e.target.value}))} style={inputStyle}/>
              </Field>
            </FormGrid>

            <Divider label="Completion certificate (optional)" />
            <FormGrid cols={1}>
              <FileUpload
                fieldKey={`training_cert_${Date.now()}`}
                label="Upload training completion certificate"
                hint="Upload your certificate for this session. Attach one certificate per session entry."
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </FormGrid>

            <div style={{ marginTop:16 }}>
              <Field label="Notes (optional)">
                <textarea placeholder="Any additional notes about this training..." value={newSession.notes} onChange={e=>setNewSession(p=>({...p,notes:e.target.value}))} rows={2} style={{ ...inputStyle, resize:'vertical' }}/>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Training Sessions — 2026">
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13.5 }}>
                <thead>
                  <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                    {['DATE','TOPIC / COURSE','TYPE','PROVIDER','HOURS','CERT'].map(h=>(
                      <th key={h} style={{ textAlign:'left', padding:'10px 14px', fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((ss,i)=>(
                    <tr key={i} style={{ borderBottom:'1px solid #f8fafc' }}>
                      <td style={{ padding:'12px 14px', color:'#64748b', whiteSpace:'nowrap' }}>{ss.date}</td>
                      <td style={{ padding:'12px 14px', fontWeight:600, color:'#1e293b' }}>{ss.course}</td>
                      <td style={{ padding:'12px 14px' }}>
                        <span style={{ fontSize:12, padding:'2px 9px', borderRadius:20, background:'#eef4fc', color:'#1e5c8a', border:'1px solid #a8c4e0', fontWeight:600, whiteSpace:'nowrap' }}>{ss.type}</span>
                      </td>
                      <td style={{ padding:'12px 14px', color:'#64748b' }}>{ss.provider}</td>
                      <td style={{ padding:'12px 14px', fontWeight:700, color:'#2d7a4f', textAlign:'center' }}>{ss.hours}</td>
                      <td style={{ padding:'12px 14px', textAlign:'center' }}>
                        {ss.ce && <span style={{ color:'#2d7a4f', fontSize:16, fontWeight:700 }}>&#9679;</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      </div>
    );
  }

  /* ══ HEALTH & IMMUNIZATIONS tab ══════════════════════════════════════════ */
  if (activeTab === 'health') {
    const ImmRow = ({ vaccine, sub, dateKey, statusKey, opts=['Up to date','Incomplete','Declined'] }) => (
      <div style={{ paddingBottom:18, marginBottom:18, borderBottom:'1px solid #f1f5f9' }}>
        <div style={{ fontSize:13.5, fontWeight:700, color:'#1e293b', marginBottom:2 }}>{vaccine}</div>
        <div style={{ fontSize:12, color:'#64748b', marginBottom:10 }}>{sub}</div>
        <FormGrid>
          <Field label="Date of last dose">
            <input type="date" value={health[dateKey]||''} onChange={e=>setHealth(p=>({...p,[dateKey]:e.target.value}))} style={inputStyle}/>
          </Field>
          <Field label="Status">
            <YesNoGroup value={health[statusKey]||''} onChange={v=>setHealth(p=>({...p,[statusKey]:v}))} opts={opts}/>
          </Field>
        </FormGrid>
      </div>
    );
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#f8fafc', overflowY:'auto' }}>
        {header}
        <div style={{ padding:'24px 28px' }}>
          <InfoBanner>
            Keep your health records up to date. Your center director can view this information to verify compliance.
            All information is confidential and used only for licensing compliance purposes.
          </InfoBanner>

          <SectionCard
            title="Physical Exam & TB Screening"
            subtitle="Texas requires a physical exam on file at time of hire"
            footer={<SubmitFooter
              onClear={()=>setHealth(p=>({...p,physicalDone:'',physicalDate:'',physician:'',physicalSubmitted:'',tbDone:'',tbDate:'',tbResult:''}))}
              onSubmit={()=>{ setHealthSubmitted(true); onStaffUpdate && onStaffUpdate('Health & Immunizations', { health }); }}
              submitted={healthSubmitted}
            />}
          >
            <FormGrid>
              <Field label="Physical exam completed">
                <YesNoGroup value={health.physicalDone} onChange={v=>setHealth(p=>({...p,physicalDone:v}))} opts={['Yes','No']}/>
              </Field>
              <Field label="Physical exam date">
                <input type="date" value={health.physicalDate} onChange={e=>setHealth(p=>({...p,physicalDate:e.target.value}))} style={inputStyle}/>
              </Field>
              <Field label="Examining physician / clinic">
                <input placeholder="e.g. Dr. Priya Sharma, CareNow" value={health.physician} onChange={e=>setHealth(p=>({...p,physician:e.target.value}))} style={inputStyle}/>
              </Field>
              <Field label="Physical exam record submitted to director">
                <YesNoGroup value={health.physicalSubmitted} onChange={v=>setHealth(p=>({...p,physicalSubmitted:v}))} opts={['Yes','No']}/>
              </Field>
            </FormGrid>

            <Divider label="Physical exam document" />
            <FormGrid cols={1}>
              <FileUpload
                fieldKey="physical_exam_doc"
                label="Upload physical exam form"
                hint="Upload the physician-signed physical exam form. Required at hire and on file for inspection."
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </FormGrid>

            <Divider label="TB screening" />
            <FormGrid>
              <Field label="TB screening completed">
                <YesNoGroup value={health.tbDone} onChange={v=>setHealth(p=>({...p,tbDone:v}))} opts={['Yes','No']}/>
              </Field>
              <Field label="TB screening date">
                <input type="date" value={health.tbDate} onChange={e=>setHealth(p=>({...p,tbDate:e.target.value}))} style={inputStyle}/>
              </Field>
              <Field label="TB screening result" hint="TX: Required at hire (initial only)">
                <select value={health.tbResult} onChange={e=>setHealth(p=>({...p,tbResult:e.target.value}))} style={selectStyle}>
                  <option>Negative</option>
                  <option>Positive — medically managed</option>
                  <option>Risk assessment only</option>
                  <option>Pending</option>
                </select>
              </Field>
            </FormGrid>
            <div style={{ marginTop:12 }}>
              <FormGrid cols={1}>
                <FileUpload
                  fieldKey="tb_result_doc"
                  label="Upload TB screening result"
                  hint="Upload the TB test result documentation from your healthcare provider."
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </FormGrid>
            </div>
          </SectionCard>

          <SectionCard title="My Immunization Records" subtitle="Recommended for all childcare staff per CDC and CFOC national standards"
            footer={<SubmitFooter onClear={()=>{}} onSubmit={()=>{ onStaffUpdate && onStaffUpdate('Health & Immunizations', { health }); }} submitted={false}/>}>
            {/* ── Summary pill row ── */}
            {(() => {
              const statusKeys = ['hepBStatus','mmrStatus','varicellaStatus','tdapStatus','fluStatus','tb2Status'];
              const upToDate   = statusKeys.filter(k => health[k] === 'Up to date' || health[k] === 'Negative').length;
              const incomplete = statusKeys.filter(k => health[k] === 'Incomplete' || health[k] === 'Positive' || health[k] === 'Pending' || health[k] === 'Not yet').length;
              const declined   = statusKeys.filter(k => health[k] === 'Declined').length;
              const empty      = statusKeys.filter(k => !health[k]).length;
              return (
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20, padding:'12px 16px', background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0' }}>
                  {upToDate > 0 && (
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600, color:'#2d7a4f', background:'#eef7f2', border:'1px solid #a7d4ba' }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:'#2d7a4f' }}/>
                      {upToDate} Up to date
                    </span>
                  )}
                  {incomplete > 0 && (
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600, color:'#b45309', background:'#fdf4e7', border:'1px solid #e6b87a' }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:'#b45309' }}/>
                      {incomplete} Incomplete
                    </span>
                  )}
                  {declined > 0 && (
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600, color:'#64748b', background:'#f1f5f9', border:'1px solid #cbd5e1' }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:'#94a3b8' }}/>
                      {declined} Declined
                    </span>
                  )}
                  {empty > 0 && (
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600, color:'#94a3b8', background:'#f8fafc', border:'1px solid #e2e8f0' }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:'#cbd5e1' }}/>
                      {empty} Not recorded
                    </span>
                  )}
                  <span style={{ fontSize:11.5, color:'#94a3b8', alignSelf:'center', marginLeft:'auto' }}>6 vaccines tracked</span>
                </div>
              );
            })()}
            <ImmRow vaccine="Hepatitis B" sub="3-dose series — recommended for all childcare workers" dateKey="hepB" statusKey="hepBStatus"/>
            <ImmRow vaccine="MMR" sub="Measles, mumps, rubella — 2 doses or documented immunity" dateKey="mmr" statusKey="mmrStatus"/>
            <ImmRow vaccine="Varicella (chickenpox)" sub="2 doses or documented immunity" dateKey="varicella" statusKey="varicellaStatus"/>
            <ImmRow vaccine="Tdap" sub="Tetanus, diphtheria, pertussis booster — especially important in infant rooms" dateKey="tdap" statusKey="tdapStatus"/>
            <ImmRow vaccine="Influenza (flu)" sub="Annual vaccination — strongly recommended for all childcare staff" dateKey="flu" statusKey="fluStatus" opts={['Up to date','Not yet','Declined']}/>
            <ImmRow vaccine="TB test / PPD" sub="Annual tuberculosis screening — recommended for childcare workers" dateKey="tb2" statusKey="tb2Status" opts={['Negative','Positive','Pending']}/>
          </SectionCard>

          <SectionCard title="Allergies & Emergency Information" subtitle="Confidential — used only for workplace safety and emergency purposes"
            footer={<SubmitFooter onClear={()=>{}} onSubmit={()=>{ onStaffUpdate && onStaffUpdate('Health & Immunizations', { health }); }} submitted={false}/>}>
            <FormGrid>
              <Field label="Do you have any food or environmental allergies?">
                <YesNoGroup value={health.allergies} onChange={v=>setHealth(p=>({...p,allergies:v}))} opts={['Yes','No']}/>
              </Field>
              <Field label="Do you carry an EpiPen or emergency medication?">
                <YesNoGroup value={health.epipen} onChange={v=>setHealth(p=>({...p,epipen:v}))} opts={['Yes','No']}/>
              </Field>
              <Field label="Emergency contact — name">
                <input value={health.emergName} onChange={e=>setHealth(p=>({...p,emergName:e.target.value}))} style={inputStyle}/>
              </Field>
              <Field label="Emergency contact — phone">
                <input value={health.emergPhone} onChange={e=>setHealth(p=>({...p,emergPhone:e.target.value}))} style={inputStyle}/>
              </Field>
              <Field label="Emergency contact — relationship">
                <input value={health.emergRel} onChange={e=>setHealth(p=>({...p,emergRel:e.target.value}))} style={inputStyle}/>
              </Field>
              <div/>
              <Field label="Any medical conditions relevant to your childcare duties (optional)" span={2}>
                <textarea placeholder="e.g. Any conditions your director should be aware of for emergency purposes..." value={health.conditions} onChange={e=>setHealth(p=>({...p,conditions:e.target.value}))} rows={3} style={{ ...inputStyle, resize:'vertical' }}/>
              </Field>
            </FormGrid>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:8 }}>This information is confidential and only visible to your center director.</div>
          </SectionCard>
        </div>
      </div>
    );
  }

  /* ══ PROFILE & CREDENTIALS tab ═══════════════════════════════════════════ */
  if (activeTab === 'profile') return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#f8fafc', overflowY:'auto' }}>
      {header}
      <div style={{ padding:'24px 28px' }}>
        <InfoBanner>
          Keep your education credentials, professional registries, and certifications current.
          Upload documents directly — your director will see them when you submit an update.
        </InfoBanner>

        {/* Education & Credentials */}
        <SectionCard title="Education & Qualifications"
          footer={<SubmitFooter
            onClear={()=>setProfile(p=>({...p,education:'',institution:'',gradYear:'',degreeOnFile:'',cdaNum:'',cdaExpiry:''}))}
            onSubmit={()=>{ setProfileSubmitted(true); onStaffUpdate && onStaffUpdate('Profile & Credentials', { profile }); }}
            submitted={profileSubmitted}/>}>
          <FormGrid>
            <Field label="Highest education level">
              <select value={profile.education} onChange={e=>setProfile(p=>({...p,education:e.target.value}))} style={selectStyle}>
                <option>Bachelor's degree in ECE</option>
                <option>Bachelor's degree (other field)</option>
                <option>Associate's degree in ECE</option>
                <option>Associate's degree (other field)</option>
                <option>CDA Credential</option>
                <option>High School Diploma / GED</option>
                <option>Some college — no degree</option>
              </select>
            </Field>
            <Field label="Institution / school name">
              <input value={profile.institution} onChange={e=>setProfile(p=>({...p,institution:e.target.value}))} style={inputStyle}/>
            </Field>
            <Field label="Year of graduation / completion">
              <input value={profile.gradYear} onChange={e=>setProfile(p=>({...p,gradYear:e.target.value}))} style={inputStyle}/>
            </Field>
            <Field label="Degree / credential on file with director">
              <YesNoGroup value={profile.degreeOnFile} onChange={v=>setProfile(p=>({...p,degreeOnFile:v}))} opts={['Yes','No']}/>
            </Field>
            <Field label="CDA credential number (if applicable)">
              <input placeholder="CDA credential number" value={profile.cdaNum} onChange={e=>setProfile(p=>({...p,cdaNum:e.target.value}))} style={inputStyle}/>
            </Field>
            <Field label="CDA expiry date (if applicable)">
              <input type="date" value={profile.cdaExpiry} onChange={e=>setProfile(p=>({...p,cdaExpiry:e.target.value}))} style={inputStyle}/>
            </Field>
          </FormGrid>
          <Divider label="Degree or credential document" />
          <FormGrid cols={2}>
            <FileUpload
              fieldKey="degree_transcript"
              label="Upload degree / transcript"
              hint="Upload your degree certificate, official transcript, or diploma."
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <FileUpload
              fieldKey="cda_cert"
              label="Upload CDA certificate (if applicable)"
              hint="Upload your current CDA credential certificate."
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </FormGrid>
        </SectionCard>

        {/* Professional Registry */}
        <SectionCard title="Professional Registry" subtitle="Texas maintains the TX Workforce Registry for childcare professionals"
          footer={<SubmitFooter
            onClear={()=>setProfile(p=>({...p,registryEnrolled:'',registryId:'',registryDate:'',careerLevel:''}))}
            onSubmit={()=>{ onStaffUpdate && onStaffUpdate('Profile & Credentials', { profile }); }}
            submitted={false}/>}>
          <div style={{ fontSize:12.5, color:'#64748b', marginBottom:14 }}>Registry information is shared with your center director</div>
          <FormGrid>
            <Field label="Enrolled in TX Workforce Registry">
              <YesNoGroup value={profile.registryEnrolled} onChange={v=>setProfile(p=>({...p,registryEnrolled:v}))} opts={['Yes','No','In progress']}/>
            </Field>
            <Field label="Registry ID / username">
              <input placeholder="TX Workforce Registry ID" value={profile.registryId} onChange={e=>setProfile(p=>({...p,registryId:e.target.value}))} style={inputStyle}/>
            </Field>
            <Field label="Registry enrollment date">
              <input type="date" value={profile.registryDate} onChange={e=>setProfile(p=>({...p,registryDate:e.target.value}))} style={inputStyle}/>
            </Field>
            <Field label="Career ladder / credential level in registry">
              <select value={profile.careerLevel} onChange={e=>setProfile(p=>({...p,careerLevel:e.target.value}))} style={selectStyle}>
                <option value="">Select...</option>
                <option>Level I — Entry</option>
                <option>Level II</option>
                <option>Level III</option>
                <option>Level IV</option>
                <option>Level V — Director/Administrator</option>
              </select>
            </Field>
          </FormGrid>
        </SectionCard>

        {/* Mandated Reporter */}
        <SectionCard title="Mandated Reporter Training"
          footer={<SubmitFooter
            onClear={()=>setProfile(p=>({...p,mandatedDone:'',mandatedDate:'',mandatedProvider:'',mandatedCertNum:'',mandatedSubmitted:''}))}
            onSubmit={()=>{ onStaffUpdate && onStaffUpdate('Profile & Credentials', { profile }); }}
            submitted={false}/>}>
          <FormGrid>
            <Field label="Mandated reporter training completed">
              <YesNoGroup value={profile.mandatedDone} onChange={v=>setProfile(p=>({...p,mandatedDone:v}))} opts={['Yes','No']}/>
            </Field>
            <Field label="Training completion date">
              <input type="date" value={profile.mandatedDate} onChange={e=>setProfile(p=>({...p,mandatedDate:e.target.value}))} style={inputStyle}/>
            </Field>
            <Field label="Training provider">
              <input placeholder="TX HHS Online Portal" value={profile.mandatedProvider} onChange={e=>setProfile(p=>({...p,mandatedProvider:e.target.value}))} style={inputStyle}/>
            </Field>
            <Field label="Certificate number">
              <input placeholder="Completion certificate number" value={profile.mandatedCertNum} onChange={e=>setProfile(p=>({...p,mandatedCertNum:e.target.value}))} style={inputStyle}/>
            </Field>
            <Field label="Certificate submitted to director">
              <YesNoGroup value={profile.mandatedSubmitted} onChange={v=>setProfile(p=>({...p,mandatedSubmitted:v}))} opts={['Yes','No']}/>
            </Field>
          </FormGrid>
          <Divider label="Mandated reporter certificate" />
          <FormGrid cols={1}>
            <FileUpload
              fieldKey="mandated_reporter_cert"
              label="Upload mandated reporter training certificate"
              hint="Upload your completion certificate from TX HHS or approved provider."
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </FormGrid>
          <div style={{ marginTop:12, fontSize:12.5, color:'#00a99d' }}>TX: One-time training required (no renewal)</div>
        </SectionCard>

        {/* New Hire Orientation */}
        <SectionCard title="New Hire Orientation"
          subtitle="Required before working independently with children"
          footer={<SubmitFooter
            onClear={()=>setProfile(p=>({...p,orientationComplete:'',orientationDate:'',orientationHours:'',orientationFormat:'',emergPrepTraining:'',safeSleepTraining:'',standardPrecautions:''}))}
            onSubmit={()=>{ onStaffUpdate && onStaffUpdate('Profile & Credentials', { profile }); }}
            submitted={false}/>}>
          <FormGrid>
            <Field label="Orientation completed">
              <YesNoGroup value={profile.orientationComplete} onChange={v=>setProfile(p=>({...p,orientationComplete:v}))} opts={['Yes','No','In progress']}/>
            </Field>
            <Field label="Orientation completion date">
              <input type="date" value={profile.orientationDate} onChange={e=>setProfile(p=>({...p,orientationDate:e.target.value}))} style={inputStyle}/>
            </Field>
            <Field label="Orientation hours completed" hint="TX: 8 hrs · UT: 20 hrs · TN/FL: 40 hrs">
              <input type="number" min="0" step="0.5" placeholder="e.g. 8" value={profile.orientationHours} onChange={e=>setProfile(p=>({...p,orientationHours:e.target.value}))} style={inputStyle}/>
            </Field>
            <Field label="Delivery format">
              <select value={profile.orientationFormat} onChange={e=>setProfile(p=>({...p,orientationFormat:e.target.value}))} style={selectStyle}>
                <option value="">Select...</option>
                <option>In-person</option>
                <option>Online</option>
                <option>Blended</option>
              </select>
            </Field>
          </FormGrid>
          <div style={{ fontSize:13, fontWeight:600, color:'#374151', margin:'16px 0 10px' }}>Required orientation modules</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[
              { label:'Emergency preparedness training', key:'emergPrepTraining', hint:'Required before working with children (CO and others)' },
              { label:'Safe sleep training', key:'safeSleepTraining', hint:'Required for all infant room staff' },
              { label:'Standard precautions (bloodborne pathogens)', key:'standardPrecautions', hint:'Annual requirement in CO' },
            ].map(item => (
              <div key={item.key} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <label style={{ fontSize:12.5, fontWeight:600, color:'#374151' }}>{item.label}</label>
                {item.hint && <span style={{ fontSize:11.5, color:'#94a3b8' }}>{item.hint}</span>}
                <YesNoGroup value={profile[item.key]} onChange={v=>setProfile(p=>({...p,[item.key]:v}))} opts={['Yes','No','N/A']}/>
              </div>
            ))}
          </div>
          <Divider label="Orientation completion record" />
          <FormGrid cols={1}>
            <FileUpload
              fieldKey="orientation_record"
              label="Upload orientation sign-in sheet or completion record"
              hint="Upload the signed orientation completion form or attendance log."
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </FormGrid>
        </SectionCard>

        {/* Professional Memberships */}
        <SectionCard title="Professional Memberships & Additional Certifications"
          footer={<SubmitFooter
            onClear={()=>setProfile(p=>({...p,naeyc:'',additionalCerts:'',notes:''}))}
            onSubmit={()=>{ onStaffUpdate && onStaffUpdate('Profile & Credentials', { profile }); }}
            submitted={false}/>}>
          <FormGrid>
            <Field label="NAEYC membership">
              <YesNoGroup value={profile.naeyc} onChange={v=>setProfile(p=>({...p,naeyc:v}))} opts={['Yes','No']}/>
            </Field>
            <Field label="Any additional ECE certifications">
              <input placeholder="e.g. Infant Mental Health, Pyramid Model" value={profile.additionalCerts} onChange={e=>setProfile(p=>({...p,additionalCerts:e.target.value}))} style={inputStyle}/>
            </Field>
            <Field label="Other professional development notes" span={2}>
              <textarea placeholder="Any other qualifications, awards, or professional development relevant to your role..." value={profile.notes} onChange={e=>setProfile(p=>({...p,notes:e.target.value}))} rows={3} style={{ ...inputStyle, resize:'vertical' }}/>
            </Field>
          </FormGrid>
        </SectionCard>

      </div>
    </div>
  );

  return null;
}

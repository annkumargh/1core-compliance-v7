import React, { useState } from 'react';

// 1Core teal icon — SVG recreation of the power-button logo mark
const IconLogo = ({ size = 52 }) => (
  <svg width={size} height={size} viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="52" height="52" rx="14" fill="#04b8b5"/>
    {/* Power arc — open circle at top */}
    <path d="M17 20 A12 12 0 1 0 35 20" stroke="white" strokeWidth="3.2" strokeLinecap="round" fill="none"/>
    {/* Vertical line through center */}
    <line x1="26" y1="13" x2="26" y2="27" stroke="white" strokeWidth="3.2" strokeLinecap="round"/>
  </svg>
);


const ROLES = [
  { id:'staff',      icon:'user',    label:'Staff Member',    email:'sarah.mitchell@lionheart.org', desc:'View your personal certifications and training status' },
  { id:'director',   icon:'dir',     label:'Center Director', email:'director@lionheartca.org',     desc:'Manage compliance for your assigned center' },
  { id:'owner',      icon:'home',    label:'Business Owner',  email:'owner@lionheartca.org',        desc:'Network-wide overview across all centers' },
  { id:'superadmin', icon:'globe',   label:'Super Admin',     email:'admin@1coresolution.com',      desc:'Full platform access — all companies and centers' },
  { id:'inspector',  icon:'eye',     label:'Inspector',       email:'inspector@state.tx.gov',       desc:'Read-only 8-hour session for compliance inspection' },
];

function RoleIcon({ type, active }) {
  const color = active ? '#00d4c8' : '#64748b';
  const s = { width:24, height:24 };
  const p = { fill:'none', stroke:color, strokeWidth:1.8, strokeLinecap:'round', strokeLinejoin:'round' };
  const icons = {
    user:  <svg {...s} viewBox="0 0 24 24" {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    dir:   <svg {...s} viewBox="0 0 24 24" {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
    home:  <svg {...s} viewBox="0 0 24 24" {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    globe: <svg {...s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    eye:   <svg {...s} viewBox="0 0 24 24" {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  };
  return icons[type] || null;
}

export default function LoginScreen({ onLogin }) {
  const [role, setRole] = useState('director');
  const selected = ROLES.find(r => r.id === role);

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0a1628 0%,#0d2040 55%,#0a2535 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ background:'rgba(255,255,255,0.06)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'36px', width:'100%', maxWidth:500, boxShadow:'0 32px 80px rgba(0,0,0,0.5)' }}>

        {/* Logo */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:28 }}>
          <IconLogo size={64}/>
          <div style={{ marginTop:12, textAlign:'center' }}>
            <div style={{ fontSize:20, fontWeight:800, color:'#fff', letterSpacing:'0.08em', lineHeight:1 }}>
              1CORE <span style={{ color:'#04b8b5' }}>SOLUTION</span>
            </div>
            <div style={{ fontSize:10.5, color:'rgba(255,255,255,0.3)', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:4, fontWeight:600 }}>
              Compliance Module
            </div>
          </div>
        </div>

        <p style={{ fontSize:13, color:'#64748b', margin:'0 0 24px' }}>Lionheart Children's Academy — sign in to continue</p>

        {/* Email */}
        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:7 }}>Email Address</label>
          <input type="email" value={selected.email} readOnly style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, fontSize:13, color:'#e2e8f0', outline:'none', boxSizing:'border-box' }}/>
        </div>

        {/* Password */}
        <div style={{ marginBottom:22 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:7 }}>Password</label>
          <input type="password" defaultValue="password" style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, fontSize:13, color:'#e2e8f0', outline:'none', boxSizing:'border-box' }}/>
        </div>

        {/* Role selector */}
        <div style={{ marginBottom:22 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>I am signing in as</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:8 }}>
            {ROLES.slice(0,3).map(r => {
              const active = role === r.id;
              return (
                <button key={r.id} onClick={() => setRole(r.id)} style={{ padding:'12px 8px', borderRadius:10, cursor:'pointer', textAlign:'center', border:`1.5px solid ${active?'#00a99d':'rgba(255,255,255,0.1)'}`, background:active?'rgba(0,169,157,0.15)':'rgba(255,255,255,0.04)', color:active?'#00d4c8':'#64748b', transition:'all 0.15s', fontFamily:'inherit' }}>
                  <div style={{ display:'flex', justifyContent:'center', marginBottom:6 }}><RoleIcon type={r.icon} active={active}/></div>
                  <div style={{ fontSize:11, fontWeight:600, lineHeight:1.3 }}>{r.label}</div>
                </button>
              );
            })}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {ROLES.slice(3).map(r => {
              const active = role === r.id;
              return (
                <button key={r.id} onClick={() => setRole(r.id)} style={{ padding:'10px 8px', borderRadius:10, cursor:'pointer', textAlign:'center', border:`1.5px solid ${active?'#7c3aed':'rgba(255,255,255,0.08)'}`, background:active?'rgba(124,58,237,0.12)':'rgba(255,255,255,0.02)', color:active?'#a78bfa':'#4a5568', transition:'all 0.15s', fontFamily:'inherit', display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
                  <RoleIcon type={r.icon} active={active}/>
                  <div style={{ fontSize:11, fontWeight:600 }}>{r.label}</div>
                </button>
              );
            })}
          </div>
          {/* Description */}
          <div style={{ marginTop:10, padding:'8px 14px', background:'rgba(0,169,157,0.08)', border:'1px solid rgba(0,169,157,0.18)', borderRadius:8 }}>
            <p style={{ fontSize:12, color:'#94a3b8', margin:0 }}>{selected.desc}</p>
          </div>
        </div>

        <button onClick={() => onLogin(role)} style={{ width:'100%', padding:13, background:'#00a99d', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.02em', transition:'background 0.15s' }}
          onMouseEnter={e=>e.target.style.background='#00d4c8'} onMouseLeave={e=>e.target.style.background='#00a99d'}>
          Sign In to Compliance Dashboard
        </button>
        <p style={{ textAlign:'center', fontSize:12, color:'#94a3b8', marginTop:18 }}>support@1coresolution.com | 1-833-33-1CORE</p>
      </div>
    </div>
  );
}

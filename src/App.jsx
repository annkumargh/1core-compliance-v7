import React, { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';
import { CENTERS } from './centers';
import { calcCompliance, scoreColor, scoreLabel, buildAlerts } from './compliance';
import { getReg, getRegForUI } from './regulations';
import { LIONHEART_SEED } from './lionheartSeed';

import LoginScreen        from './components/LoginScreen';
import BusinessOwnerView  from './components/BusinessOwnerView';
import CenterDirectorView from './components/CenterDirectorView';
import StaffView          from './components/StaffView';
import SuperAdminView     from './components/SuperAdminView';
import InspectorView      from './components/InspectorView';
import HelpTab            from './components/tabs/HelpTab';

// ── Notifications Panel ───────────────────────────────────────────────────────
const NOTIF_DISMISS_KEY = '1core_compliance_v6_notifications';

function loadDismissed() {
  try { return JSON.parse(localStorage.getItem(NOTIF_DISMISS_KEY) || '[]'); } catch { return []; }
}
function saveDismissed(ids) {
  try { localStorage.setItem(NOTIF_DISMISS_KEY, JSON.stringify(ids)); } catch {}
}

function buildNotifications(liveData, center) {
  const data  = liveData?.data || {};
  const today = new Date();
  const daysUntil = (d) => d ? Math.round((new Date(d) - today) / 86400000) : null;
  const notifs = [];

  const checks = [
    { key:'licenseExpiry',      label:'Operating license',          domain:'D1', critical:true  },
    { key:'glExpiry',           label:'GL insurance',               domain:'D1', critical:true  },
    { key:'workersCompExpiry',  label:"Workers' comp insurance",    domain:'D1', critical:true  },
    { key:'qrisRenewalDate',    label:'QRIS rating renewal',        domain:'D1', critical:false },
    { key:'cprExpiry',          label:'CPR certification',          domain:'D5', critical:true  },
    { key:'directorCredExpiry', label:'Director credential',        domain:'D3', critical:false },
    { key:'licenseRenewalDate', label:'License renewal',            domain:'D1', critical:false },
  ];

  for (const { key, label, domain, critical } of checks) {
    const val = data[key];
    if (!val) continue;
    const d = daysUntil(val);
    if (d === null) continue;
    const fmtDate = new Date(val).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    if (d < 0) {
      notifs.push({ id:`${key}_expired`, tier:'expired', label, domain, critical,
        message:`Expired ${Math.abs(d)} day${Math.abs(d)!==1?'s':''} ago (${fmtDate})`, days:d });
    } else if (d <= 30) {
      notifs.push({ id:`${key}_soon`, tier:'soon', label, domain, critical,
        message:`Expires in ${d} day${d!==1?'s':''} — ${fmtDate}`, days:d });
    } else if (d <= 90) {
      notifs.push({ id:`${key}_upcoming`, tier:'upcoming', label, domain, critical,
        message:`Expires in ${d} days — ${fmtDate}`, days:d });
    }
  }

  // Drill overdue checks
  const drillChecks = [
    { key:'lastFireDrillDate',    label:'Fire drill',     freqDays:35,  domain:'D7' },
    { key:'lastTornadoDrillDate', label:'Tornado drill',  freqDays:180, domain:'D7' },
    { key:'lastLockdownDate',     label:'Lockdown drill', freqDays:180, domain:'D7' },
  ];
  for (const { key, label, freqDays, domain } of drillChecks) {
    const val = data[key];
    if (!val) continue;
    const daysSince = Math.round((today - new Date(val)) / 86400000);
    if (daysSince > freqDays) {
      notifs.push({ id:`${key}_overdue`, tier:'expired', label, domain, critical:false,
        message:`Last held ${daysSince} days ago — overdue`, days:-daysSince });
    }
  }

  return notifs.sort((a, b) => a.days - b.days);
}

function NotificationsPanel({ liveData, center }) {
  const [open, setOpen]           = useState(false);
  const [dismissed, setDismissed] = useState(() => loadDismissed());
  const panelRef                  = useRef();

  const notifs    = buildNotifications(liveData, center);
  const visible   = notifs.filter(n => !dismissed.includes(n.id));
  const expired   = visible.filter(n => n.tier === 'expired');
  const soon      = visible.filter(n => n.tier === 'soon');
  const upcoming  = visible.filter(n => n.tier === 'upcoming');
  const totalBadge = expired.length + soon.length;

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    saveDismissed(next);
  };
  const dismissAll = () => {
    const next = [...dismissed, ...visible.map(n => n.id)];
    setDismissed(next);
    saveDismissed(next);
    setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const TIER_CFG = {
    expired:  { color:'#b91c1c', bg:'#fdf1f1', bd:'#e8a0a0', label:'Expired / Overdue', dot:'#b91c1c' },
    soon:     { color:'#b45309', bg:'#fdf4e7', bd:'#e6b87a', label:'Due within 30 days', dot:'#b45309' },
    upcoming: { color:'#1e5c8a', bg:'#eef4fc', bd:'#a8c4e0', label:'Upcoming (31–90 days)', dot:'#3b82f6' },
  };

  return (
    <div style={{ position:'relative' }} ref={panelRef}>
      {/* Bell button */}
      <button onClick={() => setOpen(o => !o)} style={{
        position:'relative', display:'flex', alignItems:'center', justifyContent:'center',
        width:36, height:36, borderRadius:8, border:'1px solid rgba(255,255,255,0.1)',
        background: open ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
        cursor:'pointer', color:'#94a3b8', transition:'all 0.15s',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {totalBadge > 0 && (
          <span style={{ position:'absolute', top:-4, right:-4, minWidth:16, height:16,
            borderRadius:8, background:'#b91c1c', color:'#fff', fontSize:10, fontWeight:700,
            display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px',
            border:'2px solid #0d1f35' }}>
            {totalBadge}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="notif-panel-mobile" style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:360,
          background:'#fff', border:'1px solid #e2e8f0', borderRadius:12,
          boxShadow:'0 8px 32px rgba(0,0,0,0.12)', zIndex:200, overflow:'hidden' }}>

          {/* Panel header */}
          <div style={{ padding:'14px 16px', borderBottom:'1px solid #f1f5f9',
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#0f172a' }}>Reminders</div>
              <div style={{ fontSize:12, color:'#94a3b8', marginTop:1 }}>
                {visible.length === 0 ? 'All clear' : `${visible.length} item${visible.length!==1?'s':''} need attention`}
              </div>
            </div>
            {visible.length > 0 && (
              <button onClick={dismissAll} style={{ fontSize:12, color:'#94a3b8',
                background:'none', border:'none', cursor:'pointer', padding:'4px 8px',
                borderRadius:6, fontFamily:'inherit' }}>
                Dismiss all
              </button>
            )}
          </div>

          <div style={{ maxHeight:380, overflowY:'auto' }}>
            {visible.length === 0 ? (
              <div style={{ padding:'32px 16px', textAlign:'center' }}>
                <div style={{ fontSize:24, marginBottom:8 }}>✓</div>
                <div style={{ fontSize:13, fontWeight:600, color:'#2d7a4f' }}>All expiry dates are current</div>
                <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>No upcoming renewals in the next 90 days</div>
              </div>
            ) : (
              [['expired', expired], ['soon', soon], ['upcoming', upcoming]].map(([tier, items]) => {
                if (items.length === 0) return null;
                const cfg = TIER_CFG[tier];
                return (
                  <div key={tier}>
                    <div style={{ padding:'8px 16px 4px', fontSize:11, fontWeight:700,
                      color:cfg.color, textTransform:'uppercase', letterSpacing:'0.05em',
                      background:cfg.bg, borderBottom:`1px solid ${cfg.bd}` }}>
                      {cfg.label}
                    </div>
                    {items.map(n => (
                      <div key={n.id} style={{ padding:'10px 16px', borderBottom:'1px solid #f8fafc',
                        display:'flex', alignItems:'flex-start', gap:10 }}>
                        <div style={{ width:6, height:6, borderRadius:'50%',
                          background:cfg.dot, flexShrink:0, marginTop:5 }}/>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:'#1e293b' }}>{n.label}</div>
                          <div style={{ fontSize:12, color:'#64748b', marginTop:1 }}>{n.message}</div>
                          <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{n.domain}</div>
                        </div>
                        <button onClick={() => dismiss(n.id)} style={{
                          padding:'2px 6px', borderRadius:5, border:'1px solid #e2e8f0',
                          background:'#f8fafc', color:'#94a3b8', fontSize:11,
                          cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const LS_KEY = '1core_compliance_v6';

// ── Empty data shape ─────────────────────────────────────────────────────────
const EMPTY = () => ({
  licensing:{}, physical:{}, personnel:{}, staffList:[],
  ratios:{ infant:{children:'',staff:''}, toddler:{children:'',staff:''},
           preschool:{children:'',staff:''}, schoolAge:{children:'',staff:''} },
  staffHealth:{}, staffCredentials:{}, children:{}, emergency:{},
  centerFacility:{}, centerLicensing:{}, familyEngagement:{},
  familyHealth:{}, familyImmunizations:{}, familyAllergies:{},
  notes:'', history:[], lastUpdated:null,
});

// ── Load / save ──────────────────────────────────────────────────────────────
function loadAll() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
  catch { return {}; }
}

// ── Seed Lionheart on first load ─────────────────────────────────────────────
function initStorage() {
  const stored = loadAll();
  let changed = false;
  Object.entries(LIONHEART_SEED).forEach(([cid, seed]) => {
    if (!stored[cid]) {
      // First time — seed the full entry
      stored[cid] = seed;
      changed = true;
    } else {
      // Re-stamp every seed key so updates always apply.
      // This overwrites compliance data fields too, which is intentional for
      // the prototype — production would only re-stamp _metadata keys.
      Object.keys(seed).forEach(k => {
        if (JSON.stringify(stored[cid][k]) !== JSON.stringify(seed[k])) {
          stored[cid][k] = seed[k];
          changed = true;
        }
      });
    }
  });
  if (changed) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(stored)); } catch {}
  }
  return stored;
}

// ── Unique companies list ────────────────────────────────────────────────────
const COMPANIES = [...new Map(CENTERS.map(c=>[c.companyId,{
  id: c.companyId, name: c.companyName,
  centers: CENTERS.filter(x=>x.companyId===c.companyId),
  states: [...new Set(CENTERS.filter(x=>x.companyId===c.companyId).map(x=>x.state))],
}])).values()].sort((a,b)=>a.name.localeCompare(b.name));

// ── All unique states across all 337 centers ─────────────────────────────────
const ALL_STATES = ['All states', ...[...new Set(CENTERS.map(c=>c.state))].sort()];

const ROLES = {
  staff:     { label:'Staff Member',    color:'#0891b2' },
  director:  { label:'Center Director', color:'#00a99d' },
  owner:     { label:'Business Owner',  color:'#2d7a4f' },
  superadmin:{ label:'Super Admin',     color:'#4f5fa8' },
  inspector: { label:'Inspector',       color:'#0891b2' },
};
const USERS = {
  staff:     { name:'Sarah Mitchell',  initials:'SM', sub:'Lead Teacher'   },
  director:  { name:'Marcus Lee',      initials:'ML', sub:'Center Director' },
  owner:     { name:'Michael Torres',  initials:'MT', sub:'Business Owner'  },
  superadmin:{ name:'Admin User',      initials:'AU', sub:'Super Admin'     },
  inspector: { name:'State Inspector', initials:'SI', sub:'Read-Only Access'},
};
const NAV = {
  staff:     [
    {id:'status',   label:'My Status',             icon:'user',    badge:1, group:'MY COMPLIANCE'},
    {id:'cpr',      label:'CPR & First Aid',        icon:'cpr',             group:''},
    {id:'training', label:'Training Log',           icon:'book',            group:''},
    {id:'health',   label:'Health & Immunizations', icon:'clipboard',       group:''},
    {id:'profile',  label:'Profile & Credentials',  icon:'shield',          group:''},
  ],
  director:  [
    {id:'overview',   label:'Overview',        icon:'chart',   group:'COMPLIANCE'},
    {id:'alerts',     label:'Alerts',          icon:'bell',    group:'', badge:4  },
    {id:'staterules', label:'State Rules',     icon:'map',     group:''           },
    {id:'dataentry',  label:'Data Entry',      icon:'edit',    group:''           },
    {id:'auditsim',   label:'Audit Simulation',icon:'shield',  group:''           },
    {id:'history',    label:'History',         icon:'history', group:''           },
    {id:'changelog',  label:'Change Log',      icon:'history', group:''           },
    {id:'help',       label:'Help & Glossary', icon:'help',    group:''           },
  ],
  // Owner-inside-center nav: same as director minus Audit Simulation (operational tool)
  ownerCenter: [
    {id:'overview',   label:'Overview',        icon:'chart',   group:'CENTER'},
    {id:'alerts',     label:'Alerts',          icon:'bell',    group:'', badge:4 },
    {id:'staterules', label:'State Rules',     icon:'map',     group:''          },
    {id:'dataentry',  label:'Data Entry',      icon:'edit',    group:''          },
    {id:'history',    label:'History',         icon:'history', group:''          },
    {id:'changelog',  label:'Change Log',      icon:'history', group:''          },
    {id:'help',       label:'Help & Glossary', icon:'help',    group:''          },
  ],
  owner:     [
    {id:'overview',label:'Network Overview',icon:'chart',group:'NETWORK'      },
    {id:'alerts',  label:'All Alerts',      icon:'bell', group:'', badge:true },
  ],
  superadmin:[
    {id:'overview',label:'Platform Overview',icon:'globe',   group:'PLATFORM'    },
    {id:'companies',label:'All Companies',   icon:'users',   group:''            },
    {id:'alerts',  label:'All Alerts',       icon:'bell',    group:'', badge:true},
    {id:'audit',   label:'Audit Log',        icon:'history', group:''            },
    {id:'help',    label:'Help & Glossary',  icon:'help',    group:''            },
  ],
  inspector: [
    {id:'overview',    label:'Center Overview',     icon:'eye',       group:'INSPECTION'},
    {id:'staterules',  label:'State Rules',         icon:'map',       group:''          },
    {id:'insphistory', label:'Inspection History',  icon:'history',   group:'RECORDS'   },
    {id:'opencap',     label:'Open Corrections',    icon:'clipboard', group:''          },
    {id:'documents',   label:'Documents',           icon:'folder',    group:''          },
    {id:'changelog',   label:'Change Log',          icon:'history',   group:''          },
    {id:'centerprofile',label:'Center Profile',     icon:'building',  group:''          },
  ],
};

function NavIcon({type,size=15}) {
  const s={width:size,height:size};
  const p={fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round'};
  const icons={
    user:     <svg {...s} viewBox="0 0 24 24" {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    cpr:      <svg {...s} viewBox="0 0 24 24" {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    book:     <svg {...s} viewBox="0 0 24 24" {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
    clipboard:<svg {...s} viewBox="0 0 24 24" {...p}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>,
    shield:   <svg {...s} viewBox="0 0 24 24" {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    chart:    <svg {...s} viewBox="0 0 24 24" {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><polyline points="2 20 22 20"/></svg>,
    bell:     <svg {...s} viewBox="0 0 24 24" {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    map:      <svg {...s} viewBox="0 0 24 24" {...p}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
    users:    <svg {...s} viewBox="0 0 24 24" {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    history:  <svg {...s} viewBox="0 0 24 24" {...p}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>,
    edit:     <svg {...s} viewBox="0 0 24 24" {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    ratios:   <svg {...s} viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    globe:    <svg {...s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    eye:      <svg {...s} viewBox="0 0 24 24" {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    home:     <svg {...s} viewBox="0 0 24 24" {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    help:     <svg {...s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    folder:   <svg {...s} viewBox="0 0 24 24" {...p}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
    building: <svg {...s} viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>,
  };
  return icons[type]||null;
}

export default function App() {
  const [role,          setRole]          = useState(null);
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [selectedId,    setSelectedId]    = useState(null);
  const [activeTab,     setActiveTab]     = useState('overview');
  const [search,        setSearch]        = useState('');
  const [stateFilter,   setStateFilter]   = useState('All states');
  // superadmin: null = platform overview, string = center id selected
  const [saMode,        setSaMode]        = useState('platform'); // 'platform' | 'center'
  const [allData,       setAllData]       = useState(() => initStorage());
  const [pendingStaffUpdates, setPendingStaffUpdates] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY + '_pending')) || []; } catch { return []; }
  });

  // Pick RCCO as default for director, first Lionheart center for others — but NOT for owner (lands on network)
  useEffect(() => {
    if (!selectedId && role && role !== 'owner') {
      const rcco = CENTERS.find(c => c.id === '1292_Lionheart_-_RCCO');
      const first = CENTERS.find(c => c.companyId === 1292);
      setSelectedId((rcco || first)?.id);
    }
  }, [role]);

  const persist = useCallback((centerId, updater) => {
    setAllData(prev => {
      const current = prev[centerId] || EMPTY();
      const updated  = updater(current);
      const next     = { ...prev, [centerId]: { ...updated, lastUpdated: new Date().toISOString() } };
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const updateData = useCallback((centerId, section, fields) => {
    persist(centerId, prev => ({
      ...prev,
      [section]: { ...(prev[section]||{}), ...fields },
    }));
  }, [persist]);

  const handleStaffUpdate = useCallback((tab, data) => {
    const now = new Date();
    const timestamp = now.toLocaleDateString('en-US', { month:'short', day:'numeric' }) + ' at ' + now.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
    const update = { tab, data, timestamp, status:'pending', id: Date.now() };
    setPendingStaffUpdates(prev => {
      const next = [update, ...prev];
      try { localStorage.setItem(LS_KEY + '_pending', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  if (!role) return <LoginScreen onLogin={r => { setRole(r); setActiveTab(r==='staff'?'status':'overview'); if(r==='owner') setSelectedId(null); }} />;

  const user     = USERS[role];
  const roleConf = ROLES[role];
  const navItems = NAV[role] || [];

  // Selected center data
  const selectedCenter = CENTERS.find(c=>c.id===selectedId) || CENTERS[0];
  const centerData     = allData[selectedId] || EMPTY();
  const seedData       = LIONHEART_SEED[selectedId] || {};
  const reg            = getRegForUI(selectedCenter.state);
  const scores         = calcCompliance(centerData, selectedCenter.state);
  const alerts         = buildAlerts(centerData, selectedCenter.state);

  const centerViewData = {
    id: selectedId,
    name: selectedCenter.centerName,
    address: selectedCenter.address || '',
    city: selectedCenter.city,
    state: selectedCenter.state,
    zip: selectedCenter.zip || '',
    score: scores.overall ?? (seedData._scores?.overall ?? null),
    scores: {
      overall:     scores.overall     ?? seedData._scores?.overall     ?? null,
      d1:          scores.d1          ?? seedData._scores?.d1          ?? seedData._scores?.licensing   ?? null,
      d2:          scores.d2          ?? seedData._scores?.d2          ?? seedData._scores?.center      ?? null,
      d3:          scores.d3          ?? seedData._scores?.d3          ?? seedData._scores?.credentials ?? null,
      d4:          scores.d4          ?? seedData._scores?.d4          ?? seedData._scores?.ratios      ?? null,
      d5:          scores.d5          ?? seedData._scores?.d5          ?? null,
      d6:          scores.d6          ?? seedData._scores?.d6          ?? seedData._scores?.family      ?? null,
      d7:          scores.d7          ?? seedData._scores?.d7          ?? null,
      // legacy keys kept for compat
      ratios:      scores.d4          ?? seedData._scores?.ratios      ?? null,
      credentials: scores.d3          ?? seedData._scores?.credentials ?? null,
      center:      scores.d2          ?? seedData._scores?.center      ?? null,
      family:      scores.d6          ?? seedData._scores?.family      ?? null,
      licensing:   scores.d1          ?? seedData._scores?.licensing   ?? null,
    },
    alerts:         alerts.length ? alerts : (seedData._alerts || []),
    ratios:         seedData._ratios || [],
    staff:          seedData._staff  || [],
    history:        seedData._history|| [],
    lastInspection: seedData._lastInspection || 'No data',
    inspResult:     seedData._inspResult || '—',
    inspDaysAgo:    seedData._inspDaysAgo || 0,
    agency:         seedData._agency || reg.agency || 'State Licensing Agency',
    agencyPhone:    seedData._agencyPhone || '',
  };

  // Role-based center filtering
  const roleCenters = role === 'superadmin'
    ? CENTERS
    : CENTERS.filter(c => c.companyId === 1292);

  const filteredCenters = roleCenters.filter(c => {
    const matchSearch = !search ||
      c.centerName.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase()) ||
      c.companyName?.toLowerCase().includes(search.toLowerCase());
    const matchState = stateFilter === 'All states' || c.state === stateFilter;
    return matchSearch && matchState;
  });

  // Network stats for owner view
  const lhCenters = CENTERS.filter(c=>c.companyId===1292);
  const lhWithScores = lhCenters.map(c=>{
    const d    = allData[c.id]||EMPTY();
    const seed = LIONHEART_SEED[c.id]||{};
    // Only use live calcCompliance if real data has been entered; otherwise use seed score
    const liveScore = (d.lastUpdated && Object.values(d.licensing||{}).some(v=>v!==''&&v!==null))
      ? calcCompliance(d, c.state).overall
      : null;
    const score = liveScore ?? seed._scores?.overall ?? null;
    return { ...c, score, address: seed._address || '', zip: seed._zip || '' };
  });

  const networkData = {
    company: "Lionheart Children's Academy",
    totalCenters: lhCenters.length,
    states: [...new Set(lhCenters.map(c=>c.state))],
    networkScore: Math.round(lhWithScores.filter(c=>c.score!==null).reduce((s,c)=>s+(c.score||0),0)/Math.max(1,lhWithScores.filter(c=>c.score!==null).length)),
    compliant:    lhWithScores.filter(c=>c.score>=80).length,
    atRisk:       lhWithScores.filter(c=>c.score>=60&&c.score<80).length,
    nonCompliant: lhWithScores.filter(c=>c.score<60).length,
    stateBreakdown: [...new Set(lhCenters.map(c=>c.state))].map(st=>{
      const stCenters = lhWithScores.filter(c=>c.state===st&&c.score!==null);
      return { state:{TX:'Texas',CO:'Colorado',OH:'Ohio',IN:'Indiana',TN:'Tennessee'}[st]||st, abbr:st,
               centers:lhCenters.filter(c=>c.state===st).length,
               score: stCenters.length ? Math.round(stCenters.reduce((s,c)=>s+c.score,0)/stCenters.length) : null };
    }),
    networkAlerts: [
      {type:'danger',  text:'CPR certifications expired — multiple staff', detail:'Across 4 centers — renewal required immediately'},
      {type:'danger',  text:'3 centers — Staff ratio violation',            detail:'CCH (OH), FLC (OH), OCMDO (TN)'},
      {type:'warning', text:'5 centers — Insurance expiring within 60 days',detail:'Review coverage immediately'},
      {type:'warning', text:'Training hours below minimum — 4 centers',     detail:'TX requires 12 hrs/yr · OH requires 20 hrs/yr'},
      {type:'info',    text:'Drill records unconfirmed — 6 centers',        detail:'TX requires monthly fire and tornado drills'},
    ],
    centers: lhWithScores.map(c=>({
      id:c.id, name:c.centerName, city:c.city, state:c.state, score:c.score,
      status: c.score>=80?'compliant':c.score>=60?'atrisk':'critical'
    })),
  };

  const criticalCount = alerts.filter(a=>a.type==='danger').length;

  // ── Superadmin center selection handler ──────────────────────────────────────
  const handleSASelectCenter = (centerId) => {
    setSelectedId(centerId);
    setSaMode('center');
    setActiveTab('overview');
  };

  const handleSAPlatformView = () => {
    setSaMode('platform');
    setActiveTab('overview');
  };

  // ── Sidebar: superadmin gets the full center list; director/owner keep existing ─
  const showCenterList = ['owner', 'superadmin'].includes(role);

  return (
    <div className={`app${sidebarOpen?'':' sidebar-closed'}`}>

      {/* ── HEADER ── */}
      <header className="header">
        <button className="header-hamburger" onClick={()=>setSidebarOpen(o=>!o)}>
          <span/><span/><span/>
        </button>
        <div className="header-brand">
          <svg width="32" height="32" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
            <rect width="52" height="52" rx="14" fill="#04b8b5"/>
            <path d="M17 20 A12 12 0 1 0 35 20" stroke="white" strokeWidth="3.2" strokeLinecap="round" fill="none"/>
            <line x1="26" y1="13" x2="26" y2="27" stroke="white" strokeWidth="3.2" strokeLinecap="round"/>
          </svg>
          <div className="header-wordmark">1CORE <span>SOLUTION</span></div>
          <div className="header-divider"/>
          <div className="header-title">Compliance Module v6</div>
        </div>
        <div className="header-right">
          {role!=='staff'&&role!=='inspector'&&criticalCount>0&&
            <span className="header-alerts-badge">{criticalCount} critical</span>}
          {(role==='director'||role==='owner') && (
            <NotificationsPanel liveData={centerData} center={selectedCenter} />
          )}
          <span className="header-role-badge" style={{background:`${roleConf.color}22`,color:roleConf.color,borderColor:`${roleConf.color}44`}}>
            {roleConf.label}
          </span>
          <button className="header-switch-btn" onClick={()=>setRole(null)}>Switch Role</button>
          <div className="avatar" title={user.name}>{user.initials}</div>
        </div>
      </header>

      {/* ── MOBILE OVERLAY (closes sidebar on tap outside) ── */}
      <div className="sidebar-overlay" onClick={()=>setSidebarOpen(false)} />

      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-user">
          <div className="avatar">{user.initials}</div>
          <div style={{minWidth:0}}>
            <div className="sidebar-user-name">{user.name}</div>
            <div className="sidebar-user-role">{user.sub}</div>
          </div>
        </div>

        {/* Superadmin: Platform Overview button at top */}
        {role === 'superadmin' && (
          <div style={{padding:'10px 14px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            <button
              onClick={handleSAPlatformView}
              style={{
                display:'flex',alignItems:'center',gap:9,width:'100%',
                padding:'9px 12px',borderRadius:8,border:'none',cursor:'pointer',
                background: saMode==='platform' ? 'rgba(79,95,168,0.18)' : 'rgba(255,255,255,0.05)',
                color: saMode==='platform' ? '#8b9fd4' : '#94a3b8',
                fontSize:13,fontWeight:saMode==='platform'?700:500,
                fontFamily:'inherit',
                borderLeft: saMode==='platform' ? '3px solid #4f5fa8' : '3px solid transparent',
              }}
            >
              <span style={{color:saMode==='platform'?'#8b9fd4':'#64748b',display:'flex'}}>
                <NavIcon type="globe" size={14}/>
              </span>
              Platform Overview
            </button>
          </div>
        )}

        {/* Non-superadmin: Center name + Company label */}
        {role !== 'superadmin' && (
          <>
            {role === 'director' && selectedCenter.centerName && (
              <>
                <div style={{padding:'10px 14px 4px',fontSize:10,fontWeight:700,color:'#4a5568',letterSpacing:'0.08em'}}>CENTER</div>
                <div style={{padding:'2px 14px 8px',fontSize:13,fontWeight:600,color:'#e2e8f0',borderBottom:'none'}}>
                  {selectedCenter.centerName}
                </div>
              </>
            )}
            <div style={{padding: role==='director' ? '4px 14px 4px' : '10px 14px 4px',fontSize:10,fontWeight:700,color:'#4a5568',letterSpacing:'0.08em'}}>COMPANY</div>
            <div style={{padding:'2px 14px 12px',fontSize:13,fontWeight:600,color:'#94a3b8',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
              {role==='owner' ? "Lionheart Children's Academy" : selectedCenter.companyName}
            </div>
          </>
        )}

        {/* Search — show for director, owner, superadmin */}
        {showCenterList && (
          <div className="sidebar-search">
            <input
              placeholder={role==='superadmin' ? 'Search centers, cities...' : 'Search centers...'}
              value={search}
              onChange={e=>setSearch(e.target.value)}
            />
          </div>
        )}

        {/* State filter — superadmin only */}
        {role === 'superadmin' && (
          <div style={{padding:'0 14px 10px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            <select
              value={stateFilter}
              onChange={e=>setStateFilter(e.target.value)}
              style={{
                width:'100%',padding:'7px 10px',
                background:'rgba(255,255,255,0.06)',
                border:'1px solid rgba(255,255,255,0.1)',
                borderRadius:8,fontSize:12,color:'#e2e8f0',
                outline:'none',
              }}
            >
              {ALL_STATES.map(st=>(
                <option key={st} value={st} style={{background:'#0d1f35',color:'#e2e8f0'}}>
                  {st === 'All states' ? `All states (${roleCenters.length})` : `${st} (${roleCenters.filter(c=>c.state===st).length})`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Nav items — only for non-superadmin roles (superadmin nav lives in SuperAdminView) */}
        {role !== 'superadmin' && (
          <div style={{padding:'8px 0'}}>
            {/* Always show the role's own nav items */}
            {navItems.map((item,i)=>{
              const prevGroup = i>0?navItems[i-1].group:'__none__';
              const showGroup = item.group && item.group!==prevGroup;
              return (
                <div key={item.id}>
                  {showGroup&&<div style={{padding:'12px 14px 4px',fontSize:10,fontWeight:700,color:'#4a5568',letterSpacing:'0.08em'}}>{item.group}</div>}
                  <div className={`center-item ${activeTab===item.id&&!selectedId?'active':''}`} onClick={()=>{ setActiveTab(item.id); if(role==='owner' && item.id==='overview') setSelectedId(null); }}
                    style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                    <span style={{color:activeTab===item.id&&!selectedId?'#00d4c8':'#64748b',display:'flex'}}>
                      <NavIcon type={item.icon}/>
                    </span>
                    <span style={{fontSize:13.5,color:activeTab===item.id&&!selectedId?'#e2e8f0':'#94a3b8',fontWeight:activeTab===item.id&&!selectedId?600:400,flex:1}}>
                      {item.label}
                    </span>
                    {item.badge&&criticalCount>0&&(
                      <span style={{background:'#b91c1c',color:'#fff',fontSize:10,fontWeight:700,minWidth:18,height:18,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px'}}>
                        {typeof item.badge==='number'?item.badge:criticalCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {/* Owner inside a center: show director-style nav below network nav */}
            {role==='owner' && selectedId && (
              <>
                <div style={{padding:'12px 14px 4px',fontSize:10,fontWeight:700,color:'#4a5568',letterSpacing:'0.08em',borderTop:'1px solid rgba(255,255,255,0.06)',marginTop:4}}>
                  CENTER
                </div>
                <div style={{padding:'2px 14px 10px',fontSize:13,fontWeight:600,color:'#94a3b8',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                  {centerViewData.name}
                </div>
                {NAV.ownerCenter.map((item,i)=>{
                  const prevGroup = i>0?NAV.ownerCenter[i-1].group:'__none__';
                  const showGroup = item.group && item.group!==prevGroup;
                  return (
                    <div key={item.id}>
                      {showGroup&&<div style={{padding:'8px 14px 4px',fontSize:10,fontWeight:700,color:'#4a5568',letterSpacing:'0.08em'}}>{item.group}</div>}
                      <div className={`center-item ${activeTab===item.id?'active':''}`} onClick={()=>setActiveTab(item.id)}
                        style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                        <span style={{color:activeTab===item.id?'#00d4c8':'#64748b',display:'flex'}}>
                          <NavIcon type={item.icon}/>
                        </span>
                        <span style={{fontSize:13.5,color:activeTab===item.id?'#e2e8f0':'#94a3b8',fontWeight:activeTab===item.id?600:400,flex:1}}>
                          {item.label}
                        </span>
                        {item.badge&&criticalCount>0&&(
                          <span style={{background:'#b91c1c',color:'#fff',fontSize:10,fontWeight:700,minWidth:18,height:18,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px'}}>
                            {criticalCount}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Center list */}
        {showCenterList && (
          <>
            <div style={{padding:'10px 14px 5px',fontSize:10,fontWeight:700,color:'#4a5568',letterSpacing:'0.08em',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
              {role==='superadmin'
                ? `ALL CENTERS (${filteredCenters.length}${filteredCenters.length<roleCenters.length?` of ${roleCenters.length}`:''})`
                : `LIONHEART CENTERS (${filteredCenters.length})`}
            </div>
            <div className="sidebar-list">
              {filteredCenters.map(c=>{
                const d = allData[c.id]||EMPTY();
                const sc = calcCompliance(d,c.state);
                const seed = LIONHEART_SEED[c.id]||{};
                const s = sc.overall??seed._scores?.overall??null;
                const isActive = selectedId===c.id && (role!=='superadmin' || saMode==='center');
                return (
                  <div key={c.id} className={`center-item ${isActive?'active':''}`}
                    onClick={()=>{
                      if (role==='superadmin') {
                        handleSASelectCenter(c.id);
                      } else {
                        setSelectedId(c.id);
                        setActiveTab('overview');
                      }
                    }}>
                    <div className="center-score-dot" style={{background:scoreColor(s),color:'#fff',fontSize:11}}>
                      {s!==null?`${s}%`:'—'}
                    </div>
                    <div style={{minWidth:0,flex:1}}>
                      <div className="center-item-name">{c.centerName}</div>
                      <div className="center-item-sub">
                        {c.city}, {c.state}
                        {role==='superadmin' && (
                          <span style={{color:'#4a5568'}}> · {c.companyName?.split(' ').slice(0,2).join(' ')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredCenters.length === 0 && (
                <div style={{padding:'20px 14px',fontSize:12,color:'#4a5568',textAlign:'center'}}>
                  No centers match your filters
                </div>
              )}
            </div>
          </>
        )}

        <div style={{marginTop:'auto',padding:'12px 14px',borderTop:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
          <button onClick={()=>setRole(null)} style={{display:'flex',alignItems:'center',gap:8,width:'100%',background:'none',border:'none',color:'#64748b',fontSize:13,cursor:'pointer',padding:'6px 0',fontFamily:'inherit'}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main">
        {role==='staff'     && <StaffView     activeTab={activeTab} onStaffUpdate={handleStaffUpdate} pendingUpdates={pendingStaffUpdates}/>}
        {role==='inspector' && <InspectorView activeTab={activeTab} center={centerViewData} reg={reg} liveData={centerData}/>}
        {role==='owner' && selectedId && (
          <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
            {/* Back to Network bar */}
            <div style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'8px 20px', borderBottom:'1px solid #e2e8f0',
              background:'#f8fafc', flexShrink:0,
            }}>
              <button
                onClick={()=>{ setSelectedId(null); setActiveTab('overview'); }}
                style={{
                  display:'flex', alignItems:'center', gap:6,
                  background:'none', border:'1px solid #e2e8f0', borderRadius:7,
                  padding:'4px 12px', fontSize:12.5, fontWeight:600, color:'#475569',
                  cursor:'pointer',
                }}
              >
                ← Network Overview
              </button>
              <span style={{fontSize:12.5, color:'#94a3b8'}}>
                {centerViewData.name} · {centerViewData.city}, {centerViewData.state}
              </span>
            </div>
            <div style={{flex:1, overflow:'auto'}}>
              <CenterDirectorView
                center={centerViewData}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                scoreColor={scoreColor}
                scoreLabel={scoreLabel}
                liveData={centerData}
                updateData={(section,fields)=>updateData(selectedId,section,fields)}
                reg={reg}
                userRole="owner"
                pendingStaffUpdates={pendingStaffUpdates}
                onApproveStaffUpdate={(id) => setPendingStaffUpdates(prev => { const next = prev.filter(u=>(u.id||u)!==id); try{localStorage.setItem(LS_KEY+'_pending',JSON.stringify(next));}catch{} return next; })}
                onRejectStaffUpdate={(id)  => setPendingStaffUpdates(prev => { const next = prev.filter(u=>(u.id||u)!==id); try{localStorage.setItem(LS_KEY+'_pending',JSON.stringify(next));}catch{} return next; })}
              />
            </div>
          </div>
        )}
        {role==='owner' && !selectedId && (
          <BusinessOwnerView
            network={networkData}
            centers={networkData.centers}
            scoreColor={scoreColor}
            scoreLabel={scoreLabel}
            allData={allData}
            lionheartSeed={LIONHEART_SEED}
            allCentersMap={CENTERS}
            getRegForUI={getRegForUI}
            onSelectCenter={(centerId) => { setSelectedId(centerId); setActiveTab('overview'); }}
          />
        )}

        {/* Superadmin: platform overview OR center detail */}
        {role==='superadmin' && saMode==='platform' && (
          <SuperAdminView
            activeTab={activeTab}
            allData={allData}
            companies={COMPANIES}
            allCenters={CENTERS}
            lionheartSeed={LIONHEART_SEED}
            scoreColor={scoreColor}
            onSelectCenter={handleSASelectCenter}
          />
        )}
        {role==='superadmin' && saMode==='platform' && activeTab==='help' && (
          <div style={{padding:'24px 28px', background:'#f8fafc', flex:1, overflowY:'auto'}}>
            <HelpTab/>
          </div>
        )}
        {role==='superadmin' && saMode==='center' && (
          <CenterDirectorView
            center={centerViewData}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            scoreColor={scoreColor}
            scoreLabel={scoreLabel}
            liveData={centerData}
            updateData={(section,fields)=>updateData(selectedId,section,fields)}
            reg={reg}
            userRole="superadmin"
          />
        )}

        {role==='director' && (
          <CenterDirectorView
            center={centerViewData}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            scoreColor={scoreColor}
            scoreLabel={scoreLabel}
            liveData={centerData}
            updateData={(section,fields)=>updateData(selectedId,section,fields)}
            reg={reg}
            userRole={role}
            pendingStaffUpdates={pendingStaffUpdates}
            onApproveStaffUpdate={(id) => setPendingStaffUpdates(prev => { const next = prev.filter(u=>(u.id||u)!==id); try{localStorage.setItem(LS_KEY+'_pending',JSON.stringify(next));}catch{} return next; })}
            onRejectStaffUpdate={(id)  => setPendingStaffUpdates(prev => { const next = prev.filter(u=>(u.id||u)!==id); try{localStorage.setItem(LS_KEY+'_pending',JSON.stringify(next));}catch{} return next; })}
          />
        )}
      </main>

      {/* ── MOBILE BOTTOM NAV — shows on ≤767px for director/staff/inspector ── */}
      {(role === 'director' || role === 'staff' || role === 'inspector') && (
        <nav className="mobile-bottom-nav">
          {(role === 'director' ? [
            { id:'overview',  label:'Overview', icon:'chart'    },
            { id:'alerts',    label:'Alerts',   icon:'bell'     },
            { id:'dataentry', label:'Data',     icon:'edit'     },
            { id:'staterules',label:'Rules',    icon:'map'      },
          ] : role === 'staff' ? [
            { id:'status',    label:'Status',   icon:'user'     },
            { id:'cpr',       label:'CPR',      icon:'cpr'      },
            { id:'training',  label:'Training', icon:'book'     },
            { id:'health',    label:'Health',   icon:'clipboard'},
          ] : [
            { id:'overview',  label:'Overview', icon:'eye'      },
            { id:'ratios',    label:'Ratios',   icon:'ratios'   },
            { id:'staff',     label:'Staff',    icon:'users'    },
            { id:'staterules',label:'Rules',    icon:'map'      },
          ]).map(item => (
            <button
              key={item.id}
              className={`mobile-bottom-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <NavIcon type={item.icon} size={18} />
              {item.label}
              {item.id === 'alerts' && criticalCount > 0 && (
                <span style={{
                  position:'absolute', top:6, marginLeft:8,
                  minWidth:16, height:16, borderRadius:8,
                  background:'#b91c1c', color:'#fff',
                  fontSize:9, fontWeight:700,
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                  padding:'0 3px',
                }}>{criticalCount}</span>
              )}
            </button>
          ))}
          {/* Menu / more button — opens sidebar */}
          <button
            className="mobile-bottom-nav-item"
            onClick={() => setSidebarOpen(o => !o)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="3" y1="6"  x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            More
          </button>
        </nav>
      )}
    </div>
  );
}

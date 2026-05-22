import React, { useState, useEffect } from 'react';
import OverviewTab    from './tabs/OverviewTab';
import AlertsTab      from './tabs/AlertsTab';
import StaffTab       from './tabs/StaffTab';
import StateRulesTab  from './tabs/StateRulesTab';
import HistoryTab     from './tabs/HistoryTab';
import DataEntryTab   from './tabs/DataEntryTab';
import RatiosTab      from './tabs/RatiosTab';
import HelpTab        from './tabs/HelpTab';
import InspectionView           from './tabs/InspectionView';
import CorrectiveActionPlanTab  from './tabs/CorrectiveActionPlanTab';
import AuditSimTab              from './tabs/AuditSimTab';

/* Topbar tabs — operational day-to-day views */
const TOPBAR_TABS = [
  { id:'overview',    label:'Overview'                      },
  { id:'ratios',      label:'Ratios',      live:true        },
  { id:'staff',       label:'Staff',       live:true        },
  { id:'inspection',  label:'Inspection View'               },
  { id:'cap',         label:'Corrective Action Plan'        },
];

/* All tab ids that live in the topbar (used to decide which bar to highlight) */
const TOPBAR_IDS = new Set(TOPBAR_TABS.map(t => t.id));

export default function CenterDirectorView({
  center, activeTab, setActiveTab, scoreColor, scoreLabel,
  liveData, updateData, reg, userRole='director',
  pendingStaffUpdates=[], onApproveStaffUpdate, onRejectStaffUpdate,
}) {
  // ── All hooks first (React rules) ──────────────────────────────────────
  const [initialDomain, setInitialDomain] = useState(null);
  const [deHighlight,   setDeHighlight]   = useState(null);
  const [deInitialSub,  setDeInitialSub]  = useState(null);

  useEffect(() => {
    const handler = (e) => {
      const { fieldKey, subTab } = e.detail || {};
      setDeHighlight(fieldKey || null);
      setDeInitialSub(subTab || null);
      setActiveTab('dataentry');
    };
    window.addEventListener('1core_navigate_dataentry', handler);
    return () => window.removeEventListener('1core_navigate_dataentry', handler);
  }, [setActiveTab]);

  // ── Derived values (after hooks) ────────────────────────────────────────
  const criticalCount = (center.alerts||[]).filter(a=>a.type==='danger').length;
  const sc    = center.scores;
  const color = scoreColor(sc?.overall);

  const flatLiveData = Object.assign({},
    ...(Object.values(liveData || {}).map(v => typeof v === 'object' && !Array.isArray(v) ? v : {}))
  );
  const centerWithSeed = { ...center, _seed: center, liveData: flatLiveData };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

      {/* ── Center header ── */}
      <div className="center-header">
        <div>
          <h2>{center.name}</h2>
          <div className="sub">{[center.address,center.city,center.state,center.zip].filter(Boolean).join(', ')}</div>
          <div className="agency">{center.agency} · {center.agencyPhone}</div>
        </div>
        <div className="score-pill" style={{ background:color+'15', color, borderColor:color+'50' }}>
          <div className="score-pill-num">{sc?.overall!=null?`${sc.overall}%`:'—'}</div>
          <div className="score-pill-label">{sc?.overall!=null?scoreLabel(sc.overall):'No data'}</div>
        </div>
      </div>

      {/* ── Topbar ── */}
      <div className="tab-nav">
        {TOPBAR_TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn ${activeTab===t.id?'active':''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}

            {/* Critical alerts badge on Overview */}
            {t.id==='overview' && criticalCount>0 && (
              <span className="tab-badge">{criticalCount}</span>
            )}

            {/* Live badge */}
            {t.live && (
              <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:20,
                background:'#eef7f2', color:'#1e5c38', border:'1px solid #a7d4ba', marginLeft:5 }}>
                Live
              </span>
            )}

            {/* Pending staff updates badge on Staff tab */}
            {t.id==='staff' && pendingStaffUpdates.length>0 && (
              <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
                background:'#b45309', color:'#fff', fontSize:10, fontWeight:700,
                minWidth:18, height:18, borderRadius:9, padding:'0 4px', marginLeft:4 }}>
                {pendingStaffUpdates.length}
              </span>
            )}
          </button>
        ))}

        {/* Subtle divider + "more" label when a sidebar tab is active */}
        {!TOPBAR_IDS.has(activeTab) && (
          <div style={{ display:'flex', alignItems:'center', marginLeft:'auto', paddingRight:4 }}>
            <span style={{ fontSize:11.5, color:'#94a3b8', fontStyle:'italic' }}>
              {
                activeTab==='alerts'    ? 'Alerts' :
                activeTab==='staterules'? 'State Rules' :
                activeTab==='dataentry' ? 'Data Entry' :
                activeTab==='auditsim'  ? 'Audit Simulation' :
                activeTab==='history'   ? 'History' :
                activeTab==='help'      ? 'Help & Glossary' : ''
              }
            </span>
          </div>
        )}
      </div>

      {/* ── Tab content ── */}
      <div className="content">
        {activeTab==='overview'   && <OverviewTab    center={center} scoreColor={scoreColor} scoreLabel={scoreLabel} liveData={flatLiveData} reg={reg} onNavigate={(tab, domainNum) => { setInitialDomain(domainNum || null); setActiveTab('inspection'); }}/>}
        {activeTab==='alerts'     && <AlertsTab      center={center}/>}
        {activeTab==='ratios'     && <RatiosTab      center={center}/>}
        {activeTab==='staff'      && <StaffTab       center={center} pendingUpdates={pendingStaffUpdates} onApproveUpdate={onApproveStaffUpdate} onRejectUpdate={onRejectStaffUpdate}/>}
        {activeTab==='inspection' && <InspectionView center={centerWithSeed} reg={reg} initialDomain={initialDomain}/>}
        {activeTab==='cap'        && <CorrectiveActionPlanTab center={center} reg={reg} liveData={liveData}/>}
        {activeTab==='auditsim'   && <AuditSimTab    center={center} reg={reg} liveData={liveData}/>}
        {activeTab==='staterules' && <StateRulesTab  center={center} reg={reg} userRole={userRole}/>}
        {activeTab==='history'    && <HistoryTab     center={center} scoreColor={scoreColor}/>}
        {activeTab==='dataentry'  && (
          <DataEntryTab
            key={`de-${deHighlight}-${deInitialSub}`}
            center={center}
            liveData={liveData.data || {}}
            updateData={(key, val) => updateData('data', { [key]: val })}
            reg={reg}
            highlightField={deHighlight}
            initialSub={deInitialSub}
          />
        )}
        {activeTab==='help'       && <HelpTab/>}
      </div>
    </div>
  );
}

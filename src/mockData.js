export const MOCK_NETWORK = {
  company: "Lionheart Children's Academy",
  totalCenters: 25, states: ['TX','CO','OH','IN','TN'],
  networkScore: 78, compliant: 14, atRisk: 8, nonCompliant: 3,
  stateBreakdown: [
    { state:'Texas',     abbr:'TX', centers:17, score:82 },
    { state:'Colorado',  abbr:'CO', centers:3,  score:74 },
    { state:'Ohio',      abbr:'OH', centers:2,  score:61 },
    { state:'Indiana',   abbr:'IN', centers:2,  score:88 },
    { state:'Tennessee', abbr:'TN', centers:1,  score:45 },
  ],
  networkAlerts: [
    { type:'danger',  text:'3 centers — Staff ratio violation',        detail:'OCMDO (TN), FLC (OH), CCH (OH) exceeding state maximums' },
    { type:'danger',  text:'7 staff — CPR certification expired',      detail:'Across 4 centers — renewal required immediately' },
    { type:'warning', text:'5 centers — Insurance expiring within 60 days', detail:'BTB, EVC, LCC, MBBC, SC — review coverage' },
    { type:'warning', text:'Training hours below minimum — 4 centers', detail:'TX requires 12 hrs/yr · OH requires 20 hrs/yr' },
    { type:'info',    text:'Drill records unconfirmed — 6 centers',    detail:'TX requires monthly fire and tornado drills' },
  ],
};

export const MOCK_CENTERS = [
  { id:'121CC', name:'Lionheart — 121CC', city:'Grapevine',     state:'TX', score:72, status:'atrisk'   },
  { id:'ACC',   name:'Lionheart — ACC',   city:'Colo. Springs', state:'CO', score:74, status:'atrisk'   },
  { id:'BTB',   name:'Lionheart — BTB',   city:'Carrollton',    state:'TX', score:85, status:'compliant' },
  { id:'CC',    name:'Lionheart — CC',    city:'Georgetown',    state:'TX', score:91, status:'compliant' },
  { id:'EVC',   name:'Lionheart — EVC',   city:'Irving',        state:'TX', score:81, status:'compliant' },
  { id:'FLC',   name:'Lionheart — FLC',   city:'Columbus',      state:'OH', score:55, status:'critical'  },
  { id:'GCH',   name:'Lionheart — GCH',   city:'Fort Worth',    state:'TX', score:76, status:'atrisk'   },
  { id:'CCH',   name:'Lionheart — CCH',   city:'Cleveland',     state:'OH', score:48, status:'critical'  },
  { id:'IND1',  name:'Lionheart — IND1',  city:'Indianapolis',  state:'IN', score:88, status:'compliant' },
  { id:'IND2',  name:'Lionheart — IND2',  city:'Carmel',        state:'IN', score:87, status:'compliant' },
  { id:'LCC',   name:'Lionheart — LCC',   city:'Lewisville',    state:'TX', score:83, status:'compliant' },
  { id:'MBBC',  name:'Lionheart — MBBC',  city:'McKinney',      state:'TX', score:79, status:'atrisk'   },
  { id:'OCMDO', name:'Lionheart — OCMDO', city:'Nashville',     state:'TN', score:45, status:'critical'  },
  { id:'RCCO',  name:'Lionheart — RCCO',  city:'Denver',        state:'CO', score:88, status:'compliant' },
  { id:'SC',    name:'Lionheart — SC',    city:'Southlake',     state:'TX', score:85, status:'compliant' },
];

export const MOCK_CENTER_DATA = {
  id:'121CC', name:'Lionheart — 121CC', address:'121 Corporate Circle',
  city:'Grapevine', state:'TX', zip:'76051', score:72,
  lastInspection:'Feb 14, 2026', inspResult:'Passed', inspDaysAgo:87,
  agency:'TX Health and Human Services Commission', agencyPhone:'(800) 862-5252',
  scores:{ overall:72, ratios:91, credentials:68, center:70, family:80, licensing:58 },
  alerts:[
    { type:'danger',  title:'CPR Expired — Sarah Mitchell',         detail:'Expired May 1, 2026 — renewal required immediately' },
    { type:'warning', title:'Liability insurance expiring in 38 days', detail:'Policy renewal due June 18, 2026' },
    { type:'warning', title:'Training hours below minimum',         detail:'9 hrs avg — TX requires 12 hrs/yr' },
    { type:'info',    title:'Drill log confirmation needed',        detail:'TX requires monthly fire and tornado drills on file' },
  ],
  ratios:[
    { group:'Infants (0–18mo)',   children:8,  staff:2, ratio:'1:4',  max:'1:4',  compliant:true },
    { group:'Toddlers (18–36mo)', children:18, staff:2, ratio:'1:9',  max:'1:9',  compliant:true },
    { group:'Preschool (3–5yr)',  children:45, staff:3, ratio:'1:15', max:'1:15', compliant:true },
    { group:'School-age (6+)',    children:44, staff:2, ratio:'1:22', max:'1:26', compliant:true },
  ],
  staff:[
    { name:'Sarah Mitchell', role:'Lead Teacher', cpr:'May 1, 2026 — Expired', bg:'Valid', training:'12 hrs', mandated:'Current',  physical:'On file',  status:'danger'  },
    { name:'James Rivera',   role:'Teacher',      cpr:'Aug 14, 2026',          bg:'Valid', training:'10 hrs', mandated:'Current',  physical:'On file',  status:'warning' },
    { name:'Priya Nair',     role:'Assistant',    cpr:'Nov 22, 2026',          bg:'Valid', training:'12 hrs', mandated:'Current',  physical:'Pending',  status:'warning' },
    { name:'Marcus Lee',     role:'Director',     cpr:'Mar 8, 2027',           bg:'Valid', training:'14 hrs', mandated:'Current',  physical:'On file',  status:'ok'      },
    { name:'Tanya Brooks',   role:'Floater',      cpr:'Jan 30, 2027',          bg:'Valid', training:'9 hrs',  mandated:'Current',  physical:'On file',  status:'warning' },
    { name:'DeShawn Carter', role:'Teacher',      cpr:'Sep 4, 2026',           bg:'Valid', training:'12 hrs', mandated:'Current',  physical:'Missing',  status:'warning' },
  ],
  history:[
    { date:'May 12, 2026', label:'Current', overall:72, ratios:91, credentials:68, center:70, family:80, alerts:7  },
    { date:'Apr 1, 2026',  label:'',        overall:68, ratios:88, credentials:65, center:65, family:78, alerts:9  },
    { date:'Mar 3, 2026',  label:'',        overall:65, ratios:85, credentials:60, center:62, family:75, alerts:11 },
    { date:'Feb 14, 2026', label:'',        overall:70, ratios:90, credentials:66, center:68, family:80, alerts:8  },
    { date:'Jan 6, 2026',  label:'',        overall:58, ratios:80, credentials:54, center:50, family:72, alerts:14 },
  ],
};

// Super Admin: multiple companies
export const MOCK_ALL_COMPANIES = [
  { id:'lionheart', name:"Lionheart Children's Academy", centers:25, states:5, score:78, compliant:14, atRisk:8, critical:3 },
  { id:'happyhall', name:'Happy Hall Schools',           centers:9,  states:1, score:84, compliant:7,  atRisk:2, critical:0 },
  { id:'kla',       name:'KLA Schools',                  centers:12, states:3, score:71, compliant:7,  atRisk:3, critical:2 },
  { id:'brightpath',name:'BrightPath Learning Centers',  centers:18, states:4, score:89, compliant:15, atRisk:3, critical:0 },
];

export const MOCK_STAFF_SARAH = {
  name:'Sarah Mitchell', role:'Lead Teacher', initials:'SM',
  center:'Lionheart — 121CC', city:'Grapevine', state:'TX',
  urgentCount:1, reviewCount:1, upToDateCount:4,
  certs:[
    { label:'CPR Certification',        sub:'Expired May 1, 2026',                        status:'expired',  statusText:'Expired'  },
    { label:'First Aid Certification',  sub:'Valid until Nov 14, 2026',                   status:'current',  statusText:'Current'  },
    { label:'Background Check',         sub:'Completed Jan 8, 2026 — State + FBI',        status:'valid',    statusText:'Valid'    },
    { label:'Annual Training Hours',    sub:'12 hrs completed — TX requires 12 hrs/yr',   status:'met',      statusText:'Met'      },
    { label:'Mandated Reporter Training',sub:'Completed March 2025 — No renewal required in TX', status:'current', statusText:'Current' },
    { label:'Physical Exam on File',    sub:'January 2026',                               status:'onfile',   statusText:'On file'  },
  ],
  actionItems:[
    { type:'danger',  title:'CPR Certification Expired — Immediate Action Required',
      detail:'Your CPR certification expired May 1, 2026. Texas licensing requires all direct-care staff to hold a valid CPR certification at all times. You cannot provide direct care until this is renewed.',
      links:'American Heart Association — heart.org · American Red Cross — redcross.org/cpr' },
  ],
};

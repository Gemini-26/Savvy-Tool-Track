/* ================================================================
   Savvy ToolTrack Pro — app.js
   Real-time sync: Firebase Realtime Database
   Session: localStorage
   ================================================================

   FIREBASE SETUP (~5 minutes, one-time):
   1. https://console.firebase.google.com  →  Add project
   2. Any project name  →  Continue  →  Disable Analytics  →  Create project
   3. Left panel: Build  →  Realtime Database  →  Create database
   4. Choose any region  →  Start in TEST MODE  →  Enable
   5. Left panel: Project Settings (gear icon)  →  scroll to "Your apps"
   6. Click the  </>  web icon  →  any app nickname  →  Register app
   7. Copy the 7 firebaseConfig values shown
   8. Paste them into FIREBASE_CONFIG below
   9. Save file  →  deploy to Vercel  →  done!

   NOTE: Test mode stays open for 30 days. Set security rules after
   your presentation in the Firebase console under Rules tab.
   ================================================================ */

/* ── Step 1: Replace placeholders with your Firebase values ── */
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyCR-O0WqDHGUPiE6wpwHjTM_qdOkYDgIrY',
  authDomain:        'savvy-tool-track.firebaseapp.com',
  databaseURL:       'https://savvy-tool-track-default-rtdb.firebaseio.com',
  projectId:         'savvy-tool-track',
  storageBucket:     'savvy-tool-track.firebasestorage.app',
  messagingSenderId: '279874145941',
  appId:             '1:279874145941:web:f0fcfaf2acfe4f9445959c',
};

/* ================================================================
   FIREBASE INIT
   ================================================================ */
firebase.initializeApp(FIREBASE_CONFIG);
const fdb = firebase.database();

/* ================================================================
   STATIC DATA — never written to Firebase
   ================================================================ */
const USERS = {
  admin:   { id:'admin',   name:'Admin',          role:'admin',  pass:'admin',   dept:'Management'  },
  james:   { id:'james',   name:'James Khumalo',  role:'worker', pass:'james',   dept:'Construction' },
  thandi:  { id:'thandi',  name:'Thandi Mokoena', role:'worker', pass:'thandi',  dept:'Electrical'   },
  sipho:   { id:'sipho',   name:'Sipho Dlamini',  role:'worker', pass:'sipho',   dept:'Plumbing'     },
  naledi:  { id:'naledi',  name:'Naledi Sithole', role:'worker', pass:'naledi',  dept:'Lifting Ops'  },
  bongani: { id:'bongani', name:'Bongani Ndlovu', role:'worker', pass:'bongani', dept:'Workshop'     },
};

const JOB_TEMPLATES = [
  { id:'JT1', name:'Electrical installation', tools:['TM001','TM003','TM007','WH016','WH017'], duration:'3 days'  },
  { id:'JT2', name:'Concrete & formwork',     tools:['JK001','JK002','WH009','WH010','WH005'], duration:'5 days'  },
  { id:'JT3', name:'Plumbing fit-out',        tools:['SD001','SD003','SD005','WH021','WH022'], duration:'2 days'  },
  { id:'JT4', name:'Steel erection',          tools:['NS001','NS002','NS003','WH001','WH004'], duration:'4 days'  },
  { id:'JT5', name:'Workshop maintenance',    tools:['BN001','BN003','BN009','WH026','WH033'], duration:'1 day'   },
];

/* ================================================================
   SEED DATA — written to Firebase on first run only
   CLEAN SLATE: no requests, no jobs, no audit logs, no notifications
   ================================================================ */

/* Tool factory — keeps seed compact */
function mkT(id, name, cat, owner, value, cond) {
  const wh = (owner === 'warehouse');
  return {
    id, name, cat, owner,
    holder:    wh ? '' : owner,
    status:    wh ? 'warehouse' : 'with_owner',
    barcode:   id,
    serial:    id + '-SN',
    since:     wh ? '' : 'Jan 2025',
    value:     value,
    condition: cond || 'Good',
    dueBack:   '',
  };
}

/* Build the seed tools object (keyed by tool ID) */
const SEED_TOOLS = (function () {
  const defs = [
    /* ── James Khumalo — Construction (11 tools) ── */
    ['JK001', 'Bosch SDS Plus Drill 800W',         'Power Tools',   'james',    4800],
    ['JK002', 'DeWalt Circular Saw 185mm',          'Power Tools',   'james',    6200],
    ['JK003', 'Claw Hammer 20oz Fibreglass',        'Hand Tools',    'james',     380],
    ['JK004', 'Stanley Tape Measure 8m',            'Measuring',     'james',     280],
    ['JK005', 'Spirit Level 600mm Aluminium',       'Measuring',     'james',     650],
    ['JK006', 'Flat Pry Bar 600mm',                 'Hand Tools',    'james',     420],
    ['JK007', 'Chisel Set 6pc Wood',                'Hand Tools',    'james',     580],
    ['JK008', 'Masonry Drill Bit Set 10pc',         'Accessories',   'james',     340],
    ['JK009', 'Speed Square 200mm Aluminium',       'Measuring',     'james',     220],
    ['JK010', 'Chalk Line Reel Stanley',            'Measuring',     'james',     180],
    ['JK011', 'Hand Saw 550mm 8TPI',                'Hand Tools',    'james',     320],

    /* ── Thandi Mokoena — Electrical (11 tools) ── */
    ['TM001', 'Fluke 117 Multimeter',              'Measuring',     'thandi',   3200],
    ['TM002', 'Wire Stripper & Cutter Pro',         'Hand Tools',    'thandi',    680],
    ['TM003', 'Non-Contact Voltage Tester',         'Measuring',     'thandi',    780],
    ['TM004', 'Ratchet Cable Crimper 6-25mm²',      'Hand Tools',    'thandi',    920],
    ['TM005', 'Conduit Bender 20mm Steel',          'Hand Tools',    'thandi',   1100],
    ['TM006', 'Insulation Tape Set 10pc',           'Accessories',   'thandi',    240],
    ['TM007', 'Circuit Tracer & Detector Kit',      'Measuring',     'thandi',   2800],
    ['TM008', 'Electrical Screwdriver Set 6pc',     'Hand Tools',    'thandi',    420],
    ['TM009', 'Fish Tape 20m Fibreglass',           'Hand Tools',    'thandi',    860],
    ['TM010', 'Cable Ties Bag 500pc Assorted',      'Accessories',   'thandi',    180],
    ['TM011', 'Digital Continuity Tester',          'Measuring',     'thandi',    480],

    /* ── Sipho Dlamini — Plumbing (11 tools) ── */
    ['SD001', 'Pipe Wrench 14" Heavy Duty',         'Hand Tools',    'sipho',     680],
    ['SD002', 'Torque Wrench 1/2" Drive 40-200Nm',  'Hand Tools',    'sipho',    1400],
    ['SD003', 'Ratchet Pipe Cutter 15-35mm',        'Hand Tools',    'sipho',     780],
    ['SD004', 'Basin Wrench Telescoping',           'Hand Tools',    'sipho',     520],
    ['SD005', 'Plumber\'s Snake Steel 7.5m',        'Hand Tools',    'sipho',    1200],
    ['SD006', 'Thread Seal Tape PTFE 12pc',         'Accessories',   'sipho',     120],
    ['SD007', 'Copper Tube Cutter Mini Set',        'Hand Tools',    'sipho',     340],
    ['SD008', 'Push-Fit Fitting Starter Kit',       'Accessories',   'sipho',     480],
    ['SD009', 'Drain Rods 10pc Polypropylene',      'Hand Tools',    'sipho',     680],
    ['SD010', 'Pipe Repair Clamp Set 4pc',          'Accessories',   'sipho',     360],
    ['SD011', 'Water Pump Pliers 300mm',            'Hand Tools',    'sipho',     420],

    /* ── Naledi Sithole — Lifting Ops (11 tools) ── */
    ['NS001', 'Full Body Safety Harness CE rated',  'Safety',        'naledi',   2800],
    ['NS002', 'D-Shackle Set 6pc Grade 80 3.25t',   'Lifting',       'naledi',   1600],
    ['NS003', 'Polyester Web Sling 2t x 3m',        'Lifting',       'naledi',   1800],
    ['NS004', 'Ratchet Load Binder 1.5t',           'Lifting',       'naledi',    980],
    ['NS005', 'Swivel Hook Set 3pc 2t Galv.',       'Lifting',       'naledi',   1200],
    ['NS006', 'Heavy Duty Leather Work Gloves',     'Safety',        'naledi',    280],
    ['NS007', 'Signalling Flags Set 4pc Hi-Vis',    'Safety',        'naledi',    180],
    ['NS008', 'Twin Fall Arrest Lanyard 2m',        'Safety',        'naledi',   1400],
    ['NS009', 'Rigging Knife Stainless Steel',      'Hand Tools',    'naledi',    320],
    ['NS010', 'Crane Signalling Mirror 200mm',      'Safety',        'naledi',    240],
    ['NS011', 'Self-Retracting Lifeline 4m',        'Safety',        'naledi',   3200],

    /* ── Bongani Ndlovu — Workshop (11 tools) ── */
    ['BN001', 'Socket Set 94pc 1/2" Drive',         'Hand Tools',    'bongani',  2200],
    ['BN002', 'Digital Torque Wrench 1/2" Drive',   'Hand Tools',    'bongani',  3800],
    ['BN003', 'Angle Grinder 230mm 2400W',          'Power Tools',   'bongani',  2800],
    ['BN004', 'Impact Driver 18V Brushless',        'Power Tools',   'bongani',  3200],
    ['BN005', 'Digital Caliper 150mm Stainless',    'Measuring',     'bongani',   680],
    ['BN006', 'Allen Key Set Metric+SAE 17pc',      'Hand Tools',    'bongani',   380],
    ['BN007', 'Engineer\'s File Set 6pc',           'Hand Tools',    'bongani',   280],
    ['BN008', 'Hacksaw Heavy Duty 300mm',           'Hand Tools',    'bongani',   320],
    ['BN009', 'Bench Vice 4" Cast Iron',            'Workshop',      'bongani',  1800],
    ['BN010', 'Metric Tap & Die Set 40pc',          'Hand Tools',    'bongani',  1600],
    ['BN011', 'Combination Wrench Set 12pc',        'Hand Tools',    'bongani',   920],

    /* ── WAREHOUSE / COMPANY TOOLS — 50 tools ── */
    /* Lifting & Access */
    ['WH001', 'Chain Hoist 2t x 3m Drop',          'Lifting',       'warehouse',  9500],
    ['WH002', 'Chain Hoist 5t x 3m Drop',          'Lifting',       'warehouse', 18500],
    ['WH003', 'Electric Chain Hoist 1t 240V',      'Lifting',       'warehouse', 14500],
    ['WH004', 'Scaffolding Frame Set 10pc',         'Access',        'warehouse', 28000],
    ['WH005', 'Extension Ladder 6m Aluminium',      'Access',        'warehouse',  3200],
    ['WH006', 'Extension Ladder 9m Aluminium',      'Access',        'warehouse',  5800],
    ['WH007', 'Step Ladder 3m Fibreglass',          'Access',        'warehouse',  2400],
    ['WH008', 'Mobile Scaffold Tower 4m',           'Access',        'warehouse', 22000],
    /* Construction */
    ['WH009', 'Concrete Mixer 140L Electric',       'Construction',  'warehouse',  8500],
    ['WH010', 'Rotary Hammer SDS+ 1100W',           'Power Tools',   'warehouse',  4800],
    ['WH011', 'Demolition Hammer 1500W',            'Power Tools',   'warehouse',  6200],
    ['WH012', 'Core Drill Machine 1800W',           'Power Tools',   'warehouse', 12000],
    ['WH013', 'Drywall Screw Gun 18V',              'Power Tools',   'warehouse',  2800],
    ['WH014', 'Tile Cutter Wet Saw 250mm',          'Power Tools',   'warehouse',  7500],
    ['WH015', 'Table Saw 254mm Bench Top',          'Power Tools',   'warehouse',  9800],
    /* Electrical */
    ['WH016', 'Extension Cord 25m 16A Orange',      'Electrical',    'warehouse',   680],
    ['WH017', 'Extension Cord 50m 16A Heavy',       'Electrical',    'warehouse',  1200],
    ['WH018', 'Cable Drum 100m 2.5mm² Twin+Earth',  'Electrical',    'warehouse',  2800],
    ['WH019', 'RCD Adaptor Safety Plug 16A',        'Electrical',    'warehouse',   480],
    ['WH020', 'Neon Circuit Tester Set 5pc',        'Electrical',    'warehouse',   320],
    /* Plumbing */
    ['WH021', 'Electric Pipe Threading Machine',    'Plumbing',      'warehouse', 18500],
    ['WH022', 'Electric Drain Snake 15m Motor',     'Plumbing',      'warehouse',  8500],
    ['WH023', 'Hydraulic Pipe Bender Set',          'Plumbing',      'warehouse', 12000],
    ['WH024', 'Pressure Test Kit with Gauges',      'Plumbing',      'warehouse',  3800],
    ['WH025', 'Pipe Freezing Kit Propane',          'Plumbing',      'warehouse',  4200],
    /* Workshop */
    ['WH026', 'MIG Welder 180A 240V',              'Workshop',      'warehouse',  8500],
    ['WH027', 'ARC Welder 200A 240V',              'Workshop',      'warehouse',  5800],
    ['WH028', 'Plasma Cutter 40A Inverter',        'Workshop',      'warehouse',  9500],
    ['WH029', 'Air Compressor 50L 2HP 240V',       'Workshop',      'warehouse',  4800],
    ['WH030', 'Bench Grinder 150mm Double End',     'Workshop',      'warehouse',  2200],
    ['WH031', 'Drill Press Bench-Top 350W',         'Workshop',      'warehouse',  3800],
    ['WH032', 'Steel Cutting Bandsaw 250mm',        'Workshop',      'warehouse', 12000],
    ['WH033', 'Hydraulic Floor Jack 3t Low Profile','Workshop',      'warehouse',  2800],
    ['WH034', 'Jack Stands Pair 3t Heavy Duty',     'Workshop',      'warehouse',  1800],
    ['WH035', 'Folding Work Bench Steel',           'Workshop',      'warehouse',  2400],
    ['WH036', 'Mobile Tool Cart 7 Drawer Steel',    'Workshop',      'warehouse',  4200],
    /* Measuring & Survey */
    ['WH037', 'Laser Distance Meter 100m Bosch',    'Measuring',     'warehouse',  2800],
    ['WH038', 'Rotary Laser Level Kit Self-Level',  'Measuring',     'warehouse',  8500],
    ['WH039', 'Builder\'s Auto Level Optical',      'Measuring',     'warehouse',  5800],
    ['WH040', 'Water Level Hose Set 30m Clear',     'Measuring',     'warehouse',   480],
    ['WH041', 'Total Station Entry Level',          'Measuring',     'warehouse', 45000],
    /* Safety */
    ['WH042', 'Safety Sign Set 20pc Reflective',    'Safety',        'warehouse',  1200],
    ['WH043', 'First Aid Kit 100pc Large Site',     'Safety',        'warehouse',  1800],
    ['WH044', 'Fire Extinguisher Set 5pc Mixed',    'Safety',        'warehouse',  4800],
    ['WH045', 'Safety Barrier Tape Red/White 500m', 'Safety',        'warehouse',   380],
    ['WH046', 'PPE Storage Cabinet Steel Lockable', 'Safety',        'warehouse',  6500],
    /* Power Generation & General */
    ['WH047', 'Generator 5kVA Petrol Recoil',       'General',       'warehouse', 14500],
    ['WH048', 'Generator 2.5kVA Petrol Portable',   'General',       'warehouse',  8500],
    ['WH049', 'Power Washer 2000psi Electric',       'Maintenance',   'warehouse',  4800],
    ['WH050', 'Professional Spray Gun Kit',          'Finishing',     'warehouse',  2200],
  ];

  const obj = {};
  defs.forEach(d => {
    const t = mkT(d[0], d[1], d[2], d[3], d[4], d[5] || 'Good');
    obj[t.id] = t;
  });
  return obj;
})();

const SEED = {
  tools:         SEED_TOOLS,
  requests:      {},
  jobs:          {},
  auditLog:      {},
  notifications: {
    james: {}, thandi: {}, sipho: {}, naledi: {}, bongani: {},
  },
};

/* ================================================================
   RUNTIME STATE — mirrored from Firebase by listeners
   ================================================================ */
let STATE = {
  tools:         {},
  requests:      {},
  jobs:          {},
  auditLog:      {},
  notifications: {},
  _ready: { tools: false, requests: false, jobs: false, auditLog: false },
};

/* Convenience array accessors */
const toolsArr  = ()  => Object.values(STATE.tools    || {});
const reqsArr   = ()  => Object.values(STATE.requests || {});
const jobsArr   = ()  => Object.values(STATE.jobs     || {});
const auditArr  = ()  => Object.values(STATE.auditLog || {}).sort((a, b) => b.id > a.id ? 1 : -1);
const notifsArr = uid => Object.values((STATE.notifications || {})[uid] || {}).sort((a, b) => b.id > a.id ? 1 : -1);

/* ================================================================
   SESSION PERSISTENCE
   ================================================================ */
const SESSION_KEY  = 'savvy_tt_uid_v2';
const saveSession  = uid => localStorage.setItem(SESSION_KEY, uid);
const clearSession = ()  => localStorage.removeItem(SESSION_KEY);
const loadSession  = ()  => localStorage.getItem(SESSION_KEY);

/* ================================================================
   APP STATE
   ================================================================ */
let currentUser  = null;
let currentView  = '';
let borrowSearch = '';
let loginError   = '';

/* Controls the return-initiation form inside the Handover tab */
let HS = { active: false, toolId: null, condition: '', comment: '' };

/* ================================================================
   UTILITIES
   ================================================================ */
const fmt      = v   => 'R\u00A0' + Math.round(v).toLocaleString('en-ZA');
const todayStr = ()  => new Date().toLocaleString('en-ZA', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
const genPin   = ()  => String(Math.floor(1000 + Math.random() * 9000));
const dueDate  = days => { const d = new Date(); d.setDate(d.getDate() + days); return d.toLocaleDateString('en-ZA', { day:'2-digit', month:'short', year:'numeric' }); };
const $        = id  => document.getElementById(id);

const uname    = id => (id === 'warehouse' ? 'Warehouse' : (USERS[id] ? USERS[id].name : id));
const ufirst   = id => uname(id).split(' ')[0];
const initials = id => {
  if (id === 'warehouse') return 'WH';
  if (!USERS[id]) return '??';
  return USERS[id].name.split(' ').map(w => w[0]).join('').slice(0, 2);
};
const tById    = id  => (STATE.tools || {})[id];
const jTpl     = id  => JOB_TEMPLATES.find(j => j.id === id);
const myJob    = uid => jobsArr().find(j => j.worker === uid && (j.status === 'assigned' || j.status === 'active'));

/* A tool is overdue ONLY when it has an active holder AND a due date AND is lent/checked_out */
const isOverdue = t  => t.dueBack && t.dueBack !== '' && t.holder && t.holder !== ''
                      && (t.status === 'lent' || t.status === 'checked_out');

const unreadCnt = uid => notifsArr(uid).filter(n => n.unread).length;

/* ================================================================
   FIREBASE WRITE HELPERS
   ================================================================ */
const dbUpdate = (path, data) => fdb.ref(path).update(data);
const dbSet    = (path, data) => fdb.ref(path).set(data);

async function dbNotify(uid, msg, type, extra) {
  if (!USERS[uid]) return; /* don't notify warehouse */
  const id   = 'N' + Date.now() + Math.floor(Math.random() * 9999);
  const note = { id, msg, type, unread: true, date: todayStr(), ...extra };
  await dbSet(`notifications/${uid}/${id}`, note);
}

async function markNotifsRead(uid) {
  const notifs  = (STATE.notifications || {})[uid] || {};
  const updates = {};
  Object.keys(notifs).forEach(k => { if (notifs[k].unread) updates[`${k}/unread`] = false; });
  if (Object.keys(updates).length) await fdb.ref(`notifications/${uid}`).update(updates);
}

/* ================================================================
   FIREBASE LISTENERS — update STATE and call render()
   ================================================================ */
function setupListeners() {
  fdb.ref('tools').on('value',         s => { STATE.tools         = s.val() || {}; STATE._ready.tools    = true; render(); });
  fdb.ref('requests').on('value',      s => { STATE.requests      = s.val() || {}; STATE._ready.requests  = true; render(); });
  fdb.ref('jobs').on('value',          s => { STATE.jobs          = s.val() || {}; STATE._ready.jobs      = true; render(); });
  fdb.ref('auditLog').on('value',      s => { STATE.auditLog      = s.val() || {}; STATE._ready.auditLog  = true; render(); });
  fdb.ref('notifications').on('value', s => { STATE.notifications = s.val() || {}; render(); });
}

/* ================================================================
   DATABASE SEEDING — runs only if database is empty
   ================================================================ */
async function initDatabase() {
  const snap = await fdb.ref('tools/JK001').once('value');
  if (snap.val()) return; /* already seeded — skip */
  await dbSet('tools',         SEED.tools);
  await dbSet('requests',      SEED.requests);
  await dbSet('jobs',          SEED.jobs);
  await dbSet('auditLog',      SEED.auditLog);
  await dbSet('notifications', SEED.notifications);
}

/* ================================================================
   BADGE RENDERERS
   ================================================================ */
function bdg(s) {
  const m = {
    warehouse:             '<span class="badge badge-gray">Warehouse</span>',
    with_owner:            '<span class="badge badge-green">With me</span>',
    lent:                  '<span class="badge badge-amber">Lent out</span>',
    checked_out:           '<span class="badge badge-blue">Checked out</span>',
    repair:                '<span class="badge badge-red">In repair</span>',
    pending:               '<span class="badge badge-amber">Pending</span>',
    approved:              '<span class="badge badge-blue">Approved</span>',
    awaiting_confirmation: '<span class="badge badge-amber">Awaiting PIN</span>',
    completed:             '<span class="badge badge-green">Completed</span>',
    denied:                '<span class="badge badge-red">Denied</span>',
    active:                '<span class="badge badge-teal">On site</span>',
    assigned:              '<span class="badge badge-blue">Assigned</span>',
  };
  return m[s] || `<span class="badge badge-gray">${s}</span>`;
}

function condBdg(c) {
  if (!c || c === '') return '';
  if (c === 'Good')    return '<span class="badge badge-green"  style="font-size:10px">Good</span>';
  if (c === 'Fair')    return '<span class="badge badge-amber"  style="font-size:10px">Fair</span>';
  if (c === 'Damaged') return '<span class="badge badge-red"    style="font-size:10px">Damaged</span>';
  return '';
}

/* ================================================================
   ROUTING
   ================================================================ */
function render() {
  const allReady = STATE._ready.tools && STATE._ready.requests && STATE._ready.jobs && STATE._ready.auditLog;
  if (!allReady) { $('root').innerHTML = renderLoading(); return; }
  $('root').innerHTML = !currentUser            ? renderLogin()
                      : currentUser.role === 'admin' ? renderAdmin()
                      : renderWorker();
}

function go(v) {
  currentView = v;
  if (v === 'w-borrow')   borrowSearch = '';
  if (v !== 'w-handover') HS = { active: false, toolId: null, condition: '', comment: '' };
  render();
}

/* ================================================================
   AUTH
   ================================================================ */
function doLogin() {
  const u    = ($('li-u') || {}).value.trim().toLowerCase();
  const p    = ($('li-p') || {}).value.trim().toLowerCase();
  const user = USERS[u];
  if (user && user.pass === p) {
    currentUser = user;
    loginError  = '';
    currentView = user.role === 'admin' ? 'a-dash' : 'w-mytools';
    saveSession(user.id);
    render();
  } else {
    loginError = 'Incorrect credentials. Try admin/admin or james/james';
    render();
  }
}

function doLogout() {
  currentUser = null; currentView = ''; borrowSearch = ''; clearSession(); render();
}

/* ================================================================
   SHELL BUILDER
   ================================================================ */
function shell(sb, title, body, alerts = '') {
  return `<div class="app"><div class="shell">${sb}
    <div class="main">
      <div class="topbar"><div class="tbtitle">${title}</div><div>${alerts}</div></div>
      <div class="content">${body}</div>
    </div>
  </div></div>`;
}

function navLi(label, v, icon, badge = '') {
  return `<div class="nav ${currentView === v ? 'on' : ''}" onclick="go('${v}')">${icon} ${label}${badge}</div>`;
}

function adminSb() {
  const wp = reqsArr().filter(r => r.type === 'borrow_warehouse' && r.status === 'pending').length;
  const od = toolsArr().filter(t => isOverdue(t)).length;
  return `<div class="sb">
    <div class="logo">Savvy ToolTrack <span>Pro</span></div>
    <div class="nav-group">Overview</div>
    ${navLi('Dashboard',     'a-dash',    '◼')}
    ${navLi('All tools',     'a-tools',   '⚙')}
    ${navLi('Company tools', 'a-company', '▣')}
    ${navLi('Financial view','a-finance', 'R')}
    ${navLi('Audit log',     'a-audit',   '▤')}
    <div class="nav-group">Workforce</div>
    ${navLi('Jobs',     'a-jobs',     '◈')}
    ${navLi('Team',     'a-team',     '◉')}
    ${navLi('Requests', 'a-requests', '⇄', wp > 0 ? `<span class="nbadge">${wp}</span>` : '')}
    <div class="nav-group">System</div>
    ${navLi('Overdue tools', 'a-overdue', '⚠', od > 0 ? `<span class="nbadge">${od}</span>` : '')}
    <div class="userinf">
      <div class="av av-lg av-p">AD</div>
      <div style="flex:1;min-width:0"><div class="bold" style="font-size:13px">Admin</div><div class="muted small">Management</div></div>
      <button class="btn" style="font-size:11px;padding:4px 9px" onclick="doLogout()">Out</button>
    </div>
  </div>`;
}

function workerSb() {
  const u  = currentUser;
  const uc = unreadCnt(u.id);
  const mj = myJob(u.id);
  const dot = mj && mj.status === 'active'
    ? '<span style="margin-left:auto;width:8px;height:8px;border-radius:50%;background:#1D9E75;display:inline-block;flex-shrink:0"></span>' : '';
  return `<div class="sb">
    <div class="logo">Savvy ToolTrack <span>Pro</span></div>
    <div class="nav-group">My work</div>
    ${navLi('My tools',          'w-mytools',   '⚙')}
    ${navLi('Handover / return', 'w-handover',  '⇄')}
    ${navLi('My job site',       'w-jobsite',   '◈', dot)}
    <div class="nav-group">Borrow</div>
    ${navLi('Borrow from colleague',  'w-borrow',    '◉')}
    ${navLi('Request from warehouse', 'w-warehouse', '▣')}
    ${navLi('My requests',            'w-reqs',      '▤')}
    <div class="nav-group">Account</div>
    ${navLi('Notifications', 'w-notifs', '◉', uc > 0 ? `<span class="nbadge">${uc}</span>` : '')}
    <div class="userinf">
      <div class="av av-lg">${initials(u.id)}</div>
      <div style="flex:1;min-width:0">
        <div class="bold" style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.name.split(' ')[0]}</div>
        <div class="muted small">${u.dept}</div>
      </div>
      <button class="btn" style="font-size:11px;padding:4px 9px" onclick="doLogout()">Out</button>
    </div>
  </div>`;
}

/* ================================================================
   LOADING & LOGIN SCREENS
   ================================================================ */
function renderLoading() {
  return `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;">
    <div style="text-align:center">
      <div style="font-size:22px;font-weight:700;color:var(--color-text-primary);margin-bottom:10px;letter-spacing:-0.03em">Savvy ToolTrack Pro</div>
      <div class="muted small">Connecting to database…</div>
    </div>
  </div>`;
}

function renderLogin() {
  const quick = ['admin','james','thandi','sipho','naledi','bongani']
    .map(u => `<button class="btn" style="font-size:11px;padding:4px 10px" onclick="$('li-u').value='${u}';$('li-p').value='${u}'">${u}</button>`).join('');
  return `<div class="login-wrap"><div class="login-box">
    <div style="font-size:22px;font-weight:700;letter-spacing:-0.03em;margin-bottom:4px;color:var(--color-text-primary)">Savvy ToolTrack <span style="color:var(--color-accent)">Pro</span></div>
    <div class="muted small" style="margin-bottom:20px">Sign in to your account</div>
    ${loginError ? `<div class="strip strip-err">${loginError}</div>` : ''}
    <div class="form-group">
      <label class="form-label">Username</label>
      <input class="fi-full" id="li-u" placeholder="admin, james, thandi…" onkeydown="if(event.key==='Enter')doLogin()"/>
    </div>
    <div class="form-group">
      <label class="form-label">Password</label>
      <input class="fi-full" id="li-p" type="password" placeholder="same as username" onkeydown="if(event.key==='Enter')doLogin()"/>
    </div>
    <button class="btn btn-primary" style="width:100%;padding:10px;margin-bottom:16px;font-size:14px;font-weight:600" onclick="doLogin()">Sign in</button>
    <div class="small muted" style="margin-bottom:7px">Quick login (demo):</div>
    <div style="display:flex;flex-wrap:wrap;gap:5px">${quick}</div>
  </div></div>`;
}

/* ================================================================
   ADMIN — SHELL + VIEWS
   ================================================================ */
function renderAdmin() {
  const views  = { 'a-dash':aDash,'a-tools':aTools,'a-company':aCompany,'a-finance':aFinance,'a-audit':aAudit,'a-jobs':aJobs,'a-team':aTeam,'a-requests':aRequests,'a-overdue':aOverdue };
  const titles = { 'a-dash':'Dashboard','a-tools':'All tools','a-company':'Company tools','a-finance':'Financial view','a-audit':'Audit log','a-jobs':'Jobs','a-team':'Team','a-requests':'Warehouse requests','a-overdue':'Overdue tools' };
  const wp = reqsArr().filter(r => r.type === 'borrow_warehouse' && r.status === 'pending').length;
  const od = toolsArr().filter(t => isOverdue(t)).length;
  const alerts = [
    wp > 0 && currentView !== 'a-requests' ? `<span style="background:var(--color-amber-bg);color:var(--color-amber);font-size:11px;padding:3px 10px;border-radius:99px;cursor:pointer;margin-left:6px" onclick="go('a-requests')">${wp} warehouse request${wp > 1 ? 's' : ''}</span>` : '',
    od > 0 && currentView !== 'a-overdue'  ? `<span style="background:var(--color-red-bg);color:var(--color-red);font-size:11px;padding:3px 10px;border-radius:99px;cursor:pointer;margin-left:6px" onclick="go('a-overdue')">${od} overdue</span>` : '',
  ].join('');
  return shell(adminSb(), titles[currentView] || 'Dashboard', (views[currentView] || aDash)(), alerts);
}

/* -- Dashboard -- */
function aDash() {
  const wh   = toolsArr().filter(t => t.status === 'warehouse').length;
  const lent = toolsArr().filter(t => t.status === 'lent' || t.status === 'checked_out').length;
  const od   = toolsArr().filter(t => isOverdue(t));
  const wp   = reqsArr().filter(r => r.type === 'borrow_warehouse' && r.status === 'pending');
  return `
    <div class="metrics metrics-4">
      <div class="mc"><div class="mc-label">Total tools</div><div class="mc-val">${toolsArr().length}</div></div>
      <div class="mc"><div class="mc-label">In warehouse</div><div class="mc-val val-g">${wh}</div></div>
      <div class="mc"><div class="mc-label">Active checkouts</div><div class="mc-val val-o">${lent}</div></div>
      <div class="mc"><div class="mc-label">Overdue returns</div><div class="mc-val" style="color:${od.length?'#A32D2D':'var(--color-green)'}">${od.length}</div></div>
    </div>
    ${od.length ? `<div class="strip strip-err">⚠ ${od.length} tool(s) overdue. See Overdue tools tab.</div>` : ''}
    <div class="sh"><span class="st">Pending warehouse requests</span></div>
    ${wp.length ? `
    <div class="tw"><table>
      <thead><tr><th style="width:30%">Tool</th><th style="width:20%">Requested by</th><th style="width:15%">Value</th><th style="width:15%">Date</th><th style="width:20%">Action</th></tr></thead>
      <tbody>${wp.map(r => { const t = tById(r.toolId) || {name:'?',value:0}; return `<tr>
        <td class="bold">${t.name}</td>
        <td><span class="av" style="font-size:9px">${initials(r.to)}</span> ${ufirst(r.to)}</td>
        <td class="val-g">${fmt(t.value)}</td>
        <td class="muted">${r.date}</td>
        <td style="display:flex;gap:6px">
          <button class="btn btn-green" style="font-size:11px;padding:4px 9px" onclick="adminAct('${r.id}','approved')">Approve</button>
          <button class="btn btn-red"   style="font-size:11px;padding:4px 9px" onclick="adminAct('${r.id}','denied')">Deny</button>
        </td>
      </tr>`; }).join('')}
      </tbody>
    </table></div>` : '<div class="strip strip-ok">No pending warehouse requests.</div>'}
    <div class="sh" style="margin-top:8px"><span class="st">Recent audit activity</span></div>
    <div class="tw">${auditArr().slice(0,6).map(a => {
      const t = tById(a.toolId) || { name: '?' };
      const toLabel = a.to === 'warehouse' ? 'Warehouse' : ufirst(a.to);
      const action  = a.action === 'lent' ? 'lent' : a.action === 'returned_to_warehouse' ? 'returned to warehouse ←' : 'returned';
      return `<div class="audit-row">
        <span class="av" style="font-size:9px">${initials(a.from)}</span>
        <div style="flex:1;min-width:0">
          <span class="audit-who">${ufirst(a.from)}</span>
          <span class="audit-act"> ${action} <strong>${t.name}</strong>${a.action !== 'returned_to_warehouse' ? ' → ' + toLabel : ''}</span>
          ${condBdg(a.conditionIn || a.conditionOut) ? ' · ' + condBdg(a.conditionIn || a.conditionOut) : ''}
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          ${a.pinConfirmed ? '<span class="badge badge-green" style="font-size:10px">PIN ✓</span>' : ''}
          <span class="audit-time">${a.date}</span>
        </div>
      </div>`;
    }).join('') || '<div class="muted small" style="padding:14px">No audit entries yet.</div>'}</div>`;
}

/* -- All tools -- */
function aTools() {
  const od = toolsArr().filter(t => isOverdue(t)).map(t => t.id);
  return `<div class="tw"><table>
    <thead><tr>
      <th style="width:22%">Name</th><th style="width:10%">Barcode</th>
      <th style="width:11%">Owner</th><th style="width:11%">Holder</th>
      <th style="width:11%">Status</th><th style="width:8%">Cond.</th>
      <th style="width:12%">Value</th><th style="width:15%">Due back</th>
    </tr></thead>
    <tbody>${toolsArr().map(t => `<tr>
      <td class="bold">${t.name}${od.includes(t.id) ? '<span class="overdue-flag">Overdue</span>' : ''}</td>
      <td class="mono small muted">${t.barcode}</td>
      <td>${t.owner === 'warehouse' ? '<span class="badge badge-blue" style="font-size:10px">Company</span>' : `<span class="av" style="font-size:9px">${initials(t.owner)}</span> ${ufirst(t.owner)}`}</td>
      <td>${t.holder && t.holder !== '' ? `<span class="av" style="font-size:9px">${initials(t.holder)}</span> ${ufirst(t.holder)}` : '—'}</td>
      <td>${bdg(t.status)}</td>
      <td>${condBdg(t.condition)}</td>
      <td class="val-g">${fmt(t.value)}</td>
      <td style="color:${isOverdue(t) ? '#A32D2D' : 'var(--color-text-secondary)'};">${t.dueBack || '—'}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

/* -- Company tools -- */
function aCompany() {
  const tools = toolsArr().filter(t => t.owner === 'warehouse');
  const total = tools.reduce((s, t) => s + t.value, 0);
  const avail = tools.filter(t => t.status === 'warehouse').length;
  const out   = tools.filter(t => t.status === 'checked_out').length;
  const cats  = [...new Set(tools.map(t => t.cat))].sort();
  return `
    <div class="metrics metrics-3">
      <div class="mc"><div class="mc-label">Company tools</div><div class="mc-val">${tools.length}</div><div class="mc-sub">All warehouse owned</div></div>
      <div class="mc"><div class="mc-label">In warehouse (available)</div><div class="mc-val val-g">${avail}</div></div>
      <div class="mc"><div class="mc-label">Total fleet value</div><div class="mc-val">${fmt(total)}</div></div>
    </div>
    ${out > 0 ? `<div class="strip strip-info">${out} company tool(s) currently checked out to workers.</div>` : ''}
    <div class="sh"><span class="st">Filter by category</span></div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">
      ${cats.map(c => `<button class="btn" style="font-size:11px;padding:4px 10px" onclick="filterCompany('${c}')">${c}</button>`).join('')}
      <button class="btn btn-primary" style="font-size:11px;padding:4px 10px" onclick="filterCompany('all')">All</button>
    </div>
    <div id="company-table">
    <div class="tw"><table>
      <thead><tr>
        <th style="width:26%">Tool</th><th style="width:13%">Category</th>
        <th style="width:10%">Barcode</th><th style="width:11%">Status</th>
        <th style="width:14%">Current holder</th><th style="width:12%">Value</th>
        <th style="width:7%">Cond.</th><th style="width:7%">Due</th>
      </tr></thead>
      <tbody>${tools.map(t => `<tr>
        <td class="bold">${t.name}</td>
        <td class="muted small">${t.cat}</td>
        <td class="mono small muted">${t.barcode}</td>
        <td>${bdg(t.status)}</td>
        <td>${t.holder && t.holder !== '' ? `<span class="av" style="font-size:9px">${initials(t.holder)}</span> ${ufirst(t.holder)}` : '—'}</td>
        <td class="val-g">${fmt(t.value)}</td>
        <td>${condBdg(t.condition)}</td>
        <td style="color:${isOverdue(t)?'#A32D2D':'var(--color-text-secondary)'};">${t.dueBack||'—'}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    </div>`;
}

function filterCompany(cat) {
  const tools = toolsArr().filter(t => t.owner === 'warehouse' && (cat === 'all' || t.cat === cat));
  const el = $('company-table');
  if (!el) return;
  el.innerHTML = `<div class="tw"><table>
    <thead><tr>
      <th style="width:26%">Tool</th><th style="width:13%">Category</th>
      <th style="width:10%">Barcode</th><th style="width:11%">Status</th>
      <th style="width:14%">Current holder</th><th style="width:12%">Value</th>
      <th style="width:7%">Cond.</th><th style="width:7%">Due</th>
    </tr></thead>
    <tbody>${tools.map(t => `<tr>
      <td class="bold">${t.name}</td>
      <td class="muted small">${t.cat}</td>
      <td class="mono small muted">${t.barcode}</td>
      <td>${bdg(t.status)}</td>
      <td>${t.holder && t.holder !== '' ? `<span class="av" style="font-size:9px">${initials(t.holder)}</span> ${ufirst(t.holder)}` : '—'}</td>
      <td class="val-g">${fmt(t.value)}</td>
      <td>${condBdg(t.condition)}</td>
      <td style="color:${isOverdue(t)?'#A32D2D':'var(--color-text-secondary)'};">${t.dueBack||'—'}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

/* -- Financial view -- */
function aFinance() {
  const workers = Object.values(USERS).filter(u => u.role === 'worker');
  const total   = toolsArr().reduce((s, t) => s + t.value, 0);
  const whVal   = toolsArr().filter(t => t.owner === 'warehouse').reduce((s, t) => s + t.value, 0);
  const lentVal = toolsArr().filter(t => t.status === 'lent' || t.status === 'checked_out').reduce((s, t) => s + t.value, 0);
  const dmgVal  = toolsArr().filter(t => t.condition === 'Damaged').reduce((s, t) => s + t.value, 0);
  return `
    <div class="metrics metrics-4">
      <div class="mc"><div class="mc-label">Total fleet value</div><div class="mc-val">${fmt(total)}</div></div>
      <div class="mc"><div class="mc-label">Company tools value</div><div class="mc-val val-b">${fmt(whVal)}</div></div>
      <div class="mc"><div class="mc-label">At risk (lent / out)</div><div class="mc-val val-o">${fmt(lentVal)}</div></div>
      <div class="mc"><div class="mc-label">Damaged tools value</div><div class="mc-val" style="color:#A32D2D">${fmt(dmgVal)}</div></div>
    </div>
    <div class="sh"><span class="st">Worker liability breakdown</span></div>
    <div class="tw"><table>
      <thead><tr>
        <th style="width:22%">Worker</th><th style="width:19%">Personal tools value</th>
        <th style="width:20%">Holding (others')</th><th style="width:19%">Lent out value</th>
        <th style="width:20%">Net liability</th>
      </tr></thead>
      <tbody>${workers.map(u => {
        const ownVal  = toolsArr().filter(t => t.owner === u.id).reduce((s, t) => s + t.value, 0);
        const holding = toolsArr().filter(t => t.holder === u.id && t.owner !== u.id).reduce((s, t) => s + t.value, 0);
        const lentOut = toolsArr().filter(t => t.owner === u.id && t.status === 'lent').reduce((s, t) => s + t.value, 0);
        return `<tr>
          <td><span class="av" style="font-size:9px">${initials(u.id)}</span> <span class="bold">${u.name.split(' ')[0]}</span></td>
          <td class="val-g">${fmt(ownVal)}</td>
          <td style="color:${holding ? 'var(--color-amber)' : 'var(--color-text-tertiary)'}">${holding ? fmt(holding) : '—'}</td>
          <td style="color:${lentOut ? 'var(--color-blue-text)' : 'var(--color-text-tertiary)'}">${lentOut ? fmt(lentOut) : '—'}</td>
          <td class="${holding > 0 ? 'val-o' : 'val-g'}">${holding > 0 ? 'Liable: ' + fmt(holding) : 'Clear'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
}

/* -- Audit log -- */
function aAudit() {
  const entries = auditArr();
  return `
    <div class="strip strip-info">Every handover and return is logged with PIN verification and condition records — your legal paper trail.</div>
    ${entries.length ? `<div class="tw"><table>
      <thead><tr>
        <th style="width:20%">Tool</th><th style="width:13%">Action</th>
        <th style="width:13%">From</th><th style="width:13%">To</th>
        <th style="width:10%">Condition</th><th style="width:10%">PIN</th>
        <th style="width:21%">Date / note</th>
      </tr></thead>
      <tbody>${entries.map(a => {
        const t = tById(a.toolId) || { name: '?' };
        return `<tr>
          <td class="bold">${t.name}</td>
          <td>${a.action==='lent'?'<span class="badge badge-amber" style="font-size:10px">Lent out</span>':a.action==='returned_to_warehouse'?'<span class="badge badge-blue" style="font-size:10px">→ Warehouse</span>':'<span class="badge badge-green" style="font-size:10px">Returned</span>'}</td>
          <td><span class="av" style="font-size:9px">${initials(a.from)}</span> ${ufirst(a.from)}</td>
          <td>${a.to === 'warehouse' ? '<span class="badge badge-blue" style="font-size:10px">Warehouse</span>' : `<span class="av" style="font-size:9px">${initials(a.to)}</span> ${ufirst(a.to)}`}</td>
          <td>${condBdg(a.conditionIn || a.conditionOut) || '—'}</td>
          <td>${a.pinConfirmed ? `<span class="badge badge-green" style="font-size:10px">✓ ${a.pin||''}</span>` : '<span class="badge badge-gray" style="font-size:10px">—</span>'}</td>
          <td class="small muted">${a.date}${a.commentIn ? ' · "' + a.commentIn + '"' : a.commentOut ? ' · "' + a.commentOut + '"' : ''}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>` : '<div class="strip strip-ok">No audit entries yet. They appear here after handovers and returns.</div>'}`;
}

/* -- Jobs -- */
function aJobs() {
  const workers = Object.values(USERS).filter(u => u.role === 'worker');
  const onJob   = workers.filter(u => myJob(u.id));
  const free    = workers.filter(u => !myJob(u.id));
  return `
    <div class="metrics metrics-3">
      <div class="mc"><div class="mc-label">Workers on site</div><div class="mc-val" style="color:var(--color-teal-text)">${onJob.length}</div></div>
      <div class="mc"><div class="mc-label">Available to assign</div><div class="mc-val val-g">${free.length}</div></div>
      <div class="mc"><div class="mc-label">Total jobs logged</div><div class="mc-val">${jobsArr().length}</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div>
        <div style="font-size:10px;font-weight:700;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">On a job site</div>
        ${onJob.length ? onJob.map(u => { const j = myJob(u.id); const jt = jTpl(j.templateId) || {name:'?'}; return `
          <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid rgba(15,23,42,0.06);border-radius:14px;margin-bottom:6px;background:#fff">
            <span class="av" style="font-size:9px">${initials(u.id)}</span>
            <div style="flex:1;min-width:0"><div class="small bold">${u.name.split(' ')[0]}</div><div style="font-size:10px;color:var(--color-text-secondary)">${jt.name}</div></div>
            ${bdg(j.status)}
          </div>`;}).join('') : '<div class="small muted">None on site.</div>'}
      </div>
      <div>
        <div style="font-size:10px;font-weight:700;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Available to assign</div>
        ${free.length ? free.map(u => `
          <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid rgba(15,23,42,0.06);border-radius:14px;margin-bottom:6px;background:#fff">
            <span class="av av-g" style="font-size:9px">${initials(u.id)}</span>
            <div class="small bold" style="flex:1">${u.name.split(' ')[0]}</div>
            <span class="badge badge-green" style="font-size:10px">Free</span>
          </div>`).join('') : '<div class="small muted">All workers assigned.</div>'}
      </div>
    </div>
    <div class="sh"><span class="st">Assign new job</span></div>
    <div class="frow">
      <select class="fi" id="jt-s" style="flex:1;min-width:140px">
        <option value="">— Job type —</option>
        ${JOB_TEMPLATES.map(j => `<option value="${j.id}">${j.name}</option>`).join('')}
      </select>
      <select class="fi" id="jw-s" style="flex:1;min-width:130px">
        <option value="">— Assign worker —</option>
        ${free.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
      </select>
      <input class="fi" id="js-s" placeholder="Site address (e.g. 12 Main St, Sandton)" style="flex:2;min-width:170px"/>
      <input class="fi" id="jc-s" placeholder="Client name" style="flex:1;min-width:120px"/>
      <button class="btn btn-primary" onclick="assignJob()">Assign</button>
    </div>
    <div class="sh"><span class="st">All jobs</span></div>
    <div class="tw"><table>
      <thead><tr>
        <th style="width:22%">Job type</th><th style="width:28%">Site</th>
        <th style="width:14%">Worker</th><th style="width:14%">Client</th>
        <th style="width:10%">Status</th><th style="width:12%">Started</th>
      </tr></thead>
      <tbody>${jobsArr().length ? jobsArr().map(j => { const jt = jTpl(j.templateId) || {name:'?'}; return `<tr>
        <td class="bold">${jt.name}</td>
        <td class="small muted">${j.site.split(',')[0]}</td>
        <td><span class="av" style="font-size:9px">${initials(j.worker)}</span> ${ufirst(j.worker)}</td>
        <td class="small muted">${j.client || '—'}</td>
        <td>${bdg(j.status)}</td>
        <td class="small muted">${j.startedAt || j.startDate || '—'}</td>
      </tr>`; }).join('') : '<tr><td colspan="6" style="text-align:center;padding:18px;color:var(--color-text-secondary)">No jobs yet.</td></tr>'}</tbody>
    </table></div>`;
}

async function assignJob() {
  const jtId   = ($('jt-s') || {}).value;
  const wId    = ($('jw-s') || {}).value;
  const site   = ($('js-s') || {}).value.trim();
  const client = ($('jc-s') || {}).value.trim();
  if (!jtId || !wId || !site) { alert('Please select a job type, a worker, and enter a site address.'); return; }
  const jt = jTpl(jtId);
  const id = 'J' + Date.now();
  await dbSet(`jobs/${id}`, { id, templateId: jtId, worker: wId, site, client, status: 'assigned', startDate: todayStr(), startedAt: '', endDate: '' });
  await dbNotify(wId, `You have been assigned to: "${jt.name}" at ${site.split(',')[0]}`, 'job');
  alert(`${uname(wId)} assigned to "${jt.name}". They have been notified.`);
}

/* -- Team -- */
function aTeam() {
  return Object.values(USERS).filter(u => u.role === 'worker').map(u => {
    const ownVal  = toolsArr().filter(t => t.owner === u.id).reduce((s, t) => s + t.value, 0);
    const holding = toolsArr().filter(t => t.holder === u.id && t.owner !== u.id).reduce((s, t) => s + t.value, 0);
    const j  = myJob(u.id);
    const jt = j ? jTpl(j.templateId) : null;
    return `<div class="card" style="display:flex;gap:14px;align-items:flex-start">
      <div class="av av-lg">${initials(u.id)}</div>
      <div style="flex:1">
        <div class="bold" style="font-size:14px">${u.name}</div>
        <div class="muted small" style="margin-bottom:8px">${u.dept}</div>
        <div style="display:flex;gap:7px;flex-wrap:wrap">
          ${j ? bdg(j.status) + (jt ? ` <span class="muted small">${jt.name}</span>` : '') : '<span class="badge badge-green">Available</span>'}
          ${ownVal  ? `<span class="chip-g">${fmt(ownVal)} owned</span>`   : ''}
          ${holding ? `<span class="chip-o">${fmt(holding)} holding</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

/* -- Admin requests (warehouse only — peer requests handled between colleagues) -- */
function aRequests() {
  const pend = reqsArr().filter(r => r.type === 'borrow_warehouse' && r.status === 'pending');
  const hist = reqsArr().filter(r => r.type === 'borrow_warehouse' && r.status !== 'pending');
  return `
    <div class="strip strip-info">Admin manages warehouse checkout requests only. Tool requests between colleagues are approved directly by the colleague via their Notifications tab.</div>
    <div class="sh"><span class="st">Pending warehouse requests</span></div>
    ${pend.length ? `<div class="tw"><table>
      <thead><tr>
        <th style="width:28%">Tool</th><th style="width:18%">Requested by</th>
        <th style="width:14%">Value</th><th style="width:14%">Date</th><th style="width:26%">Action</th>
      </tr></thead>
      <tbody>${pend.map(r => { const t = tById(r.toolId) || {name:'?',value:0}; return `<tr>
        <td class="bold">${t.name} <span class="badge badge-blue" style="font-size:10px">Company</span></td>
        <td><span class="av" style="font-size:9px">${initials(r.to)}</span> ${ufirst(r.to)}</td>
        <td class="val-g">${fmt(t.value)}</td>
        <td class="muted">${r.date}</td>
        <td style="display:flex;gap:6px">
          <button class="btn btn-green" style="font-size:11px;padding:4px 9px" onclick="adminAct('${r.id}','approved')">Approve</button>
          <button class="btn btn-red"   style="font-size:11px;padding:4px 9px" onclick="adminAct('${r.id}','denied')">Deny</button>
        </td>
      </tr>`; }).join('')}</tbody>
    </table></div>` : '<div class="strip strip-ok">No pending warehouse requests.</div>'}
    ${hist.length ? `<div class="sh" style="margin-top:12px"><span class="st">History</span></div>
    <div class="tw"><table>
      <thead><tr><th style="width:32%">Tool</th><th style="width:22%">Worker</th><th style="width:18%">Date</th><th style="width:28%">Status</th></tr></thead>
      <tbody>${hist.map(r => { const t = tById(r.toolId) || {name:'?'}; return `<tr>
        <td class="bold">${t.name}</td>
        <td><span class="av" style="font-size:9px">${initials(r.to)}</span> ${ufirst(r.to)}</td>
        <td class="muted">${r.date}</td>
        <td>${bdg(r.status)}</td>
      </tr>`; }).join('')}</tbody>
    </table></div>` : ''}`;
}

async function adminAct(reqId, status) {
  const r = reqsArr().find(x => x.id === reqId);
  if (!r || r.type !== 'borrow_warehouse') return;
  const t = tById(r.toolId) || { name: '?', value: 0 };
  if (status === 'approved') {
    /* Check tool is still available */
    if (t.status !== 'warehouse') { alert('This tool is no longer available in the warehouse.'); return; }
    await dbUpdate(`tools/${r.toolId}`, { holder: r.to, status: 'checked_out', since: todayStr(), dueBack: dueDate(14) });
    await dbNotify(r.to, `Your request for company tool "${t.name}" was approved — it is checked out to you. Return to warehouse when done.`, 'info');
  } else {
    await dbNotify(r.to, `Your request for "${t.name}" was denied by admin.`, 'info');
  }
  await dbUpdate(`requests/${reqId}`, { status });
}

/* -- Overdue -- */
function aOverdue() {
  const od = toolsArr().filter(t => isOverdue(t));
  if (!od.length) return '<div class="strip strip-ok">No overdue tools — everything is returned on time!</div>';
  return `
    <div class="strip strip-err">These tools have passed their due-back date. Contact holders immediately. If not returned within 48 hours, escalate to a formal dispute.</div>
    <div class="tw"><table>
      <thead><tr>
        <th style="width:26%">Tool</th><th style="width:14%">Value</th>
        <th style="width:18%">Holder</th><th style="width:16%">Owner</th><th style="width:26%">Due back</th>
      </tr></thead>
      <tbody>${od.map(t => `<tr>
        <td class="bold">${t.name}</td>
        <td class="val-o">${fmt(t.value)}</td>
        <td><span class="av av-a" style="font-size:9px">${initials(t.holder)}</span> ${ufirst(t.holder)}</td>
        <td>${t.owner === 'warehouse' ? '<span class="badge badge-blue" style="font-size:10px">Warehouse</span>' : `<span class="av" style="font-size:9px">${initials(t.owner)}</span> ${ufirst(t.owner)}`}</td>
        <td style="color:#A32D2D;font-weight:600">${t.dueBack} <span class="overdue-flag">Overdue</span></td>
      </tr>`).join('')}</tbody>
    </table></div>`;
}

/* ================================================================
   WORKER — SHELL + VIEWS
   ================================================================ */
function renderWorker() {
  const views  = { 'w-mytools':wMyTools,'w-handover':wHandover,'w-jobsite':wJobSite,'w-borrow':wBorrow,'w-warehouse':wWarehouse,'w-reqs':wReqs,'w-notifs':wNotifs };
  const titles = { 'w-mytools':'My tools','w-handover':'Handover / return','w-jobsite':'My job site','w-borrow':'Borrow from colleague','w-warehouse':'Request from warehouse','w-reqs':'My requests','w-notifs':'Notifications' };
  const uc = unreadCnt(currentUser.id);
  const alerts = uc > 0 && currentView !== 'w-notifs'
    ? `<span style="background:var(--color-red-bg);color:var(--color-red);font-size:11px;padding:3px 10px;border-radius:99px;cursor:pointer" onclick="go('w-notifs')">${uc} new</span>` : '';
  return shell(workerSb(), titles[currentView] || 'My tools', (views[currentView] || wMyTools)(), alerts);
}

/* -- My tools -- */
function wMyTools() {
  const u         = currentUser;
  const owned     = toolsArr().filter(t => t.owner === u.id && t.holder === u.id);
  const lentOut   = toolsArr().filter(t => t.owner === u.id && t.holder !== u.id && t.status === 'lent');
  const borrowing = toolsArr().filter(t => t.holder === u.id && t.owner && t.owner !== u.id);
  const ownVal    = owned.reduce((s, t) => s + t.value, 0);
  const lentVal   = lentOut.reduce((s, t) => s + t.value, 0);
  const borVal    = borrowing.reduce((s, t) => s + t.value, 0);
  const overdueL  = lentOut.filter(t => isOverdue(t));
  return `
    <div class="metrics metrics-3">
      <div class="mc"><div class="mc-label">My tools (with me)</div><div class="mc-val">${owned.length}</div><div class="chip-g" style="display:inline-block;margin-top:6px">${fmt(ownVal)}</div></div>
      <div class="mc"><div class="mc-label">Lent to others</div><div class="mc-val val-o">${lentOut.length}</div><div class="chip-o" style="display:inline-block;margin-top:6px">${lentOut.length ? fmt(lentVal) + ' at risk' : '—'}</div></div>
      <div class="mc"><div class="mc-label">I'm borrowing</div><div class="mc-val val-b">${borrowing.length}</div><div class="chip-b" style="display:inline-block;margin-top:6px">${borrowing.length ? fmt(borVal) + ' liability' : '—'}</div></div>
    </div>
    ${overdueL.length  ? `<div class="strip strip-err">${overdueL.length} of your lent tool(s) are overdue. Request them back immediately.</div>` : ''}
    ${lentVal  > 0     ? `<div class="strip strip-warn">You have ${fmt(lentVal)} of your tools with other workers. You remain responsible if they are lost or damaged.</div>` : ''}
    ${borVal   > 0     ? `<div class="strip strip-info">You are holding ${fmt(borVal)} worth of others' tools. Return them on time.</div>` : ''}

    ${owned.length ? `<div class="sdiv">My tools — in my possession</div>
    ${owned.map(t => `<div class="card" style="display:flex;align-items:center;gap:12px">
      <div style="flex:1">
        <div class="bold" style="font-size:13px">${t.name}</div>
        <div class="small muted">${t.cat} · ${t.barcode} · ${condBdg(t.condition) || 'No condition recorded'}</div>
      </div>
      <span class="val-g">${fmt(t.value)}</span>
    </div>`).join('')}` : ''}

    ${lentOut.length ? `<div class="sdiv">My tools — lent to colleagues</div>
    ${lentOut.map(t => `<div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span class="bold" style="font-size:13px">${t.name}${isOverdue(t) ? '<span class="overdue-flag">Overdue</span>' : ''}</span>
        <span class="val-o">${fmt(t.value)}</span>
      </div>
      <div class="small muted" style="margin-bottom:10px">With ${uname(t.holder)} since ${t.since || '—'} · due back ${t.dueBack || 'not set'}</div>
      <button class="btn btn-amber" style="font-size:11px;padding:5px 12px" onclick="recallTool('${t.id}')">Request back (48hr notice)</button>
    </div>`).join('')}` : ''}

    ${borrowing.length ? `<div class="sdiv">Borrowed from others — my liability</div>
    ${borrowing.map(t => `<div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
        <span class="bold" style="font-size:13px">${t.name}</span>
        <span class="val-b">${fmt(t.value)}</span>
      </div>
      <div class="small muted" style="margin-bottom:10px">
        ${t.owner === 'warehouse' ? '<span class="badge badge-blue" style="font-size:10px">Company tool</span> Return to warehouse when done' : 'Owned by ' + uname(t.owner)} · ${condBdg(t.condition)} at checkout · due ${t.dueBack || 'not set'}
      </div>
      <button class="btn btn-amber" style="font-size:11px;padding:5px 12px" onclick="initiateReturn('${t.id}')">Return this tool →</button>
    </div>`).join('')}` : ''}

    ${!owned.length && !lentOut.length && !borrowing.length ? `<div style="text-align:center;padding:36px 0;color:var(--color-text-secondary)">
      <div style="font-size:14px;margin-bottom:12px">No tools on your profile yet.</div>
      <button class="btn btn-primary" onclick="go('w-warehouse')">Request from warehouse</button>
    </div>` : ''}`;
}

/* -- Handover / Return -- */
function wHandover() {
  const u = currentUser;

  /* Section A: Return initiation form (when HS.active is true) */
  let formHTML = '';
  if (HS.active) {
    const t     = tById(HS.toolId) || { name: '?', owner: '', condition: '' };
    const isWH  = t.owner === 'warehouse';
    formHTML = `<div class="card" style="border:2px solid var(--color-accent);margin-bottom:16px">
      <div class="bold" style="font-size:14px;margin-bottom:4px">Returning: ${t.name}</div>
      <div class="small muted" style="margin-bottom:12px">${isWH ? '🏭 Company tool — return to warehouse' : 'Returning to ' + uname(t.owner)}</div>
      <div class="bold small" style="margin-bottom:8px">Condition at return</div>
      <div style="display:flex;gap:8px;margin-bottom:14px">
        ${['Good','Fair','Damaged'].map(c => `<button class="cond-btn cond-${c.toLowerCase()}${HS.condition===c?' sel':''}" onclick="setHSCondition('${c}')">${c}</button>`).join('')}
      </div>
      <div class="bold small" style="margin-bottom:6px">Comment (optional)</div>
      <textarea class="fi-full" id="hs-cmt" rows="2" placeholder="e.g. slight surface wear, fully functional…" style="resize:none;margin-bottom:14px">${HS.comment}</textarea>
      ${!HS.condition ? '<div class="strip strip-warn" style="margin-bottom:0">Select a condition rating before continuing.</div>' :
        isWH ? `<div style="display:flex;gap:8px"><button class="btn" onclick="cancelReturn()">Cancel</button><button class="btn btn-teal" onclick="doReturnToWarehouse()">Confirm return to warehouse ✓</button></div>`
             : `<div style="display:flex;gap:8px"><button class="btn" onclick="cancelReturn()">Cancel</button><button class="btn btn-primary" onclick="generateReturnPin()">Generate return PIN →</button></div>`}
    </div>`;
  }

  /* Section B: Collect an approved borrow — I'm the borrower, enter lend-out PIN */
  const toCollect = reqsArr().filter(r => r.type === 'borrow_peer' && r.status === 'approved' && r.to === u.id && !r.pinUsed);

  /* Section C: Confirm a return — I'm the tool owner, enter return PIN colleague generated */
  const toConfirm = reqsArr().filter(r => r.type === 'return_peer' && r.status === 'awaiting_confirmation' && r.to === u.id);

  /* Section D: My active returns — I generated a PIN, show it so owner can enter it */
  const myReturns = reqsArr().filter(r => r.type === 'return_peer' && r.status === 'awaiting_confirmation' && r.from === u.id);

  /* Section E: Tools I can return (not already in form) */
  const returnable = toolsArr().filter(t => t.holder === u.id && t.owner && t.owner !== u.id
                                          && (t.status === 'lent' || t.status === 'checked_out')
                                          && !HS.active);

  const empty = !HS.active && !toCollect.length && !toConfirm.length && !myReturns.length && !returnable.length;

  return `
    ${formHTML}

    ${toCollect.length ? `
      <div class="sdiv">Collect a tool — enter lend-out PIN</div>
      <div class="strip strip-info">Your borrow request was approved. Ask the tool owner to show you their lend-out PIN from their Notifications — then enter it here to confirm collection.</div>
      ${toCollect.map(r => {
        const t = tById(r.toolId) || { name: '?', value: 0 };
        return `<div class="card">
          <div class="bold" style="font-size:14px;margin-bottom:2px">${t.name}</div>
          <div class="small muted" style="margin-bottom:4px">Approved by ${ufirst(r.from)} · value: ${fmt(t.value)}</div>
          <div class="small" style="margin-bottom:12px;color:var(--color-blue-text)">Ask ${ufirst(r.from)} to open their Notifications and show you the PIN</div>
          <input class="pin-input-field" id="lpin-${r.id}" maxlength="4" placeholder="· · · ·" type="number" inputmode="numeric" oninput="this.value=this.value.slice(0,4)"/>
          <div id="lpin-err-${r.id}" class="small" style="color:#A32D2D;text-align:center;margin-bottom:8px"></div>
          <div style="text-align:center"><button class="btn btn-primary" style="padding:10px 28px" onclick="enterLendPin('${r.id}')">Confirm collection</button></div>
        </div>`;}).join('')}` : ''}

    ${toConfirm.length ? `
      <div class="sdiv">Confirm a return — enter return PIN</div>
      <div class="strip strip-info">A colleague is returning your tool. Ask them to show you their return PIN from their Notifications, then enter it here to confirm receipt.</div>
      ${toConfirm.map(r => {
        const t = tById(r.toolId) || { name: '?', value: 0 };
        return `<div class="card">
          <div class="bold" style="font-size:14px;margin-bottom:2px">${t.name}</div>
          <div class="small muted" style="margin-bottom:4px">Returned by ${ufirst(r.from)} · condition reported: ${condBdg(r.conditionIn) || '—'}${r.commentIn ? ' · "' + r.commentIn + '"' : ''}</div>
          <div class="small" style="margin-bottom:12px;color:var(--color-blue-text)">Ask ${ufirst(r.from)} to open their Notifications and show you the return PIN</div>
          <input class="pin-input-field" id="rpin-${r.id}" maxlength="4" placeholder="· · · ·" type="number" inputmode="numeric" oninput="this.value=this.value.slice(0,4)"/>
          <div id="rpin-err-${r.id}" class="small" style="color:#A32D2D;text-align:center;margin-bottom:8px"></div>
          <div style="text-align:center"><button class="btn btn-green" style="padding:10px 28px" onclick="enterReturnPin('${r.id}')">Confirm receipt</button></div>
        </div>`;}).join('')}` : ''}

    ${myReturns.length ? `
      <div class="sdiv">Return in progress — show this PIN to ${myReturns[0] && tById(myReturns[0].toolId) ? ufirst((tById(myReturns[0].toolId)).owner) : 'owner'}</div>
      ${myReturns.map(r => {
        const t = tById(r.toolId) || { name: '?' };
        return `<div class="card">
          <div class="bold" style="font-size:14px;margin-bottom:4px">${t.name}</div>
          <div class="small muted" style="margin-bottom:6px">Show this PIN to ${ufirst(r.to)} so they can confirm receipt in their Handover tab</div>
          <div class="pin-box">
            <div class="small muted" style="margin-bottom:6px">Return PIN — show to ${ufirst(r.to)}</div>
            <div class="pin-display">${r.returnPin}</div>
            <div class="small muted">One-time use · expires when entered</div>
          </div>
        </div>`;}).join('')}` : ''}

    ${returnable.length ? `
      <div class="sdiv">Return a borrowed tool</div>
      ${returnable.map(t => `<div class="card" style="display:flex;align-items:center;gap:12px">
        <div style="flex:1">
          <div class="bold" style="font-size:13px">${t.name}</div>
          <div class="small muted">${t.owner === 'warehouse' ? 'Company tool — return to warehouse' : 'Owned by ' + uname(t.owner)} · ${condBdg(t.condition)}</div>
        </div>
        <button class="btn btn-amber" style="font-size:12px;flex-shrink:0" onclick="initiateReturn('${t.id}')">Return →</button>
      </div>`).join('')}` : ''}

    ${empty ? '<div class="strip strip-ok">No pending handovers or returns. Everything is up to date.</div>' : ''}`;
}

/* -- Job site -- */
function wJobSite() {
  const j = myJob(currentUser.id);
  if (!j) return `<div style="text-align:center;padding:48px 0;color:var(--color-text-secondary)">
    <div style="font-size:16px;font-weight:600;margin-bottom:8px">No job assigned yet</div>
    <div class="small muted">Contact your admin to be assigned to a job site.</div>
  </div>`;
  const jt       = jTpl(j.templateId) || { name: '?', tools: [], duration: '' };
  const isActive = j.status === 'active';
  const needed   = jt.tools.map(tid => tById(tid)).filter(Boolean);
  const missing  = needed.filter(t => t.holder !== currentUser.id);
  return `
    <div class="job-site-card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
        <div><div class="bold" style="font-size:16px">${jt.name}</div><div class="small muted" style="margin-top:3px">${j.client || 'Client not set'}</div></div>
        ${bdg(j.status)}
      </div>
      <div class="small muted" style="margin-bottom:5px">Site address</div>
      <div class="bold" style="font-size:14px;margin-bottom:12px;padding:10px 14px;background:var(--color-bg-secondary);border-radius:var(--radius-md)">${j.site}</div>
      <div class="small muted" style="margin-bottom:16px">Scheduled: ${j.startDate}${isActive ? ' · Started: ' + j.startedAt : ''} · Est. duration: ${jt.duration}</div>
      ${isActive
        ? `<button class="btn btn-finish" onclick="finishJob('${j.id}')">Mark job complete</button>`
        : `<button class="btn btn-start"  onclick="startJob('${j.id}')">Start job — I'm on site now</button>`}
    </div>
    ${missing.length ? `<div class="strip strip-warn">You are missing ${missing.length} required tool(s). Collect them before starting.</div>` : '<div class="strip strip-ok">You have all required tools for this job.</div>'}
    <div class="sdiv">Required tools for this job</div>
    ${needed.length ? needed.map(t => {
      const have     = t.holder === currentUser.id;
      const isWhTool = t.owner === 'warehouse';
      const goView   = isWhTool ? 'w-warehouse' : 'w-borrow';
      const holderLabel = isWhTool
        ? (t.holder && t.holder !== '' ? 'Checked out to ' + uname(t.holder) : 'Available in warehouse')
        : (t.holder && t.holder !== '' ? 'With ' + uname(t.holder) : 'Owned by ' + uname(t.owner));
      return `<div class="card" style="display:flex;align-items:center;gap:12px">
        <span class="dot ${have ? 'dot-g' : 'dot-r'}" style="flex-shrink:0"></span>
        <div style="flex:1">
          <div class="bold" style="font-size:13px">${t.name}</div>
          <div class="small muted">${t.cat}${isWhTool ? ' \u00b7 Company tool' : ''} \u00b7 ${holderLabel}</div>
        </div>
        ${have ? '<span class="badge badge-green" style="font-size:10px">I have it</span>'
               : `<span class="badge badge-red" style="font-size:10px">Not with me</span>
                  <button class="btn btn-primary" style="font-size:10px;padding:4px 9px;margin-left:4px" onclick="go('${goView}')">Request</button>`}
      </div>`;})
    .join('') : '<div class="strip strip-warn">Tool list unavailable — contact admin to verify the job template.</div>'}` ;
}

async function startJob(jId)  {
  await dbUpdate(`jobs/${jId}`, { status: 'active', startedAt: todayStr() });
}
async function finishJob(jId) {
  const j  = jobsArr().find(x => x.id === jId);
  const jt = j ? jTpl(j.templateId) : null;
  await dbUpdate(`jobs/${jId}`, { status: 'completed', endDate: todayStr() });
  await dbNotify(currentUser.id, `Job complete: "${jt ? jt.name : 'Job'}". Remember to return all job kit tools.`, 'info');
  alert('Job marked complete. Remember to return all tools from this kit.');
}

/* -- Borrow from colleague -- */
function wBorrow() {
  const u      = currentUser;
  /* Only personal tools (not warehouse tools) show here */
  const peers  = toolsArr().filter(t => t.holder && t.holder !== '' && t.holder !== u.id && t.owner !== 'warehouse' && t.owner !== u.id);
  const found  = borrowSearch ? peers.filter(t =>
    t.name.toLowerCase().includes(borrowSearch.toLowerCase()) ||
    uname(t.holder).toLowerCase().includes(borrowSearch.toLowerCase()) ||
    t.cat.toLowerCase().includes(borrowSearch.toLowerCase())
  ) : [];
  return `
    <div class="strip strip-info">Search for a tool held by a colleague. Once you request it, they will approve or deny from their <strong>Notifications</strong> tab. After approval, go to <strong>Handover tab</strong> to complete collection with a PIN.</div>
    <div style="margin-bottom:14px">
      <input class="fi" id="bsrch" placeholder="Search by tool name, category, or worker name…"
        value="${borrowSearch}" oninput="borrowSearch=this.value;document.getElementById('blist').innerHTML=renderBorrowList()"
        style="width:100%;font-size:13px;padding:10px 14px"/>
    </div>
    <div id="blist">${renderBorrowList(found)}</div>`;
}

function renderBorrowList(list) {
  if (!borrowSearch) return '<div style="text-align:center;padding:32px 0;color:var(--color-text-tertiary);font-size:13px">Start typing to find a tool</div>';
  /* Called from oninput without args — compute the filtered list here */
  if (list === undefined) {
    const u = currentUser;
    const peers = toolsArr().filter(t => t.holder && t.holder !== '' && t.holder !== u.id && t.owner !== 'warehouse' && t.owner !== u.id);
    list = peers.filter(t =>
      t.name.toLowerCase().includes(borrowSearch.toLowerCase()) ||
      uname(t.holder).toLowerCase().includes(borrowSearch.toLowerCase()) ||
      t.cat.toLowerCase().includes(borrowSearch.toLowerCase())
    );
  }
  if (!list.length) return `<div style="text-align:center;padding:24px 0;color:var(--color-text-secondary);font-size:13px">No tools found matching "<strong>${borrowSearch}</strong>"</div>`;
  return list.map(t => `<div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
      <span class="bold" style="font-size:14px">${t.name}</span>
      ${condBdg(t.condition)}
    </div>
    <div class="small muted" style="margin-bottom:4px">Held by ${uname(t.holder)} · ${t.cat}</div>
    <div class="small muted" style="margin-bottom:10px">Replacement value: <strong class="val-o">${fmt(t.value)}</strong></div>
    <div class="strip strip-warn" style="margin-bottom:10px;font-size:11px">By requesting this tool you accept liability for <strong>${fmt(t.value)}</strong> if it is lost or damaged.</div>
    <button class="btn btn-primary" style="font-size:12px" onclick="sendBorrowReq('${t.id}','${t.holder}')">Request from ${ufirst(t.holder)}</button>
  </div>`).join('');
}

async function sendBorrowReq(toolId, holderId) {
  const t   = tById(toolId) || { name: '?', value: 0 };
  const id  = 'RQ' + Date.now();
  /* from = current holder (who must approve), to = requester */
  await dbSet(`requests/${id}`, {
    id, type: 'borrow_peer', toolId,
    from: holderId, to: currentUser.id,
    status: 'pending', pin: null, pinUsed: false,
    note: '', date: todayStr(),
  });
  await dbNotify(holderId,
    `${currentUser.name} wants to borrow your "${t.name}" (${fmt(t.value)}) — approve or deny below.`,
    'borrow_request', { reqId: id }
  );
  alert(`Request sent to ${ufirst(holderId)}. They will approve or deny from their Notifications tab.`);
  go('w-reqs');
}

/* -- Request from warehouse -- */
function wWarehouse() {
  const avail = toolsArr().filter(t => t.owner === 'warehouse' && t.status === 'warehouse');
  return `
    <div class="strip strip-info">These are company-owned tools stored in the warehouse. Submit a request — admin will approve or deny. Once approved, the tool is checked out to you.</div>
    ${avail.length ? avail.map(t => `<div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
        <span class="bold" style="font-size:14px">${t.name}</span>
        <span class="badge badge-blue" style="font-size:10px">Company tool</span>
      </div>
      <div class="small muted" style="margin-bottom:5px">${t.cat} · ${t.barcode} · ${condBdg(t.condition)}</div>
      <div class="small muted" style="margin-bottom:10px">Replacement value: <strong class="val-g">${fmt(t.value)}</strong></div>
      <button class="btn btn-primary" style="font-size:12px" onclick="reqWarehouse('${t.id}')">Request this tool</button>
    </div>`).join('') : '<div class="strip strip-ok">No tools available in the warehouse right now.</div>'}`;
}

async function reqWarehouse(toolId) {
  const t   = tById(toolId) || { name: '?' };
  /* Check not already requested */
  const dup = reqsArr().find(r => r.toolId === toolId && r.to === currentUser.id && r.status === 'pending');
  if (dup) { alert('You already have a pending request for this tool.'); return; }
  const id  = 'RQ' + Date.now();
  await dbSet(`requests/${id}`, {
    id, type: 'borrow_warehouse', toolId,
    from: 'warehouse', to: currentUser.id,
    status: 'pending', pin: null, pinUsed: false,
    note: '', date: todayStr(),
  });
  alert(`Request submitted for "${t.name}". Admin will review it shortly. You'll get a notification when approved.`);
  go('w-reqs');
}

/* -- My requests -- */
function wReqs() {
  const reqs = reqsArr().filter(r => r.to === currentUser.id).sort((a, b) => b.id > a.id ? 1 : -1);
  if (!reqs.length) return '<div style="text-align:center;padding:32px 0;color:var(--color-text-secondary)">No requests yet.</div>';
  return `<div class="tw"><table>
    <thead><tr>
      <th style="width:28%">Tool</th><th style="width:14%">Type</th>
      <th style="width:14%">Value</th><th style="width:14%">Date</th>
      <th style="width:14%">Status</th><th style="width:16%">Note</th>
    </tr></thead>
    <tbody>${reqs.map(r => {
      const t   = tById(r.toolId) || { name: '?', value: 0 };
      const typ = r.type === 'borrow_warehouse' ? '<span class="badge badge-blue" style="font-size:10px">Warehouse</span>'
                : r.type === 'borrow_peer'      ? '<span class="badge badge-gray" style="font-size:10px">Peer borrow</span>'
                : '<span class="badge badge-green" style="font-size:10px">Return</span>';
      return `<tr>
        <td class="bold">${t.name}</td>
        <td>${typ}</td>
        <td class="val-g">${fmt(t.value)}</td>
        <td class="small muted">${r.date}</td>
        <td>${bdg(r.status)}</td>
        <td class="small muted">${r.status === 'approved' && r.type === 'borrow_peer' && r.pin && !r.pinUsed ? 'Go to Handover tab' : '—'}</td>
      </tr>`;}).join('')}
    </tbody>
  </table></div>`;
}

/* -- Notifications -- */
function wNotifs() {
  const uid    = currentUser.id;
  const notifs = notifsArr(uid);
  markNotifsRead(uid);
  if (!notifs.length) return '<div style="text-align:center;padding:32px 0;color:var(--color-text-secondary)">No notifications yet.</div>';

  const typeClass = {
    borrow_request: 'notif-borrow',
    lend_pin:       'notif-pin',
    return_request: 'notif-return',
    return_pin:     'notif-pin',
    overdue:        'notif-overdue',
    recall:         'notif-recall',
    job:            'notif-job',
    info:           '',
  };

  return notifs.map(n => {
    let extra = '';

    /* Borrow request from colleague — show approve/deny if not yet actioned */
    if (n.type === 'borrow_request' && n.reqId && !n.actionTaken) {
      extra = `<div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn btn-green" style="font-size:12px;padding:6px 14px" onclick="approveBorrow('${n.reqId}','${n.id}')">Approve</button>
        <button class="btn btn-red"   style="font-size:12px;padding:6px 14px" onclick="denyBorrow('${n.reqId}','${n.id}')">Deny</button>
      </div>`;
    }

    /* Lend-out PIN — show prominently so worker can show it to borrower */
    if (n.type === 'lend_pin' && n.pin) {
      extra = `<div class="pin-box" style="margin-top:10px">
        <div class="small muted" style="margin-bottom:6px">Show this PIN to the borrower — they enter it in their Handover tab</div>
        <div class="pin-display">${n.pin}</div>
        <div class="small muted">One-time use</div>
      </div>`;
    }

    /* Return PIN — show so worker can show it to the tool owner */
    if (n.type === 'return_pin' && n.pin) {
      extra = `<div class="pin-box" style="margin-top:10px">
        <div class="small muted" style="margin-bottom:6px">Show this return PIN to the tool owner — they enter it in their Handover tab</div>
        <div class="pin-display">${n.pin}</div>
        <div class="small muted">One-time use</div>
      </div>`;
    }

    /* Return request — button to go to handover tab */
    if (n.type === 'return_request') {
      extra = `<div style="margin-top:10px"><button class="btn btn-primary" onclick="go('w-handover')">Go to Handover tab →</button></div>`;
    }

    return `<div class="notif-card ${typeClass[n.type] || ''}">
      <div class="bold" style="font-size:12px;margin-bottom:3px">${n.msg}</div>
      <div class="small muted">${n.date}</div>
      ${extra}
    </div>`;
  }).join('');
}

/* ================================================================
   HANDOVER ACTIONS
   ================================================================ */

/* Colleague approves borrow request from their notifications */
async function approveBorrow(reqId, notifId) {
  const r = reqsArr().find(x => x.id === reqId);
  if (!r) return;
  const t   = tById(r.toolId) || { name: '?', value: 0 };
  const pin = genPin();

  await dbUpdate(`requests/${reqId}`, { status: 'approved', pin });

  /* Update B's notification so buttons disappear */
  await dbUpdate(`notifications/${currentUser.id}/${notifId}`, {
    actionTaken: true,
    msg: `You approved ${uname(r.to).split(' ')[0]}'s request for "${t.name}" — show lend-out PIN below when doing the handover`,
  });

  /* Notify B (self) with the lend-out PIN — shown in their notifications */
  await dbNotify(currentUser.id,
    `Lend-out PIN for "${t.name}" → ${uname(r.to).split(' ')[0]} — show to them during handover`,
    'lend_pin', { pin }
  );

  /* Notify A that their request was approved */
  await dbNotify(r.to,
    `${currentUser.name} approved your request for "${t.name}". Go to the Handover tab to collect — ask ${uname(currentUser.id).split(' ')[0]} to show you the PIN.`,
    'info'
  );
}

/* Colleague denies borrow request */
async function denyBorrow(reqId, notifId) {
  const r = reqsArr().find(x => x.id === reqId);
  if (!r) return;
  const t = tById(r.toolId) || { name: '?' };
  await dbUpdate(`requests/${reqId}`, { status: 'denied' });
  await dbUpdate(`notifications/${currentUser.id}/${notifId}`, {
    actionTaken: true,
    msg: `You denied ${uname(r.to).split(' ')[0]}'s request for "${t.name}"`,
  });
  await dbNotify(r.to, `${currentUser.name} denied your request for "${t.name}".`, 'info');
}

/* Borrower (A) enters lend-out PIN to confirm collection */
async function enterLendPin(reqId) {
  const entered = ($(`lpin-${reqId}`) || {}).value || '';
  const r       = reqsArr().find(x => x.id === reqId);
  if (!r) return;
  const errEl = $(`lpin-err-${reqId}`);

  if (String(entered).trim() !== String(r.pin).trim()) {
    if (errEl) errEl.textContent = `Incorrect PIN. Ask ${ufirst(r.from)} to open their Notifications and show you the lend-out PIN.`;
    return;
  }

  const t   = tById(r.toolId) || { name: '?', condition: 'Good' };
  const aId = 'AL' + Date.now();

  await dbUpdate(`tools/${r.toolId}`, {
    holder: r.to, status: 'lent', since: todayStr(), dueBack: dueDate(14),
  });
  await dbUpdate(`requests/${reqId}`, { pinUsed: true, status: 'completed' });
  await dbSet(`auditLog/${aId}`, {
    id: aId, toolId: r.toolId, action: 'lent',
    from: r.from, to: r.to, date: todayStr(),
    conditionOut: t.condition || '', commentOut: '',
    conditionIn: '', commentIn: '',
    pin: r.pin, pinConfirmed: true,
  });
  await dbNotify(r.from,
    `${currentUser.name} confirmed collection of "${t.name}". Due back: ${dueDate(14)}.`,
    'info'
  );
}

/* Initiate return flow — sets HS so form shows in Handover tab */
function initiateReturn(toolId) {
  HS = { active: true, toolId, condition: '', comment: '' };
  currentView = 'w-handover';
  render();
}

function cancelReturn() {
  HS = { active: false, toolId: null, condition: '', comment: '' };
  render();
}

function setHSCondition(c) {
  const cmt = ($('hs-cmt') || {}).value || '';
  HS.condition = c;
  HS.comment   = cmt;
  render();
}

/* Worker returns a warehouse (company) tool — no PIN needed */
async function doReturnToWarehouse() {
  const cmt   = ($('hs-cmt') || {}).value || '';
  const toolId = HS.toolId;
  const t      = tById(toolId) || { name: '?', condition: 'Good' };
  const aId    = 'AW' + Date.now();

  /* FIX: Clear holder, reset status to 'warehouse', clear dueBack */
  await dbUpdate(`tools/${toolId}`, {
    holder: '', status: 'warehouse', since: '', dueBack: '', condition: HS.condition,
  });
  await dbSet(`auditLog/${aId}`, {
    id: aId, toolId, action: 'returned_to_warehouse',
    from: currentUser.id, to: 'warehouse', date: todayStr(),
    conditionOut: '', commentOut: '',
    conditionIn: HS.condition, commentIn: cmt,
    pin: '', pinConfirmed: false,
  });
  HS = { active: false, toolId: null, condition: '', comment: '' };
  render();
  alert(`"${t.name}" has been returned to the warehouse. Thank you!`);
}

/* Worker generates return PIN to return a personal tool to its owner */
async function generateReturnPin() {
  const cmt    = ($('hs-cmt') || {}).value || '';
  const toolId = HS.toolId;
  const t      = tById(toolId) || { name: '?', owner: '' };
  const pin    = genPin();
  const reqId  = 'RET' + Date.now();

  await dbSet(`requests/${reqId}`, {
    id: reqId, type: 'return_peer', toolId,
    from: currentUser.id, to: t.owner,
    status: 'awaiting_confirmation',
    returnPin: pin, conditionIn: HS.condition, commentIn: cmt,
    date: todayStr(), pinUsed: false,
  });

  /* A sees their return PIN in notifications to show to B */
  await dbNotify(currentUser.id,
    `Return PIN for "${t.name}" — show this to ${ufirst(t.owner)} so they can confirm receipt`,
    'return_pin', { pin }
  );

  /* B notified to go to Handover tab and enter the return PIN */
  await dbNotify(t.owner,
    `${currentUser.name} is returning your "${t.name}" — go to your Handover tab and enter their return PIN to confirm receipt`,
    'return_request', { reqId }
  );

  HS = { active: false, toolId: null, condition: '', comment: '' };
  render();
}

/* Tool owner (B) enters return PIN to confirm they received the tool */
async function enterReturnPin(reqId) {
  const entered = ($(`rpin-${reqId}`) || {}).value || '';
  const r       = reqsArr().find(x => x.id === reqId);
  if (!r) return;
  const errEl = $(`rpin-err-${reqId}`);

  if (String(entered).trim() !== String(r.returnPin).trim()) {
    if (errEl) errEl.textContent = `Incorrect PIN. Ask ${ufirst(r.from)} to open their Notifications and show you the return PIN.`;
    return;
  }

  const t   = tById(r.toolId) || { name: '?', condition: 'Good' };
  const aId = 'AR' + Date.now();

  /* FIX: Restore tool to owner, clear dueBack */
  await dbUpdate(`tools/${r.toolId}`, {
    holder: currentUser.id, status: 'with_owner',
    since: todayStr(), dueBack: '', condition: r.conditionIn,
  });
  await dbUpdate(`requests/${reqId}`, { status: 'completed', pinUsed: true });
  await dbSet(`auditLog/${aId}`, {
    id: aId, toolId: r.toolId, action: 'returned',
    from: r.from, to: r.to, date: todayStr(),
    conditionOut: '', commentOut: '',
    conditionIn: r.conditionIn, commentIn: r.commentIn,
    pin: r.returnPin, pinConfirmed: true,
  });
  await dbNotify(r.from,
    `${currentUser.name} confirmed receipt of "${t.name}". Return complete.`,
    'info'
  );
}

/* Owner recalls their tool from someone who borrowed it */
async function recallTool(toolId) {
  const t = tById(toolId) || { name: '?', value: 0 };
  await dbNotify(
    t.holder,
    `${currentUser.name} is recalling their "${t.name}" (${fmt(t.value)}) — please return it within 48 hours`,
    'recall'
  );
  alert(`48-hour recall notice sent to ${ufirst(t.holder)}.`);
}

/* ================================================================
   BOOT — session restore + seed + listeners
   ================================================================ */
async function boot() {
  /* Guard: check config has been filled in */
  if (FIREBASE_CONFIG.apiKey === 'PASTE_YOUR_apiKey_HERE') {
    $('root').innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f4f7fb;">
      <div style="background:#fff;border-radius:20px;padding:32px;max-width:440px;text-align:center;border:1px solid rgba(15,23,42,0.08);box-shadow:0 10px 30px rgba(15,23,42,0.08)">
        <div style="font-size:22px;font-weight:700;margin-bottom:12px;color:#0f172a">Firebase setup needed</div>
        <div style="font-size:14px;color:#64748b;line-height:1.7;margin-bottom:16px">
          Open <strong>app.js</strong> and paste your 7 Firebase config values into <code>FIREBASE_CONFIG</code> at the top of the file.
        </div>
        <div style="background:#f8fafc;border-radius:12px;padding:16px;font-family:monospace;font-size:12px;text-align:left;color:#475569;line-height:1.8">
          1. console.firebase.google.com → Add project<br>
          2. Build → Realtime Database → Create (Test mode)<br>
          3. Project Settings → web app → copy config<br>
          4. Paste 7 values into FIREBASE_CONFIG<br>
          5. Save → deploy to Vercel
        </div>
      </div>
    </div>`;
    return;
  }

  /* Seed database if first run, then start real-time listeners */
  await initDatabase();
  setupListeners();

  /* Restore login session from localStorage */
  const savedId = loadSession();
  if (savedId && USERS[savedId]) {
    currentUser = USERS[savedId];
    currentView = currentUser.role === 'admin' ? 'a-dash' : 'w-mytools';
  }
  /* render() will be called by the first Firebase listener response */
}

boot();

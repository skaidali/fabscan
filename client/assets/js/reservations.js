// Simple client-side weekly reservations calendar with predefined slots per machine.

// Storage keys
const MACHINE_KEY = 'fablab_machines_v1';
const RES_KEY = 'fablab_reservations_v1';

// default machines and hourly slots
function defaultMachines(){
  const makeSlots = () => {
    const s=[]; for(let h=8; h<20; h++) s.push(String(h).padStart(2,'0')+':00'); return s;
  };
  return {
    'laser-cutter': { id:'laser-cutter', label:'Laser cutter', slots: makeSlots() },
    '3d-printer': { id:'3d-printer', label:'3D printer', slots: makeSlots() },
    'cnc': { id:'cnc', label:'CNC router', slots: makeSlots() }
  };
}

// load machine defs from localStorage if present
function loadMachines(){
  try {
    const raw = localStorage.getItem(MACHINE_KEY);
    if(raw){
      const arr = JSON.parse(raw);
      const obj = {};
      if(Array.isArray(arr)){
        arr.forEach(m=>{ obj[m.id||m.key||m.name]= { id:m.id||m.key||m.name, label:m.name||m.label||m.id, slots: Array.isArray(m.slots)&&m.slots.length?m.slots:[] }});
      }
      return Object.keys(obj).length?obj:defaultMachines();
    }
  } catch(e){ console.warn('machines load failed',e) }
  return defaultMachines();
}

const machines = loadMachines();

// reservations: simple objects {id, machine, date:'YYYY-MM-DD', time:'HH:MM', name, email, reason}
function loadReservations(){
  try{ const raw = localStorage.getItem(RES_KEY); if(raw) return JSON.parse(raw); }catch(e){console.warn('load res',e)}
  return [];
}
function saveReservations(list){ localStorage.setItem(RES_KEY, JSON.stringify(list)); }

let reservations = loadReservations();

// DOM refs
const calendarRoot = document.getElementById('calendarRoot');
const weekRange = document.getElementById('weekRange');
const machineFilter = document.getElementById('machineFilter');

const prevWeek = document.getElementById('prevWeek');
const nextWeek = document.getElementById('nextWeek');
const todayBtn = document.getElementById('todayBtn');

const addBtn = document.getElementById('addBtn');
const addModal = document.getElementById('addModal');
const rDate = document.getElementById('r-date');
const rMachine = document.getElementById('r-machine');
const rTime = document.getElementById('r-time');
const rName = document.getElementById('r-name');
const rEmail = document.getElementById('r-email');
const rReason = document.getElementById('r-reason');
const addSave = document.getElementById('addSave');
const addCancel = document.getElementById('addCancel');

const viewModal = document.getElementById('viewModal');
const viewContent = document.getElementById('viewContent');
const viewClose = document.getElementById('viewClose');
const viewDelete = document.getElementById('viewDelete');

// week state
function getWeekStart(d){ const date=new Date(d); date.setHours(0,0,0,0); const day=(date.getDay()+6)%7; date.setDate(date.getDate()-day); return date; }
let current = getWeekStart(new Date());

function formatShort(d){ return d.toLocaleDateString(undefined,{day:'numeric',month:'short'}); }
function toYMD(d){ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}` }

function render(){
  calendarRoot.innerHTML = '';
  // headers: empty machine-col header then weekdays
  const blank = document.createElement('div'); blank.className='header'; calendarRoot.appendChild(blank);
  const weekStart = new Date(current);
  const days = [];
  for(let i=0;i<7;i++){ const d=new Date(weekStart); d.setDate(weekStart.getDate()+i); days.push(d); const h=document.createElement('div'); h.className='header weekday'; h.innerHTML=`${d.toLocaleDateString(undefined,{weekday:'short'})}<br><small>${formatShort(d)}</small>`; calendarRoot.appendChild(h); }
  weekRange.textContent = `${formatShort(weekStart)} – ${formatShort(new Date(weekStart.getFullYear(),weekStart.getMonth(),weekStart.getDate()+6))}`;

  const filter = machineFilter.value;
  // build machine column and day cells per machine
  const machineKeys = Object.keys(machines).filter(k=>!filter||filter===k);

  machineKeys.forEach(mid=>{
    const m = machines[mid];
    // machine name cell
    const mCell = document.createElement('div'); mCell.className='machine-cell'; mCell.innerHTML=`<div class="machine-name">${m.label}</div><div class="muted">${m.id}</div>`; calendarRoot.appendChild(mCell);
    // for each day create a cell with slots
    days.forEach(d=>{
      const cell = document.createElement('div'); cell.className='day-cell';
      const dateStr = toYMD(d);
      const slotsWrap = document.createElement('div'); slotsWrap.className='slots';
      (m.slots||[]).forEach(time=>{
        const existing = reservations.find(r=>r.machine===mid && r.date===dateStr && r.time===time);
        const s = document.createElement('div'); s.className='slot '+(existing?'booked':'vacant'); s.classList.add('small'); s.textContent = time.replace(':00','');
        s.title = existing? `${existing.name} — ${existing.time}` : `Vacant ${m.label} ${time}`;
        s.addEventListener('click', (ev)=>{ ev.stopPropagation(); if(existing) openView(existing); else openAdd({date:dateStr,machine:mid,time}); });
        slotsWrap.appendChild(s);
      });
      cell.appendChild(slotsWrap);
      calendarRoot.appendChild(cell);
    });
  });
}

// populate machine filter and add-machine select
function populateMachineControls(){
  machineFilter.innerHTML = '<option value="">All machines</option>';
  rMachine.innerHTML = '';
  Object.keys(machines).forEach(k=>{
    const m = machines[k];
    const opt = document.createElement('option'); opt.value=k; opt.textContent = m.label; machineFilter.appendChild(opt);
    const opt2 = document.createElement('option'); opt2.value=k; opt2.textContent = m.label; rMachine.appendChild(opt2);
  });
}

// Open add modal with optional prefill
function openAdd(prefill){
  rDate.value = prefill && prefill.date ? prefill.date : toYMD(new Date());
  rMachine.value = prefill && prefill.machine ? prefill.machine : (Object.keys(machines)[0]||'');
  // fill time options from machine slots
  fillTimeOptions(rMachine.value);
  if(prefill && prefill.time){ rTime.value = prefill.time; }
  rName.value=''; rEmail.value=''; rReason.value='';
  addModal.classList.add('open'); addModal.setAttribute('aria-hidden','false');
}

function closeAdd(){ addModal.classList.remove('open'); addModal.setAttribute('aria-hidden','true'); }

function fillTimeOptions(machineId){ rTime.innerHTML=''; const m = machines[machineId]; if(!m) return; (m.slots||[]).forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t; rTime.appendChild(o); }); }

function addReservationFromForm(){
  const obj = { id: Date.now(), machine: rMachine.value, date: rDate.value, time: rTime.value, name: rName.value.trim(), email: rEmail.value.trim(), reason: rReason.value.trim() };
  if(!obj.name){ alert('Please provide a name'); return; }
  // prevent double-book
  const exists = reservations.find(r=>r.machine===obj.machine && r.date===obj.date && r.time===obj.time);
  if(exists){ alert('This slot is already booked'); return; }
  reservations.push(obj); saveReservations(reservations); closeAdd(); render();
}

// View reservation
let activeView = null;
function openView(r){ activeView = r; viewContent.innerHTML = `
  <p><strong>${r.name}</strong> — ${r.machine} <span class="muted">${r.date} ${r.time}</span></p>
  <p><strong>Email:</strong> ${r.email||'<em>—</em>'}</p>
  <p><strong>Reason:</strong> ${r.reason||'<em>—</em>'}</p>`; viewModal.classList.add('open'); viewModal.setAttribute('aria-hidden','false'); }
function closeView(){ viewModal.classList.remove('open'); viewModal.setAttribute('aria-hidden','true'); activeView=null; }
function deleteActive(){ if(!activeView) return; if(!confirm('Delete reservation?')) return; reservations = reservations.filter(r=>r.id!==activeView.id); saveReservations(reservations); closeView(); render(); }

// wire controls
prevWeek.addEventListener('click', ()=>{ current.setDate(current.getDate()-7); current = getWeekStart(current); render(); });
nextWeek.addEventListener('click', ()=>{ current.setDate(current.getDate()+7); current = getWeekStart(current); render(); });
todayBtn.addEventListener('click', ()=>{ current = getWeekStart(new Date()); render(); });
machineFilter.addEventListener('change', ()=>render());

addBtn.addEventListener('click', ()=> openAdd());
addCancel.addEventListener('click', ()=> closeAdd());
addSave.addEventListener('click', ()=> addReservationFromForm());
rMachine.addEventListener('change', ()=> fillTimeOptions(rMachine.value));

viewClose.addEventListener('click', ()=> closeView());
viewDelete.addEventListener('click', ()=> deleteActive());

// close modals on overlay click or Esc
document.querySelectorAll('.modal').forEach(m=>{ m.addEventListener('click', e=>{ if(e.target===m){ m.classList.remove('open'); m.setAttribute('aria-hidden','true'); } }); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ document.querySelectorAll('.modal.open').forEach(m=>{ m.classList.remove('open'); m.setAttribute('aria-hidden','true'); }); } });

// initial setup
populateMachineControls(); render();

// expose a small helper for debugging
window._reservations_save = ()=>{ saveReservations(reservations); alert('saved'); };

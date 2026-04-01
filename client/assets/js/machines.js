// machines stored in localStorage for now
const STORAGE_KEY = 'fablab_machines_v1';
let machines = [];
let currentMachineId = null;

function loadMachines(){
    try{
        const raw = localStorage.getItem(STORAGE_KEY);
        machines = raw ? JSON.parse(raw) : [];
    }catch(e){ machines = []; }
    if(machines.length === 0){
        // default machines
        machines = [
            {id: 'laser-cutter', name:'Laser cutter', type:'laser-cutter', desc:'Découpe laser', slots:[]},
            {id: '3d-printer', name:'3D printer', type:'3d-printer', desc:'Impression 3D', slots:[]},
            {id: 'cnc', name:'CNC router', type:'cnc', desc:'Fraiseuse CNC', slots:[]}
        ];
        saveMachines();
    }
}

function saveMachines(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(machines));
}

function renderMachines(){
    const ul = document.getElementById('machines');
    ul.innerHTML = '';
    machines.forEach(m => {
        const li = document.createElement('li');
        li.innerHTML = `<div>
                <div style="font-weight:700">${m.name}</div>
                <div class="small">Type: ${m.type} ${m.desc?'- '+m.desc:''}</div>
            </div>
            <div style="display:flex;gap:0.4rem">
                <button class="btn" data-id="${m.id}" data-action="view">Voir créneaux</button>
                <button class="btn" data-id="${m.id}" data-action="add-slot">Ajouter créneau</button>
                <button class="btn" data-id="${m.id}" data-action="remove">Supprimer</button>
            </div>`;
        ul.appendChild(li);
    });
}

function openAddModal(){ document.getElementById('add-modal').style.display = 'flex'; }
function closeAddModal(){ document.getElementById('add-modal').style.display = 'none'; }

document.getElementById('add-machine-btn').addEventListener('click', ()=>{ openAddModal(); });
document.getElementById('close-add').addEventListener('click', closeAddModal);
document.getElementById('cancel-machine').addEventListener('click', closeAddModal);

document.getElementById('save-machine').addEventListener('click', ()=>{
    const name = document.getElementById('machine-name').value.trim();
    const type = document.getElementById('machine-type').value;
    const desc = document.getElementById('machine-desc').value.trim();
    if(!name){ alert('Nom requis'); return; }
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    machines.push({id,name,type,desc,slots:[]});
    saveMachines(); renderMachines(); closeAddModal();
    document.getElementById('machine-name').value=''; document.getElementById('machine-desc').value='';
});

document.getElementById('machines').addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    const idx = machines.findIndex(m=>m.id===id);
    if(idx === -1) return;
    if(action === 'view'){
        currentMachineId = id; showSlotsFor(machines[idx]);
    }else if(action === 'remove'){
        if(confirm('Supprimer la machine et ses créneaux ?')){
            machines.splice(idx,1); saveMachines(); renderMachines();
        }
    }else if(action === 'add-slot'){
        currentMachineId = id; showSlotsFor(machines[idx]);
        // prefill date/time with now
        const now = new Date();
        document.getElementById('slot-date').value = now.toISOString().slice(0,10);
        document.getElementById('slot-start').value = String(now.getHours()).padStart(2,'0')+':00';
        document.getElementById('slot-end').value = String((now.getHours()+1)%24).padStart(2,'0')+':00';
    }
});

function showSlotsFor(machine){
    document.getElementById('slots-card').style.display = 'block';
    document.getElementById('slots-title').textContent = `Créneaux – ${machine.name}`;
    document.getElementById('slots-sub').textContent = `Type: ${machine.type}`;
    renderSlots(machine);
}

document.getElementById('close-slots').addEventListener('click', ()=>{ document.getElementById('slots-card').style.display='none'; currentMachineId=null; });

function renderSlots(machine){
    const container = document.getElementById('slots-list');
    container.innerHTML = '';
    if(!machine.slots || machine.slots.length===0){ container.innerHTML = '<div class="muted">Aucun créneau défini.</div>'; return; }
    // sort by date
    const sorted = machine.slots.slice().sort((a,b)=> new Date(a.date+'T'+a.start) - new Date(b.date+'T'+b.start));
    sorted.forEach((s, i) =>{
        const div = document.createElement('div');
        div.className = 'slot';
        div.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${s.date}</strong> ${s.start}–${s.end} <span class="small">[${s.type}]</span></div><div><button class="btn" data-idx="${i}" id="remove-slot">Supprimer</button></div></div>`;
        container.appendChild(div);
    });
}

document.getElementById('add-slot-btn').addEventListener('click', ()=>{
    if(!currentMachineId) return alert('Machine non sélectionnée');
    const date = document.getElementById('slot-date').value;
    const start = document.getElementById('slot-start').value;
    const end = document.getElementById('slot-end').value;
    const type = document.getElementById('slot-type').value;
    if(!date || !start || !end){ alert('Date et heures requises'); return; }
    const m = machines.find(x=>x.id===currentMachineId);
    if(!m) return;
    m.slots = m.slots || [];
    m.slots.push({date,start,end,type});
    saveMachines(); renderSlots(m);
});

// handle remove slot by delegation
document.getElementById('slots-list').addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    if(btn.id !== 'remove-slot') return;
    const idx = Number(btn.dataset.idx);
    const m = machines.find(x=>x.id===currentMachineId);
    if(!m) return;
    if(confirm('Supprimer ce créneau ?')){
        m.slots.splice(idx,1); saveMachines(); renderSlots(m);
    }
});

document.getElementById('import-sample').addEventListener('click', ()=>{
    machines.push({id:'vinyl-cutter',name:'Vinyl cutter',type:'vinyl-cutter',desc:'Découpe vinyle',slots:[{date:new Date().toISOString().slice(0,10),start:'10:00',end:'11:00',type:'horaire'}]});
    machines.push({id:'electronics-bench',name:'Electronics bench',type:'electronics-bench',desc:'Atelier électronique',slots:[]});
    saveMachines(); renderMachines();
});

// init
loadMachines(); renderMachines();

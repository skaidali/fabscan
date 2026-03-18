// Client uses server API (MACHINES table) as primary persistence. No localStorage fallback.
let machines = [];
let currentMachineId = null;
let serverAvailable = true;

async function fetchMachinesFromServer(){
    try{
        const res = await fetch('/api/machines');
        if(!res.ok) throw new Error('API unavailable');
        const data = await res.json();
        serverAvailable = true; updateApiStatus();
        return data.items || [];
    }catch(e){ serverAvailable = false; updateApiStatus(); return null; }
}

async function createMachineOnServer(m){
    try{
        const res = await fetch('/api/machines', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(m)});
        if(!res.ok) throw new Error('create failed');
        return await res.json();
    }catch(e){ serverAvailable=false; updateApiStatus(); return null; }
}


function updateApiStatus(){
    const el = document.getElementById('api-status');
    if(!el) return;
    if(serverAvailable){ el.textContent = 'Serveur: disponible'; el.style.color = '#22863a'; }
    else { el.textContent = 'Serveur: indisponible — certaines actions désactivées'; el.style.color = '#d9534f'; }
    // update main action buttons enabled state
    const addBtn = document.getElementById('add-machine-btn'); if(addBtn) addBtn.disabled = !serverAvailable;
    const importBtn = document.getElementById('import-sample'); if(importBtn) importBtn.disabled = !serverAvailable;
    const addSlotBtn = document.getElementById('add-slot-btn'); if(addSlotBtn) addSlotBtn.disabled = !serverAvailable;
}

async function updateMachineOnServer(m){
    try{
        const res = await fetch('/api/machines_update', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(m)});
        if(!res.ok) throw new Error('update failed');
        return await res.json();
    }catch(e){ serverAvailable=false; updateApiStatus(); return null; }
}

async function deleteMachineOnServer(id){
    try{
        const res = await fetch(`/api/machines/${encodeURIComponent(id)}`, {method:'DELETE'});
        if(!res.ok) throw new Error('delete failed');
        return await res.json();
    }catch(e){ serverAvailable=false; updateApiStatus(); return null; }
}

// localStorage fallback removed — server is the single source of truth

function renderMachines(){
    const ul = document.getElementById('machines'); ul.innerHTML='';
    if(!machines || machines.length===0){ ul.innerHTML = '<div class="muted">Aucune machine disponible.</div>'; return; }
    machines.forEach(m => {
        const li = document.createElement('li');
        li.innerHTML = `<div><div style="font-weight:700">${m.name}</div><div class="small">Type: ${m.type} ${m.desc?'- '+m.desc:''}</div></div><div style="display:flex;gap:0.4rem"><button class="btn" data-id="${m.id}" data-action="view">Voir créneaux</button><button class="btn" data-id="${m.id}" data-action="add-slot">Ajouter créneau</button><button class="btn" data-id="${m.id}" data-action="remove">Supprimer</button></div>`;
        ul.appendChild(li);
    });
}

function openAddModal(){ document.getElementById('add-modal').style.display = 'flex'; }
function closeAddModal(){ document.getElementById('add-modal').style.display = 'none'; }

document.getElementById('add-machine-btn').addEventListener('click', ()=>{ openAddModal(); });
document.getElementById('close-add').addEventListener('click', closeAddModal);
document.getElementById('cancel-machine').addEventListener('click', closeAddModal);

document.getElementById('save-machine').addEventListener('click', async ()=>{
    const name = document.getElementById('machine-name').value.trim();
    const type = document.getElementById('machine-type').value;
    const desc = document.getElementById('machine-desc').value.trim();
    if(!name){ alert('Nom requis'); return; }
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    const m = { id, name, type, desc, slots: [] };
    if(serverAvailable){
        const r = await createMachineOnServer({id:id,name:name,type:type,slots:[]});
        if(r && r.success){
            // reload authoritative list from server
            await loadMachines();
        } else {
            // server failed unexpectedly — mark unavailable and notify
            serverAvailable = false; updateApiStatus();
            alert('Impossible de créer sur le serveur. Veuillez réessayer plus tard.');
            return;
        }
    } else {
        alert('Serveur indisponible — impossible de créer une machine pour le moment.');
        return;
    }
    closeAddModal(); document.getElementById('machine-name').value=''; document.getElementById('machine-desc').value='';
});

document.getElementById('machines').addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    const id = btn.dataset.id; const action = btn.dataset.action;
    const idx = machines.findIndex(m=>m.id===id);
    if(idx === -1) return;
    if(action === 'view'){ currentMachineId = id; showSlotsFor(machines[idx]); }
    else if(action === 'remove'){
        if(!confirm('Supprimer la machine et ses créneaux ?')) return;
        if(serverAvailable){
            deleteMachineOnServer(id).then(r=>{
                if(r && r.success){ loadMachines(); }
                else { serverAvailable = false; updateApiStatus(); alert('Erreur suppression sur le serveur. Réessayez plus tard.'); }
            });
        } else {
            alert('Serveur indisponible — impossible de supprimer la machine.');
        }
    }else if(action === 'add-slot'){ currentMachineId = id; showSlotsFor(machines[idx]); const now = new Date(); document.getElementById('slot-date').value = now.toISOString().slice(0,10); document.getElementById('slot-start').value = String(now.getHours()).padStart(2,'0')+':00'; document.getElementById('slot-end').value = String((now.getHours()+1)%24).padStart(2,'0')+':00'; }
});

function showSlotsFor(machine){ document.getElementById('slots-card').style.display = 'block'; document.getElementById('slots-title').textContent = `Créneaux – ${machine.name}`; document.getElementById('slots-sub').textContent = `Type: ${machine.type}`; renderSlots(machine); }
document.getElementById('close-slots').addEventListener('click', ()=>{ document.getElementById('slots-card').style.display='none'; currentMachineId=null; });

function renderSlots(machine){ const container = document.getElementById('slots-list'); container.innerHTML = ''; if(!machine.slots || machine.slots.length===0){ container.innerHTML = '<div class="muted">Aucun créneau défini.</div>'; return; } const sorted = machine.slots.slice().sort((a,b)=> new Date(a.date+'T'+a.start) - new Date(b.date+'T'+b.start)); sorted.forEach((s, i) =>{ const div = document.createElement('div'); div.className = 'slot'; div.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${s.date}</strong> ${s.start}–${s.end} <span class="small">[${s.type}]</span></div><div><button class="btn" data-idx="${i}" id="remove-slot">Supprimer</button></div></div>`; container.appendChild(div); }); }

document.getElementById('add-slot-btn').addEventListener('click', async ()=>{
    if(!currentMachineId) return alert('Machine non sélectionnée');
    const date = document.getElementById('slot-date').value; const start = document.getElementById('slot-start').value; const end = document.getElementById('slot-end').value; const type = document.getElementById('slot-type').value;
    if(!date || !start || !end){ alert('Date et heures requises'); return; }
    const mIndex = machines.findIndex(x=>x.id===currentMachineId); if(mIndex===-1) return;
    const slot = {date,start,end,type};
    if(serverAvailable){
        // prepare new slots array and send to server; avoid mutating local until success
        const newSlots = (machines[mIndex].slots || []).concat([slot]);
        const r = await updateMachineOnServer({id: machines[mIndex].id, slots: newSlots});
        if(r && r.success){
            await loadMachines();
            showSlotsFor(machines.find(x=>x.id===currentMachineId));
        } else {
            serverAvailable = false; updateApiStatus();
            alert('Erreur de sauvegarde sur le serveur. Réessayez plus tard.');
            return;
        }
    } else {
        alert('Serveur indisponible — impossible d\'ajouter un créneau.');
        return;
    }
});

// handle remove slot by delegation
document.getElementById('slots-list').addEventListener('click', async (e)=>{
    const btn = e.target.closest('button'); if(!btn) return; if(btn.id !== 'remove-slot') return; const idx = Number(btn.dataset.idx); const mIndex = machines.findIndex(x=>x.id===currentMachineId); if(mIndex===-1) return; if(!confirm('Supprimer ce créneau ?')) return;
    if(serverAvailable){
        const newSlots = (machines[mIndex].slots || []).slice(); newSlots.splice(idx,1);
        const r = await updateMachineOnServer({id: machines[mIndex].id, slots: newSlots});
        if(r && r.success){ await loadMachines(); showSlotsFor(machines.find(x=>x.id===currentMachineId)); }
        else { serverAvailable=false; updateApiStatus(); alert('Erreur suppression de créneau sur le serveur.'); }
    } else {
        alert('Serveur indisponible — impossible de supprimer ce créneau.');
        return;
    }
});

document.getElementById('import-sample').addEventListener('click', async ()=>{
    const sample = [{id:'vinyl-cutter',name:'Vinyl cutter',type:'vinyl-cutter',desc:'Découpe vinyle',slots:[{date:new Date().toISOString().slice(0,10),start:'10:00',end:'11:00',type:'horaire'}]},{id:'electronics-bench',name:'Electronics bench',type:'electronics-bench',desc:'Atelier électronique',slots:[] }];
    if(serverAvailable){
        for(const m of sample){ await createMachineOnServer(m); }
        await loadMachines();
    }else{ alert('Serveur indisponible — impossible d\'importer des machines d\'exemple.'); }
});

async function loadMachines(){
    const srv = await fetchMachinesFromServer();
    if(srv){ machines = srv.map(m=>({ id:m.id, name:m.name||m.label||m.id, type:m.type||'', desc:'', slots:m.slots||[] })); renderMachines(); }
    else { machines = []; updateApiStatus(); renderMachines(); }
}

// init
loadMachines();

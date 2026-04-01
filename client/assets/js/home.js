document.getElementById('time').textContent = 'Heure client : ' + new Date().toLocaleString();

const apiBase = '/api';

function isToday(d){
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

async function fetchTodayActions(){
    const listEl = document.getElementById('actions');
    listEl.innerHTML = '<li class="muted">Chargement…</li>';
    const items = [];

    // 1) Arrivals (ENTREE)
    try{
        const r = await fetch(apiBase + '/entries?limit=1000');
        if(r.ok){
            const entries = await r.json();
            entries.forEach(e => {
                const d = new Date(e.date);
                if(isToday(d)){
                    items.push({time:d, type:'arrivée', text:`Arrivée: ${e.prenom} ${e.nom} — ${e.type_projet || '—'} ${e.zone_travail?('['+e.zone_travail+']'):''}`});
                }
            });
        }
    }catch(err){ console.error('entries', err); }

    // 2) Registrations (users) — server doesn't store created_at, but add_user generates timestamp-like id (YYYYMMDD...)
    try{
        const r2 = await fetch(apiBase + '/users?page=1&page_size=1000');
        if(r2.ok){
            const data = await r2.json();
            const users = data.items || [];
            const todayPrefix = new Date().toISOString().slice(0,10).replace(/-/g,''); // YYYYMMDD
            users.forEach(u => {
                if(u.id && String(u.id).startsWith(todayPrefix)){
                    // derive time from id if possible: YYYYMMDDHHMMSSmmm
                    const id = String(u.id);
                    let timeText = '';
                    if(id.length >= 14){
                        const hh = id.substr(8,2), mm = id.substr(10,2), ss = id.substr(12,2);
                        timeText = ` à ${hh}:${mm}:${ss}`;
                    }
                    items.push({time:new Date(), type:'inscription', text:`Inscription: ${u.prenom} ${u.nom}${timeText}`});
                }
            });
        }
    }catch(err){ console.error('users', err); }

    // 3) Bills — attempt to fetch /api/bills (may not exist)
    try{
        const rb = await fetch(apiBase + '/bills?limit=100');
        if(rb.ok){
            const bills = await rb.json();
            bills.forEach(b => {
                const d = new Date(b.date || b.created_at || Date.now());
                if(isToday(d)) items.push({time:d,type:'facture', text:`Facture: ${b.client || b.name || '—'} — ${b.amount?b.amount+'€':''}`});
            });
        }
    }catch(err){ /* ignore, bills API likely missing */ }

    // 4) Reservations — try /api/reservations
    try{
        const rr = await fetch(apiBase + '/reservations?limit=1000');
        if(rr.ok){
            const res = await rr.json();
            res.forEach(r => {
                const d = new Date(r.date || r.start || Date.now());
                if(isToday(d)) items.push({time:d,type:'réservation', text:`Réservation: ${r.name || r.user || '—'} — ${r.machine || r.zone || r.resource || ''}`});
            });
        }
    }catch(err){ /* ignore if not implemented */ }

    // Sort by time descending
    items.sort((a,b)=>b.time - a.time);

    // Render
    if(items.length === 0){
        listEl.innerHTML = '<li class="muted">Aucune action enregistrée aujourd\'hui.</li>';
        return;
    }
    listEl.innerHTML = '';
    items.forEach(it => {
        const li = document.createElement('li');
        const t = it.time instanceof Date ? it.time.toLocaleTimeString() : new Date(it.time).toLocaleTimeString();
        li.innerHTML = `<div><strong>[${it.type}]</strong> ${it.text}</div><div class="muted">${t}</div>`;
        listEl.appendChild(li);
    });
}

document.getElementById('refresh-actions').addEventListener('click', fetchTodayActions);

// Initial load
fetchTodayActions();
// Fetch stats from server and entries, then compute charts
const apiBase = '/api';
let fullEntries = [];
let currentRange = 'week'; // or 'month'

async function fetchStats(){
    try{
        const s = await fetch(apiBase + '/stats');
        const stats = await s.json();
        document.getElementById('today-count').textContent = stats.today_entries ?? '—';
        document.getElementById('week-count').textContent = stats.week_entries ?? '—';
        document.getElementById('total-count').textContent = stats.total_entries ?? '—';
    }catch(e){
        console.error('stats fetch', e);
    }
}

async function fetchEntries(){
    try{
        // request a large limit so we can compute month view
        const r = await fetch(apiBase + '/entries?limit=1000');
        const arr = await r.json();
        // normalize: expect objects {date, statut, nom, prenom, type_projet, zone_travail, commentaire}
        fullEntries = arr.map(e => ({
            date: new Date(e.date),
            nom: e.nom,
            prenom: e.prenom,
            zone: e.zone_travail || e.zone || '',
            projet: e.type_projet || e.projet || '',
            commentaire: e.commentaire || ''
        }));
        renderEntriesTable();
        computeAndRender();
    }catch(e){
        console.error('entries fetch', e);
    }
}

function computeAndRender(){
    // determine date range days
    const now = new Date();
    const days = currentRange === 'week' ? 7 : 30;
    const buckets = [];
    for(let i=days-1;i>=0;i--){
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        d.setHours(0,0,0,0);
        buckets.push({date:d,count:0});
    }

    const zoneCounts = {};

    fullEntries.forEach(e => {
        const d = new Date(e.date);
        d.setHours(0,0,0,0);
        // count in buckets
        const diffDays = Math.round((d - buckets[0].date)/(1000*60*60*24));
        if(diffDays >= 0 && diffDays < buckets.length){
            buckets[diffDays].count++;
        }
        const z = e.zone || e.zone_travail || e.zone || 'Autre';
        zoneCounts[z] = (zoneCounts[z] || 0) + 1;
    });

    renderActivityChart(buckets);
    renderZoneList(zoneCounts);
}

function renderActivityChart(buckets){
    const chart = document.getElementById('activity-chart');
    const xlabels = document.getElementById('activity-xlabels');
    chart.innerHTML = '';
    xlabels.innerHTML = '';
    const max = Math.max(1, ...buckets.map(b=>b.count));
    buckets.forEach(b => {
        const h = Math.round((b.count / max) * 100);
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = (h + '%');
        bar.innerHTML = `<div class="label">${b.count}</div>`;
        chart.appendChild(bar);
        const lbl = document.createElement('div');
        lbl.textContent = b.date.toLocaleDateString(undefined, {weekday:'short', day:'numeric'});
        xlabels.appendChild(lbl);
    });
    document.getElementById('range-label').textContent = currentRange === 'week' ? '7 derniers jours' : '30 derniers jours';
}

function renderZoneList(zoneCounts){
    const list = document.getElementById('zone-list');
    list.innerHTML = '';
    const total = Object.values(zoneCounts).reduce((s,v)=>s+v,0);
    document.getElementById('zone-total').textContent = total;
    const entries = Object.entries(zoneCounts).sort((a,b)=>b[1]-a[1]);
    entries.forEach(([zone,count])=>{
        const pct = total ? Math.round((count/total)*100) : 0;
        const div = document.createElement('div');
        div.style.display='flex'; div.style.justifyContent='space-between'; div.style.padding='6px 0';
        div.innerHTML = `<div>${zone}</div><div>${count} <span class="muted">(${pct} %)</span></div>`;
        list.appendChild(div);
    });
}

function renderEntriesTable(){
    const tbody = document.querySelector('#entries-table tbody');
    tbody.innerHTML = '';
    fullEntries.slice(0,50).forEach(e=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${e.date.toLocaleString()}</td><td>${e.prenom} ${e.nom}</td><td>${e.zone}</td><td>${e.projet}</td>`;
        tbody.appendChild(tr);
    });
    document.getElementById('entries-note').textContent = `Affiche ${Math.min(50, fullEntries.length)} dernières entrées`;
}

// UI wiring
document.getElementById('refresh-btn').addEventListener('click', ()=>{ fetchStats(); fetchEntries(); });
document.getElementById('toggle-range').addEventListener('click', (e)=>{
    currentRange = currentRange === 'week' ? 'month' : 'week';
    e.target.textContent = currentRange === 'week' ? 'Afficher: Semaine' : 'Afficher: Mois';
    computeAndRender();
});

// initial load
fetchStats();
fetchEntries();
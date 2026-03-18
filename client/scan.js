// helpers
function renderScanned(data){
    const out = document.getElementById('scanned-info');
    out.innerHTML = '';
    const rows = [];
    for(const k of ['id','name','email','type']){
        if(data[k]) rows.push(`<div class="field"><strong>${k}:</strong> <span class="big">${data[k]}</span></div>`);
    }
    if(rows.length===0) rows.push('<div class="field"><span class="muted">No structured data</span></div>');
    out.innerHTML = rows.join('');

    // populate form fields
    if(data.name) document.getElementById('member-name').value = data.name;
    if(data.id) document.getElementById('member-id').value = data.id;
}

function parseScan(payload){
    // payload can be JSON or simple id or delimited string
    let data = { raw: payload };
    payload = payload.trim();
    // JSON
    if((payload.startsWith('{') && payload.endsWith('}')) || payload.startsWith('[')){
        try{
            const obj = JSON.parse(payload);
            data = Object.assign(data, obj);
            data.type = 'qr-json';
            return data;
        }catch(e){ /* fallthrough */ }
    }
    // common QR formats: id:name:email or id|name|email
    const sep = payload.includes(':') ? ':' : (payload.includes('|') ? '|' : null);
    if(sep){
        const parts = payload.split(sep).map(s=>s.trim());
        if(parts.length>=1) data.id = parts[0];
        if(parts.length>=2) data.name = parts[1];
        if(parts.length>=3) data.email = parts[2];
        data.type = 'qr-delim';
        return data;
    }
    // fallback: treat as rfid id string
    data.id = payload;
    data.type = 'rfid';
    return data;
}

// simulate actions
document.getElementById('simulate-qr').addEventListener('click', ()=>{
    const sample = JSON.stringify({id:'20260318131139806', name:'Kaidali', email:'skander.kaidali@etu.ec-lyon.fr'});
    const parsed = parseScan(sample);
    renderScanned(parsed);
});
document.getElementById('simulate-rfid').addEventListener('click', ()=>{
    const sample = 'RFID-7C:89:AA:10';
    const parsed = parseScan(sample);
    renderScanned(parsed);
});

// manual input (keyboard-wedge scanners often paste + Enter)
const manual = document.getElementById('manual-input');
manual.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
        e.preventDefault();
        const p = manual.value.trim();
        if(!p) return;
        const parsed = parseScan(p);
        renderScanned(parsed);
        manual.value = '';
    }
});

// submit handler - for now we just log; hook to backend as needed
document.getElementById('submit-btn').addEventListener('click', ()=>{
    const payload = {
        id: document.getElementById('member-id').value.trim(),
        name: document.getElementById('member-name').value.trim(),
        reason: document.getElementById('reason').value,
        zone: document.getElementById('zone').value,
        comments: document.getElementById('comments').value.trim(),
        time: new Date().toISOString()
    };
    // basic validation
    if(!payload.id || !payload.name){
        alert('Please provide member name and id (scanned or manual).');
        return;
    }
    // TODO: replace with real POST to server if desired
    console.log('Arrival recorded:', payload);
    const result = document.getElementById('submit-result');
    result.textContent = 'Recorded at ' + new Date().toLocaleTimeString();
    result.className = 'success';
    // small visual reset after 2s
    setTimeout(()=>{ result.textContent=''; result.className='muted'; }, 2500);
});

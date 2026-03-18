(function(){
        const panel = document.getElementById('balancePanel');
        const searchInput = document.getElementById('balSearch');
        const searchBtn = document.getElementById('balSearchBtn');
        const results = document.getElementById('balResults');
        const editor = document.getElementById('balEditor');
        const balName = document.getElementById('balName');
        const balId = document.getElementById('balId');
        const balAmount = document.getElementById('balAmount');
        const balDelta = document.getElementById('balDelta');
        const balAdd = document.getElementById('balAdd');
        const balSub = document.getElementById('balSub');
        const balSaveLocal = document.getElementById('balSaveLocal');

        // local override store (id -> montant)
        const OV_KEY = 'balance_overrides_v1';
        function loadOverrides(){ try{ return JSON.parse(localStorage.getItem(OV_KEY) || '{}'); }catch(e){return {}} }
        function saveOverrides(o){ localStorage.setItem(OV_KEY, JSON.stringify(o)); }

    let selectedUser = null;

    // panel visible inline — focus search input on load
    try{ searchInput.focus(); }catch(e){}

        async function searchUsers(q){
            results.innerHTML = '<div class="muted">Recherche...</div>';
            try{
                const res = await fetch(`/api/users?search=${encodeURIComponent(q)}&page_size=50`);
                if(!res.ok) throw new Error('Erreur serveur');
                const data = await res.json();
                renderResults(data.items || []);
            }catch(e){ results.innerHTML = `<div class="muted">Erreur recherche: ${e.message}</div>`; }
        }

        function renderResults(list){
            if(!list.length){ results.innerHTML = '<div class="muted">Aucun utilisateur trouvé</div>'; return; }
            results.innerHTML = '';
            const ov = loadOverrides();
            list.forEach(u=>{
                const el = document.createElement('div');
                el.style.padding='6px'; el.style.borderBottom='1px solid #f0f0f0'; el.style.display='flex'; el.style.justifyContent='space-between'; el.style.alignItems='center';
                el.innerHTML = `<div><strong>${u.prenom} ${u.nom}</strong><div class="muted">ID: ${u.id}</div></div><div style="text-align:right"><div>Balance: <strong>${(u.montant||0).toFixed(2)} €</strong></div><button class="btn" style="margin-top:6px">Gérer</button></div>`;
                el.querySelector('button').addEventListener('click', ()=> selectUser(u));
                // if override exists show small mark
                if(ov[u.id]){
                    const note = document.createElement('div'); note.className='muted'; note.style.fontSize='0.8rem'; note.textContent = ` (local override: ${ov[u.id].toFixed(2)} €)`; el.querySelector('div strong').after(note);
                }
                results.appendChild(el);
            });
        }

        function selectUser(u){
            selectedUser = u;
            const ov = loadOverrides();
            const local = typeof ov[u.id] === 'number' ? ov[u.id] : null;
            balName.textContent = `${u.prenom} ${u.nom}`;
            balId.textContent = u.id;
            balAmount.textContent = (local !== null ? local : (u.montant || 0)).toFixed(2);
            editor.style.display = 'block';
            balDelta.value = '';
        }

        function updateLocal(delta, replace=false){
            if(!selectedUser) return;
            const ov = loadOverrides();
            const base = (selectedUser.montant || 0);
            const current = (typeof ov[selectedUser.id] === 'number') ? ov[selectedUser.id] : base;
            const next = replace ? delta : (current + delta);
            ov[selectedUser.id] = Number(next.toFixed(2));
            saveOverrides(ov);
            balAmount.textContent = ov[selectedUser.id].toFixed(2);
        }

        balAdd.addEventListener('click', ()=>{
            const v = parseFloat(balDelta.value || '0'); if(isNaN(v) || v===0) return alert('Montant invalide'); updateLocal(Math.abs(v));
        });
        balSub.addEventListener('click', ()=>{
            const v = parseFloat(balDelta.value || '0'); if(isNaN(v) || v===0) return alert('Montant invalide'); updateLocal(-Math.abs(v));
        });
        balSaveLocal.addEventListener('click', ()=>{ if(!selectedUser) return; alert('Solde enregistré localement. Pour persister côté serveur, ajouter une route API serveur.'); });

        searchBtn.addEventListener('click', ()=>{ const q=searchInput.value.trim(); if(!q) return alert('Saisissez un nom ou identifiant'); searchUsers(q); });
        searchInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ searchBtn.click(); } });
    })();
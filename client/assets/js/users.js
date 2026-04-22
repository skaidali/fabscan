// Function to call when users page is opened
async function initUsersPage(){
  
  // Get HTML elements from users.html page to be able to modify them dynamically
  const tableBody = document.getElementById('users-table-body');
  const template = document.getElementById('users-row-template');
  const state = document.getElementById('users-table-state');
  const search = document.getElementById('users-search');
  const statusFilter = document.getElementById('users-status-filter');
  const prevBtn = document.getElementById('users-page-prev');
  const nextBtn = document.getElementById('users-page-next');
  const pageNumbers = document.getElementById('users-page-numbers');

  if(!tableBody || !template) return;

  // Edit the state message under the table (showing either pages or "Aucun utilisateur trouvé.")
  function setState(msg, kind){ if(!state) return; state.textContent = msg||''; state.className = kind?`message ${kind}`:'message'; }

  const pager = { page: 1, page_size: 12, total: 0, total_pages: 1 };

  // Add page selection buttons under the table
  function renderPageNumbers(){
    pageNumbers.innerHTML = '';
    const start = Math.max(1, pager.page-2);
    const end = Math.min(pager.total_pages, pager.page+2);

    // create page buttons (this will end up creating like 500 buttons but a)
    for(let p=start;p<=end;p++){
      const b = document.createElement('button'); b.type='button'; b.textContent = String(p); b.className = (p===pager.page?'page-btn active':'page-btn'); b.addEventListener('click', ()=>{ pager.page=p; fetchUsers(); });
      pageNumbers.appendChild(b);
    }
    prevBtn.disabled = pager.page<=1; nextBtn.disabled = pager.page>=pager.total_pages;
  }

  // Main function: show the fetched users in the user list
  function renderRows(items){
    tableBody.innerHTML='';

    // edit state message to show the number of users shown
    if(!items || items.length===0){ setState('Aucun utilisateur trouvé.','error'); return; }
    setState(`Affichage ${Math.max(1,(pager.page-1)*pager.page_size+1)}-${Math.min(pager.total,(pager.page)*pager.page_size)} sur ${pager.total}`,'');
    
    // add users to table
    for(const u of items){
      const frag = template.content.cloneNode(true); // clone template
      const tr = frag.querySelector('tr'); // get table row from template element
      tr.dataset.userId = u.id;

      // construct row from user information
      frag.querySelector('.user-prenom').textContent = u.prenom || '';
      frag.querySelector('.user-nom').textContent = u.nom || '';
      frag.querySelector('.user-email').textContent = u.email || (u.id_moodle||'') ;
      const statu = frag.querySelector('.user-statut'); statu.innerHTML = `<span class="pill">${u.statut||''}</span>`;
      const rfid = frag.querySelector('.user-rfid'); rfid.innerHTML = (u.id_moodle?'<span class="rfid-badge rfid-linked">Liée</span>':'<span class="rfid-badge rfid-unlinked">Non liée</span>');

      // wire action buttons to other functions
      const edit = frag.querySelector('.action-edit'); if(edit) edit.addEventListener('click', ()=> loadPage('./views/registration.html', edit));
      const resend = frag.querySelector('.action-resend-qr'); if(resend) resend.addEventListener('click', ()=> resendQr(u.id));
      const checkin = frag.querySelector('.action-checkin'); if(checkin) checkin.addEventListener('click', ()=> manualCheckin(u.id));
      const del = frag.querySelector('.action-delete'); if(del) del.addEventListener('click', ()=> deleteUser(u.id));

      tableBody.appendChild(frag);
    }
  }

  // Fetch all users from database
  async function fetchUsers(){
    setState('Chargement...', '');

    // take in account both search and statut filter
    const searchvalue = encodeURIComponent((search&&search.value)||'');
    const statut = encodeURIComponent((statusFilter&&statusFilter.value)||'all');

    // fetch users based on the above criteria
    const resp = await fetch(`/api/users?search=${searchvalue}&statut=${statut}&page=${pager.page}&page_size=${pager.page_size}`);
    if(!resp.ok){ setState('Erreur lors du chargement des utilisateurs.','error'); return; }
    const payload = await resp.json();
    const items = payload.items || payload || []; // package the users in a list variable
    pager.total = Number((payload.pagination && payload.pagination.total) || items.length || 0);
    pager.total_pages = Number((payload.pagination && payload.pagination.total_pages) || 1);

    // render all fetched items
    renderRows(items);
    renderPageNumbers();
  }
  
  // Call /resend_qr endpoint and show an alert when successful
  async function resendQr(userId){
    if(!confirm('Renvoyer le QR code par email à cet utilisateur ?')) return;
    const res = await fetch('/api/resend_qr', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: userId }) });
    const d = await res.json().catch(()=>({success:false}));
    if(res.ok && d.success) alert(d.message||'QR renvoyé'); else alert(d.error||'Erreur serveur');
  }

  // TODO
  async function manualCheckin(userId){
    if(!confirm('Enregistrer un pointage manuel pour cet utilisateur ?')) return;
    const res = await fetch('/api/manual_checkin', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: userId })});
    const d = await res.json().catch(()=>({success:false}));
    if(res.ok && d.success) alert(d.message||'Pointage enregistré'); else alert(d.error||'Erreur serveur');
  }

  // Call /user endpoint to delete user from database
  async function deleteUser(userId){
    if(!confirm('Supprimer cet utilisateur et toutes ses données ?')) return;
    const res = await fetch(`/api/user/${encodeURIComponent(userId)}`, { method: 'DELETE' });
    const d = await res.json().catch(()=>({success:false}));
    if(res.ok && d.success){ alert(d.message||'Utilisateur supprimé'); fetchUsers(); } else alert(d.error||'Erreur suppression');
  }

  // Wire controls to buttons
  if(search) search.addEventListener('input', ()=>{ pager.page=1; fetchUsers(); });
  if(statusFilter) statusFilter.addEventListener('change', ()=>{ pager.page=1; fetchUsers(); });
  if(prevBtn) prevBtn.addEventListener('click', ()=>{ if(pager.page>1){ pager.page--; fetchUsers(); }});
  if(nextBtn) nextBtn.addEventListener('click', ()=>{ if(pager.page<pager.total_pages){ pager.page++; fetchUsers(); }});

  // Initial load
  fetchUsers();
}

// Scan page logic - handles simulated QR/RFID, manual lookup and adding entries
async function initScanPage(){
	const scannedInfo = document.getElementById('scanned-info');
	const simulateQrBtn = document.getElementById('simulate-qr');
	const simulateRfidBtn = document.getElementById('simulate-rfid');
	const manualInput = document.getElementById('manual-input');
	const memberName = document.getElementById('member-name');
	const zoneSelect = document.getElementById('zone');
	const submitBtn = document.getElementById('submit-btn');

	if(!scannedInfo) return;

	function setScannedText(txt, kind){
		scannedInfo.innerHTML = '';
		const el = document.createElement('div');
		el.className = kind || '';
		el.textContent = txt;
		scannedInfo.appendChild(el);
	}

	async function lookupUserById(id){
		if(!id) return null;
		try{
			const resp = await fetch(`/api/user/${encodeURIComponent(id)}`);
			if(!resp.ok) return null;
			const data = await resp.json();
			return data;
		}catch(e){
			console.error('lookup error', e);
			return null;
		}
	}

    // TODO: Replace the following two simulate buttons with a "scan button"
    // that will use the same function as the registration page and call /api/scan with it



	// Simulate a QR scan: generate a timestamp-based id and call /api/scan
	async function simulateQr(){
		// generate a simple id similar to server's add_user id format
		const id = new Date().toISOString().replace(/[^0-9]/g,'');
		setScannedText(`Simulated QR: ${id}`,'highlight');
		try{
			const resp = await fetch('/api/scan',{
				method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: id })
			});
			const d = await resp.json().catch(()=>({}));
			if(resp.ok && d.success){
				setScannedText(`Entrée enregistrée pour ${d.prenom||''} ${d.nom||''}`,'success');
			}else{
				// store last scan on server's DERNIER_SCAN but user unknown => show message
				setScannedText(`Carte lue (${id}) - Utilisateur inconnu. Vous pouvez lier cet ID lors de l'inscription.`,'warning');
			}
		}catch(e){
			console.error(e);
			setScannedText('Erreur lors de l\'envoi du scan','error');
		}
	}

	// Simulate an RFID scan: use a short numeric id
	async function simulateRfid(){
		const id = String(Math.floor(100000 + Math.random()*900000));
		setScannedText(`Simulated RFID: ${id}`,'highlight');
		try{
			const resp = await fetch('/api/scan',{
				method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: id })
			});
			const d = await resp.json().catch(()=>({}));
			if(resp.ok && d.success){
				setScannedText(`Entrée enregistrée pour ${d.prenom||''} ${d.nom||''}`,'success');
			}else{
				setScannedText(`Carte lue (${id}) - Utilisateur inconnu.`,`warning`);
			}
		}catch(e){
			console.error(e);
			setScannedText('Erreur lors de l\'envoi du scan','error');
		}
	}

	// Manual entry submission from the form
	async function submitManualEntry(){
		const userId = manualInput.value && manualInput.value.trim();
		const zone = zoneSelect && zoneSelect.value ? zoneSelect.value : '';
		if(!userId){ alert('Veuillez entrer l\'ID du badge ou du QR.'); return; }

		// Try to lookup user for nicer message
		const user = await lookupUserById(userId);

		try{
			const resp = await fetch('/api/add_entry',{
				method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: userId, zone: zone })
			});
			const d = await resp.json().catch(()=>({}));
			if(resp.ok && d.success){
				setScannedText(`Entrée enregistrée pour ${user? (user.prenom + ' ' + user.nom) : userId}`,'success');
				memberName.value = user ? `${user.prenom} ${user.nom}` : '';
			}else{
				setScannedText(d.error || 'Erreur enregistrement','error');
			}
		}catch(e){
			console.error(e);
			setScannedText('Erreur réseau','error');
		}
	}

	// bind buttons
	if(simulateQrBtn) simulateQrBtn.addEventListener('click', simulateQr);
	if(simulateRfidBtn) simulateRfidBtn.addEventListener('click', simulateRfid);
	if(submitBtn) submitBtn.addEventListener('click', submitManualEntry);

	// If manual input loses focus, try to lookup user and pre-fill name
	if(manualInput){
		manualInput.addEventListener('blur', async ()=>{
			const id = manualInput.value && manualInput.value.trim();
			if(!id) return;
			const u = await lookupUserById(id);
			if(u){ memberName.value = `${u.prenom || ''} ${u.nom || ''}`; }
		});
	}
}
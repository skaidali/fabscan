function initRegistrationAutofill() {
  const form = document.getElementById('registration-form');
  if (!form || form.dataset.emailLogicBound === '1') {
    return;
  }
  form.dataset.emailLogicBound = '1';

  const firstNameInput = document.getElementById('prenom');
  const lastNameInput = document.getElementById('nom');
  const emailInput = document.getElementById('email');
  const messageBox = document.getElementById('registration-message');
  const submitButton = form.querySelector('.submit-btn');
  const rfidAssociateBtn = document.getElementById('rfid-associate-btn');
  const statusInputs = form.querySelectorAll('input[name="statut"]');

  if (!firstNameInput || !lastNameInput || !emailInput || !statusInputs.length) {
    return;
  }

  function normalizeIdentity(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\s']/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function selectedStatus() {
    const checked = form.querySelector('input[name="statut"]:checked');
    return checked ? checked.value : '';
  }

  function updateEmailFromRules(forceResetManual) {
    const status = selectedStatus();
    const first = normalizeIdentity(firstNameInput.value);
    const last = normalizeIdentity(lastNameInput.value);

    if (status === 'Externe') {
      emailInput.placeholder = 'exemple@domaine.com';
      if (forceResetManual) {
        emailInput.dataset.manual = '0';
      }
      emailInput.value = '';
      return;
    }

    emailInput.placeholder = 'prenom.nom@etu.ec-lyon.fr';

    if (emailInput.dataset.manual === '1' && !forceResetManual) {
      return;
    }

    const domain = status === 'Personnel' ? '@ec-lyon.fr' : '@etu.ec-lyon.fr';
    emailInput.value = first && last ? `${first}.${last}${domain}` : '';
  }

  firstNameInput.addEventListener('input', function () {
    updateEmailFromRules(false);
  });

  lastNameInput.addEventListener('input', function () {
    updateEmailFromRules(false);
  });

  statusInputs.forEach(function (input) {
    input.addEventListener('change', function () {
      updateEmailFromRules(true);
    });
  });

  emailInput.addEventListener('input', function () {
    this.dataset.manual = this.value.trim() ? '1' : '0';
  });

  if (rfidAssociateBtn && rfidAssociateBtn.dataset.bound !== '1') {
    rfidAssociateBtn.dataset.bound = '1';
    rfidAssociateBtn.addEventListener('click', function () {
      if (this.classList.contains('is-loading')) {
        return;
      }
      this.classList.add('is-loading');
      this.innerHTML = '<span class="mini-spinner" aria-hidden="true"></span>Associer la carte étudiante';
    });
  }

  function setRegistrationMessage(text, kind) {
    if (!messageBox) {
      return;
    }
    messageBox.textContent = text || '';
    if (kind) {
      messageBox.className = `message ${kind}`;
    } else {
      messageBox.className = 'message';
    }
  }

  function setSubmittingState(isSubmitting) {
    if (!submitButton) {
      return;
    }
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting ? 'Enregistrement...' : 'Enregistrer';
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const payload = {
      prenom: String(firstNameInput.value || '').trim(),
      nom: String(lastNameInput.value || '').trim(),
      statut: selectedStatus(),
      email: String(emailInput.value || '').trim(),
      motif: (form.querySelector('input[name="motif"]:checked') || {}).value || '',
      send_qr_email: Boolean(form.querySelector('#send_qr_email') && form.querySelector('#send_qr_email').checked),
      rfid_card_id: String((form.querySelector('#rfid_card_id') || {}).value || '').trim()
    };

    if (!payload.prenom || !payload.nom || !payload.statut) {
      setRegistrationMessage('Merci de renseigner prénom, nom et statut.', 'error');
      return;
    }

    try {
      setSubmittingState(true);
      setRegistrationMessage('Enregistrement en cours...', '');

      const response = await fetch('/api/add_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(function () {
        return {};
      });

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Échec de l\'enregistrement');
      }

      setRegistrationMessage(data.message || 'Utilisateur enregistré avec succès.', 'success');
      form.reset();
      emailInput.dataset.manual = '0';
      updateEmailFromRules(true);

      if (rfidAssociateBtn) {
        rfidAssociateBtn.classList.remove('is-loading');
        rfidAssociateBtn.textContent = 'Associer la carte étudiante';
      }
    } catch (error) {
      setRegistrationMessage(error.message || 'Erreur réseau lors de l\'enregistrement.', 'error');
    } finally {
      setSubmittingState(false);
    }
  });

  updateEmailFromRules(false);
}

initRegistrationAutofill();

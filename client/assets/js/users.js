function initUsersPage() {
  const tableBody = document.getElementById('users-table-body');
  const rowTemplate = document.getElementById('users-row-template');
  const tableState = document.getElementById('users-table-state');
  const searchInput = document.getElementById('users-search');
  const statusFilter = document.getElementById('users-status-filter');
  const prevButton = document.getElementById('users-page-prev');
  const nextButton = document.getElementById('users-page-next');
  const pageNumbers = document.getElementById('users-page-numbers');

  if (!tableBody || !rowTemplate || !tableState || !searchInput || !statusFilter || !prevButton || !nextButton || !pageNumbers) {
    return;
  }

  const usersState = {
    users: [],
    currentPage: 1,
    pageSize: 8,
    totalPages: 1,
    total: 0
  };

  function postJson(url, payload) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.success) {
          throw new Error(data.error || data.message || 'Erreur serveur');
        }
        return data;
      });
    });
  }

  function normalizeText(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function classifyStatus(statut) {
    const normalized = normalizeText(statut);
    if (normalized.includes('personnel')) {
      return { label: 'Personnel', className: 'pill pill-staff' };
    }
    if (normalized.includes('externe')) {
      return { label: 'Externe', className: 'pill pill-external' };
    }
    return { label: 'Étudiant', className: 'pill pill-student' };
  }

  function mapEmail(user) {
    if (user.email) {
      return user.email;
    }
    if (user.id_moodle && String(user.id_moodle).includes('@')) {
      return String(user.id_moodle);
    }
    return '—';
  }

  function mapRfidLinked(user) {
    return Boolean(user.id_moodle && String(user.id_moodle).trim());
  }

  function setStateMessage(message, type) {
    tableState.textContent = message || '';
    tableState.className = type ? `message ${type}` : 'message';
  }

  function renderPageNumbers() {
    const totalPages = usersState.totalPages || 1;
    pageNumbers.innerHTML = '';

    const maxButtons = 7;
    let startPage = Math.max(1, usersState.currentPage - 3);
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let page = startPage; page <= endPage; page += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `page-btn${page === usersState.currentPage ? ' active' : ''}`;
      button.textContent = String(page);
      button.addEventListener('click', function () {
        usersState.currentPage = page;
        fetchUsers();
      });
      pageNumbers.appendChild(button);
    }

    prevButton.disabled = usersState.currentPage <= 1;
    nextButton.disabled = usersState.currentPage >= totalPages;
  }

  function renderTable() {
    tableBody.innerHTML = '';

    if (!usersState.users.length) {
      setStateMessage('Aucun utilisateur trouvé.', 'error');
      renderPageNumbers();
      return;
    }

    const startIndex = (usersState.currentPage - 1) * usersState.pageSize + 1;
    const endIndex = startIndex + usersState.users.length - 1;
    setStateMessage(`Affichage ${startIndex}-${endIndex} sur ${usersState.total}`, '');

    usersState.users.forEach(function (user) {
      const rowFragment = rowTemplate.content.cloneNode(true);
      const row = rowFragment.querySelector('tr');
      const statusInfo = classifyStatus(user.statut);
      const email = mapEmail(user);
      const rfidLinked = mapRfidLinked(user);

      rowFragment.querySelector('.user-prenom').textContent = user.prenom || '';
      rowFragment.querySelector('.user-nom').textContent = user.nom || '';
      rowFragment.querySelector('.user-email').textContent = email;

      const statusCell = rowFragment.querySelector('.user-statut');
      statusCell.innerHTML = `<span class="${statusInfo.className}">${statusInfo.label}</span>`;

      const rfidCell = rowFragment.querySelector('.user-rfid');
      rfidCell.innerHTML = rfidLinked
        ? '<span class="rfid-badge rfid-linked">Liée</span>'
        : '<span class="rfid-badge rfid-unlinked">Non liée</span>';

      const userId = user.id || '';
      row.dataset.userId = userId;
      rowFragment.querySelector('.action-edit').dataset.userId = userId;
      rowFragment.querySelector('.action-resend-qr').dataset.userId = userId;
      rowFragment.querySelector('.action-checkin').dataset.userId = userId;
      rowFragment.querySelector('.action-delete').dataset.userId = userId;

      tableBody.appendChild(rowFragment);
    });

    renderPageNumbers();
  }

  function fetchUsers() {
    const search = encodeURIComponent(searchInput.value.trim());
    const statut = encodeURIComponent(statusFilter.value);
    const page = usersState.currentPage;
    const pageSize = usersState.pageSize;

    setStateMessage('Chargement des utilisateurs...', '');

    fetch(`/api/users?search=${search}&statut=${statut}&page=${page}&page_size=${pageSize}`)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Impossible de charger les utilisateurs');
        }
        return response.json();
      })
      .then(function (payload) {
        const items = Array.isArray(payload.items) ? payload.items : (Array.isArray(payload) ? payload : []);
        const pagination = payload.pagination || {};

        usersState.users = items;
        usersState.total = Number(pagination.total || items.length || 0);
        usersState.totalPages = Number(pagination.total_pages || 1);
        usersState.currentPage = Number(pagination.page || usersState.currentPage || 1);

        if (usersState.totalPages < 1) {
          usersState.totalPages = 1;
        }

        renderTable();
      })
      .catch(function (error) {
        console.error(error);
        usersState.users = [];
        usersState.total = 0;
        usersState.totalPages = 1;
        tableBody.innerHTML = '';
        setStateMessage('Erreur lors du chargement des utilisateurs.', 'error');
        renderPageNumbers();
      });
  }

  function handleEditUser(userId) {
    const user = usersState.users.find(function (item) {
      return String(item.id) === String(userId);
    });

    if (!user) {
      setStateMessage('Utilisateur introuvable.', 'error');
      return;
    }

    const newPrenom = prompt('Prénom :', user.prenom || '');
    if (newPrenom === null) {
      return;
    }

    const newNom = prompt('Nom :', user.nom || '');
    if (newNom === null) {
      return;
    }

    const currentEmail = mapEmail(user) === '—' ? '' : mapEmail(user);
    const newEmail = prompt('Email :', currentEmail);
    if (newEmail === null) {
      return;
    }

    const currentStatus = classifyStatus(user.statut).label;
    const rawStatus = prompt('Statut (Étudiant, Personnel, Externe) :', currentStatus);
    if (rawStatus === null) {
      return;
    }

    const normalizedStatus = normalizeText(rawStatus);
    let mappedStatus = 'Étudiant';
    if (normalizedStatus.includes('personnel')) {
      mappedStatus = 'Personnel';
    } else if (normalizedStatus.includes('externe')) {
      mappedStatus = 'Externe';
    }

    postJson('/api/update_user', {
      user_id: user.id,
      prenom: newPrenom.trim(),
      nom: newNom.trim(),
      email: newEmail.trim(),
      statut: mappedStatus
    })
      .then(function (result) {
        setStateMessage(result.message || 'Utilisateur mis à jour.', 'success');
        fetchUsers();
      })
      .catch(function (error) {
        setStateMessage(error.message, 'error');
      });
  }

  function handleResendQr(userId) {
    postJson('/api/resend_qr', { user_id: userId })
      .then(function (result) {
        setStateMessage(result.message || 'QR code renvoyé.', 'success');
      })
      .catch(function (error) {
        setStateMessage(error.message, 'error');
      });
  }

  function handleManualCheckin(userId) {
    postJson('/api/manual_checkin', { user_id: userId })
      .then(function (result) {
        setStateMessage(result.message || 'Pointage manuel enregistré.', 'success');
        fetchUsers();
      })
      .catch(function (error) {
        setStateMessage(error.message, 'error');
      });
  }

  function handleDeleteUser(userId) {
    const confirmed = window.confirm('Supprimer cet utilisateur ? Cette action supprimera aussi ses entrées et commentaires.');
    if (!confirmed) {
      return;
    }

    postJson('/api/delete_user', { user_id: userId })
      .then(function (result) {
        setStateMessage(result.message || 'Utilisateur supprimé.', 'success');
        if (usersState.users.length === 1 && usersState.currentPage > 1) {
          usersState.currentPage -= 1;
        }
        fetchUsers();
      })
      .catch(function (error) {
        setStateMessage(error.message, 'error');
      });
  }

  prevButton.addEventListener('click', function () {
    if (usersState.currentPage > 1) {
      usersState.currentPage -= 1;
      fetchUsers();
    }
  });

  nextButton.addEventListener('click', function () {
    if (usersState.currentPage < usersState.totalPages) {
      usersState.currentPage += 1;
      fetchUsers();
    }
  });

  searchInput.addEventListener('input', function () {
    usersState.currentPage = 1;
    fetchUsers();
  });

  statusFilter.addEventListener('change', function () {
    usersState.currentPage = 1;
    fetchUsers();
  });

  tableBody.addEventListener('click', function (event) {
    const actionButton = event.target.closest('.action-edit, .action-resend-qr, .action-checkin, .action-delete');
    if (!actionButton) {
      return;
    }

    const userId = actionButton.dataset.userId;
    if (!userId) {
      setStateMessage('Utilisateur invalide.', 'error');
      return;
    }

    if (actionButton.classList.contains('action-edit')) {
      handleEditUser(userId);
      return;
    }

    if (actionButton.classList.contains('action-resend-qr')) {
      handleResendQr(userId);
      return;
    }

    if (actionButton.classList.contains('action-checkin')) {
      handleManualCheckin(userId);
      return;
    }

    if (actionButton.classList.contains('action-delete')) {
      handleDeleteUser(userId);
    }
  });

  fetchUsers();
}

initUsersPage();

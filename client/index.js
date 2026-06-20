/* Map de correspondance entre les ancres d'URL et les fichiers HTML réels */
const ROUTES = {
  'home': './views/home.html',
  'scan': './views/scan.html',
  'users': './views/users.html',
  'bills': './views/bills.html',
  'stats': './views/stats.html',
  'registration': './views/registration.html'
};

/* 🌐 1. LE ROUTEUR CENTRAL (Aiguillage automatique) */
function router() {
  // On récupère l'ancre actuelle (ex: "#registration" -> "registration"). Si vide, direction "home"
  const hash = window.location.hash.replace('#', '') || 'home';
  
  // On récupère le chemin du template HTML associé
  const pageHtml = ROUTES[hash] || ROUTES['home'];
  
  // On localise le bouton physique dans le header grâce à l'attribut data-page
  const boutonAssocie = document.querySelector(`header nav button[data-page="${hash}"]`);
  
  // On charge le contenu de la page
  loadPage(pageHtml, boutonAssocie);
}

/* 📥 2. LE CHARGEUR DE CONTENU ASYNCHRONE */
function loadPage(page, targetButton) {
  fetch(page)
    .then(function (response) {
      return response.text();
    })
    .then(function (data) {
      // Met à jour la classe "active" sur les boutons du menu
      setActiveNav(targetButton);
      
      // Injecte le template HTML dans la zone principale
      document.getElementById('content').innerHTML = data;
        
      // Appel dynamique de la fonction d'initialisation (Ex: initRegistrationPage())
      try {
        const parts = page.split('/');
        const base = (parts[parts.length-1] || '').split('.')[0] || '';
        if (base) {
          const initName = 'init' + base.charAt(0).toUpperCase() + base.slice(1) + 'Page';
          const fn = window[initName];
          if (typeof fn === 'function') {
            setTimeout(() => { try { fn(); } catch(e) { console.error('init fn error', e); } }, 0);
          }
        }
      } catch(err) { console.error('init call failed', err); }
    })
    .catch(function (error) {
      console.error('Error:', error);
    });
}

/* 🎨 3. GESTION DE LA CLASSE ACTIVE DANS LE MENU */
function setActiveNav(activeButton) {
  const navButtons = document.querySelectorAll('header nav button');
  navButtons.forEach(function (btn) {
    btn.classList.remove('active');
  });

  if (activeButton) {
    activeButton.classList.add('active');
  }
}

/* 🚨 4. ÉCOUTEURS GLOBAUX DU NAVIGATEUR */
// Intercepte les flèches RETOUR / AVANT et les changements d'ancres manuels
window.addEventListener('hashchange', router);

// Gère le chargement ou le rafraîchissement initial de la page (F5)
window.addEventListener('DOMContentLoaded', router);
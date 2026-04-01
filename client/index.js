function findNavButtonByPage(page) {
  return document.querySelector(`header nav button[data-page="${page}"]`);
}

function setActiveNav(button, page) {
  const navButtons = document.querySelectorAll('header nav button');
  navButtons.forEach(function (btn) {
    btn.classList.remove('active');
  });

  if (button) {
    button.classList.add('active');
    return;
  }

  const matched = findNavButtonByPage(page);
  if (matched) {
    matched.classList.add('active');
  }
}

function pageToHash(page) {
  return String(page || '').replace(/^\.\//, '');
}

function hashToPage() {
  const raw = window.location.hash.replace(/^#/, '').trim();
  if (!raw) {
    return './views/home.html';
  }

  const candidate = raw.startsWith('./') ? raw : `./${raw}`;
  return findNavButtonByPage(candidate) ? candidate : './views/home.html';
}

function loadPageResources(pagePath, cb) {
  try {
    const cleanPath = String(pagePath || '')
      .replace(/^(?:\.\/|\/)/, '')
      .replace(/\.html?$/, '');
    const base = cleanPath.split('/').pop();

    if (!base) {
      if (typeof cb === 'function') cb();
      return;
    }

    const prevCss = document.getElementById('page-css');
    if (prevCss) prevCss.remove();

    const prevScript = document.getElementById('page-script');
    if (prevScript) prevScript.remove();

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${base}.css`;
    link.id = 'page-css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = `${base}.js`;
    script.id = 'page-script';
    script.async = false;
    script.onload = function () {
      if (typeof cb === 'function') cb();
    };
    script.onerror = function () {
      if (typeof cb === 'function') cb();
    };
    document.body.appendChild(script);
  } catch (error) {
    console.warn('loadPageResources failed', error);
    if (typeof cb === 'function') cb();
  }
}

function loadPage(page, button, updateHash) {
  const targetButton = button || null;
  const shouldUpdateHash = updateHash !== false;

  fetch(page)
    .then(function (response) {
      return response.text();
    })
    .then(function (data) {
      setActiveNav(targetButton, page);
      document.getElementById('content').innerHTML = data;

      if (shouldUpdateHash) {
        const nextHash = pageToHash(page);
        if (window.location.hash !== `#${nextHash}`) {
          window.location.hash = nextHash;
        }
      }

      loadPageResources(page);
    })
    .catch(function (error) {
      console.error('Erreur :', error);
    });
}

window.addEventListener('DOMContentLoaded', function () {
  const initialPage = hashToPage();
  const initialButton = findNavButtonByPage(initialPage);
  loadPage(initialPage, initialButton, false);
});

window.addEventListener('hashchange', function () {
  const page = hashToPage();
  const button = findNavButtonByPage(page);
  loadPage(page, button, false);
});

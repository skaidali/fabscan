/* When the site is first loaded, go to home page and load it */
window.addEventListener('DOMContentLoaded', function () {
  const initialPage = "./views/home.html"
  const initialButton = findNavButtonByPage(initialPage);
  loadPage(initialPage, initialButton, false);
});

/* Helper function that loads the chosen page's content */
function loadPage(page, button) {
  const targetButton = button || null;

  fetch(page)
    .then(function (response) {
      return response.text();
    })
    .then(function (data) {
      setActiveNav(targetButton, page);
      document.getElementById('content').innerHTML = data;
        
        // Trying to call initTabNamePage() from the corresponding tab's JS file when it is loaded
        // Seems like this makes loading separate js files possible so I guess it works
        try{
          const parts = page.split('/');
          const base = (parts[parts.length-1] || '').split('.')[0] || '';
          if(base){
            const initName = 'init' + base.charAt(0).toUpperCase() + base.slice(1) + 'Page';
            const fn = window[initName];
            if(typeof fn === 'function'){
              // call asynchronously to avoid blocking
              setTimeout(()=>{ try{ fn(); }catch(e){ console.error('init fn error', e); } }, 0);
            }
          }
        }catch(err){ console.error('init call failed', err); }
    })
    .catch(function (error) {
      console.error('Error:', error);
    });
}

/* The following two functions are here to locate and activate the header button when on its corresponding page */
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





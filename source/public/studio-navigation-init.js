for (const shell of document.querySelectorAll('[data-studio-nav]')) {
  const toggle=shell.querySelector('.studio-nav-toggle');
  function close(){shell.dataset.open='false';toggle.setAttribute('aria-expanded','false');}
  toggle.addEventListener('click',()=>{const open=shell.dataset.open!=='true';shell.dataset.open=String(open);toggle.setAttribute('aria-expanded',String(open));});
  shell.addEventListener('keydown',event=>{if(event.key==='Escape'&&shell.dataset.open==='true'){close();toggle.focus();}});
  shell.querySelector('nav').addEventListener('click',event=>{if(event.target.closest('a'))close();});
}

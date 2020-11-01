const navOpen = document.querySelector('#menuOpen');
const navOverlay = document.querySelector('#menuOverlay');
const nav = document.querySelector('#menuNav');
const navClose = document.querySelector('#menuClose');

//Instantiate
const menuet = new Menuet({
 nav: nav,
 openTrigger: navOpen,
 closeTrigger: navClose,
 overlay: navOverlay,
 subMenus: ''
});

//Display output

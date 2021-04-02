/* Notes:
  <a> should always be the one clickable having a full height and width

  always use max-height to transition height
*/

class Menuet {
 constructor({
  nav,
  openTrigger,
  closeTrigger,
  overlay,
  subMenus
 }) {
  /* Arguments */
  this.nav = nav;
  this.openTrigger = openTrigger;
  this.overlay = overlay;
  this.closeTrigger = closeTrigger;
  this.subMenus = subMenus

  /* Parents */
  this.header = document.querySelector('header');
  this.body = document.querySelector('body');
  this.header = document.querySelector('.header');
  this.wrapper = document.querySelector('#wrapper');
  this.main = document.querySelector('#main');

  this.links = document.querySelectorAll('.menu-link');

  this.gsapTimeline = gsap.timeline({ defaults: { duration: 1, ease: Back.easeOut.config(2) } });

  this.gsapTimeline.paused(true);
  this.gsapTimeline.to('#menuOverlay', { clipPath: 'circle(100%)' });

  /* 
    -=1 is an offset to delay menu item animation and waits for overlay to finish first
   */

  this.gsapTimeline.to('.menu-item', {
   opacity: 1,
   y: '0',
   stagger: 0.1,
   ease: 'elastic.out'
  }, "-=1");



  //Automatic runs these functions
  this.open();
  this.close();
  this.stick();

 }

 // Properties

 open() {
  this.openTrigger.addEventListener('click', (e) => {
   e.preventDefault();
   
   this.gsapTimeline.play();
   document.querySelector('body').classList.add('menu--hide');
   this.closeTrigger.classList.remove('menu--disable');

   /* Remove disable class of each links */
   this.links.forEach(link => { 
     link.classList.remove('disable');
   });


  }, false);
 }

 close() {
  this.closeTrigger.addEventListener('click', (e) => {
   e.preventDefault();

   this.gsapTimeline.reverse(.5);
   document.querySelector('body').classList.remove('menu--hide');
   this.closeTrigger.classList.add('menu--disable');

    /* Remove disable class of each links */
    this.links.forEach(link => {
      link.classList.add('disable');
    });

  });
 }

 stick() {
  /* The scrollbar is in the wrapper div */
  this.wrapper.addEventListener('scroll', () => {
   let fromTop = this.wrapper.scrollTop;
   let screenWidth = document.body.clientWidth;
   const headerHeight = this.header.clientHeight;


   /* Detects if screen width is mobile or not
      then it declares a height trigger when scrolled.
   */
   const TRIGGER_HEIGHT = screenWidth > 800 ? 30 : 5;

   /* Adds fixed head and a dynamic top 
      padding for main content */
   if (fromTop >= TRIGGER_HEIGHT) {
    this.header.classList.add('header--sticky');
    /* this.main.style.paddingTop = `${headerHeight}px`; */
   } else {
    this.header.classList.remove('header--sticky');
    /* this.main.style.paddingTop = `0`; */
   }

  });
 }

 setGsapDefaults(){
   let tl = gsap.timeline({defaults:{duration: 1, ease: Back.easePit.config(2)}})
 }


 /* Checks if device is mobile */
 isMobile() {
  if (navigator.userAgent.match(/Android/i) ||
   navigator.userAgent.match(/webOS/i) ||
   navigator.userAgent.match(/iPhone/i) ||
   navigator.userAgent.match(/iPad/i) ||
   navigator.userAgent.match(/iPod/i) ||
   navigator.userAgent.match(/BlackBerry/i) ||
   navigator.userAgent.match(/Windows Phone/i))

   return true;
 }

}
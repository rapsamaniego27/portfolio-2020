class Animate{
 constructor(){
  this.techContainer = document.querySelector('#techContainer');
  this.awardContainer = document.querySelector('#awardContainer');
 }

 // Follow the visitor's device setting when reducing animation.
 reducedMotion(){
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
 }

 portfolio(cards){
  // Cancel the previous filter animation before animating the newly rendered cards.
  this.portfolioTween?.kill();
  if (!cards.length || typeof gsap === 'undefined' || this.reducedMotion()) return;

  this.portfolioTween = gsap.fromTo(cards,
   { autoAlpha: 0, y: -36 },
   {
    autoAlpha: 1, y: 0, duration: 0.7, ease: 'bounce.out',
    // Cap the total delay so larger categories still appear quickly.
    stagger: { amount: Math.min(0.65, (cards.length - 1) * 0.07) },
    clearProps: 'transform,opacity,visibility'
   }
  );
 }

 modal(panel){
  if (!panel || typeof gsap === 'undefined') return;
  gsap.killTweensOf(panel);
  if (this.reducedMotion()) {
   gsap.set(panel, { clearProps: 'transform,opacity,visibility' });
   return;
  }
  // Keep CSS centering while popping in, then clear the temporary animation styles.
  gsap.fromTo(panel,
   { autoAlpha: 0, scale: 0.97, x: 0, y: 14, xPercent: -50, yPercent: -50 },
   { autoAlpha: 1, scale: 1, y: 0, duration: 0.23, ease: 'power2.out', clearProps: 'transform,opacity,visibility' }
  );
 }

 skills(){
  gsap.from('.other-tech__category', {
   scrollTrigger: {
    trigger: '.other-tech__category',
    toggleActions: "restart none none none"
   },
   x: -100,
   opacity: 0,
   duration: 0.3,
   stagger: 0.4
  });
 }

 certs(){
  gsap.registerPlugin(ScrollTrigger);

  gsap.from('.award', {
   scrollTrigger: {
    trigger: '.award',
    toggleActions: "restart none none none"
   },
   y: -100,
   opacity: 0,
   duration: 0.5,
   stagger: 0.3
  });
 }
}

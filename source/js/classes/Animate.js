class Animate{
 constructor(){
  this.techContainer = document.querySelector('#techContainer');
  this.awardContainer = document.querySelector('#awardContainer');
 }

 //Methods
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
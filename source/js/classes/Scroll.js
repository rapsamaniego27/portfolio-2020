class Scroll{
 constructor(){
  
 }

 //Methods
 showSkillLevel(){
  /* const title = document.querySelector('.summary-what__title'); */

  gsap.registerPlugin(ScrollTrigger);

  gsap.to('.specialty-inner',{
   scrollTrigger: {
    trigger: '.summary-what__specialties',
    toggleActions: "restart none none none"
   },
   x:0,
   duration: 1.5,
   stagger: 0.2
  })
 }

 showSamples(){

  gsap.registerPlugin(ScrollTrigger);

  gsap.to('.sample',{
   scrollTrigger:{
    trigger: '.sample-projects__title',
    toggleActions: "restart none none none"
   },
   duration:0.4,
   stagger:0.2,
   scale:1,
   ease: "expoScale(0, 1, power2.in)"
  });
 }
}



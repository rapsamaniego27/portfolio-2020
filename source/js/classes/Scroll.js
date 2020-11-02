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
   duration:0.5,
   stagger:0.5,
   scale:1,
   ease: "expoScale(0, 1, power2.in)"
  });
 }


 smoothScroll(target, duration) {
  //This Function gets the target Section and your desired duration
  const targetted = document.querySelector(target);
  const targetPosition = targetted.getBoundingClientRect().top - 100;

  //Gets the window PageY off set and substract by target position
  //to get the distance
  const startPosition = window.pageYOffset;
  const distance = targetPosition - startPosition;
  let startTime = null;

  function animation(currentTime) {
   if (startTime === null) startTime = currentTime;
   const timeElapsed = currentTime - startTime;
   const run = ease(timeElapsed, startPosition, distance, duration);

   window.scrollTo(0, run);

   if (timeElapsed < duration) requestAnimationFrame(animation);
  }

  function ease(t, b, c, d) {
   t /= d / 2;
   if (t < 1) return (c / 2) * t * t + b;
   t--;
   return (-c / 2) * (t * (t - 2) - 1) + b;
  }

  requestAnimationFrame(animation);
 }
 
}




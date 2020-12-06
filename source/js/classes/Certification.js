class Certification {
 constructor() {
  this.awardContainer = document.querySelector('#awardContainer');
  this.data = new Data();
  this.UI = new UI();

  /* Automatic */

  this.displayCerts();
 }

 //Methods
 displayCerts() {

  this.data.getCerts()
   .then((certs) => {
    let html = ``;

    this.awardContainer.innerHTML = '<span class="spinner hex-primary mt-30 mb-30"></span>';

    certs.forEach(cert => {
      html += this.UI.makeCertCard(cert);
    });

    setTimeout(() => {
      this.awardContainer.innerHTML = html;

      gsap.registerPlugin(ScrollTrigger);

      gsap.from('.award', {
        scrollTrigger: {
          trigger: '.award',
          toggleActions: "restart none none none"
        },
        y: -100,
        opacity:0,
        duration: 0.7,
        stagger: 0.4
      });

    }, 1000);

    
 

   }).catch((err) => {

    console.log(err);

   });

 }
}
class Certification {
 constructor() {
  this.awardContainer = document.querySelector('#awardContainer');
  this.data = new Data();
  this.UI = new UI();

  /* Modal */
  this.images = document.querySelectorAll('.btnCert');
  this.modalOverlay = document.querySelector('#modalOverlay');
  this.modalImg = document.querySelector('#modalImg');
  this.modalImgSrc = document.querySelector('#modalImgSrc');
  this.modalClose = document.querySelector('#modalClose');

  /* Automatic */

  /* Open this just incase */
  /* this.displayCerts(); */ 
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

  bindOpenModal() {
    this.images.forEach(image => {
      image.addEventListener('click', (e) => {
        e.preventDefault();

        const imageSrc = e.target.href;


        this.modalImgSrc.src = imageSrc;

        this.modalOverlay.classList.remove('modal--hide');
        this.modalImg.classList.remove('modal--hide');

      });
    });
  }

  bindCloseModal() {
    this.modalClose.addEventListener('click', (e) => {
      e.preventDefault();

      if (e.target.classList.contains('modal-close')) {
        this.modalImg.classList.add('modal--hide');
        this.modalOverlay.classList.add('modal--hide');
      }


    });

    this.modalOverlay.addEventListener('click', (e) => {

      if (e.target.classList.contains('modal-overlay')) {
        this.modalImg.classList.add('modal--hide');
        this.modalOverlay.classList.add('modal--hide');
      }

    });
  }

}
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

    certs.forEach(cert => {
      html += this.UI.makeCertCard(cert);
    });

    this.awardContainer.innerHTML = html;

   }).catch((err) => {

    console.log(err);

   });

 }
}
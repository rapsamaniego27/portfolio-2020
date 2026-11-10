class Contact{
 constructor(){
  this.form = document.querySelector('.contact-form__inner');
  this.localNotice = document.querySelector('#contactLocalNotice');
  this.bindLocalPreview();
 }

 //Like Folk Ridge, local Jekyll previews show a notice instead of submitting.
 bindLocalPreview(){
  const localHosts = ['localhost', '127.0.0.1', '[::1]'];
  if (!localHosts.includes(window.location.hostname) || !this.form || !this.localNotice) return;

  //On Netlify this handler is never attached; native POST and CAPTCHA handle sending.
  this.form.addEventListener('submit', event => {
   event.preventDefault();
   this.localNotice.showModal();
  });

  //The native dialog handles focus and Escape; buttons/backdrop close it too.
  this.localNotice.querySelectorAll('[data-contact-notice-close]').forEach(button => {
   button.addEventListener('click', () => this.localNotice.close());
  });
  this.localNotice.addEventListener('click', event => {
   if (event.target === this.localNotice) this.localNotice.close();
  });
 }
}

class Modal{
 constructor(){
  this.api = 'https://strapi-rap.herokuapp.com';

  /* Primary Modals */
  this.modalOverlay = document.querySelector('#modalOverlay');
  this.modalClose = document.querySelector('#modalClose');
  this.modalTitle = document.querySelector('#modalTitle');
  this.modalDate = document.querySelector('#modalDate');
  this.modalDesc = document.querySelector('#modalDesc');
  this.modalTech = document.querySelector('#modalTech');
  this.modalGallery = document.querySelector('#modalGallery');
  this.modalMainImage = document.querySelector('#modalMainImage');
  this.galleryContainer = document.querySelector('.modal__gallery');

  /* Image Modal */
  this.modalImgOverlay = document.querySelector('#modalImgOverlay');
  this.modalCloseSecondary = document.querySelector('#modalCloseSecondary');
  this.modalTypeImg = document.querySelector('.modal__type-img');
  this.modalTypeImgContainer = document.querySelector('.modal__type-img__container');

  this.UI = new UI();
 }

 //Methods
 openModalInfo(project){

  const createDate = new Date(project.create_date);
  const technologiesList = this.loopTechnologies(project);
  const gallery = this.showGalleryImages(project);


  this.modalTitle.innerHTML = project.name;
  this.modalDate.innerHTML = createDate;
  this.modalDesc.innerHTML = project.description;
  this.modalTech.innerHTML = technologiesList;
  this.modalMainImage.src = `${this.api}${project.main_image.url}`;
  this.modalMainImage.title = `Rap Esteva | Projects | ${project.name}`;
  this.modalMainImage.alt = `Rap Esteva | Projects | ${project.name}`;
  this.isGallery(gallery);


  this.modalOverlay.classList.remove('modal--hide');
 }

 //Bind Close modal
 bindCloseModal(){
  this.modalOverlay.addEventListener('click', (e)=> {
   e.preventDefault();
  
   /* Close if clicked is an overlay or Close Button */
   if (e.target == this.modalOverlay || e.target == this.modalClose){
    this.modalOverlay.classList.add('modal--hide');
   }
  });
 }


 /* Loops Through technologies and creating a UI for them */
 loopTechnologies(project){

  let html = '';

  project.technologies.forEach(technology => {
    html += this.UI.makeTechBadge(technology);
  });

  return html;
 }

 showGalleryImages(project){
  let html = '';

  project.gallery.forEach(image => {
   html += this.UI.makeGallery(image.url, project.name);
  });

  return html;
 }

 isGallery(gallery){

  if(gallery){
   this.galleryContainer.style.display = 'block';
  }else{
   this.galleryContainer.style.display = 'none';
  }
  
 }



 openModalImage(project){
  this.modalTypeImg.src = `${this.api}${project.main_image.url}`;
  this.modalTypeImg.alt = `Rap Esteva | Projects | ${project.name}`;
  this.modalTypeImg.title = `Rap Esteva | Projects | ${project.name}`;

  this.modalImgOverlay.classList.remove('modal--hide');
 }

 //Bind Close modal
 bindCloseModalImage() {
  this.modalImgOverlay.addEventListener('click', (e) => {
   e.preventDefault();

   /* Close if clicked is an overlay or Close Button */
   if (e.target == this.modalImgOverlay || e.target == this.modalCloseSecondary) {
    this.modalImgOverlay.classList.add('modal--hide');
   }
  });
 }
}
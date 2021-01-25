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

  /* Collaborators */
   this.collaboratorsSection = document.querySelector('.modal__collaborators__section');
   this.collaborators = document.querySelector('#collaborators');

  /* Image Modal */
  this.modalImgOverlay = document.querySelector('#modalImgOverlay');
  this.modalCloseSecondary = document.querySelector('#modalCloseSecondary');
  this.modalTypeImg = document.querySelector('.modal__type-img');
  this.modalTypeImgContainer = document.querySelector('.modal__type-img__container');

  this.UI = new UI();
 }

 //Once modal is opened it fetches the information of the project from an API
 openModalInfo(project){

 /* Sets the date format options */
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };

 /* Declare the Javascript Date Object */
  const date = new Date(project.create_date);

 /* And uses the Intl.dateformat to finalize the date format */
  const createDate = new Intl.DateTimeFormat('en-US', dateOptions).format(date);
  const technologiesList = this.loopTechnologies(project);
  const collaboratorsList = this.loopCollaborators(project);
  const gallery = this.showGalleryImages(project);


  this.modalTitle.innerHTML = project.name; /* Title */
  this.modalDate.innerHTML = createDate; /* Date */
  this.modalDesc.innerHTML = project.description; /* Description */
  this.modalTech.innerHTML = technologiesList; /* Technologies */
  this.collaborators.innerHTML = collaboratorsList; /* Collaborators */
  this.modalMainImage.src = `${project.main_image.url}`; /* Image URL */
  this.modalMainImage.title = `Rap Esteva - Projects | ${project.name}`; /* Image Title */
  this.modalMainImage.alt = `Rap Esteva - Projects | ${project.name}`;  /* Image Alt */
  this.modalGallery.innerHTML = gallery; /* Image Gallery */
  this.isGallery(gallery);


  this.modalOverlay.classList.remove('modal--hide');
 }

 //Bind Close modal
 bindCloseModal(){
  this.modalOverlay.addEventListener('click', (e)=> {
    
    /* Close if clicked is an overlay or Close Button */
    if (e.target == this.modalOverlay || e.target == this.modalClose){
     e.preventDefault();
    this.modalOverlay.classList.add('modal--hide');
   }
  });
 }


 /* Loops Through technologies and creating a UI for them */
 loopTechnologies(project){

  let html = '';

  /* Creates a tech badge markup */
  project.technologies.forEach(technology => {
    html += this.UI.makeTechBadge(technology);
  });

  return html;
 }
 

 /* Loops Through collaborators and creating a UI for them */
loopCollaborators(project){
  let html = '';

  if(project.collaborators != 0){
    this.collaboratorsSection.style.display = 'block';

    /* Creates a collaborator item markup */
    project.collaborators.forEach(collaborator => {
      html += this.UI.makeCollaborator(collaborator);
    });
  }else{
    this.collaboratorsSection.style.display = 'none';
  }

  

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
  this.modalTypeImg.src = `${project.main_image.url}`;
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
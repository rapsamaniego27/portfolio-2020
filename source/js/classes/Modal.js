class Modal{
 constructor(){
  // Legacy URL retained; this class displays details already loaded from JSON.
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

  this.modalPanel = document.querySelector('#modalOverlay .modal');
  this.modalImagePanel = document.querySelector('#modalImgOverlay .modal__secondary');
  this.modalMainImageButton = document.querySelector('#modalMainImageButton');
  this.modalImageCanvas = document.querySelector('.modal__image-canvas');
  this.modalImageStatus = document.querySelector('#modalImageStatus');
  this.modalZoomIn = document.querySelector('#modalZoomIn');
  this.modalZoomOut = document.querySelector('#modalZoomOut');
  this.modalZoomReset = document.querySelector('#modalZoomReset');
  this.modalZoomLevel = document.querySelector('#modalZoomLevel');

  this.UI = new UI();
  this.animate = new Animate();
  // Zoom is relative to the fitted image: 1 fits the viewer, 2 doubles that size.
  this.zoom = 1;
 }

 //Display the selected project from the saved JSON.
 openModalInfo(project){

  // Format the saved date for display, e.g. January 1, 2024.
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const date = new Date(project.create_date);
  const createDate = new Intl.DateTimeFormat('en-US', dateOptions).format(date);
  const technologiesList = this.loopTechnologies(project);
  const collaboratorsList = this.loopCollaborators(project);
  const gallery = this.showGalleryImages(project);
  this.modalTitle.innerHTML = project.name;
  this.modalDate.innerHTML = createDate;
  this.modalDesc.innerHTML = project.description;
  this.modalTech.innerHTML = technologiesList;
  this.collaborators.innerHTML = collaboratorsList;
  this.modalMainImage.src = `${project.main_image.url}`;
  this.modalMainImage.title = `Rap Esteva - Projects | ${project.name}`;
  this.modalMainImage.alt = `Rap Esteva - Projects | ${project.name}`;
  this.modalGallery.innerHTML = gallery;
  this.isGallery(gallery);
  // Remember the eye button so closing the modal returns keyboard focus to it.
  this.infoTrigger = document.activeElement;
  this.modalOverlay.classList.remove('modal--hide');
  this.modalOverlay.setAttribute('aria-hidden', 'false');
  document.querySelector('#modalOverlay .modal__guts').scrollTop = 0;
  this.lockScroll();
  this.modalPanel.focus({ preventScroll: true });
  this.animate.modal(this.modalPanel);
 }

 //Bind once; gallery buttons are inserted each time a project is opened.
 bindCloseModal(){
  if (this.infoBound) return;
  this.infoBound = true;
  this.modalOverlay.addEventListener('click', (e)=> {
   if (e.target == this.modalOverlay || e.target == this.modalClose){
    e.preventDefault();
    this.closeModalInfo();
   }
  });
  this.modalMainImageButton.addEventListener('click', () => {
   this.openImage(this.modalMainImage.src, this.modalMainImage.alt, this.modalMainImageButton);
  });
  this.modalGallery.addEventListener('click', e => {
   // Delegation handles clicks on either the button or its nested image.
   const button = e.target.closest('[data-modal-image]');
   if (button) this.openImage(button.dataset.modalImage, button.querySelector('img').alt, button);
  });
  document.addEventListener('keydown', e => this.handleKeyboard(e));
 }

 isOpen(overlay){
  return !overlay.classList.contains('modal--hide');
 }

 lockScroll(){
  // Keep the page still while a modal is open, preserving its previous setting.
  if (this.previousOverflow === undefined) this.previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
 }

 unlockScroll(){
  // Closing the image viewer must keep scrolling locked if info is still open.
  if (this.isOpen(this.modalOverlay) || this.isOpen(this.modalImgOverlay)) return;
  document.body.style.overflow = this.previousOverflow;
  this.previousOverflow = undefined;
 }

 closeModalInfo(){
  this.modalOverlay.classList.add('modal--hide');
  this.modalOverlay.setAttribute('aria-hidden', 'true');
  this.unlockScroll();
  this.infoTrigger?.focus({ preventScroll: true });
 }

 handleKeyboard(e){
  // Escape closes the top dialog first; Tab stays inside that same dialog.
  const imageOpen = this.isOpen(this.modalImgOverlay);
  if (!imageOpen && !this.isOpen(this.modalOverlay)) return;
  if (e.key === 'Escape') {
   e.preventDefault();
   if (imageOpen) this.closeModalImage();
   else this.closeModalInfo();
  }
  if (e.key !== 'Tab') return;
  const panel = imageOpen ? this.modalImagePanel : this.modalPanel;
  const buttons = [...panel.querySelectorAll('a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])')]
   .filter(node => node.getClientRects().length && !node.hidden);
  const first = buttons[0];
  const last = buttons[buttons.length - 1];
  if (!first) {
   e.preventDefault();
   panel.focus();
   return;
  }
  if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
   e.preventDefault(); last.focus();
  } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === panel)) {
   e.preventDefault(); first.focus();
  }
 }


 //Build the technology badges displayed in project details.
 loopTechnologies(project){

  let html = '';

  project.technologies.forEach(technology => {
    html += this.UI.makeTechBadge(technology);
  });

  return html;
 }
 

 //Hide the collaborator section when the project has no collaborators.
 loopCollaborators(project){
  let html = '';

  if(project.collaborators != 0){
    this.collaboratorsSection.style.display = 'block';

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
  this.openImage(project.main_image.url, `Rap Esteva | Projects | ${project.name}`);
 }

 //One viewer handles standalone image projects, info images and gallery images.
 openImage(url, name, trigger = document.activeElement){
  this.imageTrigger = trigger;
  this.imageReady = false;
  this.zoom = 1;
  this.modalImageStatus.textContent = 'Loading image…';
  this.modalTypeImg.hidden = true;
  this.updateZoomControls();

  //Fit only after the browser knows the image's natural dimensions.
  this.modalTypeImg.onload = () => {
   this.imageReady = true;
   this.modalTypeImg.hidden = false;
   this.modalImageStatus.textContent = '';
   this.renderImageZoom(false);
  };
  this.modalTypeImg.onerror = () => {
   this.imageReady = false;
   this.modalTypeImg.hidden = true;
   this.modalImageStatus.textContent = 'Image could not be loaded. Please close and try again.';
   this.updateZoomControls();
  };
  this.modalTypeImg.src = url;
  this.modalTypeImg.alt = name;
  this.modalTypeImg.title = name;
  this.modalImgOverlay.classList.remove('modal--hide');
  this.modalImgOverlay.setAttribute('aria-hidden', 'false');
  this.lockScroll();
  this.modalImagePanel.focus({ preventScroll: true });
  //Pause interaction with the info dialog while leaving its content/scroll intact.
  if (this.isOpen(this.modalOverlay)) {
   this.modalOverlay.inert = true;
   this.modalOverlay.setAttribute('aria-hidden', 'true');
  }
  this.animate.modal(this.modalImagePanel);
 }

 closeModalImage(){
  this.modalImgOverlay.classList.add('modal--hide');
  this.modalImgOverlay.setAttribute('aria-hidden', 'true');
  this.modalOverlay.inert = false;
  if (this.isOpen(this.modalOverlay)) this.modalOverlay.setAttribute('aria-hidden', 'false');
  this.unlockScroll();
  //Return to the clicked image without scrolling the info dialog back to the top.
  this.imageTrigger?.focus({ preventScroll: true });
 }

 updateZoomControls(){
  this.modalZoomIn.disabled = !this.imageReady || this.zoom >= 4;
  this.modalZoomOut.disabled = !this.imageReady || this.zoom <= 1;
  this.modalZoomReset.disabled = !this.imageReady || this.zoom === 1;
  this.modalZoomLevel.textContent = `${Math.round(this.zoom * 100)}%`;
  this.modalTypeImg.setAttribute('aria-label', this.zoom > 1 ? 'Fit image to viewer' : 'Zoom image in');
  this.modalTypeImgContainer.classList.toggle('is-zoomed', this.zoom > 1);
 }

 setImageZoom(zoom){
  if (!this.imageReady) return;
  //Keep zoom between Fit (100%) and four times the fitted size (400%).
  this.zoom = Math.max(1, Math.min(4, zoom));
  this.renderImageZoom(this.zoom > 1);
 }

 renderImageZoom(preserveCenter = true){
  if (!this.imageReady || !this.isOpen(this.modalImgOverlay)) return;
  const viewport = this.modalTypeImgContainer;

  //Preserve the point being viewed when zoom changes.
  const centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / (this.modalImageCanvas.offsetWidth || 1);
  const centerY = (viewport.scrollTop + viewport.clientHeight / 2) / (this.modalImageCanvas.offsetHeight || 1);

  //Fit both dimensions with 16px space per edge, keeping the image proportions.
  const fit = Math.min(1, (viewport.clientWidth - 32) / this.modalTypeImg.naturalWidth,
   (viewport.clientHeight - 32) / this.modalTypeImg.naturalHeight);
  const width = Math.max(1, this.modalTypeImg.naturalWidth * fit * this.zoom);
  const height = Math.max(1, this.modalTypeImg.naturalHeight * fit * this.zoom);
  this.modalTypeImg.style.width = `${width}px`;
  this.modalTypeImg.style.height = `${height}px`;
  //A larger canvas supplies scrollable space for the enlarged image.
  this.modalImageCanvas.style.width = `${Math.max(viewport.clientWidth, width + 32)}px`;
  this.modalImageCanvas.style.height = `${Math.max(viewport.clientHeight, height + 32)}px`;
  viewport.scrollLeft = preserveCenter ? centerX * this.modalImageCanvas.offsetWidth - viewport.clientWidth / 2 : 0;
  viewport.scrollTop = preserveCenter ? centerY * this.modalImageCanvas.offsetHeight - viewport.clientHeight / 2 : 0;
  this.updateZoomControls();
 }

 //Bind viewer controls once; reopening only replaces the image and resets zoom.
 bindCloseModalImage() {
  if (this.imageBound) return;
  this.imageBound = true;
  this.modalImgOverlay.addEventListener('click', (e) => {
   /* Close if clicked is an overlay or Close Button */
   if (e.target == this.modalImgOverlay || e.target == this.modalCloseSecondary) {
    this.closeModalImage();
   }
  });
  this.modalZoomIn.addEventListener('click', () => this.setImageZoom(this.zoom + 0.5));
  this.modalZoomOut.addEventListener('click', () => this.setImageZoom(this.zoom - 0.5));
  this.modalZoomReset.addEventListener('click', () => this.setImageZoom(1));
  this.modalTypeImg.addEventListener('click', () => this.setImageZoom(this.zoom > 1 ? 1 : 2));
  this.modalTypeImg.addEventListener('keydown', e => {
   if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    this.setImageZoom(this.zoom > 1 ? 1 : 2);
   }
  });
  window.addEventListener('resize', () => this.renderImageZoom());

  //Touch uses native scrolling. Mouse users can also drag an enlarged image.
  const viewport = this.modalTypeImgContainer;
  viewport.addEventListener('pointerdown', e => {
   if (e.pointerType !== 'mouse' || e.button !== 0 || this.zoom <= 1) return;
   this.pan = { id: e.pointerId, x: e.clientX, y: e.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
  });
  viewport.addEventListener('pointermove', e => {
   if (!this.pan || e.pointerId !== this.pan.id) return;
   const x = e.clientX - this.pan.x;
   const y = e.clientY - this.pan.y;
   //A small movement threshold keeps ordinary image clicks working.
   if (!this.pan.moved && Math.hypot(x, y) < 4) return;
   if (!this.pan.moved) viewport.setPointerCapture(e.pointerId);
   this.pan.moved = true;
   this.suppressImageClick = true;
   viewport.classList.add('is-dragging');
   viewport.scrollLeft = this.pan.left - x;
   viewport.scrollTop = this.pan.top - y;
   e.preventDefault();
  });
  const stopPan = e => {
   if (viewport.hasPointerCapture(e.pointerId)) viewport.releasePointerCapture(e.pointerId);
   this.pan = null;
   viewport.classList.remove('is-dragging');
   window.setTimeout(() => { this.suppressImageClick = false; }, 0);
  };
  viewport.addEventListener('pointerup', stopPan);
  viewport.addEventListener('pointercancel', stopPan);
  viewport.addEventListener('pointerleave', e => {
   if (!viewport.hasPointerCapture(e.pointerId)) stopPan(e);
  });
  viewport.addEventListener('click', e => {
   //Finishing a drag must not also activate the image's click-to-zoom action.
   if (!this.suppressImageClick) return;
   e.preventDefault();
   e.stopPropagation();
   this.suppressImageClick = false;
  }, true);
 }
}

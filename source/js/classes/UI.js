class UI{
 constructor(){
  this.source = 'https://strapi-rap.herokuapp.com';
 }

 //Methods
 makeProjectCards(project){
   let layout = ``;

   const btnVisit = this.makeBtnVisit(project.url);
   const btnInfo = this.makeBtnInfo(project);

    layout += `
     <div class="portfolio-result">
      <div class="portfolio-result__title-wrapper" data-project-id="${project.id}">
       <h6>${project.name}</h6>
      </div>

      <div class="portfolio-result__content">
       <img src="${project.main_image.url}" alt="Rap Esteva | Projects | ${project.name}" title="${project.name}" class="portfolio-result__img" loading="lazy">

       <div class="portfolio-results__overlay">
        <div class="portfolio-result__options">
         ${btnVisit}
         ${btnInfo}
        </div>
       </div>
      </div>
     </div>
    `; 



   return layout;
 }

/* Creates a technology badge */
 makeTechBadge(technology){
  let layout = '';

  layout = `
   <div class="tag" style="background: ${technology.color};">
        <p>${technology.name}</p>
       </div>
  `;

  return layout;
 }

 /* Creates a collaborator markup */
 makeCollaborator(collaborator){
  let layout = '';
  let infoMarkup = '';
  
  /* Checks if collaborator has website */
  if(collaborator.website){
    infoMarkup = `
      <a href="${collaborator.website}" target="_blank" class="modal__collaborator__link">
        ${collaborator.name}
        <span class="modal__collaborator__pos">${collaborator.position}</span>
      </a> 
    `;
  }else{
    infoMarkup = `
      <span>
        ${collaborator.name}
        <span class="modal__collaborator__pos">${collaborator.position}</span>
      </span>
    `;
  }

  /* Finalize layout */
  layout = `
    <li class="modal__collaborator__item">
         <i class="fas fa-user-circle hex-primary"></i>
         ${infoMarkup}
      </li>
  `;

  return layout;
 }

 makeGallery(imageUrl, name){
  let layout = '';
  
  layout = `
   <img src="${imageUrl}" alt="Rap Esteva | Projects | ${name}" title="Rap Esteva | Projects | ${name}" class="modal__gallery-image">
  `;

  return layout;
 }

 makeBtnVisit(url){
  let layout = '';

  if(url){
    layout = `<a href="${url}" target="_blank" class="btn btn-circle-primary btn-visit">
          <i class="fas fa-link"></i>
         </a>`;
  }

  return layout;
 
 }

 makeBtnInfo(project){
  let layout = '';

  if(project.modal_type != 'none'){
   layout = `
   <a href="#" target="_blank" class="btn btn-circle-accent btn-open-modal" id="${project.id}">
           <i class="fas fa-eye"></i>
         </a>
  `;
  }

  return layout;
 }

 makeSkillsColumn(type, skills){
   
  const children = this.makeSkillsList(skills);

  const parent = `
   <div class="other-tech__category">
    <h4 class="hex-dark">${type}</h4>
    <ul class="other-tech__list mt-20">
      ${children}
    </ul>
  </div>`;
   

  
   return parent;
 }

  makeSkillsList(skills) {
    let items = '';

    skills.forEach(skill => {
      items += `
      <li class="other-tech__item">${skill.technology}</li>
    `;
    });

    return items;
  }

  makeCertCard(cert){

    /* Sets the date format options */
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };

    /* Declare the Javascript Date Object */
    const date = new Date(cert.date_received);

    /* And uses the Intl.dateformat to finalize the date format */
    const dateReceived = new Intl.DateTimeFormat('en-US', dateOptions).format(date);

    let layout = `
      <div class="award">
        <div class="award-content">
          <h4 class="hex-primary award-title">${cert.name}</h4>
          <h6 class="hex-dark award-organizer mt-10">${cert.organizer}</h6>
          <h6 class="hex-dark award-date">${dateReceived}</h6>
       </div>
       <a href="${cert.link}" target="_blank" class="btn btn-primary pr-lg20">View Certficate</a>
      </div>

    `;
    
    return layout;
  }

}


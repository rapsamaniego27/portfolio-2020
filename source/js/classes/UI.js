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

 makeTechBadge(technology){
  let layout = '';

  layout = `
   <div class="tag" style="background: ${technology.color};">
        <p>${technology.name}</p>
       </div>
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
    console.log(skills);
    let items = '';

    skills.forEach(skill => {
      items += `
      <li class="other-tech__item">${skill.technology}</li>
    `;
    });

    return items;
  }

}


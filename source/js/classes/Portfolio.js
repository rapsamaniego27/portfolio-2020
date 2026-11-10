class Portfolio{
 constructor(){
  this.options = document.querySelectorAll('.portfolio-option');
  this.portfolioCount = document.querySelector('#portfolioCount');
  this.UI = new UI();
  this.modal = new Modal();
  this.data = new Data();
  this.animate = new Animate();
  // Bind page controls once; each rendered card gets its own detail button below.
  this.bindClick();
  this.modal.bindCloseModal();
  this.modal.bindCloseModalImage();
 }

 //Methods

 // Render one category for both the initial page load and category clicks.
 displayResults(type){
  // Ignore older responses if the visitor switches categories quickly.
  const request = this.resultsRequest = (this.resultsRequest || 0) + 1;
  const data = new Data();
  const portfolioResultsContainer = document.querySelector('#portfolioResultsContainer');

  
  return data.fetchProjects(type)
   .then(data => {
    if (request !== this.resultsRequest) return;
    let html = ``;
    
    // Prepend each saved project to keep the newest projects at the top.
    data.forEach(project => {
      html = `${this.UI.makeProjectCards(project)} ${html}`;
    });

    portfolioResultsContainer.innerHTML = html;
    this.portfolioCount.innerHTML = `${data.length} results found.`;
    // Replacing the cards allows the entrance animation to replay for each filter.
    this.animate.portfolio(portfolioResultsContainer.querySelectorAll('.portfolio-result'));

    // Bind the eye buttons after inserting the new cards.
    const infoButtons = document.querySelectorAll('.btn-open-modal');

    infoButtons.forEach(button => {
     button.addEventListener('click', (e)=> {
      e.preventDefault();
      const projectId = e.currentTarget.id;

      // Look up the details in the shared JSON already used for the cards.
      this.data.fetchSingleProject(projectId)
       .then((singleProject) => {
        if (singleProject.modal_type == 'info'){
         this.modal.openModalInfo(singleProject);
        }

        if (singleProject.modal_type == 'image') {
         this.modal.openModalImage(singleProject);
        }
       }).catch(err => console.log(err));
     });
    });

   })
   .catch(err => {
    if (request !== this.resultsRequest) return;
    portfolioResultsContainer.textContent = 'Could not load the portfolio. Please select a category to try again.';
    this.portfolioCount.textContent = 'Portfolio unavailable.';
    console.log(err);
   });

 }
 /* Binds click events to Filter options */
 bindClick(){
  this.options.forEach(option => {
    option.addEventListener('click', (e)=> {
     e.preventDefault();
     const portfolioResultsContainer = document.querySelector('#portfolioResultsContainer');

     /* Removes active class to past selected option */
     const pastSelectedOption = document.querySelector('.portfolio-link--active');
     if(pastSelectedOption){
      pastSelectedOption.classList.remove('portfolio-link--active');
     }

     /* Then adds it to the current selected option */
     e.currentTarget.classList.add('portfolio-link--active');

     /* Adds a spinner before displaying actual results */
     portfolioResultsContainer.innerHTML = `<span class="spinner"></span>`;
     const projectType = option.dataset.projectType;
     
     this.displayResults(projectType); 

    });
  });
 }
}

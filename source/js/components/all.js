window.addEventListener('DOMContentLoaded', ()=> {
 const scroll = new Scroll();
 const btnSeeProjects = document.querySelector('#btnSeeProjects');
 const portfolioContainer = document.querySelector('.portfolio-container');

 scroll.showSkillLevel();
 scroll.showSamples();



  if (isInPage(btnSeeProjects)){

    btnSeeProjects.addEventListener('click', (e) => {
      const scroll = new Scroll();
      e.preventDefault();

      scroll.smoothScroll(".sample-projects__title", 1000);
     
    });

  }

  /* Portfolio */
  if(isInPage(portfolioContainer)){
    const portfolio = new Portfolio();
  }


});
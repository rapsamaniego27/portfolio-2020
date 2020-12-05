window.addEventListener('DOMContentLoaded', ()=> {
 const scroll = new Scroll();
 const btnSeeProjects = document.querySelector('#btnSeeProjects');
 const portfolioContainer = document.querySelector('.portfolio-container');
 const pageAboutMe = document.querySelector('#pageAboutMe');
 const pageHome = document.querySelector('#pageHome');





  if (isInPage(btnSeeProjects)){

    btnSeeProjects.addEventListener('click', (e) => {
      const scroll = new Scroll();
      e.preventDefault();

      scroll.smoothScroll(".sample-projects__title", 1000);
     
    });

  }

  /* Home */

  if(isInPage(pageHome)){
    scroll.showSkillLevel();
    scroll.showSamples();
  }

  /* Portfolio */
  if(isInPage(portfolioContainer)){
    const portfolio = new Portfolio();
  }

  if (isInPage(pageAboutMe)) {
    /* Skills and Certifications*/

    const skills = new Skills();
    const certification = new Certification();
  }


 

});
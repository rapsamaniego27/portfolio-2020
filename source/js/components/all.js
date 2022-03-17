window.addEventListener('DOMContentLoaded', ()=> {
 const scroll = new Scroll();
 const btnSeeProjects = document.querySelector('#btnSeeProjects');
 const portfolioContainer = document.querySelector('.portfolio-container');
 const pageAboutMe = document.querySelector('#pageAboutMe');
 const pageHome = document.querySelector('#pageHome');
 const btnDownloadCV = document.querySelector('.btnDownload');


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

    /* Auto display projects */
    portfolio.displayResults('Web');
  }

  if (isInPage(pageAboutMe)) {
      /* Skills and Certifications*/

    /* const skills = new Skills(); */
    const certification = new Certification(); 
    
   const animate = new Animate();
   animate.skills();
   animate.certs();

   certification.bindOpenModal();
   certification.bindCloseModal();
  }

  /* Makes the Download CV wiggle */
  if(isInPage(btnDownloadCV)){
    setInterval(() => {
      btnDownloadCV.classList.toggle('btn--animate');
    }, 3000);

  }

});
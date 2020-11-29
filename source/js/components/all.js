window.addEventListener('DOMContentLoaded', ()=> {
 const scroll = new Scroll();
 const btnSeeProjects = document.querySelector('#btnSeeProjects');

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
  const portfolio = new Portfolio();


});
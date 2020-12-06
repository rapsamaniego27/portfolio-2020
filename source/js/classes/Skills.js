class Skills{
 constructor(){
  this.techContainer = document.querySelector('#techContainer');
  this.data = new Data();
  this.UI = new UI();

  /* Automatic */
  
  this.displaySkills();
 }

 //Methods
 displaySkills(){
    
  this.data.getSkills()
   .then((result) => {
    let html = ``;
    
    this.techContainer.innerHTML = '<span class="spinner mt-30 mb-30"></span>';

    result.forEach(skill => {
      html += this.UI.makeSkillsColumn(skill.type, skill.skills);
    });
    
   setTimeout(() => {
     this.techContainer.innerHTML = html;

     gsap.from('.other-tech__category', {
       scrollTrigger: {
         trigger: '.other-tech__category',
         toggleActions: "restart none none none"
       },
       x: -100,
       opacity: 0,
       duration: 0.3,
       stagger: 0.4
     });
   }, 1000);

   }).catch((err) => {

     console.log(err);
     
   });

 }
}
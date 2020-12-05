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

    result.forEach(skill => {
      html += this.UI.makeSkillsColumn(skill.type, skill.skills);
    });
    
   this.techContainer.innerHTML = html;

   }).catch((err) => {

     console.log(err);
     
   });

 }
}
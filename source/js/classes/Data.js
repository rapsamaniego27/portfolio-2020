class Data{
 constructor(){
   // Jekyll supplies the JSON path, including a baseurl when one is configured.
   this.api = document.querySelector('#portfolioResultsContainer')?.dataset.projectsUrl || '/projects.json';
   // Legacy methods below remain separate from the static portfolio data.
   this.skillsApi = 'https://strapi-rap.herokuapp.com/skill-types';
   this.certsApi = 'https://strapi-rap.herokuapp.com/certifications';
   this.projects = new StaticProjects(this.api);
 }

 //Methods
 async fetchProjects(type){
    return this.projects.fetchProjects(type);
  }

 async fetchSingleProject(id){
   return this.projects.fetchSingleProject(id);
 }

 async getProjectsCount(){
   return this.projects.getProjectsCount();
 }

 async getSkills() {
    this.countApi = `${this.skillsApi}`;
    let response = await fetch(this.countApi);
    let data = await response.json();

    return data;
  }

  async getCerts() {
    this.countApi = `${this.certsApi}`;
    let response = await fetch(this.countApi);
    let data = await response.json();

    return data;
  }
}



class Data{
 constructor(){
   this.api = 'https://strapi-rap.herokuapp.com/projects';
   this.skillsApi = 'https://strapi-rap.herokuapp.com/skill-types';
   this.certsApi = 'https://strapi-rap.herokuapp.com/certifications';
   if (LocalStrapi.isLocalPreview()) {
    this.localApi = new LocalStrapi();
    this.api = `${this.localApi.source}/api/projects`;
   }
 }

 //Methods
 async fetchProjects(type){
    if (this.localApi) return this.localApi.fetchProjects(type);
    this.api = `${this.api}?type=${type}`;
    let response = await fetch(this.api);
    let data = await response.json();

    return data;
  }

 async fetchSingleProject(id){
   if (this.localApi) return this.localApi.fetchSingleProject(id);
   this.singleProjectApi = `${this.api}/${id}`;
   let response = await fetch(this.singleProjectApi);
   let data = await response.json();

   return data;
 }

 async getProjectsCount(){
   if (this.localApi) return this.localApi.getProjectsCount();
   this.countApi = `${this.api}/count`;
   let response = await fetch(this.countApi);
   let data = await response.json();

   return data;
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



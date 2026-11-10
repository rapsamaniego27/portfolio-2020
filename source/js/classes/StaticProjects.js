// One same-origin JSON download supplies every category, count and detail modal.
class StaticProjects {
 // Share the download promise across cards, filters and detail lookups.
 static cache = new Map();

 constructor(api) {
  this.api = api;
 }

 async load() {
  // This URL is served by Jekyll/Netlify; the browser never fetches Strapi here.
  if (!StaticProjects.cache.has(this.api)) {
   const request = (async () => {
    const response = await fetch(this.api, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Portfolio JSON returned ${response.status}.`);
    const snapshot = await response.json();
    // Previously saved array snapshots remain readable during the migration.
    const projects = Array.isArray(snapshot) ? snapshot : snapshot?.projects;
    if (!Array.isArray(projects) || projects.some(project => !project?.id || !project.main_image?.url)) {
     throw new Error('Portfolio JSON is invalid. Rebuild the Jekyll site to regenerate projects.json.');
    }
    return projects;
   })();
   StaticProjects.cache.set(this.api, request);
  }
  try {
   return await StaticProjects.cache.get(this.api);
  } catch (error) {
   // A failed download can be retried by selecting a category again.
   StaticProjects.cache.delete(this.api);
   throw error;
  }
 }

 async fetchProjects(type) {
  // Category keys use the existing type field, so filtering stays in the browser.
  return (await this.load()).filter(project => project.type === type);
 }

 async fetchSingleProject(id) {
  // Read modal fields from the same downloaded JSON instead of another API call.
  const project = (await this.load()).find(project => project.id === id);
  if (!project) throw new Error('The selected project is missing from the portfolio JSON.');
  return project;
 }

 async getProjectsCount() {
  return (await this.load()).length;
 }
}

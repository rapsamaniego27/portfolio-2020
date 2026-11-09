// Development adapter only. The deployed site keeps its existing Strapi v3 calls.
class LocalStrapi {
 constructor() {
  this.source = 'http://127.0.0.1:1342';
 }

 static isLocalPreview() {
  return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(window.location.hostname);
 }

 projectQuery() {
  return new URLSearchParams({
   'populate[main_image]': 'true',
   'populate[gallery]': 'true',
   'populate[technologies]': 'true',
   'populate[collaborators]': 'true'
  });
 }

 async request(path, query) {
  const response = await fetch(`${this.source}/api/${path}?${query}`, {
   signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
   throw new Error(`Local Strapi returned ${response.status}. Check that Strapi is running on port 1342 and portfolio read permissions are enabled.`);
  }
  const body = await response.json();
  if (!Object.prototype.hasOwnProperty.call(body, 'data') || body.error) {
   throw new Error('Local Strapi returned an unexpected response.');
  }
  return body;
 }

 project(project) {
  if (!project || !project.documentId) throw new Error('Local Strapi did not return a project documentId.');
  const media = image => image && ({
   ...image,
   url: image.url && image.url.startsWith('/') ? `${this.source}${image.url}` : image.url
  });
  return {
   ...project,
   // Existing cards/modal buttons use id; v5 detail URLs require documentId.
   id: project.documentId,
   main_image: media(project.main_image),
   gallery: (project.gallery || []).map(media),
   technologies: project.technologies || [],
   collaborators: project.collaborators || []
  };
 }

 async fetchProjects(type) {
  const query = this.projectQuery();
  query.set('filters[type][$eq]', type);
  query.set('sort[0]', 'createdAt:asc');
  query.set('sort[1]', 'id:asc');
  query.set('pagination[pageSize]', '100');
  let page = 1;
  let pageCount = 1;
  const projects = [];
  do {
   query.set('pagination[page]', String(page));
   const body = await this.request('projects', query);
   if (!Array.isArray(body.data)) throw new Error('Local Strapi did not return a project list.');
   projects.push(...body.data.map(project => this.project(project)));
   pageCount = body.meta?.pagination?.pageCount || 1;
   page++;
  } while (page <= pageCount);
  return projects;
 }

 async fetchSingleProject(id) {
  if (!id) throw new Error('Select a project before opening its details.');
  const body = await this.request(`projects/${encodeURIComponent(id)}`, this.projectQuery());
  return this.project(body.data);
 }

 async getProjectsCount() {
  const body = await this.request('projects', new URLSearchParams({ 'pagination[pageSize]': '1' }));
  const count = body.meta?.pagination?.total;
  if (!Number.isInteger(count)) throw new Error('Local Strapi did not return the project count.');
  return count;
 }
}

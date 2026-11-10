const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const source = ['Data', 'StaticProjects', 'UI', 'Animate', 'Modal', 'Portfolio']
 .map(name => fs.readFileSync(path.join(root, 'source/js/classes', name + '.js'), 'utf8')).join('\n');
const response = body => ({ ok: true, status: 200, json: async () => body });
const project = (type = 'Web') => ({
 id: 'project-' + type, name: 'Fixture ' + type, create_date: '2024-05-03', description: 'Fixture description',
 type, modal_type: 'info', main_image: { url: 'https://res.cloudinary.com/example/main.png' },
 gallery: [{ url: 'https://res.cloudinary.com/example/gallery.png' }],
 technologies: [{ name: 'JavaScript', color: '#6750A4' }],
 collaborators: [{ name: 'Collaborator', position: 'Designer', website: 'https://example.com' }]
});

function load(fetch, { hostname = 'localhost', projectsUrl = '/projects.json' } = {}) {
 const nodes = new Map();
 const document = {
  body: { style: {} },
  addEventListener() {},
  querySelector(selector) {
   if (!nodes.has(selector)) {
    const classes = new Set(['modal--hide']);
    nodes.set(selector, {
     dataset: { projectsUrl }, innerHTML: '', textContent: '', style: {},
     classList: { add(value) { classes.add(value); }, remove(value) { classes.delete(value); },
      contains(value) { return classes.has(value); }, toggle() {} },
     addEventListener() {}, setAttribute() {}, focus() {}, querySelectorAll() { return []; }
    });
   }
   return nodes.get(selector);
  },
  querySelectorAll() { return []; }
 };
 const context = vm.createContext({ window: { location: { hostname }, addEventListener() {} }, document, fetch, AbortSignal, console: { log() {} } });
 vm.runInContext(source + '\nthis.classes = { Data, UI, Modal, Portfolio };', context);
 return { ...context.classes, nodes };
}

test('local and deployed galleries use the same project JSON, including a Jekyll baseurl', async () => {
 for (const hostname of ['localhost', '127.0.0.1', '[::1]', 'rapesteva.com', 'deploy-preview-1--portfolio.netlify.app']) {
  const calls = [];
  const { Data } = load(async (url, options) => { calls.push(url); assert.ok(options.signal); return response([project()]); },
   { hostname, projectsUrl: '/preview/projects.json' });
  const data = new Data();
  assert.equal((await data.fetchProjects('Web')).length, 1);
  assert.equal((await data.fetchSingleProject('project-Web')).name, 'Fixture Web');
  assert.equal(await data.getProjectsCount(), 1);
  assert.deepEqual(calls, ['/preview/projects.json']);
 }
});

test('all six filters, multiple Data instances and details share one concurrent JSON download', async () => {
 const types = ['Web', 'Javascript', 'Banner', 'Edm', 'Php', 'Logo'];
 let calls = 0;
 const { Data } = load(async () => { calls++; await new Promise(resolve => setImmediate(resolve)); return response(types.map(project)); });
 const results = await Promise.all(types.map(type => new Data().fetchProjects(type)));
 results.forEach((rows, index) => { assert.equal(rows.length, 1); assert.equal(rows[0].type, types[index]); });
 assert.equal(await new Data().getProjectsCount(), 6);
 assert.equal((await new Data().fetchSingleProject('project-Logo')).name, 'Fixture Logo');
 assert.equal((await new Data().fetchProjects('Unknown')).length, 0);
 await assert.rejects(new Data().fetchSingleProject('missing'), /missing/);
 assert.equal(calls, 1);
});

test('saved projects render existing cards, technology colors, collaborators and both modal types', async () => {
 const { Data, UI, Modal, nodes } = load(async () => response([project()]));
 const row = await new Data().fetchSingleProject('project-Web');
 const card = new UI().makeProjectCards(row);
 assert.match(card, /id="project-Web"/);
 assert.match(card, /main\.png/);
 const modal = new Modal();
 modal.openModalInfo(row);
 assert.equal(nodes.get('#modalTitle').innerHTML, 'Fixture Web');
 assert.match(nodes.get('#modalTech').innerHTML, /#6750A4/);
 assert.match(nodes.get('#collaborators').innerHTML, /Designer/);
 assert.match(nodes.get('#modalGallery').innerHTML, /gallery\.png/);
 modal.openModalImage(row);
 assert.equal(nodes.get('.modal__type-img').src, row.main_image.url);
});

test('a failed JSON request removes the spinner and can retry without contacting Strapi', async () => {
 const calls = [];
 const { Data, Portfolio, nodes } = load(async url => {
  calls.push(url);
  return calls.length === 1 ? { ok: false, status: 404 } : response([project()]);
 });
 new Portfolio().displayResults('Web');
 await new Promise(resolve => setImmediate(resolve));
 assert.match(nodes.get('#portfolioResultsContainer').textContent, /Please select a category/);
 assert.equal(nodes.get('#portfolioCount').textContent, 'Portfolio unavailable.');
 assert.equal((await new Data().fetchProjects('Web')).length, 1);
 assert.deepEqual(calls, ['/projects.json', '/projects.json']);
});

test('invalid static data and invalid JSON fail instead of silently showing zero projects', async () => {
 for (const body of [{ data: [] }, [null], [{ id: 'missing-image' }]]) {
  const { Data } = load(async () => response(body));
  await assert.rejects(new Data().fetchProjects('Web'), /Portfolio JSON is invalid/);
 }
 const { Data } = load(async () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } }));
 await assert.rejects(new Data().getProjectsCount(), /Invalid JSON/);
});

test('skills and certifications retain their existing endpoints and response shape', async () => {
 const calls = [];
 const original = { original: true };
 const { Data } = load(async url => { calls.push(url); return response(original); });
 const data = new Data();
 assert.equal(await data.getSkills(), original);
 assert.equal(await data.getCerts(), original);
 assert.deepEqual(calls, ['https://strapi-rap.herokuapp.com/skill-types', 'https://strapi-rap.herokuapp.com/certifications']);
});

test('version 2 snapshots filter new CMS categories through the existing type field', async () => {
 const { Data } = load(async () => response({ version: 2, categories: [{ key: 'case-studies', name: 'Case Studies' }], projects: [project('case-studies')] }));
 assert.equal((await new Data().fetchProjects('case-studies'))[0].id, 'project-case-studies');
 assert.equal((await new Data().fetchProjects('Web')).length, 0);
 assert.equal(await new Data().getProjectsCount(), 1);
});

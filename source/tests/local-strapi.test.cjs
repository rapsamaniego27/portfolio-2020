const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const files = ['Data', 'LocalStrapi', 'UI', 'Modal', 'Portfolio'];
const source = files.map(name => fs.readFileSync(path.join(root, 'source/js/classes', name + '.js'), 'utf8')).join('\n');
function load(hostname, fetch) {
 const nodes = new Map();
 const document = {
  querySelector(selector) {
   if (!nodes.has(selector)) nodes.set(selector, { innerHTML: '', textContent: '', style: {}, classList: { add() {}, remove() {} }, addEventListener() {} });
   return nodes.get(selector);
  },
  querySelectorAll() { return []; }
 };
 const context = vm.createContext({ window: { location: { hostname } }, document, fetch, URLSearchParams, AbortSignal, console: { log() {} } });
 vm.runInContext(source + '\nthis.classes = { Data, UI, Modal, Portfolio };', context);
 return { ...context.classes, nodes };
}
const response = body => ({ ok: true, status: 200, json: async () => body });
const project = (documentId = 'project-document') => ({
 id: 7, documentId, name: 'Fixture project', create_date: '2024-05-03', description: 'Fixture description', type: 'Web', modal_type: 'info',
 main_image: { url: '/uploads/main.png' }, gallery: [{ url: 'https://res.cloudinary.com/example/gallery.png' }],
 technologies: [{ name: 'JavaScript', color: '#6750A4' }], collaborators: []
});

test('only loopback hostnames select Strapi v5', () => {
 for (const hostname of ['localhost', '127.0.0.1', '[::1]', '::1']) {
  const { Data } = load(hostname, async () => {});
  assert.equal(new Data().api, 'http://127.0.0.1:1342/api/projects');
 }
 for (const hostname of ['rapesteva.com', 'www.rapesteva.com', 'deploy-preview-1--portfolio.netlify.app', 'localhost.example.com', '192.168.1.20', '']) {
  const { Data } = load(hostname, async () => {});
  assert.equal(new Data().api, 'https://strapi-rap.herokuapp.com/projects');
  assert.equal(new Data().localApi, undefined);
 }
});

test('deployed hosts retain all original v3 URLs and unwrapped responses', async () => {
 const calls = [];
 const body = { original: true };
 const { Data } = load('rapesteva.com', async url => { calls.push(url); return response(body); });
 for (const [method, argument] of [['fetchProjects', 'Edm'], ['fetchSingleProject', 'old-id'], ['getProjectsCount'], ['getSkills'], ['getCerts']]) {
  assert.equal(await new Data()[method](argument), body);
 }
 assert.deepEqual(calls, [
  'https://strapi-rap.herokuapp.com/projects?type=Edm',
  'https://strapi-rap.herokuapp.com/projects/old-id',
  'https://strapi-rap.herokuapp.com/projects/count',
  'https://strapi-rap.herokuapp.com/skill-types',
  'https://strapi-rap.herokuapp.com/certifications'
 ]);
});

test('local filtering populates the gallery and reads every v5 page', async () => {
 const calls = [];
 const { Data } = load('localhost', async (url, options) => {
  calls.push(new URL(url));
  assert.ok(options.signal);
  return response({ data: [project('document-' + calls.length)], meta: { pagination: { pageCount: 2 } } });
 });
 const rows = await new Data().fetchProjects('Javascript');
 assert.equal(rows.length, 2);
 assert.equal(rows[0].id, 'document-1');
 assert.equal(rows[1].id, 'document-2');
 assert.equal(rows[0].main_image.url, 'http://127.0.0.1:1342/uploads/main.png');
 assert.equal(rows[0].gallery[0].url, 'https://res.cloudinary.com/example/gallery.png');
 for (const [index, url] of calls.entries()) {
  assert.equal(url.origin, 'http://127.0.0.1:1342');
  assert.equal(url.pathname, '/api/projects');
  assert.equal(url.searchParams.get('filters[type][$eq]'), 'Javascript');
  assert.equal(url.searchParams.get('pagination[page]'), String(index + 1));
  for (const field of ['main_image', 'gallery', 'technologies', 'collaborators']) assert.equal(url.searchParams.get(`populate[${field}]`), 'true');
 }
});

test('repeated category selections do not accumulate filters', async () => {
 const calls = [];
 const { Data } = load('localhost', async url => { calls.push(new URL(url)); return response({ data: [], meta: { pagination: { pageCount: 0 } } }); });
 const data = new Data();
 await data.fetchProjects('Web');
 await data.fetchProjects('Logo');
 assert.deepEqual(calls.map(url => url.searchParams.get('filters[type][$eq]')), ['Web', 'Logo']);
 assert.equal(calls[1].searchParams.getAll('filters[type][$eq]').length, 1);
});

test('local project details and count use v5 document IDs and pagination metadata', async () => {
 const calls = [];
 const { Data } = load('localhost', async url => {
  calls.push(new URL(url));
  return response(calls.length === 1 ? { data: project('v5-document') } : { data: [], meta: { pagination: { total: 46 } } });
 });
 const data = new Data();
 const row = await data.fetchSingleProject('v5-document');
 assert.equal(calls[0].pathname, '/api/projects/v5-document');
 assert.equal(row.id, 'v5-document');
 assert.equal(await data.getProjectsCount(), 46);
 assert.equal(calls[1].pathname, '/api/projects');
 assert.equal(calls[1].searchParams.get('pagination[pageSize]'), '1');
});

test('v5 records render through the existing cards, tags and detail modal', async () => {
 const { Data, UI, Modal, nodes } = load('localhost', async () => response({ data: project() }));
 const row = await new Data().fetchSingleProject('project-document');
 const card = new UI().makeProjectCards(row);
 assert.match(card, /id="project-document"/);
 assert.match(card, /http:\/\/127\.0\.0\.1:1342\/uploads\/main\.png/);
 const modal = new Modal();
 modal.openModalInfo(row);
 assert.equal(nodes.get('#modalTitle').innerHTML, 'Fixture project');
 assert.match(nodes.get('#modalTech').innerHTML, /#6750A4/);
 assert.match(nodes.get('#modalGallery').innerHTML, /gallery\.png/);
 assert.equal(nodes.get('#modalMainImage').src, 'http://127.0.0.1:1342/uploads/main.png');
});

test('local API failures stay local and show an error instead of a stuck spinner', async () => {
 const calls = [];
 const { Data, Portfolio, nodes } = load('localhost', async url => { calls.push(url); return { ok: false, status: 403 }; });
 await assert.rejects(new Data().fetchProjects('Web'), /Local Strapi returned 403/);
 const portfolio = new Portfolio();
 portfolio.displayResults('Web');
 await new Promise(resolve => setImmediate(resolve));
 assert.match(nodes.get('#portfolioResultsContainer').textContent, /Could not load the local portfolio/);
 assert.ok(calls.every(url => url.startsWith('http://127.0.0.1:1342/')));
});

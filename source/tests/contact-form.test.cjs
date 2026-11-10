const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../js/classes/Contact.js'), 'utf8');

function load(hostname, missing = false) {
 const listeners = {};
 const buttons = [{}, {}];
 const form = { addEventListener: (type, listener) => { listeners[type] = listener; } };
 const notice = {
  opened: 0, closed: 0,
  showModal() { this.opened++; },
  close() { this.closed++; },
  querySelectorAll: () => buttons.map(button => ({ addEventListener: (type, listener) => { button[type] = listener; } })),
  addEventListener: (type, listener) => { listeners['notice-' + type] = listener; }
 };
 const context = vm.createContext({
  window: { location: { hostname } },
  document: { querySelector: selector => missing ? null : selector === '.contact-form__inner' ? form : notice }
 });
 vm.runInContext(source + '\nnew Contact();', context);
 return { listeners, buttons, form, notice };
}

test('local previews prevent submission and open a truthful message-not-sent notice', () => {
 for (const hostname of ['localhost', '127.0.0.1', '[::1]']) {
  const { listeners, notice } = load(hostname);
  let prevented = false;
  listeners.submit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(notice.opened, 1);
 }
});

test('production and deploy-preview hosts retain native Netlify submission', () => {
 for (const hostname of ['rapesteva.com', 'www.rapesteva.com', 'rapesteva.netlify.app', 'deploy-preview-1--portfolio.netlify.app', 'localhost.example.com']) {
  assert.equal(load(hostname).listeners.submit, undefined);
 }
});

test('notice buttons and backdrop close it; clicking content does not', () => {
 const { listeners, buttons, notice } = load('localhost');
 buttons[0].click();
 buttons[1].click();
 listeners['notice-click']({ target: notice });
 assert.equal(notice.closed, 3);
 listeners['notice-click']({ target: {} });
 assert.equal(notice.closed, 3);
});

test('pages without contact markup do not attach handlers or throw', () => {
 assert.deepEqual(load('localhost', true).listeners, {});
});

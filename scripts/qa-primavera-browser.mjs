import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const production = process.argv[2];
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  try {
    const route = path.replace(/^\/schedules\//, '');
    if (route.startsWith('/') || route.split('/').includes('..')) throw Error('Invalid preview route');
    const name = resolve('dist-v2', route + (path.endsWith('/') ? 'index.html' : ''));
    const mime = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'};
    res.setHeader('Content-Type', mime[extname(name)] ?? 'application/octet-stream');
    res.end(await readFile(name));
  } catch {
    res.statusCode = 404;
    res.end();
  }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const root = production ?? 'http://127.0.0.1:' + server.address().port + '/schedules/';
const browser = await chromium.launch({args: ['--no-sandbox']});
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({viewport: {width, height: 900}, isMobile: width < 500, hasTouch: width < 500});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const directory = await page.goto(root + 'projects/index.html', {waitUntil: 'domcontentloaded'});
    assert.equal(directory.status(), 200);
    await page.getByText('22 projects found').waitFor();
    await page.locator('#search').fill('Narayani');
    assert.equal(await page.locator('.project-card').count(), 1);
    await page.getByRole('link', {name: /Narayani Parajuli/}).click();
    await page.getByRole('heading', {name: 'Narayani Parajuli Residence'}).waitFor();
    await page.getByText('This schedule is a planning draft.', {exact: false}).waitFor();
    assert.match(await page.locator('#view').innerText(), /of 160 activities/);
    await page.getByRole('tab', {name: 'Gantt'}).click();
    assert.equal(await page.locator('.gantt-bar').count(), 50);
    await page.getByRole('tab', {name: 'Calendar'}).click();
    assert.equal(await page.locator('.calendar-days button').count(), 7);
    await page.getByRole('tab', {name: 'Work packages'}).click();
    await page.getByRole('button', {name: 'Show package'}).waitFor();
    await page.getByRole('tab', {name: 'Drawings'}).click();
    await page.getByRole('link', {name: 'Open drawing library'}).waitFor();
    await page.goto(root + 'projects/view.html?project=PORT-000014');
    await page.getByRole('heading', {name: 'Harisharan Residence'}).waitFor();
    assert.match(await page.locator('#view').innerText(), /of 839 activities/);
    await page.goto(root + 'projects/view.html?project=PORT-000019');
    await page.getByText('No activity schedule is available for this selection.').waitFor();
    await page.goto(root + 'resources/index.html');
    await page.getByRole('link', {name: 'Open materials planner'}).waitFor();
    const headings = await page.locator('#resourceList th').allTextContents();
    assert.deepEqual(headings, ['Reference work', 'Category', 'Unit', 'Per work unit'],
      'Resource table headers at ' + width + 'px');
    assert.ok(await page.locator('#resourceList tbody tr').count() > 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
    assert.deepEqual(errors, []);
    await page.close();
    console.log(width + 'px: 22 projects, public Doc notes, all five views, empty source state and rate/norm search pass');
  }
} finally {
  await browser.close();
  server.close();
}

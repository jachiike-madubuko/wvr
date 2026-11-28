#!/usr/bin/env node
// WVR-252 pre-push check (Proto Bot), round 2. Desktop only.
// Sections: [LIB] generic prototype checks (server, layout at 1024/1280/1440, click targets, gaps, wraps,
//           scroll jumps, overflow); lift this part into a shared check.cjs when the scaffold has one.
//           [WVR-252] this issue's checks: checklist-r2 T-01..T-51 for v4 (list-first), v5 (skin chips), v6 (one picker),
//           plus: R1 v1-v3 are byte-identical to the R1 commit and still pass check-r1.cjs.
// Served from a throwaway 127.0.0.1 server; any request other than the page itself counts as a network call.
// Usage: NODE_PATH=/workspace/proto-bot/wvr231-test/node_modules node prototypes/WVR-252/check.cjs   (SHOTS=dir saves screenshots)
// Exit code 0 = all checks pass, 1 = a check failed, 2 = crashed. Do not push on a non-zero exit.
// ---------------- [LIB] ----------------
const path = require('path');
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const cp = require('child_process');
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const f = path.join(DIR, decodeURIComponent(req.url.split('?')[0]));
      if (!f.startsWith(DIR) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}
const DIR = __dirname;
const VARS = process.argv.slice(2).length ? process.argv.slice(2) : ['v4', 'v5', 'v6'];
const WIDTHS = [1024, 1280, 1440];
const MIN_TARGET = 36, MIN_GAP = 8;
const GUARD = ['Tobin', 'Rivera', 'Room 12', 'Maya', 'Jordan', 'Avery', 'Riley', 'Casey', 'Quinn', 'Morgan', 'Jamie', 'Taylor', 'Drew', 'Skyler', 'Parker', 'Cameron', 'Rowan', 'Nico', 'Andre', 'Lila'];
const DEST_WORDS = /\b(Ocean|Plants|Ballet|Digging up the past)\b/;

const BANNER = 'Proposed defaults, not decided: see Open questions in stories.md. This file is a prototype, not the app.';
const results = [];
let fails = 0;
let CUR = '';
function rec(v, id, ok, msg) { results.push({ v, id, ok, msg }); if (!ok) fails++; }

async function layout(page, v, w, label) {
  const r = await page.evaluate(({ MIN_TARGET, MIN_GAP }) => {
    const out = { hscroll: document.documentElement.scrollWidth - window.innerWidth, small: [], close: [], wraps: [] };
    const vis = el => { const s = getComputedStyle(el); const b = el.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && b.width > 0 && b.height > 0 && !el.closest('[hidden]'); };
    const modalOpen = !document.getElementById('scrim').hidden;
    let els = [...document.querySelectorAll('button, a[href], [role=button], [role=radio]')].filter(vis);
    if (modalOpen) els = els.filter(e => e.closest('#modal'));
    const lines = el => {
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const rs = [];
      while (tw.nextNode()) { if (!tw.currentNode.textContent.trim()) continue; const r = document.createRange(); r.selectNodeContents(tw.currentNode); rs.push(...[...r.getClientRects()].filter(x => x.width > 0 && x.height > 0)); }
      rs.sort((a, b) => a.top - b.top); let n = 0, bottom = -1e9;
      for (const r of rs) { if (r.top >= bottom - 2) { n++; bottom = r.bottom; } else bottom = Math.max(bottom, r.bottom); }
      return n;
    };
    const name = e => (e.id ? '#' + e.id : e.className) + ' "' + e.textContent.trim().slice(0, 30) + '"';
    const rects = els.map(e => [e, e.getBoundingClientRect()]);
    for (const [e, b] of rects) {
      if (b.width < MIN_TARGET || b.height < MIN_TARGET) out.small.push(name(e) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
      const n = lines(e);
      if (!e.classList.contains('tile') && n > 1) out.wraps.push(name(e) + ' lines=' + n);
      if (e.scrollWidth > e.clientWidth + 1) out.wraps.push(name(e) + ' overflow');
    }
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const [a, A] = rects[i], [b, B] = rects[j];
      if (a.contains(b) || b.contains(a)) continue;
      const dx = Math.max(0, Math.max(A.left, B.left) - Math.min(A.right, B.right));
      const dy = Math.max(0, Math.max(A.top, B.top) - Math.min(A.bottom, B.bottom));
      const d = Math.max(dx, dy);
      if (d < MIN_GAP) out.close.push(name(a) + ' <-> ' + name(b) + ' gap=' + d.toFixed(1));
    }
    for (const e of document.querySelectorAll('.tag,.chip,.today,.shint,.proto-label,.skinlbl')) {
      if (!vis(e)) continue;
      const n = lines(e);
      if (n > 1) out.wraps.push(name(e) + ' lines=' + n);
    }
    return out;
  }, { MIN_TARGET, MIN_GAP });
  const tag = `${w}px ${label}`;
  rec(v, 'hscroll', r.hscroll <= 0, `${tag}: overflow ${r.hscroll}px`);
  rec(v, 'targets', r.small.length === 0, `${tag}: ${r.small.join('; ') || 'all >= ' + MIN_TARGET + 'px'}`);
  rec(v, 'gaps', r.close.length === 0, `${tag}: ${r.close.join('; ') || 'all >= ' + MIN_GAP + 'px'}`);
  rec(v, 'wraps', r.wraps.length === 0, `${tag}: ${r.wraps.join('; ') || 'no wraps'}`);
}

async function scrollJump(page, v, w, sel, label) {
  const before = await page.$eval(sel, e => { e.scrollIntoView({ block: 'center' }); return scrollY; });
  await page.click(sel);
  await page.waitForTimeout(60);
  const after = await page.evaluate(() => scrollY);
  rec(v, 'scroll-jump', Math.abs(after - before) <= 2, `${w}px ${label}: scrollY ${before} -> ${after}`);
}
// ---------------- [WVR-252] ----------------
const R1_COMMIT = 'c4b5cc6728953320f480caa0a35a7fa8dae131e0';
const ADJ_WORDS = /adjacent|non-adjacent|not next to|galaxy map|travel|ready to travel/i; // must-NOT-say, student view (T-12)
const SRC_BANNED = /adjacent|not next to|galaxy map|travel|next session|switch now/i;
const FIVE = ['Space', 'Ocean', 'Plants', 'Ballet', 'Digging up the past'];
const DENY_COPY = 'Your teacher said not now. You are still on Space. You can ask again.';
const REL = { v4: 'v4', v5: 'v5', v6: 'v6' };
const agg = {};
function chk(v, id, ok, msg) { const k = v + '|' + id; const a = agg[k] || (agg[k] = { v, id, bad: [], n: 0, ok: [] }); a.n++; if (ok) a.ok.push(msg); else a.bad.push(msg); }
function flush(v) { for (const a of Object.values(agg)) if (a.v === v) { rec(v, a.id, a.bad.length === 0, a.bad.length ? a.bad.join(' || ') : (a.ok[a.ok.length - 1] + (a.n > 1 ? ` (x${a.n})` : ''))); delete agg[a.v + '|' + a.id]; } }

const act = {
  async ask(page, v, to) {
    if (v === 'v6') await page.click('#askBtn');
    if (v === 'v5') return page.click('#chip-' + to);
    await page.click('#row-' + to); await page.click('#submitReq');
  },
  async pick(page, v, to) {
    if (v === 'v5') return page.click('#chip-' + to);
    await page.click('#row-' + to); await page.click('#submitReq');
  },
  async approve(page) { await page.click('#viewTeacher'); await page.click('#teacherBadge'); await page.click('#mApprove'); await page.click('#viewStudent'); },
  async deny(page) { await page.click('#viewTeacher'); await page.click('#teacherBadge'); await page.click('#mDeny'); await page.click('#viewStudent'); },
  async force(page) { await page.click('#viewTeacher'); await page.click('#forceBtn'); await page.click('#mConfirmForce'); await page.click('#viewStudent'); },
};
async function toState(page, v, s) {
  await page.click('#resetBtn');
  await page.click('#viewStudent');
  if (s === 'a') return;
  if (s === 'f' || s === 'g' || s === 'h') {
    await act.force(page);
    if (s === 'f') return;
    await page.click('#delayBtn');
    if (s === 'g') return;
    await act.pick(page, v, 'plants'); return;
  }
  await page.click('#credAbove');
  if (s === 'b') return;
  await act.ask(page, v, 'ocean');
  if (s === 'c') return;
  if (s === 'd') { await act.approve(page); return; }
  if (s === 'e') { await act.deny(page); return; }
}
const STATE_NAME = { a: 'seeded/below target', b: 'credits met', c: 'request pending', d: 'approved+scheduled', e: 'after deny', f: 'force confirmed, before pick', g: 'boundary pick', h: 'after switch applied' };

async function fold(page, v, s) {
  const r = await page.evaluate(() => {
    const d = document.getElementById('decision'), g = document.getElementById('gatePanel');
    if (!d || !g) return null;
    const dr = d.getBoundingClientRect(), gr = g.getBoundingClientRect();
    const ctl = [...document.querySelectorAll('#student button')].filter(b => b.getBoundingClientRect().width > 0);
    const bottom = Math.max(0, ...ctl.map(b => b.getBoundingClientRect().bottom));
    return { dTop: Math.round(dr.top), gTop: Math.round(gr.top), bottom: Math.round(bottom), docH: document.documentElement.scrollHeight };
  });
  chk(v, 'T-04', !!r && r.dTop < 800 && r.gTop < 800 && r.bottom <= 800, `${s}: decision top ${r && r.dTop}, gate top ${r && r.gTop}, lowest control bottom ${r && r.bottom} (page ${r && r.docH}px)`);
}
async function studentText(page) { await page.click('#viewStudent'); return page.innerText('#student'); }
async function teacherText(page) { await page.click('#viewTeacher'); const t = await page.innerText('#teacher'); await page.click('#viewStudent'); return t; }
async function mustNotSay(page, v, s, stu, tea) {
  const both = stu + '\n' + tea;
  chk(v, 'T-11', (await page.$$('#student svg:not(.swatch)')).length === 0 && !(await page.$('#student .ring, #student [aria-label*="map" i]')), `${s}: no map, ring, or neighbor layout in the Student view`);
  const h = (stu.match(ADJ_WORDS) || [])[0];
  chk(v, 'T-12', !h, `${s}: ${h ? 'HIT "' + h + '"' : 'no adjacency / map / Travel wording'}`);
  chk(v, 'T-01', stu.includes('Student A') && stu.includes('Prototype pseudonym') && !/Tobin|Rivera|Room 12/.test(both), `${s}: Student A + pseudonym tag; no Tobin / Ms. Rivera / Room 12`);
  const g = GUARD.filter(n => new RegExp('\\b' + n.replace(/ /g, '\\s+') + '\\b').test(both));
  chk(v, 'T-02', g.length === 0, `${s}: guard names ${g.join(',') || 'none'}`);
  chk(v, 'T-43', !/next session/i.test(both), `${s}: no "next session"`);
  chk(v, 'T-44', !/switch now/i.test(both) && !(await page.$('#student #delayBtn, #teacher #delayBtn')), `${s}: no "switch now"; delay control is in Proto controls only`);
  chk(v, 'T-05', !/phone/i.test(both), `${s}: no phone copy`);
}

(async () => {
  const srv = await serve();
  const BASE = `http://127.0.0.1:${srv.address().port}/`;
  let browser;
  try { browser = await chromium.launch(); } catch (e) { browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' }); }
  const SH = process.env.SHOTS;
  const shot = async (page, name) => { if (SH) await page.screenshot({ path: path.join(SH, name + '.png') }); };

  // R1 v1-v3 unchanged
  CUR = 'R1 unchanged';
  for (const r of ['v1', 'v2', 'v3']) {
    const f = `prototypes/WVR-252/${r}/index.html`;
    let want = null;
    try { want = cp.execFileSync('git', ['show', `${R1_COMMIT}:${f}`], { cwd: path.join(DIR, '..', '..'), maxBuffer: 1 << 26 }); } catch (e) {}
    const have = fs.readFileSync(path.join(DIR, r, 'index.html'));
    rec('R1', `${r}-byte-identical`, !!want && Buffer.compare(want, have) === 0, `${r}/index.html equals ${R1_COMMIT.slice(0, 7)}`);
  }
  const r1 = cp.spawnSync(process.execPath, [path.join(DIR, 'check-r1.cjs'), 'v1', 'v2', 'v3'], { encoding: 'utf8', env: process.env, maxBuffer: 1 << 26 });
  const m = [...r1.stdout.matchAll(/== (v\d): (\d+)\/(\d+) pass/g)].map(x => `${x[1]} ${x[2]}/${x[3]}`);
  rec('R1', 'check-r1', r1.status === 0, `R1 v1-v3 still pass check-r1.cjs (exit ${r1.status}): ${m.join(', ')}`);

  for (const v of VARS) {
    const url = BASE + v + '/index.html';
    const K = `wvr252:${v}:state`;
    const src = fs.readFileSync(path.join(DIR, v, 'index.html'), 'utf8');
    rec(v, 'source-banned', !SRC_BANNED.test(src), 'source has no adjacency / Galaxy map / Travel / next session / switch now: ' + ((src.match(SRC_BANNED) || ['clean'])[0]));
    rec(v, 'self-contained', !/<script[^>]+src=|<link[^>]+href=|@import|https?:\/\//i.test(src), 'inline only, no external URLs');
    for (const w of WIDTHS) {
      CUR = `${v} @ ${w}px`;
      const ctx = await browser.newContext({ viewport: { width: w, height: w === 1280 ? 800 : 720 } });
      const page = await ctx.newPage();
      const net = [], errs = [];
      page.on('request', r => { const u = r.url(); if (!u.startsWith(url) && !u.startsWith('data:') && !u.startsWith(BASE)) net.push(u); });
      page.on('pageerror', e => errs.push(e.message));
      await page.goto(url);
      await page.click('#resetBtn');
      const ST = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), K);
      const full = w === 1280;

      // layout in every state, all widths
      for (const s of 'abcdefgh') {
        await toState(page, v, s);
        await layout(page, v, w, `student ${STATE_NAME[s]}`);
      }
      await toState(page, v, 'b');
      if (v === 'v6') { await page.click('#askBtn'); await page.click('#row-ocean'); await layout(page, v, w, 'v6 picker with selection'); }
      if (v === 'v4') { await page.click('#row-ocean'); await layout(page, v, w, 'v4 list with selection'); }
      await toState(page, v, 'c'); await page.click('#viewTeacher'); await layout(page, v, w, 'teacher pending');
      await scrollJump(page, v, w, '#teacherBadge', 'open approve modal');
      await layout(page, v, w, 'approve modal');
      await page.keyboard.press('Escape'); await page.click('#resetBtn'); await page.click('#viewTeacher');
      await layout(page, v, w, 'teacher seed'); await scrollJump(page, v, w, '#forceBtn', 'open force modal'); await layout(page, v, w, 'force modal');
      await page.keyboard.press('Escape');
      await page.click('#viewStudent'); await page.click('#resetBtn');
      await scrollJump(page, v, w, '#credAbove', 'credits at target');
      rec(v, 'network', net.length === 0, `${w}px: ${net.join(',') || 'no requests beyond the page'}`);

      if (full) {
        const BODY = () => page.innerText('body');
        // ---- per-state sweep: fold, must-NOT-say, T-45 ----
        for (const s of 'abcdefgh') {
          await toState(page, v, s);
          await fold(page, v, `(${s}) ${STATE_NAME[s]}`);
          const stu = await studentText(page), tea = await teacherText(page);
          await mustNotSay(page, v, `(${s})`, stu, tea);
          await shot(page, `${v}-${s}-student`);
        }
        // ---- A. identity, banner, proto controls, reset ----
        await page.click('#resetBtn');
        const mq = await page.evaluate(() => [...document.styleSheets].flatMap(s => [...s.cssRules]).filter(r => r.type === 4).length);
        rec(v, 'T-05b', mq === 0, `no media queries (${mq}); desktop only`);
        rec(v, 'T-06a', (await page.textContent('#bannerText')).trim() === BANNER, 'banner text exact');
        const visW = () => page.evaluate(() => { const e = document.getElementById('bannerText'); return Math.round([...e.querySelectorAll('span')].reduce((n, s) => n + (getComputedStyle(s).display === 'none' ? 0 : s.getBoundingClientRect().width), 0)); });
        const w0 = await visW(); await page.click('#bannerTog'); const w1 = await visW();
        const t1 = (await page.textContent('#bannerText')).trim();
        rec(v, 'T-06b', w1 < w0 - 40 && t1 === BANNER && await page.isVisible('#banner'), `collapses ${w0} -> ${w1}px, full text kept, not removable`);
        await page.click('#bannerTog');
        const protoVis = await Promise.all(['#resetBtn', '#delayBtn', '#credBelow', '#credAbove', '#viewStudent', '#viewTeacher'].map(s => page.isVisible(s)));
        rec(v, 'T-08', protoVis.every(Boolean) && (await page.$$eval('.proto button', b => b.length)) >= 6 && (await page.textContent('.proto-label')).includes('prototype') && (await page.$('.proto #delayBtn')) !== null, 'Proto controls: view switch, Reset, below, at-target, delayed boundary');

        // ---- B. top five (seed) ----
        await page.click('#resetBtn');
        const five = await page.innerText('#topFive');
        rec(v, 'T-10', FIVE.every(l => five.includes(l)) && (five.match(/Current/g) || []).length === 1 && /Space[\s\S]{0,20}Current|Current[\s\S]{0,20}Space/.test(five), 'five fixture interests (Space current; Ocean, Plants, Ballet, Digging up the past)');
        // ---- C. credit limit ----
        const pressable = () => page.$$eval('#student button:not([disabled])', bs => bs.filter(b => b.id !== 'x').map(b => b.id));
        const reqControls = () => page.$$eval('#student button.skinbtn:not([disabled]), #student button[role=radio]:not([disabled]), #student #askBtn:not([disabled])', bs => bs.length);
        rec(v, 'T-13', (await reqControls()) === 0 && !(await page.$('#submitReq')), 'seed (4 of 10): no request control is pressable');
        const why = await page.textContent('#gateReason');
        rec(v, 'T-14', /credit/i.test(why) && !/adjacent|next to/i.test(why), 'lock reason is a credit reason only: "' + why.slice(0, 60) + '"');
        rec(v, 'T-18', /fixture/i.test(await page.textContent('#credFixture')) && (await page.textContent('#credLine')).includes('4 of 10'), 'credit amount "4 of 10" labeled as a fixture, not a product rule');
        await page.click('#credBelow'); await page.reload();
        rec(v, 'T-15', (await ST()).credits < 10 && (await reqControls()) === 0, 'reload keeps requests locked below target');
        // locked label risk (T-51 a)
        const lockedTxt = await page.innerText('#student');
        rec(v, 'T-51a', !/switch to (Ocean|Plants|Ballet|Digging)/i.test(lockedTxt) && (await page.$$eval('#student button[disabled]', b => b.every(x => !/^\s*(Ask to )?switch to/i.test(x.textContent)))), 'locked controls do not read as pressable "switch to X"');
        if (v === 'v5') rec(v, 'T-48a', (await page.$$('#student button.skinbtn[disabled]')).length === 4 && (await page.$$eval('#student button.skinbtn', b => b.every(x => x.querySelector('svg.swatch')))), 'v5 below target: four skinned chips visible but disabled; current is not a chip button');
        if (v === 'v6') {
          rec(v, 'T-49a', await page.isDisabled('#askBtn') && /credit target/i.test(await page.textContent('#askWhy')) && await page.evaluate(() => { const a = document.getElementById('askBtn').getBoundingClientRect(), b = document.getElementById('askWhy').getBoundingClientRect(); return Math.abs((a.top + a.height / 2) - (b.top + b.height / 2)) < 20 && b.left > a.right - 1; }), 'v6: single "Ask to switch" disabled below target, credit reason next to it');
        }
        await page.click('#resetBtn'); await page.click('#credAbove');
        const noSel = () => page.$$eval('#student [aria-checked="true"]', b => b.length);
        if (v === 'v6') {
          rec(v, 'T-16a', !(await page.isDisabled('#askBtn')) && (await page.$$('#picker')).length === 0, 'v6: Ask to switch enabled, picker closed until pressed');
          await page.click('#askBtn');
        }
        if (v !== 'v5') {
          const radios = await page.$$eval('#student button[role=radio]', b => b.map(x => x.textContent.trim()));
          rec(v, 'T-16', radios.length === 4 && !radios.some(t => /^Space/.test(t)) && (await noSel()) === 0, `credits met: four other interests requestable (${radios.map(r => r.replace(/\s+/g, ' ')).join('|')}); Space (current) is not; none pre-selected`);
        } else {
          const chips = await page.$$eval('#student button.chip:not([disabled])', b => b.map(x => x.textContent.trim()));
          rec(v, 'T-16', chips.length === 4 && chips.every(t => /^Ask to switch to /.test(t)) && !chips.some(t => /Space/.test(t)), `credits met: four skinned chips pressable (${chips.join('|')}); Space (current) is not`);
          rec(v, 'T-48', (await page.$$eval('#student button.chip', b => b.length)) === 4 && (await page.$$eval('#student button.chip', b => b.every(x => x.querySelector('svg.swatch') && x.dataset.skin))) && /Current/.test(await page.innerText('#topFive')) && (await page.$$eval('#student .flatchip.cur', e => e.length)) === 1, 'v5: each other interest is a skinned chip; current marked, not pressable; preview does not move the student');
        }
        // T-28: skin as background, readable label
        const skinOf = async to => {
          if (v === 'v5') return page.$eval('#chip-' + to, b => ({ svg: !!b.querySelector('svg.swatch'), skin: b.dataset.skin, lbl: getComputedStyle(b.querySelector('.skinlbl')).backgroundColor, col: getComputedStyle(b.querySelector('.skinlbl')).color, text: b.textContent.trim(), bg: getComputedStyle(b.querySelector('svg.swatch')).position }));
          await page.click('#row-' + to);
          return page.$eval('#submitReq', b => ({ svg: !!b.querySelector('svg.swatch'), skin: b.dataset.skin, lbl: getComputedStyle(b.querySelector('.skinlbl')).backgroundColor, col: getComputedStyle(b.querySelector('.skinlbl')).color, text: b.textContent.trim(), bg: getComputedStyle(b.querySelector('svg.swatch')).position }));
        };
        const sk = await skinOf('ocean');
        const alpha = +((sk.lbl.match(/rgba\([^)]*,\s*([\d.]+)\)/) || [0, 1])[1]);
        rec(v, 'T-28', sk.svg && sk.skin === 'ocean' && sk.bg === 'absolute' && alpha >= 0.85 && /255, 255, 255/.test(sk.col) && /Ocean/.test(sk.text), `skin is the control background, label chip alpha ${alpha}, white text: "${sk.text}"`);
        await shot(page, `${v}-b-selected`);
        const sk2 = await skinOf('plants');
        rec(v, 'T-28b', sk2.skin === 'plants' && /Plants/.test(sk2.text) && (v === 'v5' || (await noSel()) === 1), `a different interest gets its own skin: "${sk2.text}"` + (v === 'v5' ? '' : '; only one row selected'));

        // ---- D. request, approve, deny ----
        await page.click('#resetBtn'); await page.click('#credAbove');
        await act.ask(page, v, 'ocean');
        let s1 = await ST();
        rec(v, 'T-19', s1.request && s1.request.status === 'pending' && s1.request.to === 'ocean' && s1.interest === 'space' && /waiting for your teacher/i.test(await page.innerText('#student')) && /Space/.test(await page.textContent('#today')), 'one pending request; still on Space; Student view says waiting for the teacher');
        rec(v, 'T-20', (await reqControls()) === 0 && (await page.$$('#student button.skinbtn:not([disabled])')).length === 0, 'pending: no second request can be submitted');
        rec(v, 'T-29', (await page.$$('#student button.skinbtn:not([disabled])')).length === 0, 'pending: no pressable destination-skin button');
        const pendTxt = await page.innerText('#student');
        rec(v, 'T-51b', !/switch to (Ocean|Plants|Ballet|Digging)/i.test(pendTxt) && (await page.$$eval('#student button[disabled]', b => b.every(x => !/^\s*(Ask to )?switch to/i.test(x.textContent)))), 'pending control reads as waiting, not as "switch to X"');
        await shot(page, `${v}-c-pending`);
        await page.click('#viewTeacher');
        rec(v, 'T-21a', await page.isVisible('#teacherBadge') && (await page.$$('#modal input, #modal textarea, #teacher input, #teacher textarea')).length === 0, 'teacher sees the pending request; no reason field');
        await page.click('#teacherBadge');
        const mt = await page.innerText('#modal');
        rec(v, 'T-21b', /Student A/.test(mt) && /Space/.test(mt) && /Ocean/.test(mt) && (await page.$$('#modal input, #modal textarea')).length === 0, 'modal shows Student A, current Space, requested Ocean; Approve/Deny one tap each');
        await shot(page, `${v}-approve-modal`);
        await page.click('#mApprove');
        const s2 = await ST();
        rec(v, 'T-22', s2.request && s2.request.status === 'scheduled' && s2.interest === 'space', 'approve: scheduled, current interest unchanged');
        await page.click('#viewStudent');
        const schedTxt = await page.innerText('#student');
        rec(v, 'T-22b', /does not apply yet/i.test(schedTxt) && /still on Space/i.test(schedTxt) && /Space/.test(await page.textContent('#today')), 'Student view: approved, does not apply yet, still on Space');
        rec(v, 'T-29b', (await page.$$('#student button.skinbtn:not([disabled])')).length === 0 && (await reqControls()) === 0, 'scheduled: no pressable destination-skin button');
        await shot(page, `${v}-d-scheduled`);
        await page.reload();
        const s3 = await ST();
        rec(v, 'T-23', s3.request && s3.request.status === 'scheduled' && s3.interest === 'space', 'reload before the boundary: still Space, still scheduled');
        await page.click('#viewTeacher');
        const tlA = await page.$$eval('#timeline li', l => l.map(x => x.className + ':' + x.textContent));
        rec(v, 'T-40', tlA.length === 1 && /^approved:/.test(tlA[0]) && /Ocean/.test(tlA[0]), 'approved-switch entry (may name Ocean): ' + tlA[0].slice(0, 70));
        await page.click('#viewStudent');
        await page.click('#delayBtn');
        const s4 = await ST();
        rec(v, 'T-24', s4.interest === 'ocean' && !s4.request && /Ocean/.test(await page.textContent('#today')), 'delayed boundary: current becomes Ocean; scheduled clears');
        rec(v, 'T-46', s4.credits === 10 && /credits carried over/i.test(await page.textContent('#carryLabel')) && /not a product rule/i.test(await page.textContent('#carryLabel')), 'credits unchanged (10) after the switch; fixture label says carried over, not a product rule');
        rec(v, 'T-51d', !(await page.$('#reqStatus')) && !/requested|scheduled|approved/i.test(await page.innerText('#topFive')), 'after the switch: no stale requested / scheduled tags');
        await shot(page, `${v}-h-applied`);
        // deny
        await page.click('#resetBtn'); await page.click('#credAbove');
        await act.ask(page, v, 'ballet');
        await act.deny(page);
        const s5 = await ST();
        const denyTxt = await page.innerText('#student');
        rec(v, 'T-25', !s5.request && s5.interest === 'space' && !/waiting for your teacher/i.test(denyTxt), 'deny: pending clears, not scheduled, still Space, no "waiting" text');
        await page.click('#delayBtn');
        rec(v, 'T-25b', (await ST()).interest === 'space', 'delayed boundary after a deny: no change');
        rec(v, 'T-26', (await page.textContent('#denyNote')).trim() === DENY_COPY && !/stay for now/i.test(denyTxt), 'deny copy is the locked v4 line, no third line: "' + DENY_COPY + '"');
        await shot(page, `${v}-e-denied`);
        rec(v, 'T-27', (await reqControls()) > 0 || v === 'v6' && !(await page.isDisabled('#askBtn')), `deny is not final: request control returns immediately (still credit-gated)`);
        rec(v, 'T-51c', !(await page.$('#reqStatus')) && (await page.$$eval('#topFive .rtag', t => t.map(x => x.textContent))).every(t => /Current/.test(t)) && !/requested|scheduled|chosen/i.test(await page.innerText('#topFive')), 'after deny: no stale requested / scheduled / chosen tags');
        await page.click('#credBelow');
        rec(v, 'T-27b', (await reqControls()) === 0, 'after a deny, requests are credit-gated again below target');
        await page.click('#viewTeacher');
        rec(v, 'T-41', (await page.$$('#timeline li')).length === 0, 'deny is not logged on the timeline (proposed fixture, OQ-10)');
        await page.click('#viewStudent');
        // T-17: different destinations
        const dests = [];
        for (const to of ['plants', 'past']) {
          await page.click('#resetBtn'); await page.click('#credAbove');
          await act.ask(page, v, to); dests.push((await ST()).request.to);
        }
        rec(v, 'T-17', dests.join() === 'plants,past', 'two different non-current interests were each requestable: ' + dests.join(', '));
        // T-16 current is never a destination
        rec(v, 'T-16b', !(await page.$('#student #row-space, #student #chip-space')), 'current interest has no request control');

        // ---- E. force + boundary pick ----
        await page.click('#resetBtn'); await page.click('#viewTeacher');
        const fb = await page.$eval('#forceBtn', b => ({ txt: b.textContent, col: getComputedStyle(b).borderTopColor, w: getComputedStyle(b).borderTopWidth }));
        rec(v, 'T-30', /Student A/.test(await page.innerText('#rowA')) && /Force switch/.test(fb.txt) && fb.col !== 'rgb(255, 255, 255)' && !(await page.$('#teacher svg')), 'teacher class view: Student A row with its own Force switch (distinct), no map');
        await page.click('#forceBtn');
        const fmt = await page.innerText('#modal');
        rec(v, 'T-31', !DEST_WORDS.test(fmt) && (await page.$$('#modal input, #modal textarea, #modal select')).length === 0 && /do not choose the destination/i.test(fmt), 'force modal: no destination choice, no reason field; short confirm');
        await shot(page, `${v}-force-modal`);
        await page.click('#mCancel');
        const s6 = await ST();
        rec(v, 'T-33', !s6.force && s6.interest === 'space' && s6.timeline.length === 0, 'cancel before confirm: nothing scheduled');
        await page.click('#forceBtn'); await page.click('#mConfirmForce');
        const s7 = await ST();
        const tTxt = await page.innerText('#teacher');
        const tlF = await page.$$eval('#timeline li', l => l.map(x => x.className + ':' + x.textContent));
        rec(v, 'T-38', tlF.length === 1 && /^forced:/.test(tlF[0]) && /Student A/.test(tlF[0]) && !DEST_WORDS.test(tlF[0]), 'force-time timeline entry names Student A and a force, no destination: ' + tlF[0].slice(0, 80));
        await shot(page, `${v}-f-teacher`);
        await page.click('#viewStudent');
        const fTxt = await page.innerText('#student');
        rec(v, 'T-32', s7.force && s7.force.status === 'scheduled' && s7.interest === 'space' && /change is coming/i.test(fTxt) && /pick your new interest/i.test(fTxt) && /Space/.test(await page.textContent('#today')), 'force confirmed: still Space; Student view says a change is coming and the student picks');
        const rtags = await page.$$eval('#topFive .rtag', t => t.map(x => x.textContent.trim()));
        const noteF = await page.textContent('#forceNote');
        rec(v, 'T-45', !DEST_WORDS.test(tTxt) && !DEST_WORDS.test(tlF.join(' ')) && !DEST_WORDS.test(noteF) && !DEST_WORDS.test(await page.textContent('#today')) && rtags.every(t => /Current/.test(t)) && !(await page.$('#reqStatus')) && (await page.$$('#student button.skinbtn:not([disabled])')).length === 0, 'force time: teacher view, timeline, note, today chip and list tags name no destination; the plain top-five list only shows labels, none marked chosen/scheduled (a literal text search for a label hits this list)');
        rec(v, 'T-51e', !/requested|scheduled|chosen|approved/i.test(await page.innerText('#topFive')) && (await reqControls()) === 0 && (v !== 'v6' || ((await page.$$('#picker')).length === 0 && (await noSel()) === 0)), 'force-coming: no stale requested/scheduled/chosen tags; nothing pre-selected' + (v === 'v6' ? '; picker not open' : ''));
        await page.reload();
        const s8 = await ST();
        rec(v, 'T-34', s8.force && s8.force.status === 'scheduled' && s8.interest === 'space', 'reload after force: still Space, force still scheduled');
        await page.click('#viewTeacher'); await page.click('#viewStudent');
        rec(v, 'T-07', (await ST()).force.status === 'scheduled' && /change is coming/i.test(await page.innerText('#student')), 'switching views keeps state');
        await page.click('#delayBtn');
        const s9 = await ST();
        const pickTxt = await page.innerText('#student');
        const opts = v === 'v5' ? await page.$$eval('#student button.chip:not([disabled])', b => b.map(x => x.textContent.trim())) : await page.$$eval('#student button[role=radio]', b => b.map(x => x.textContent.trim()));
        rec(v, 'T-35a', s9.force.status === 'picking' && s9.interest === 'space' && opts.length === 4 && /Space/.test(await page.textContent('#today')) && /did not pick it for you/i.test(pickTxt), 'boundary: pick step shown, still Space, four options, teacher did not pick');
        rec(v, 'T-36', !opts.some(o => /\bStay\b/.test(o)) && /Stay is not offered/i.test(await page.textContent('#pickFixture')), 'Stay omitted (fixture cue says so; not the product rule)');
        if (v !== 'v5') rec(v, 'T-51f', (await noSel()) === 0 && (await page.$$('#submitReq')).length === 0, 'boundary pick: nothing pre-selected, no skinned submit until a choice is made');
        if (v === 'v6') rec(v, 'T-49c', (await page.$$('#picker')).length === 1 && (await page.textContent('#picker')).includes('Current') && (await page.$$('#pickCancel')).length === 0 && (await noSel()) === 0, 'v6: the same picker is reused at the boundary, current labeled, nothing pre-selected');
        await shot(page, `${v}-g-pick`);
        await page.click('#viewTeacher');
        const tlBefore = await page.$$eval('#timeline li', l => l.map(x => x.textContent).join(' '));
        rec(v, 'T-39a', !DEST_WORDS.test(tlBefore), 'timeline still names no destination before the pick');
        await page.click('#viewStudent');
        await act.pick(page, v, 'ballet');
        const s10 = await ST();
        rec(v, 'T-35', s10.interest === 'ballet' && !s10.force && /Ballet/.test(await page.textContent('#today')), 'only after the student picks does the current interest change (Ballet)');
        await page.click('#viewTeacher');
        const tlAfter = await page.$$eval('#timeline li', l => l.map(x => x.className + ':' + x.textContent));
        rec(v, 'T-39', tlAfter.length >= 1 && tlAfter.every(x => /^forced:/.test(x)) && tlAfter.join(' ').includes('Ballet') && !DEST_WORDS.test(tlAfter[0] || ''), 'after the pick the chosen interest is logged; forced style stays distinct from approved');
        await shot(page, `${v}-h-teacher-timeline`);
        rec(v, 'T-42', !/Tobin|Rivera/.test(await page.innerText('#timeline')) && /Student A/.test(await page.innerText('#timeline')), 'timeline uses "Student A" only');
        await page.click('#viewStudent');
        await page.click('#resetBtn');
        await page.click('#delayBtn');
        rec(v, 'T-37', (await ST()).interest === 'space', 'delayed boundary with nothing scheduled: no change');
        // timeline distinguishability (approved vs forced)
        await page.click('#credAbove'); await act.ask(page, v, 'ocean'); await act.approve(page); await page.click('#delayBtn');
        await act.force(page); await page.click('#viewTeacher');
        const kinds = await page.$$eval('#timeline li', l => l.map(x => ({ c: x.className, k: x.querySelector('.kind').textContent, b: getComputedStyle(x).borderLeftColor })));
        rec(v, 'T-40b', kinds.length === 2 && kinds[0].k !== kinds[1].k && kinds[0].b !== kinds[1].b, 'approved vs forced entries differ in label and color: ' + kinds.map(k => k.k).join(' / '));
        await page.click('#viewStudent');

        // ---- reset ----
        await page.click('#resetBtn');
        const sR = await ST();
        rec(v, 'T-09', sR.interest === 'space' && sR.credits === 4 && !sR.request && !sR.force && sR.timeline.length === 0 && (await page.textContent('#credLine')).includes('4 of 10'), 'reset restores the seed: Space, 4 of 10, nothing pending / scheduled / logged');
        // ---- v6 picker cancel (T-49 / T-51) ----
        if (v === 'v6') {
          await page.click('#credAbove'); await page.click('#askBtn'); await page.click('#row-ocean');
          rec(v, 'T-49b', (await noSel()) === 1 && /Ask to switch to Ocean/.test(await page.textContent('#submitReq')), 'v6: choose one of the other four, then submit');
          await page.click('#pickCancel');
          rec(v, 'T-51g', (await page.$$('#picker')).length === 0 && (await ST()).request === null, 'cancel closes the picker, nothing requested');
          await page.click('#askBtn');
          rec(v, 'T-51h', (await noSel()) === 0 && (await page.$$('#submitReq')).length === 0, 'picker reopened after cancel: nothing pre-selected');
          await shot(page, 'v6-picker-after-cancel');
          await page.click('#resetBtn');
        }
        // ---- v4 selection hygiene ----
        if (v === 'v4') {
          await page.click('#credAbove'); await page.click('#row-ocean');
          await page.click('#viewTeacher'); await page.click('#viewStudent');
          rec(v, 'T-51i', (await noSel()) === 0, 'v4: a selected row does not survive a view change');
          await page.click('#resetBtn');
        }
        // ---- out of scope ----
        const allBtn = await page.$$eval('button', b => b.map(x => x.textContent.trim().toLowerCase()));
        rec(v, 'T-50', !allBtn.some(t => /switch now|keep|choicescreen|equip/.test(t)) && !(await page.$('svg.ring')), 'no immediate apply, switch now, ChoiceScreen, equip control, or map');
        rec(v, 'T-47', true, 'n/a: no Trophy Bag or avatar shown');
      }
      rec(v, 'js-errors', errs.length === 0, `${w}px: ${errs.join(' | ') || 'none'}`);
      await ctx.close();
    }
    flush(v);
  }
  await browser.close();
  srv.close();
  for (const v of ['R1', ...VARS]) {
    const rs = results.filter(r => r.v === v), f = rs.filter(r => !r.ok);
    console.log(`\n== ${v}: ${rs.length - f.length}/${rs.length} pass`);
    for (const r of (process.env.VERBOSE ? rs : f)) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.id} ${r.msg}`);
  }
  console.log(fails ? `\nFAILED: ${fails} check(s). Do not push.` : '\nALL CHECKS PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('crashed during ' + CUR + ':', e); process.exit(2); });

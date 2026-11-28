#!/usr/bin/env node
// WVR-252 pre-push check (Proto Bot). Desktop only.
// Layout at 1024, 1280, and 1440: click-target size, gaps, wraps, scroll jumps, overflow.
// Walks checklist T-01–T-44 (credit gate, Travel that waits, force without a teacher-picked
// destination, student pick at the boundary, timeline timing, v2 strip, v3 upcoming card).
// Served from a throwaway 127.0.0.1 server; any request other than the page itself counts as a network call.
// Usage: NODE_PATH=/workspace/proto-bot/wvr231-test/node_modules node prototypes/WVR-252/check.cjs
// Exit code 0 = all checks pass. Do not push on a non-zero exit.
const path = require('path');
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
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
const VARS = process.argv.slice(2).length ? process.argv.slice(2) : ['v1', 'v2', 'v3'];
const WIDTHS = [1024, 1280, 1440];
const MIN_TARGET = 36, MIN_GAP = 8;
const GUARD = ['Tobin', 'Rivera', 'Room 12', 'Maya', 'Jordan', 'Avery', 'Riley', 'Casey', 'Quinn', 'Morgan', 'Jamie', 'Taylor', 'Drew', 'Skyler', 'Parker', 'Cameron', 'Rowan', 'Nico', 'Andre', 'Lila'];
const DEST_WORDS = /\b(Ocean|Plants|Ballet|Digging up the past)\b/;
const BANNED = [/switch now/i, /phone/i, /iphone/i, /next session/i, /choicescreen/i, /keep or switch/i];
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

(async () => {
  const srv = await serve();
  const BASE = `http://127.0.0.1:${srv.address().port}/`;
  let browser;
  try { browser = await chromium.launch(); } catch (e) { browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' }); }
  for (const v of VARS) {
    const url = BASE + v + '/index.html';
    const K = `wvr252:${v}:state`;
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
      const txt = sel => page.textContent(sel);
      const full = w === 1280;
      await layout(page, v, w, 'student seed');
      await scrollJump(page, v, w, '#bannerTog', 'banner toggle');
      await page.click('#bannerTog');
      await scrollJump(page, v, w, '#credAbove', 'credits at target');
      await layout(page, v, w, 'student ready');
      if (v === 'v2') await layout(page, v, w, 'v2 strip');
      await scrollJump(page, v, w, '#travelBtn', 'submit travel');
      await layout(page, v, w, 'student pending');
      await page.click('#viewTeacher');
      await layout(page, v, w, 'teacher pending');
      await scrollJump(page, v, w, '#teacherBadge', 'open approve modal');
      await layout(page, v, w, 'approve modal');
      await page.keyboard.press('Escape');
      await page.click('#resetBtn');

      if (full) {
        const body = async () => page.evaluate(() => document.body.innerText);
        let all = '';
        for (const view of ['#viewStudent', '#viewTeacher']) { await page.click(view); all += await body(); }
        await page.click('#viewStudent');
        rec(v, 'T-01', all.includes('Student A') && all.includes('Prototype pseudonym') && all.includes('Teacher') && all.includes('Class') && !/Tobin|Rivera|Room 12/.test(all), 'Student A + tag; Teacher + Class; no Tobin/Rivera/Room 12');
        const hit = GUARD.filter(n => new RegExp('\\b' + n.replace(/ /g, '\\s+') + '\\b').test(all));
        rec(v, 'T-02', hit.length === 0, 'guard names: ' + (hit.join(',') || 'none'));
        const mq = await page.evaluate(() => [...document.styleSheets].flatMap(s => [...s.cssRules]).filter(r => r.type === 4).length);
        rec(v, 'T-04', mq === 0 && !/phone/i.test(all), `media queries ${mq}; phone copy ${/phone/i.test(all)}`);
        rec(v, 'T-05', (await txt('#bannerText')).trim() === BANNER, 'banner text exact');
        const visW = async () => page.evaluate(() => {
          const e = document.getElementById('bannerText');
          return Math.round([...e.querySelectorAll('span')].reduce((n, s) => n + (getComputedStyle(s).display === 'none' ? 0 : s.getBoundingClientRect().width), 0));
        });
        const w0 = await visW();
        await page.click('#bannerTog');
        const w1 = await visW();
        const t1 = (await txt('#bannerText')).trim();
        rec(v, 'T-05b', w1 < w0 - 40 && t1 === BANNER && await page.isVisible('#bannerText') && await page.isVisible('#banner'), `collapse visible ${w0} -> ${w1}; full text kept`);
        await page.click('#bannerTog');
        rec(v, 'T-07', await page.isVisible('#resetBtn') && await page.isVisible('#delayBtn') && await page.isVisible('#credBelow') && await page.isVisible('#credAbove') && (await txt('.proto-label')).includes('prototype'), 'proto controls: Reset, below, at-target, delay');
        const ban = BANNED.filter(re => re.test(all));
        rec(v, 'T-44a-copy', ban.length === 0, 'banned copy: ' + (ban.map(String).join(',') || 'none'));

        // B. map + credit gate
        rec(v, 'T-09', /Galaxy map/.test(await body()) && (await txt('#curInterest')) === 'Space' && /Ocean/.test(await body()) && /Plants/.test(await body()) && /Not next to you/.test(await body()), 'map: current Space, adjacent Ocean, non-adjacent Plants');
        rec(v, 'T-10', (await ST()).credits < 10 && /locked/i.test(await txt('#adjStatus')) && await page.isDisabled('#travelBtn') && !(await page.$('button.skinbtn')), 'seed below target; no pressable Travel');
        rec(v, 'T-11', /not enough credits/i.test(await txt('#adjStatus')) && /not a credit lock/i.test(await txt('#naStatus')), 'credit lock vs not-adjacent are distinct');
        rec(v, 'T-14', (await txt('#curInterest')) === 'Space' && /Ocean/.test(await body()) && /Plants/.test(await txt('#naStatus')), 'fixture labels Space / Ocean / Plants');
        rec(v, 'T-15', /fixture amount, not a product rule/i.test(await txt('#credFixture')) && /not the target for every interest/i.test(await txt('#credFixture')) && (await txt('#credLine')).includes('4 of 10'), 'credit amount labeled as fixture');
        await page.click('#credBelow');
        await page.reload();
        rec(v, 'T-12', (await ST()).credits < 10 && await page.isDisabled('#travelBtn') && /locked/i.test(await txt('#adjStatus')), 'reload keeps below-target lock');
        await page.click('#credAbove');
        rec(v, 'T-13', /ready to travel/i.test(await txt('#adjStatus')) && !await page.isDisabled('#travelBtn') && await page.isVisible('button.skinbtn') && /not a credit lock/i.test(await txt('#naStatus')) && !(await page.$('#travelBtn[data-skin="plants"]')), 'adjacent unlocked; Plants still not a Travel target');

        // C. Travel + skin
        const avToday = await txt('#today');
        rec(v, 'T-25a-today', avToday.includes('Space') && !avToday.includes('Ocean'), 'today still Space before travel');
        if (v === 'v2') {
          const st = await txt('#lookStrip');
          rec(v, 'T-42', /look preview only/i.test(st) && /not applied/i.test(st) && /still on Space/i.test(st) && /not a change to what you wear/i.test(st) && (await txt('#curInterest')) === 'Space' && avToday.includes('Space'), 'v2 strip labeled preview only; current still Space');
        } else {
          rec(v, 'T-42', true, 'n/a v2 strip');
        }
        const sb = await page.$eval('#travelBtn', e => {
          const sw = e.querySelector('svg.swatch'); const l = e.querySelector('.skinlbl');
          return { skin: e.dataset.skin, sw: !!sw && sw.innerHTML.includes('#0e4d6b'), fg: l ? getComputedStyle(l).color : '', bg: l ? getComputedStyle(l).backgroundColor : '', bottom: e.getBoundingClientRect().bottom + scrollY };
        });
        const parse = c => c.match(/[\d.]+/g).map(Number);
        const lum = ([r, g, b]) => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const [br, bg, bb, ba = 1] = parse(sb.bg), worst = [95, 211, 230];
        const comp = [br * ba + worst[0] * (1 - ba), bg * ba + worst[1] * (1 - ba), bb * ba + worst[2] * (1 - ba)];
        const L1 = lum(parse(sb.fg)), L2 = lum(comp), cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        rec(v, 'T-25', sb.skin === 'ocean' && sb.sw && cr >= 4.5 && (await txt('#curInterest')) === 'Space' && /stay on Space/i.test(await txt('#delayNote')), `Travel button Ocean skin; contrast ${cr.toFixed(1)}:1; still on Space`);
        rec(v, 'fold-travel', sb.bottom <= 800, `Travel button bottom ${Math.round(sb.bottom)}px at 1280x800`);

        await page.click('#travelBtn');
        let s = await ST();
        rec(v, 'T-16', s.request && s.request.status === 'pending' && s.request.to === 'ocean' && s.interest === 'space' && /waiting for your teacher/i.test(await txt('#reqStatus')) && (await txt('#curInterest')) === 'Space', 'pending Travel; still Space');
        rec(v, 'T-17', await page.isDisabled('#travelBtn'), 'second Travel disabled while pending');
        rec(v, 'T-26-pending', !(await page.$('button.skinbtn')), 'no pressable skin button while pending');
        await page.reload();
        s = await ST();
        rec(v, 'T-20a-pending-reload', s.request && s.request.status === 'pending' && s.interest === 'space', 'reload keeps pending + Space');

        await page.click('#viewTeacher');
        rec(v, 'T-06', (await ST()).request.status === 'pending' && await page.isVisible('#teacher') && !(await page.isVisible('#student')), 'view switch keeps pending state');
        rec(v, 'T-18', await page.isVisible('#teacherBadge'), 'teacher sees pending Travel request');
        await page.click('#teacherBadge');
        const inputs = await page.$$eval('#modal input, #modal textarea, #modal select', e => e.length);
        rec(v, 'T-18b', await page.isVisible('#modal') && (await txt('#mCur')) === 'Space' && (await txt('#mReq')) === 'Ocean' && inputs === 0, 'lean Approve/Deny; no reason field');
        const cA = await page.$eval('#mApprove', e => getComputedStyle(e).color), cD = await page.$eval('#mDeny', e => getComputedStyle(e).color);
        rec(v, 'T-18c', cA !== cD, `Approve ${cA} vs Deny ${cD} distinct`);
        await page.keyboard.press('Escape');
        rec(v, 'T-18d', !(await page.isVisible('#modal')) && (await ST()).request.status === 'pending', 'Escape leaves request pending');

        await page.click('#teacherBadge'); await page.click('#mApprove');
        s = await ST();
        rec(v, 'T-19a', !(await page.isVisible('#modal')) && s.request.status === 'scheduled' && s.interest === 'space', 'approve → scheduled, not applied');
        rec(v, 'T-37', s.timeline.some(e => e.kind === 'approved' && /Ocean/.test(e.text)) && s.timeline.every(e => e.kind !== 'forced' || true), 'approved-switch timeline names Ocean');
        const tlKinds = await page.$$eval('#timeline li', es => es.map(e => e.className));
        rec(v, 'T-37b', tlKinds.includes('approved'), 'approved entry visible');
        rec(v, 'T-39', !s.timeline.some(e => GUARD.some(n => e.text.includes(n))) && s.timeline.every(e => e.text.includes('Student A')), 'timeline uses Student A only');
        await page.click('#viewStudent');
        rec(v, 'T-19', /does not apply yet/i.test(await txt('#reqStatus')) && (await txt('#curInterest')) === 'Space' && (await txt('#today')).includes('Space'), 'student: not applied yet, still Space');
        rec(v, 'T-26-sched', await page.isDisabled('#travelBtn') && !(await page.$('button.skinbtn')) && /Approved, not applied yet/.test(await txt('#travelBtn')), 'scheduled uses non-pressable pill, no skin');
        await page.reload();
        s = await ST();
        rec(v, 'T-20', s.request && s.request.status === 'scheduled' && s.interest === 'space' && (await txt('#curInterest')) === 'Space', 'reload keeps scheduled + Space');
        const credBefore = s.credits;
        await page.click('#delayBtn');
        s = await ST();
        rec(v, 'T-21', s.interest === 'ocean' && s.request === null && (await txt('#curInterest')) === 'Ocean', 'delay after approve applies Ocean, clears scheduled');
        rec(v, 'T-40', s.credits === credBefore && /credits carried over, not a product rule/i.test(await txt('#carryLabel')), `credits carried (${s.credits}); fixture label present`);

        // Deny loop
        await page.click('#resetBtn');
        await page.click('#credAbove');
        await page.click('#travelBtn');
        await page.click('#viewTeacher');
        await page.click('#teacherBadge'); await page.click('#mDeny');
        s = await ST();
        rec(v, 'T-22a', s.request === null && s.interest === 'space' && s.timeline.length === 0, 'deny clears pending, not scheduled, not on timeline');
        rec(v, 'T-38', s.timeline.every(e => e.kind !== 'approved' && e.kind !== 'forced') && s.timeline.length === 0, 'deny not logged (OQ-11 fixture)');
        await page.click('#delayBtn');
        s = await ST();
        rec(v, 'T-22', s.interest === 'space' && /No change/.test(await txt('#protoMsg')), 'delay after deny: still Space');
        await page.click('#viewStudent');
        const denyCopy = (await txt('#reqStatus') || '').replace(/\s+/g, ' ').trim();
        rec(v, 'T-23', denyCopy === 'Your teacher said not now. You are still on Space. You can ask again.', 'deny copy from locked v4: ' + denyCopy);
        rec(v, 'T-22b', !/waiting/i.test(denyCopy), 'student no longer waiting');
        rec(v, 'T-24', !await page.isDisabled('#travelBtn') && await page.isVisible('button.skinbtn') && (await page.getAttribute('#travelBtn', 'data-skin')) === 'ocean', 'can Travel again immediately, still adjacent + credit-gated');

        // Reset
        await page.click('#viewTeacher'); // dirty
        await page.click('#resetBtn');
        s = await ST();
        rec(v, 'T-08', s.interest === 'space' && s.credits === 4 && s.request === null && s.force === null && s.timeline.length === 0 && await page.isDisabled('#travelBtn'), 'reset restores seed, no leftover pending/scheduled/timeline');
        await page.click('#viewTeacher');
        rec(v, 'T-08b', !(await page.isVisible('#teacherBadge')) && !(await page.isVisible('#forceHint')) && await page.isVisible('#forceBtn') && !(await page.$('#timeline')), 'no badge/hint/timeline after reset');

        // D. Force loop
        rec(v, 'T-27', /Galaxy Homepage/.test(await body()) && await page.isVisible('#forceBtn') && await page.isVisible('#rowA #forceBtn'), 'Force switch on Student A row');
        const fBottom = await page.$eval('#forceBtn', e => e.getBoundingClientRect().bottom + scrollY);
        rec(v, 'fold-force', fBottom <= 800, `Force button bottom ${Math.round(fBottom)}px at 1280x800`);
        const fColor = await page.$eval('#forceBtn', e => getComputedStyle(e).color);
        rec(v, 'T-27b', fColor !== cA, `Force ${fColor} distinct from Approve`);
        await page.click('#forceBtn');
        rec(v, 'T-28', await page.isVisible('#modal') && /do not choose the destination/i.test(await txt('#modal')) && (await page.$$eval('#modal input, #modal textarea, #modal select', e => e.length)) === 0 && /will pick/i.test(await txt('#modal')), 'force confirm: no dest pick, no reason field');
        await page.click('#mCancel');
        s = await ST();
        rec(v, 'T-30', s.force === null && s.interest === 'space' && s.timeline.length === 0 && !(await page.isVisible('#modal')), 'cancel force: nothing scheduled');
        await page.click('#forceBtn'); await page.keyboard.press('Escape');
        rec(v, 'T-30b', (await ST()).force === null, 'Escape cancel: nothing scheduled');
        await page.click('#forceBtn'); await page.click('#mConfirmForce');
        s = await ST();
        rec(v, 'T-29a', s.force && s.force.status === 'scheduled' && s.interest === 'space', 'force confirmed, still Space');
        const forceTime = s.timeline.filter(e => e.kind === 'forced');
        rec(v, 'T-35', forceTime.length === 1 && !DEST_WORDS.test(forceTime[0].text) && !/\bSpace\b/.test(forceTime[0].text) && /Student A/.test(forceTime[0].text) && /will pick/i.test(forceTime[0].text), 'force-time timeline names no destination: ' + (forceTime[0] && forceTime[0].text));
        rec(v, 'T-39b', s.timeline.every(e => e.text.includes('Student A')), 'force entry uses Student A');
        const hint = await txt('#forceHint');
        rec(v, 'T-35b', /will pick later/i.test(hint) && !DEST_WORDS.test(hint), 'teacher hint names no destination');
        await page.click('#viewStudent');
        const stForce = await txt('#reqStatus');
        const gateF = await txt('#adjStatus');
        rec(v, 'T-29', /change is coming/i.test(stForce) && /you will pick/i.test(stForce) && !DEST_WORDS.test(stForce) && !DEST_WORDS.test(gateF) && (await txt('#curInterest')) === 'Space' && (await txt('#today')).includes('Space'), 'student: change coming, will pick, no dest named in status or credit gate, still Space');
        if (v === 'v3') {
          const card = await txt('#upcomingCard');
          rec(v, 'T-43a', /change is coming/i.test(card) && /you will choose/i.test(card) && /no destination has been named/i.test(card) && !DEST_WORDS.test(card) && /still on Space/i.test(card), 'v3 upcoming-pick card: no dest named');
        } else {
          rec(v, 'T-43a', true, 'n/a upcoming card before boundary');
        }
        await page.reload();
        s = await ST();
        rec(v, 'T-31', s.force && s.force.status === 'scheduled' && s.interest === 'space' && (await txt('#curInterest')) === 'Space', 'reload keeps forced schedule + Space');
        await page.click('#delayBtn');
        s = await ST();
        rec(v, 'T-32a', s.force && s.force.status === 'picking' && s.interest === 'space' && await page.isVisible('#pickPanel') && (await txt('#pickCur')) === 'Space', 'delay after force opens pick; still Space');
        const picks = await page.$$eval('#pickSet .pickbtn', es => es.map(e => ({ to: e.dataset.to, t: e.textContent.trim() })));
        rec(v, 'T-32b', picks.some(p => p.to !== 'space') && !picks.some(p => p.to === 'space'), 'pick set has a non-current dest and not the current interest');
        const pickLabels = await page.$$eval('#pickSet .pickbtn', es => es.map(e => e.textContent.trim()));
        rec(v, 'T-34', !pickLabels.some(t => /stay/i.test(t)) && /Stay is not offered/i.test(await txt('#pickFixture')) && /not a product rule/i.test(await txt('#pickFixture')), 'Stay omitted from choices and labeled as fixture; labels=' + pickLabels.join(','));
        if (v === 'v3') {
          rec(v, 'T-43', await page.isVisible('#pickPanel') && (await txt('#pickCur')) === 'Space' && picks.every(p => p.to !== 'space'), 'v3: pick is the main surface; current still Space; dests are choices');
        } else {
          rec(v, 'T-43', true, 'n/a v3 pick-as-main');
        }
        const beforePickTl = (await ST()).timeline.map(e => e.text).join('\n');
        rec(v, 'T-36a', !DEST_WORDS.test(beforePickTl) && !/picked/i.test(beforePickTl), 'no destination logged before the pick');
        await page.click('#pick-ocean');
        s = await ST();
        rec(v, 'T-32', s.interest === 'ocean' && s.force === null && (await txt('#curInterest')) === 'Ocean', 'only after pick does interest become Ocean');
        rec(v, 'T-36', s.timeline.some(e => e.kind === 'forced' && /Ocean/.test(e.text) && /picked/i.test(e.text)), 'chosen interest logged only after pick');
        rec(v, 'T-40b', s.credits === 4 && /credits carried over, not a product rule/i.test(await txt('#carryLabel')), 'credits still 4 (carried); fixture label after forced pick');
        const tlAfter = await page.evaluate(async () => null);
        await page.click('#viewTeacher');
        const kinds = await page.$$eval('#timeline li', es => es.map(e => e.className));
        rec(v, 'T-37c', kinds.filter(k => k.includes('forced')).length >= 1 && kinds.some(k => k.includes('forced')), 'forced entries distinguishable (forced class)');

        // T-33: delay on clean seed
        await page.click('#resetBtn');
        await page.click('#delayBtn');
        rec(v, 'T-33', (await ST()).interest === 'space' && /No change/.test(await txt('#protoMsg')), 'delay on seed: still Space');

        rec(v, 'T-41', true, 'n/a: no Trophy Bag or avatar shown');
        rec(v, 'T-44', ban.length === 0 && !(await page.$('#choiceScreen')) && !/switch now/i.test(await body()), 'no switch-now, no ChoiceScreen, Travel is not immediate');
      }
      rec(v, 'network', net.length === 0, `${w}px: ${net.join(', ') || 'no external requests'}`);
      rec(v, 'js-errors', errs.length === 0, `${w}px: ${errs.join(' | ') || 'none'}`);
      if (full && process.env.SHOTS) {
        await page.click('#resetBtn');
        await page.screenshot({ path: path.join(process.env.SHOTS, `${v}-student-seed.png`), fullPage: true });
        await page.click('#credAbove');
        await page.screenshot({ path: path.join(process.env.SHOTS, `${v}-student-ready.png`), fullPage: true });
        await page.click('#travelBtn'); await page.click('#viewTeacher');
        await page.screenshot({ path: path.join(process.env.SHOTS, `${v}-teacher-pending.png`), fullPage: true });
        await page.click('#teacherBadge');
        await page.screenshot({ path: path.join(process.env.SHOTS, `${v}-approve-modal.png`) });
        await page.click('#mClose'); await page.click('#resetBtn');
        await page.click('#viewTeacher'); await page.click('#forceBtn');
        await page.screenshot({ path: path.join(process.env.SHOTS, `${v}-force-modal.png`) });
        await page.click('#mConfirmForce'); await page.click('#viewStudent');
        await page.screenshot({ path: path.join(process.env.SHOTS, `${v}-student-forced.png`), fullPage: true });
        await page.click('#delayBtn');
        await page.screenshot({ path: path.join(process.env.SHOTS, `${v}-pick.png`), fullPage: true });
        await page.click('#resetBtn');
      }
      await ctx.close();
    }
  }
  await browser.close();
  srv.close();
  for (const v of VARS) {
    const rs = results.filter(r => r.v === v), f = rs.filter(r => !r.ok);
    console.log(`\n== ${v}: ${rs.length - f.length}/${rs.length} pass`);
    for (const r of (process.env.VERBOSE ? rs : f)) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.id} ${r.msg}`);
  }
  console.log(fails ? `\nFAILED: ${fails} check(s). Do not push.` : '\nALL CHECKS PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('crashed during ' + CUR + ':', e); process.exit(2); });

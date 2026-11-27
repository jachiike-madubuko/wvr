#!/usr/bin/env node
// WVR-231 pre-push check (Proto Bot). Desktop only.
// Runs each variation in headless Chromium at 1024, 1280, and 1440px and checks:
//   click-target sizes, gaps between targets, text wraps in controls, scroll jumps,
//   horizontal overflow, network calls, guard-list names, and the checklist loop
//   (request, pending, reload, badge, modal, Escape, approve, scheduled, delay, deny, re-request, reset,
//   v2 destination preview, v3 temporary item preview, v4 button-skin preview + one-equipped-per-slot bag).
// Usage: node prototypes/WVR-231/check.cjs [v1 v2 v3]   (needs the `playwright` package; NODE_PATH is fine)
// Exit code 0 = all checks pass. Do not push on a non-zero exit.
const path = require('path');
const { chromium } = require('playwright');
const DIR = __dirname;
const VARS = process.argv.slice(2).length ? process.argv.slice(2) : ['v1', 'v2', 'v3', 'v4'];
const WIDTHS = [1024, 1280, 1440];
const MIN_TARGET = 36, MIN_GAP = 8;
const GUARD = ['Tobin', 'Rivera', 'Room 12', 'Maya', 'Jordan', 'Avery', 'Riley', 'Casey', 'Quinn', 'Morgan', 'Jamie', 'Taylor', 'Drew', 'Skyler', 'Parker', 'Cameron', 'Rowan', 'Nico', 'Andre', 'Lila'];
const BANNED = [/switch now/i, /credit/i, /force/i, /phone/i, /iphone/i, /Named the inner planets in order/, /Finished three days in a row/, /next session/i];
const BANNER = 'Proposed defaults, not decided: see Open questions in stories.md. This file is a prototype, not the app.';
const results = [];
let fails = 0;
function rec(v, id, ok, msg) { results.push({ v, id, ok, msg }); if (!ok) fails++; }

async function layout(page, v, w, label) {
  const r = await page.evaluate(({ MIN_TARGET, MIN_GAP }) => {
    const out = { hscroll: document.documentElement.scrollWidth - window.innerWidth, small: [], close: [], wraps: [] };
    const vis = el => { const s = getComputedStyle(el); const b = el.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && b.width > 0 && b.height > 0 && !el.closest('[hidden]'); };
    const modalOpen = !document.getElementById('scrim').hidden;
    let els = [...document.querySelectorAll('button, a[href], [role=button], [role=radio]')].filter(vis);
    if (modalOpen) els = els.filter(e => e.closest('#modal'));
    // count text lines: text-node rects grouped by vertical overlap
    const lines = el => {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const rs = [];
      while (w.nextNode()) { if (!w.currentNode.textContent.trim()) continue; const r = document.createRange(); r.selectNodeContents(w.currentNode); rs.push(...[...r.getClientRects()].filter(x => x.width > 0 && x.height > 0)); }
      rs.sort((a, b) => a.top - b.top); let n = 0, bottom = -1e9;
      for (const r of rs) { if (r.top >= bottom - 2) { n++; bottom = r.bottom; } else bottom = Math.max(bottom, r.bottom); }
      return n;
    };
    const name = e => (e.id ? '#' + e.id : e.className) + ' "' + e.textContent.trim().slice(0, 30) + '"';
    const rects = els.map(e => [e, e.getBoundingClientRect()]);
    for (const [e, b] of rects) {
      if (b.width < MIN_TARGET || b.height < MIN_TARGET) out.small.push(name(e) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
      const rng = document.createRange(); rng.selectNodeContents(e);
      const n = lines(e);
      // item tiles hold block content (icon, name, memory line), so they are exempt
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
    // other single-line labels
    for (const e of document.querySelectorAll('.tag,.chip,.eqtag,.today,.shint,.proto-label')) {
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
  // put the control in view first (as a user would), then make sure activating it does not move the page
  const before = await page.$eval(sel, e => { e.scrollIntoView({ block: 'center' }); return scrollY; });
  await page.click(sel);
  await page.waitForTimeout(60);
  const after = await page.evaluate(() => scrollY);
  rec(v, 'scroll-jump', Math.abs(after - before) <= 2, `${w}px ${label}: scrollY ${before} -> ${after}`);
}

(async () => {
  let browser;
  try { browser = await chromium.launch(); } catch (e) { browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' }); }
  for (const v of VARS) {
    const url = 'file://' + path.join(DIR, v, 'index.html');
    const K = `wvr231:${v}:state`;
    for (const w of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 720 } });
      const page = await ctx.newPage();
      const net = [], errs = [];
      page.on('request', r => { const u = r.url(); if (!u.startsWith('file:') && !u.startsWith('data:')) net.push(u); });
      page.on('pageerror', e => errs.push(e.message));
      await page.goto(url);
      await page.click('#resetBtn');
      const ST = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), K);
      const txt = sel => page.textContent(sel);
      const full = w === 1280; // full checklist walk once per variation, at the grading width
      await layout(page, v, w, 'student seed');
      await scrollJump(page, v, w, '#bannerTog', 'banner toggle');
      await page.click('#bannerTog');
      if (v === 'v2') { await scrollJump(page, v, w, '#previewBtn', 'v2 preview'); await layout(page, v, w, 'v2 preview open'); await page.click('#previewBtn'); }
      if (v === 'v3') { await scrollJump(page, v, w, '.tile[data-id="boots"]', 'v3 select'); await layout(page, v, w, 'v3 selected'); await page.click('.tile[data-id="boots"]'); }
      await scrollJump(page, v, w, '#submitReq', 'submit request');
      await layout(page, v, w, 'student pending');
      await page.click('#viewTeacher');
      await layout(page, v, w, 'teacher pending');
      await scrollJump(page, v, w, '#teacherBadge', 'open modal');
      await layout(page, v, w, 'modal');
      await page.keyboard.press('Escape');
      await page.click('#teacherBadge'); await page.click('#mApprove');
      await layout(page, v, w, 'teacher scheduled');
      await page.click('#viewStudent');
      await layout(page, v, w, 'student scheduled');
      await page.click('#resetBtn');

      if (full) {
        const body = async () => (await page.evaluate(() => document.body.innerText));
        // A. identity, banner, chrome
        let all = '';
        for (const view of ['#viewStudent', '#viewTeacher']) { await page.click(view); all += await body(); }
        await page.click('#viewStudent');
        rec(v, 'T-01', all.includes('Student A') && all.includes('Prototype pseudonym') && !/Tobin|Rivera|Room 12/.test(all), 'Student A + tag; no Tobin/Ms. Rivera/Room 12');
        const hit = GUARD.filter(n => new RegExp('\\b' + n + '\\b').test(all));
        rec(v, 'T-02', hit.length === 0, 'guard names: ' + (hit.join(',') || 'none'));
        const html = await page.content();
        const mq = await page.evaluate(() => [...document.styleSheets].flatMap(s => [...s.cssRules]).filter(r => r.type === 4).length);
        rec(v, 'T-04', mq === 0 && !/phone/i.test(all), `media queries ${mq}; phone copy ${/phone/i.test(all)}`);
        rec(v, 'T-05', (await txt('#bannerText')).trim() === BANNER, 'banner text exact');
        await page.click('#bannerTog');
        const bl = await page.evaluate(() => { const e = document.getElementById('bannerText'); return Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)); });
        const bremovable = await page.evaluate(() => document.querySelectorAll('#banner button').length === 1 && !!document.getElementById('banner'));
        rec(v, 'T-05b', bl === 1 && bremovable && (await page.isVisible('#bannerText')), `collapsed lines=${bl}, still present`);
        await page.click('#bannerTog');
        rec(v, 'T-07', await page.isVisible('#resetBtn') && await page.isVisible('#delayBtn') && (await txt('.proto-label')).includes('prototype'), 'proto controls at top with Reset + delay');
        const ban = BANNED.filter(re => re.test(all));
        rec(v, 'T-42', ban.length === 0, 'banned copy: ' + (ban.map(String).join(',') || 'none'));
        // B. bag + avatar
        const tiles = await page.$$eval('[data-item]', es => es.map(e => ({ id: e.dataset.item, name: e.querySelector('.iname').firstChild.textContent.trim(), memo: e.querySelector('.memo').textContent, locked: e.classList.contains('locked'), eq: !!e.querySelector('.eqtag') })));
        const CAT = ['Number Helmet', 'Word Gloves', 'Planet Badge', 'Social Cape', 'Art Brush', 'Streak Boots', 'Comeback Visor', 'Traveler Star'];
        // v4 holds several owned copies per slot, so it needs every catalog name present and no other names (not exactly 8 tiles)
        const catOk = v === 'v4' ? CAT.every(n => tiles.some(t => t.name === n)) : tiles.length === 8;
        rec(v, 'T-09/T-11', catOk && tiles.every(t => CAT.includes(t.name)), 'catalog names: ' + tiles.map(t => t.name).join(', '));
        if (v === 'v4') {
          const M4 = { helmet: 'Mastered 10s addition', visor: 'Kept going after 3 misses', badge: 'Matched the planets to their names', boots: 'Answered 3 in a row on the first try', cape1: 'Put spaceflight events in order', cape2: 'Matched landmarks to their countries', cape3: 'Put a day of school in time order' };
          const un4 = tiles.filter(t => !t.locked);
          rec(v, 'T-10/T-14', un4.length === 7 && un4.every(t => M4[t.id] === t.memo), 'unlocked memos: ' + un4.map(t => t.id + '=' + t.memo).join(' | '));
          const slots = await page.$$eval('.slot', ss => ss.map(s => ({ slot: s.dataset.slot, owned: s.querySelectorAll('.tile:not(.locked)').length, eq: s.querySelectorAll('.tile .eqtag').length, own: s.querySelectorAll('.tile .owntag').length })));
          const capes = slots.find(x => x.slot === 'back');
          rec(v, 'v4-slots', slots.every(x => x.eq <= 1 && x.eq + x.own === x.owned) && capes.owned >= 2 && capes.eq === 1 && (await txt('#slotRule')).includes('Only one per slot is equipped at a time'), 'one Equipped per slot, others Owned; capes ' + JSON.stringify(capes));
          const eq4 = tiles.filter(t => t.eq).map(t => t.id).join(',');
          const w4 = await txt('#wearing');
          rec(v, 'T-12', eq4 === 'helmet,cape1,badge' && ['Number Helmet', 'Social Cape (Red)', 'Planet Badge'].every(n => w4.includes(n)), `grid equipped ${eq4}; avatar "${w4.trim()}"`);
          rec(v, 'v4-no-equip-controls', (await page.$$('.tile button, button.tile, [data-act=sel], [data-act=equip]')).length === 0, 'bag tiles are not controls (no try-on, no equip)');
        }
        const MEMO = { 'Number Helmet': 'Mastered 10s addition', 'Comeback Visor': 'Kept going after 3 misses', 'Planet Badge': 'Matched the planets to their names', 'Streak Boots': 'Answered 3 in a row on the first try' };
        const un = tiles.filter(t => !t.locked);
        if (v !== 'v4') rec(v, 'T-10/T-14', un.length === 4 && un.every(t => MEMO[t.name] === t.memo), 'unlocked memos: ' + un.map(t => t.name + '=' + t.memo).join(' | '));
        const eqNames = tiles.filter(t => t.eq).map(t => t.name).join(',');
        const wearing = await txt('#wearing');
        if (v !== 'v4') rec(v, 'T-12', eqNames === 'Number Helmet,Planet Badge' && wearing.includes('Number Helmet') && wearing.includes('Planet Badge'), `grid equipped ${eqNames}; avatar "${wearing.trim()}"`);
        const avSeed = await page.$eval('svg.av', e => e.outerHTML);
        // C. request
        rec(v, 'T-15', (await txt('#curInterest')) === 'Space' && (await txt('#optAdj')).includes('Ocean') && (await txt('#submitReq')).includes('Ocean'), 'current Space, destination Ocean visible');
        rec(v, 'T-16', await page.isDisabled('#optNon') && (await txt('#optNon')).includes('Plants'), 'Plants visible and disabled');
        await page.click('#optNon', { force: true }).catch(() => {});
        rec(v, 'T-16b', (await ST()).request === null && (await page.getAttribute('#optNon', 'aria-checked')) === 'false', 'clicking non-adjacent does nothing');
        if (v === 'v2') {
          await page.click('#previewBtn');
          const pv = await txt('#destPreview');
          const avPv = await page.$eval('svg.av', e => e.outerHTML);
          rec(v, 'T-40', /not applied/i.test(pv) && /still on/i.test(pv) && /does not change/i.test(pv) && avPv === avSeed && (await txt('#skinLbl')) === 'Space' && (await txt('#today')).includes('Space') && (await page.isVisible('#delayNote')), 'preview labeled not applied; avatar, skin, today unchanged; delay note shown');
          await page.click('#previewBtn');
        }
        if (v === 'v4') {
          // T-40 (v4 form): destination skin is the request button background; nothing else changes
          const sb = await page.$eval('#submitReq', e => { const sw = e.querySelector('svg.swatch'); const l = e.querySelector('.skinlbl'); return { skin: e.dataset.skin, sw: !!sw && sw.innerHTML.includes('#0e4d6b'), fg: getComputedStyle(l).color, bg: getComputedStyle(l).backgroundColor }; });
          const parse = c => c.match(/[\d.]+/g).map(Number);
          const lum = ([r, g, b]) => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
          const [br, bg, bb, ba = 1] = parse(sb.bg), worst = [95, 211, 230]; // lightest colour in the Ocean skin
          const comp = [br * ba + worst[0] * (1 - ba), bg * ba + worst[1] * (1 - ba), bb * ba + worst[2] * (1 - ba)];
          const L1 = lum(parse(sb.fg)), L2 = lum(comp), cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          rec(v, 'T-40', sb.skin === 'ocean' && sb.sw && cr >= 4.5 && !(await page.$('#destPreview')) && !(await page.$('#previewBtn')) && (await page.$eval('svg.av', e => e.outerHTML)) === avSeed && (await txt('#skinLbl')) === 'Space' && (await txt('#today')).includes('Space') && /stay on Space/.test(await txt('#delayNote')), `button skin ${sb.skin}; label contrast ${cr.toFixed(1)}:1 (worst case); avatar/skin/today unchanged; no separate preview`);
          const fold = await page.evaluate(() => { const b = document.getElementById('submitReq').getBoundingClientRect(); return b.bottom + scrollY; });
          rec(v, 'v4-above-fold', fold <= 800, `request button bottom ${Math.round(fold)}px (fold 800 at 1280x800)`);
          // polish: banner collapse visibly changes it
          const bw = async () => page.$eval('#bannerText', e => Math.round(e.querySelector('.b1').getBoundingClientRect().width + (e.querySelector('.b2').getBoundingClientRect().width)));
          const w0 = await bw(); await page.click('#bannerTog'); const w1 = await bw(); const t1 = (await txt('#bannerText')).trim(); await page.click('#bannerTog');
          rec(v, 'v4-banner-visible', w1 < w0 - 50 && t1 === BANNER, `visible banner text width ${w0} -> ${w1} when collapsed; full text kept in DOM`);
        }
        if (v === 'v3') {
          await page.click('.tile[data-id="boots"]');
          const a1 = await page.$eval('svg.av', e => e.outerHTML);
          const ok1 = a1 !== avSeed && /preview only/i.test(await txt('#selMemo')) && (await txt('#wearing')) === wearing && (await txt('#selMemo')).includes('Answered 3 in a row');
          await page.click('.tile[data-id="visor"]');
          const a2 = await page.$eval('svg.av', e => e.outerHTML);
          const noBoots = !a2.includes('#7ee0a1');
          await page.click('.tile[data-id="visor"]');
          const a3 = await page.$eval('svg.av', e => e.outerHTML);
          await page.click('.tile[data-id="helmet"]'); await page.keyboard.press('Escape');
          const a4 = await page.$eval('svg.av', e => e.outerHTML);
          const eq2 = (await page.$$eval('.eqtag', es => es.length));
          rec(v, 'T-41', ok1 && noBoots && a3 === avSeed && a4 === avSeed && eq2 === 2 && (await txt('#wearing')) === wearing && (await ST()).equipped === undefined, 'temporary dashed preview; switching/leaving restores avatar; equipped set unchanged');
        }
        await page.click('#submitReq');
        let s = await ST();
        rec(v, 'T-17', s.request && s.request.status === 'pending' && s.request.to === 'ocean', 'one pending request Space->Ocean');
        rec(v, 'T-19/T-20', /waiting for your teacher/i.test(await txt('#reqStatus')) && (await txt('#curInterest')) === 'Space' && (await txt('#today')).includes('Space') && !(await txt('#today')).includes('Ocean'), 'waiting message; current Space; today on Space');
        rec(v, 'T-21', await page.isDisabled('#submitReq'), 'second submit disabled while pending');
        await page.reload();
        s = await ST();
        rec(v, 'T-22', s.request.status === 'pending' && s.interest === 'space' && await page.isDisabled('#submitReq'), 'reload keeps pending + Space');
        rec(v, 'T-13a', (await page.$eval('svg.av', e => e.outerHTML)) === avSeed, 'avatar unchanged after request');
        // D. teacher
        await page.click('#viewTeacher');
        rec(v, 'T-06', (await ST()).request.status === 'pending' && await page.isVisible('#teacher') && !(await page.isVisible('#student')), 'view switch keeps state');
        rec(v, 'T-23', /Galaxy Homepage/.test(await body()) && await page.isVisible('svg.ring'), 'simplified Galaxy Homepage');
        rec(v, 'T-24', await page.isVisible('#rowA #teacherBadge'), 'badge on Student A row');
        await page.click('#teacherBadge');
        const m = await txt('#modal');
        rec(v, 'T-26/T-27', await page.isVisible('#modal') && m.includes('Student A') && (await txt('#mCur')) === 'Space' && (await txt('#mReq')) === 'Ocean', 'modal: Student A, Space, Ocean');
        const inputs = await page.$$eval('#modal input, #modal textarea, #modal select', e => e.length);
        const af = await page.evaluate(() => document.activeElement && document.activeElement.id);
        const cA = await page.$eval('#mApprove', e => getComputedStyle(e).color), cD = await page.$eval('#mDeny', e => getComputedStyle(e).color);
        rec(v, 'T-28/T-30', inputs === 0 && af === 'mClose' && cA !== cD, `no reason field; initial focus ${af}; approve ${cA} vs deny ${cD}`);
        if (v === 'v2' || v === 'v4') rec(v, 'v2-sbs', await page.isVisible('.sbs'), 'modal side-by-side current vs requested');
        await page.keyboard.press('Escape');
        rec(v, 'T-31', !(await page.isVisible('#modal')) && (await ST()).request.status === 'pending' && await page.isVisible('#teacherBadge'), 'Escape keeps pending + badge');
        await page.click('#teacherBadge'); await page.click('#mClose');
        rec(v, 'T-31b', (await ST()).request.status === 'pending' && await page.isVisible('#teacherBadge'), 'Close keeps pending');
        // E. approve
        await page.click('#teacherBadge'); await page.click('#mApprove');
        s = await ST();
        rec(v, 'T-29/T-32', !(await page.isVisible('#modal')) && s.request.status === 'scheduled' && s.interest === 'space', 'approve -> scheduled, not applied, back on homepage');
        rec(v, 'T-34', !(await page.isVisible('#teacherBadge')) && /later/.test(await txt('#schedHint')) && (await txt('#tInterest')) === 'Space', 'badge gone; scheduled hint; teacher still shows Space');
        await page.click('#viewStudent');
        rec(v, 'T-33', /does not apply yet/i.test(await txt('#reqStatus')) && (await txt('#curInterest')) === 'Space' && (await txt('#today')).includes('Space') && (await txt('#skinLbl')) === 'Space', 'student: not applied yet, still Space');
        if (v === 'v4') {
          const pill = await page.$eval('#submitReq', e => ({ tag: e.tagName, bg: getComputedStyle(e).backgroundColor, cur: getComputedStyle(e).cursor, dis: String(e.disabled), skin: !!e.querySelector('svg'), border: getComputedStyle(e).borderTopStyle }));
          const opts = await page.$$('#optAdj, #optNon');
          rec(v, 'v4-scheduled-not-pressable', /rgba\(0, 0, 0, 0\)|transparent/.test(pill.bg) && pill.cur === 'default' && pill.dis === 'true' && !pill.skin && pill.border === 'dashed' && opts.length === 0, `"Approved, not applied yet": disabled ${pill.dis}, no fill (${pill.bg}), dashed border, cursor ${pill.cur}, no skin; options hidden`);
          const before = await page.$eval('#student', e => e.innerHTML);
          await page.click('#viewTeacher'); await page.click('#viewStudent');
          rec(v, 'v4-no-preview-persist', (await page.$eval('#student', e => e.innerHTML)) === before && !(await page.$('.sel, #selMemo, #destPreview')), 'no preview state survives a view switch');
        }
        await page.reload();
        s = await ST();
        rec(v, 'T-35', s.request.status === 'scheduled' && s.interest === 'space' && (await txt('#curInterest')) === 'Space', 'reload keeps scheduled + Space');
        await page.click('#delayBtn');
        s = await ST();
        rec(v, 'T-36', s.interest === 'ocean' && s.request === null && (await txt('#curInterest')) === 'Ocean' && (await txt('#skinLbl')) === 'Ocean' && (await page.$eval('svg.av', e => e.outerHTML)) !== avSeed, 'delay applies Ocean interest + skin, clears scheduled');
        rec(v, 'T-13b', (await txt('#wearing')) === wearing, 'equipped unchanged through approve + transition');
        // T-08 after dirty
        await page.click('#resetBtn');
        s = await ST();
        rec(v, 'T-08', s.interest === 'space' && s.request === null && s.last === null && (await page.$eval('svg.av', e => e.outerHTML)) === avSeed && !(await page.isDisabled('#submitReq')), 'reset restores seed');
        await page.click('#viewTeacher');
        rec(v, 'T-25', !(await page.isVisible('#teacherBadge')) && !(await page.isVisible('#schedHint')), 'no badge after reset');
        // F. deny
        await page.click('#viewStudent'); await page.click('#submitReq');
        await page.click('#viewTeacher'); await page.click('#teacherBadge'); await page.click('#mDeny');
        s = await ST();
        rec(v, 'T-37', s.request === null && !(await page.isVisible('#modal')), 'deny clears pending, not scheduled');
        await page.click('#delayBtn');
        s = await ST();
        rec(v, 'T-38', s.interest === 'space' && !(await page.isVisible('#teacherBadge')) && /No change/.test(await txt('#protoMsg')), 'delay after deny: still Space; badge gone');
        await page.click('#viewStudent');
        const st = await txt('#reqStatus');
        rec(v, 'T-38b', !/waiting/i.test(st) && /ask again/i.test(st), 'student no longer waiting');
        rec(v, 'T-39', !(await page.isDisabled('#submitReq')) && (await txt('#submitReq')).includes('Ocean') && await page.isDisabled('#optNon'), 'can request again immediately, adjacent-only');
        await page.click('#resetBtn');
      }
      rec(v, 'network', net.length === 0, `${w}px: ${net.join(', ') || 'no network requests'}`);
      rec(v, 'js-errors', errs.length === 0, `${w}px: ${errs.join(' | ') || 'none'}`);
      if (full && process.env.SHOTS) {
        await page.screenshot({ path: path.join(process.env.SHOTS, `${v}-student.png`), fullPage: true });
        await page.click('#submitReq'); await page.click('#viewTeacher');
        await page.screenshot({ path: path.join(process.env.SHOTS, `${v}-teacher.png`), fullPage: true });
        await page.click('#teacherBadge');
        await page.screenshot({ path: path.join(process.env.SHOTS, `${v}-modal.png`) });
        await page.click('#mApprove'); await page.click('#viewStudent');
        if (v === 'v3') await page.click('.tile[data-id="boots"]');
        await page.screenshot({ path: path.join(process.env.SHOTS, `${v}-scheduled.png`), fullPage: true });
        if (v === 'v2') { await page.click('#resetBtn'); await page.click('#previewBtn'); await page.screenshot({ path: path.join(process.env.SHOTS, `v2-preview.png`), fullPage: true }); }
        await page.click('#resetBtn');
      }
      await ctx.close();
    }
  }
  await browser.close();
  for (const v of VARS) {
    const rs = results.filter(r => r.v === v), f = rs.filter(r => !r.ok);
    console.log(`\n== ${v}: ${rs.length - f.length}/${rs.length} pass`);
    for (const r of (process.env.VERBOSE ? rs : f)) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.id} ${r.msg}`);
  }
  console.log(fails ? `\nFAILED: ${fails} check(s). Do not push.` : '\nALL CHECKS PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { MERCHANTS, CATEGORIES, TAG_LABELS } = require('../js/merchants.js');
const { CARDS, CURRENCIES, FAMILIES, ROTATION_OPTIONS, ROTATION_CALENDAR } = require('../js/cards.js');
const engine = require('../js/engine.js');

const OCT_2026 = new Date(2026, 9, 23);
const JAN_2027 = new Date(2027, 0, 15);
const index = engine.buildIndex(MERCHANTS, CATEGORIES);
const cardsById = Object.fromEntries(CARDS.map((c) => [c.id, c]));
const merchant = (id) => {
  const m = MERCHANTS.find((x) => x.id === id);
  assert.ok(m, `merchant ${id} exists`);
  return m;
};

function rotationFor(date) {
  const cal = ROTATION_CALENDAR[engine.quarterKey(date)];
  if (!cal) return null;
  const opts = cal.options.map((id) => ROTATION_OPTIONS[id]);
  return {
    label: opts.map((o) => o.label).join(', '),
    tags: opts.flatMap((o) => o.tags || []),
    merchants: opts.flatMap((o) => o.merchants || [])
  };
}

function run(placeId, walletIds, extra = {}) {
  const date = extra.date || OCT_2026;
  const place = MERCHANTS.find((m) => m.id === placeId) || CATEGORIES.find((c) => c.id === placeId);
  assert.ok(place, `place ${placeId} exists`);
  return engine.recommend({
    place,
    cards: walletIds.map((id) => {
      assert.ok(cardsById[id], `card ${id} exists`);
      return cardsById[id];
    }),
    currencies: CURRENCIES,
    values: extra.values || {},
    rotation: 'rotation' in extra ? extra.rotation : rotationFor(date),
    rotationActive: extra.rotationActive,
    online: extra.online,
    foreign: extra.foreign,
    amount: extra.amount,
    date
  });
}

const rowFor = (result, id) => result.ranked.find((r) => r.card.id === id);

// ---------- data integrity ----------

test('card ids are unique and reference known currencies and families', () => {
  const ids = new Set();
  const families = new Set(FAMILIES.map((f) => f.id));
  for (const card of CARDS) {
    assert.ok(!ids.has(card.id), `duplicate card id ${card.id}`);
    ids.add(card.id);
    assert.ok(CURRENCIES[card.currency], `${card.id} currency ${card.currency}`);
    assert.ok(families.has(card.family), `${card.id} family ${card.family}`);
    assert.ok(['Visa', 'Mastercard'].includes(card.network), `${card.id} network`);
    assert.equal(typeof card.base, 'number', `${card.id} base rate`);
    assert.ok(card.blurb, `${card.id} blurb`);
  }
});

test('every earn rule points at real tags and merchants', () => {
  const merchantIds = new Set(MERCHANTS.map((m) => m.id));
  const knownTags = new Set([...Object.keys(TAG_LABELS), 'paze']);
  for (const card of CARDS) {
    for (const rule of card.earn) {
      for (const tag of rule.tags || []) assert.ok(knownTags.has(tag), `${card.id}: unknown tag ${tag}`);
      for (const tag of rule.exclude || []) assert.ok(knownTags.has(tag), `${card.id}: unknown exclude ${tag}`);
      for (const id of rule.merchants || []) assert.ok(merchantIds.has(id), `${card.id}: unknown merchant ${id}`);
      assert.ok(rule.rotating || rule.label, `${card.id}: rule needs a label`);
      assert.ok(typeof rule.rate === 'number' || typeof rule.add === 'number', `${card.id}: rule needs a rate`);
    }
  }
});

test('merchants and rotation options use known tags and ids', () => {
  const merchantIds = new Set(MERCHANTS.map((m) => m.id));
  for (const m of MERCHANTS) {
    for (const tag of m.tags) assert.ok(TAG_LABELS[tag], `${m.name}: unknown tag ${tag}`);
  }
  for (const c of CATEGORIES) {
    for (const tag of c.tags) assert.ok(TAG_LABELS[tag], `${c.id}: unknown tag ${tag}`);
  }
  for (const [id, opt] of Object.entries(ROTATION_OPTIONS)) {
    for (const tag of opt.tags || []) assert.ok(TAG_LABELS[tag], `rotation ${id}: unknown tag ${tag}`);
    for (const mid of opt.merchants || []) assert.ok(merchantIds.has(mid), `rotation ${id}: unknown merchant ${mid}`);
  }
  for (const [q, cal] of Object.entries(ROTATION_CALENDAR)) {
    for (const id of cal.options) assert.ok(ROTATION_OPTIONS[id], `${q}: unknown option ${id}`);
  }
});

// ---------- search ----------

test('search finds merchants by name, alias, typo and category keyword', () => {
  const top = (q) => engine.search(q, index, 5)[0];
  assert.equal(top('whole foods').place.id, 'whole-foods-market');
  assert.equal(top('WFM').place.id, 'whole-foods-market');
  assert.equal(top('starbuks').place.id, 'starbucks');
  assert.equal(top('mcdonalds').place.id, 'mcdonalds');
  assert.equal(top('chick fil a').place.id, 'chick-fil-a');
  assert.equal(top('disney+').place.id, 'disney');
  assert.equal(top('coffee').place.id, 'cat-dining');
  assert.equal(top('pharmacy').place.id, 'cat-drugstore');
  // Several categories tie on a shared keyword; sorting them must not throw.
  assert.ok(engine.search('store', index, 20).some((h) => h.kind === 'category'));
  assert.deepEqual(engine.search('   ', index), []);
  assert.deepEqual(engine.search('zzqqxx', index), []);
});

// ---------- recommendations ----------

test('Freedom Flex wins grocery during the Q4 2026 rotating category', () => {
  const r = run('whole-foods-market', ['sapphire-preferred', 'freedom-unlimited', 'freedom-flex', 'prime-visa']);
  assert.equal(r.best.card.id, 'freedom-flex');
  assert.equal(r.best.rate, 5);
  assert.equal(r.best.effective, 10); // 5x at 2 cents, pooled through the Sapphire Preferred
  assert.equal(rowFor(r, 'prime-visa').effective, 5);
});

test('Freedom Flex dining stacks to 7x in Q4 2026, and drops back without activation', () => {
  const on = run('chipotle', ['freedom-flex']);
  assert.equal(on.best.rate, 7);
  const off = run('chipotle', ['freedom-flex'], { rotationActive: false });
  assert.equal(off.best.rate, 3);
});

test('original Freedom gets a flat 5% on rotating categories', () => {
  const r = run('chipotle', ['freedom']);
  assert.equal(r.best.rate, 5);
});

test('points from no-fee cards are worth more with a Sapphire in the wallet', () => {
  const alone = run('target', ['freedom-unlimited']);
  assert.equal(alone.pooled, false);
  assert.equal(alone.best.effective, 1.5);
  const pooled = run('target', ['freedom-unlimited', 'sapphire-preferred']);
  assert.equal(pooled.pooled, true);
  assert.equal(pooled.best.card.id, 'freedom-unlimited');
  assert.equal(pooled.best.effective, 3);
});

test('user point values override the defaults', () => {
  const r = run('target', ['freedom-unlimited', 'sapphire-preferred'], { values: { urTransfer: 1.25 } });
  assert.equal(r.best.effective, 1.88);
});

test('Sapphire Preferred earns 3x on gas after the 2026 refresh', () => {
  const r = run('shell', ['sapphire-preferred', 'freedom-unlimited']);
  assert.equal(r.best.card.id, 'sapphire-preferred');
  assert.equal(r.best.rate, 3);
});

test('Costco rejects Mastercards', () => {
  const r = run('costco', ['freedom-flex', 'freedom-unlimited']);
  assert.equal(r.best.card.id, 'freedom-unlimited');
  assert.deepEqual(r.notAccepted.map((x) => x.card.id), ['freedom-flex']);
});

test('foreign transaction fees are subtracted', () => {
  const r = run('cat-dining', ['freedom-unlimited', 'sapphire-reserve'], { foreign: true });
  assert.equal(rowFor(r, 'freedom-unlimited').fee, 3);
  assert.equal(rowFor(r, 'freedom-unlimited').effective, 3); // 3x at 2 cents minus 3
  assert.equal(r.best.card.id, 'sapphire-reserve');
  assert.equal(r.best.effective, 6);
});

test('Sapphire Reserve beats a hotel card at the hotel and suggests Chase Travel', () => {
  const r = run('marriott', ['sapphire-reserve', 'marriott-boundless']);
  assert.equal(r.best.card.id, 'sapphire-reserve');
  assert.equal(r.best.rate, 4);
  assert.equal(rowFor(r, 'marriott-boundless').effective, 4.5);
  const tip = r.alternatives.find((a) => a.id === 'chase_travel');
  assert.ok(tip);
  assert.equal(tip.row.rate, 8);
});

test('online grocery bonus needs the online toggle, and Target never counts', () => {
  assert.equal(run('kroger', ['sapphire-preferred']).best.rate, 1);
  const online = run('kroger', ['sapphire-preferred'], { online: true });
  assert.equal(online.best.rate, 3);
  assert.equal(run('target', ['sapphire-preferred'], { online: true }).best.rate, 1);
  const tip = run('kroger', ['sapphire-preferred']).alternatives.find((a) => a.id === 'online_grocery');
  assert.ok(tip);
});

test('Ink Premier pays 2.5% only on purchases of $5,000 or more', () => {
  assert.equal(run('cat-other', ['ink-premier'], { amount: 4999 }).best.rate, 2);
  const big = run('cat-other', ['ink-premier'], { amount: 5000 });
  assert.equal(big.best.rate, 2.5);
  assert.equal(big.best.rewards, 125);
});

test('date-limited rules switch over on their dates', () => {
  assert.equal(run('kroger', ['ihg-premier'], { rotation: null }).best.rate, 3);
  assert.equal(run('kroger', ['ihg-premier'], { date: JAN_2027, rotation: null }).best.rate, 5);
  assert.equal(run('kroger', ['aeroplan']).best.rate, 3);
  assert.equal(run('kroger', ['aeroplan'], { date: JAN_2027 }).best.rate, 2);
});

test('Paze checkout shows up as a bonus option for online purchases in 2026', () => {
  const r = run('etsy', ['sapphire-preferred'], { online: true });
  const tip = r.alternatives.find((a) => a.id === 'paze');
  assert.ok(tip);
  assert.equal(tip.row.rate, 11);
  assert.equal(run('etsy', ['sapphire-preferred'], { online: true, date: JAN_2027 })
    .alternatives.find((a) => a.id === 'paze'), undefined);
});

test('DoorDash card pays 3% at restaurants but not on other delivery apps', () => {
  assert.equal(run('chipotle', ['doordash']).best.rate, 3);
  assert.equal(run('uber-eats', ['doordash']).best.rate, 1);
  assert.equal(run('doordash', ['doordash']).best.rate, 4);
});

test('cash and points cards report rewards in their own units', () => {
  const r = run('amazon', ['prime-visa', 'freedom-unlimited'], { amount: 80 });
  const prime = rowFor(r, 'prime-visa');
  assert.equal(prime.isCash, true);
  assert.equal(prime.rewards, 4);
  const fu = rowFor(r, 'freedom-unlimited');
  assert.equal(fu.rewards, 120);
});

test('ties are flagged and broken toward Ultimate Rewards', () => {
  const r = run('cvs-pharmacy', ['freedom-unlimited', 'freedom-flex']);
  assert.equal(r.best.card.id, 'freedom-unlimited');
  assert.equal(rowFor(r, 'freedom-flex').tied, true);
});

test('an empty wallet gives no recommendation', () => {
  const r = run('starbucks', []);
  assert.equal(r.best, null);
  assert.deepEqual(r.ranked, []);
});

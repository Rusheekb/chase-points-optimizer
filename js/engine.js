/*
 * Recommendation engine. Pure functions only: no DOM, no storage, so the same
 * code runs in the browser and under `node --test`.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CPO = Object.assign(root.CPO || {}, api);
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FOREIGN_FEE_PCT = 3;
  // Kinds of travel Chase Travel sells, so booking there is a real alternative.
  var BOOKABLE_TAGS = ['airfare', 'hotel', 'lodging', 'car_rental'];

  // ---------- search ----------

  function normalize(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/&/g, ' and ')
      .replace(/['’`.]/g, '')
      .replace(/[^a-z0-9+]+/g, ' ')
      .replace(/\+/g, ' plus ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // True when a and b differ by at most one insertion, deletion or substitution.
  function withinOneEdit(a, b) {
    if (a === b) return true;
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    var i = 0, j = 0, edits = 0;
    while (i < la && j < lb) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++edits > 1) return false;
      if (la > lb) i++;
      else if (lb > la) j++;
      else { i++; j++; }
    }
    return edits + (la - i) + (lb - j) <= 1;
  }

  function scoreName(q, qTokens, name) {
    if (!name) return 0;
    if (name === q) return 100;
    var cq = q.replace(/ /g, ''), cn = name.replace(/ /g, '');
    if (cn === cq) return 96;
    if (name.indexOf(q) === 0) return 88;
    if (cn.indexOf(cq) === 0) return 84;
    var nTokens = name.split(' ');
    var allPrefix = qTokens.every(function (t) {
      return nTokens.some(function (n) { return n.indexOf(t) === 0; });
    });
    if (allPrefix) return 72;
    if (cq.length >= 3 && cn.indexOf(cq) !== -1) return 52;
    if (cq.length >= 5) {
      if (withinOneEdit(cq, cn) || withinOneEdit(cq, cn.slice(0, cq.length))) return 44;
      if (nTokens.some(function (t) { return t.length >= 4 && withinOneEdit(cq, t); })) return 40;
    }
    return 0;
  }

  // Build a search index over merchants and generic categories.
  function buildIndex(merchants, categories) {
    var entries = [];
    merchants.forEach(function (m) {
      entries.push({
        kind: 'merchant', place: m,
        names: [normalize(m.name)].concat((m.aliases || []).map(normalize))
      });
    });
    (categories || []).forEach(function (c) {
      var names = [normalize(c.label), normalize(c.short)];
      String(c.keywords || '').split(' ').forEach(function (k) { if (k) names.push(normalize(k)); });
      entries.push({ kind: 'category', place: c, names: names });
    });
    return entries;
  }

  function search(query, index, limit) {
    var q = normalize(query);
    if (!q) return [];
    var qTokens = q.split(' ');
    var hits = [];
    index.forEach(function (entry) {
      var best = 0;
      entry.names.forEach(function (n, i) {
        var s = scoreName(q, qTokens, n);
        if (s && i > 0) s -= 2; // aliases and keywords rank just below primary names
        if (s > best) best = s;
      });
      if (best && entry.kind === 'category') best -= 4;
      if (best > 0) hits.push({ kind: entry.kind, place: entry.place, score: best });
    });
    hits.sort(function (a, b) {
      var an = a.place.name || a.place.label, bn = b.place.name || b.place.label;
      return b.score - a.score || an.length - bn.length || an.localeCompare(bn);
    });
    return hits.slice(0, limit || 8);
  }

  // ---------- dates & rotating categories ----------

  function isoDate(date) {
    var d = date || new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  function quarterKey(date) {
    var d = date || new Date();
    return d.getFullYear() + '-Q' + (Math.floor(d.getMonth() / 3) + 1);
  }

  function rotationFor(calendar, date) {
    return (calendar && calendar[quarterKey(date)]) || null;
  }

  function rotationMatches(rotation, place, tags) {
    if (!rotation) return false;
    if ((rotation.merchants || []).indexOf(place.id) !== -1) return true;
    return hasAny(tags, rotation.tags || []);
  }

  // ---------- valuation ----------

  function hasAny(list, wanted) {
    for (var i = 0; i < wanted.length; i++) if (list.indexOf(wanted[i]) !== -1) return true;
    return false;
  }

  // Ultimate Rewards points are worth more when the wallet holds a card that can
  // transfer them to airline and hotel partners (Sapphire Preferred/Reserve, Ink
  // Preferred, Sapphire Reserve for Business). Points from the no-fee cards can
  // be moved onto that card, so the whole UR balance gets the higher value.
  function canTransferUR(walletCards) {
    return walletCards.some(function (c) { return c.unlocksTransfers; });
  }

  function centsPerPoint(currencyId, currencies, values, pooled) {
    var cur = currencies[currencyId];
    if (!cur) return 1;
    if (cur.kind === 'cash') return 1;
    if (currencyId === 'ur') {
      return pooled ? num(values.urTransfer, cur.transferValue) : num(values.ur, cur.value);
    }
    return num(values[currencyId], cur.value);
  }

  function num(v, fallback) {
    var n = typeof v === 'string' ? parseFloat(v) : v;
    return typeof n === 'number' && isFinite(n) && n >= 0 ? n : fallback;
  }

  // ---------- earning ----------

  function contextTags(place, ctx) {
    var tags = (place.tags || []).slice();
    if (ctx.online && tags.indexOf('grocery') !== -1 && tags.indexOf('online_grocery') === -1) {
      tags.push('online_grocery');
    }
    return tags;
  }

  function ruleApplies(rule, tags, place, ctx) {
    if (rule.from && ctx.today < rule.from) return false;
    if (rule.until && ctx.today > rule.until) return false;
    if (rule.minAmount && !(ctx.amount >= rule.minAmount)) return false;
    if (rule.exclude && hasAny(tags, rule.exclude)) return false;
    if (rule.rotating) return !!ctx.rotationActive && rotationMatches(ctx.rotation, place, tags);
    if (rule.any) return true;
    if (rule.merchants && rule.merchants.indexOf(place.id) !== -1) return true;
    return hasAny(tags, rule.tags || []);
  }

  // Rules come in three kinds:
  //   plain    { tags, rate }            the highest matching rate wins
  //   rotating { rotating: true, rate }  matches this quarter's Freedom categories;
  //                                      with `stacks`, it adds to the card's own bonus
  //                                      (Freedom Flex dining: 5% rotating + 2% extra = 7%)
  //   add-on   { tags, add }             promo points added on top (Paze checkout)
  function bestRule(card, tags, place, ctx) {
    var best = null, rotating = null, addOns = [];
    (card.earn || []).forEach(function (rule) {
      if (!ruleApplies(rule, tags, place, ctx)) return;
      if (rule.add) addOns.push(rule);
      else if (rule.rotating) rotating = rule;
      else if (!best || rule.rate > best.rate) best = rule;
    });
    var out = { rate: card.base, rule: null, label: 'everything else' };
    if (best && best.rate > card.base) out = { rate: best.rate, rule: best, label: best.label };
    if (rotating) {
      var stacked = rotating.stacks && out.rule;
      var rotRate = rotating.rate + (rotating.stacks ? out.rate - card.base : 0);
      if (rotRate > out.rate) {
        out = {
          rate: rotRate, rule: rotating,
          label: 'this quarter’s 5% category' + (stacked ? ' plus the usual ' + out.label + ' bonus' : '')
        };
      }
    }
    addOns.forEach(function (a) {
      out.rate += a.add;
      out.label += ' + ' + a.add + 'x ' + a.label;
      if (!out.rule) out.rule = a;
    });
    out.addOns = addOns;
    return out;
  }

  function evaluate(card, tags, place, ctx) {
    var match = bestRule(card, tags, place, ctx);
    var currency = ctx.currencies[card.currency] || { kind: 'points' };
    var cpp = centsPerPoint(card.currency, ctx.currencies, ctx.values, ctx.pooled);
    var gross = round2(match.rate * cpp);
    var fee = ctx.foreign && card.foreignFee ? FOREIGN_FEE_PCT : 0;
    var accepted = !place.accepts || place.accepts.indexOf(String(card.network).toLowerCase()) !== -1;
    var row = {
      card: card,
      rate: match.rate,
      rule: match.rule,
      addOns: match.addOns,
      reason: match.label,
      isCash: currency.kind === 'cash',
      cpp: cpp,
      gross: gross,
      fee: fee,
      effective: round2(gross - fee),
      accepted: accepted
    };
    if (ctx.amount > 0) {
      // Cash cards earn dollars; points cards earn whole points.
      row.rewards = row.isCash ? round2(ctx.amount * match.rate / 100) : Math.round(ctx.amount * match.rate);
      row.dollars = round2(ctx.amount * row.effective / 100);
    }
    return row;
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  function rank(rows) {
    return rows.slice().sort(function (a, b) {
      return b.effective - a.effective ||
        (a.card.currency === 'ur' ? 0 : 1) - (b.card.currency === 'ur' ? 0 : 1) ||
        a.fee - b.fee ||
        a.order - b.order;
    });
  }

  // Ways the same purchase could earn more if made differently.
  var SCENARIOS = [
    {
      id: 'chase_travel',
      label: 'Book it through Chase Travel instead',
      applies: function (tags) { return hasAny(tags, BOOKABLE_TAGS) && tags.indexOf('chase_travel') === -1; },
      tags: function () { return ['chase_travel', 'travel']; },
      place: function () { return { id: 'chase-travel', name: 'Chase Travel', tags: ['chase_travel', 'travel'] }; }
    },
    {
      id: 'online_grocery',
      label: 'Order it online for delivery or pickup',
      applies: function (tags) { return tags.indexOf('grocery') !== -1 && tags.indexOf('online_grocery') === -1; },
      tags: function (tags) { return tags.concat('online_grocery'); },
      place: function (place) { return place; }
    },
    {
      id: 'paze',
      label: 'Check out with Paze, if the store offers it',
      applies: function (tags, ctx) { return ctx.online; },
      tags: function (tags) { return tags.concat('paze'); },
      place: function (place) { return place; }
    }
  ];

  /**
   * Rank the wallet's cards for one purchase.
   *
   * opts.place      merchant or category ({ id, name, tags, accepts? })
   * opts.cards      card objects the user owns
   * opts.currencies currency table from cards.js
   * opts.values     user point valuations in cents ({ ur, urTransfer, united, ... })
   * opts.rotation   this quarter's Freedom rotating categories, or null
   * opts.rotationActive  whether the user activated them
   * opts.online, opts.foreign, opts.amount, opts.date
   */
  function recommend(opts) {
    var cards = opts.cards || [];
    var place = opts.place;
    var ctx = {
      currencies: opts.currencies || {},
      values: opts.values || {},
      pooled: canTransferUR(cards),
      rotation: opts.rotation || null,
      rotationActive: opts.rotationActive !== false,
      online: !!opts.online,
      foreign: !!opts.foreign,
      amount: num(opts.amount, 0),
      today: isoDate(opts.date)
    };
    var tags = contextTags(place, ctx);

    var rows = cards.map(function (card, i) {
      var row = evaluate(card, tags, place, ctx);
      row.order = i;
      return row;
    });
    var ranked = rank(rows.filter(function (r) { return r.accepted; }));
    var notAccepted = rows.filter(function (r) { return !r.accepted; });
    var best = ranked[0] || null;

    ranked.forEach(function (r) { r.tied = !!best && r !== best && r.effective === best.effective; });

    var alternatives = [];
    if (best) {
      SCENARIOS.forEach(function (sc) {
        if (!sc.applies(tags, ctx)) return;
        var altTags = sc.tags(tags);
        var altPlace = sc.place(place);
        var altRows = rank(cards.map(function (card, i) {
          var r = evaluate(card, altTags, altPlace, ctx);
          r.order = i;
          return r;
        }).filter(function (r) { return r.accepted; }));
        var top = altRows[0];
        if (top && top.effective > best.effective) {
          alternatives.push({ id: sc.id, label: sc.label, row: top });
        }
      });
    }

    return {
      tags: tags,
      pooled: ctx.pooled,
      best: best,
      ranked: ranked,
      notAccepted: notAccepted,
      alternatives: alternatives
    };
  }

  return {
    normalize: normalize,
    buildIndex: buildIndex,
    search: search,
    quarterKey: quarterKey,
    rotationFor: rotationFor,
    canTransferUR: canTransferUR,
    centsPerPoint: centsPerPoint,
    recommend: recommend,
    FOREIGN_FEE_PCT: FOREIGN_FEE_PCT
  };
});

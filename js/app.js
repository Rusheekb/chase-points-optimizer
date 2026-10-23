/*
 * UI controller: wires the search box, wallet and point values to the engine.
 */
(function () {
  'use strict';

  var CPO = window.CPO;
  var STORAGE_KEY = 'chase-points-optimizer:v1';
  var EXAMPLE_WALLET = ['sapphire-preferred', 'freedom-unlimited', 'freedom-flex', 'prime-visa'];
  var EXAMPLE_PLACE = 'whole-foods-market';
  var QUICK = ['cat-dining', 'cat-grocery', 'cat-gas', 'cat-drugstore', 'amazon', 'cat-airfare',
    'cat-hotel', 'cat-rideshare', 'cat-streaming', 'cat-online', 'cat-other'];

  var cardsById = {};
  CPO.CARDS.forEach(function (c) { cardsById[c.id] = c; });
  var placesById = {};
  CPO.MERCHANTS.forEach(function (m) { placesById[m.id] = Object.assign({ kind: 'merchant' }, m); });
  CPO.CATEGORIES.forEach(function (c) { placesById[c.id] = Object.assign({ kind: 'category', name: c.label }, c); });
  var index = CPO.buildIndex(CPO.MERCHANTS, CPO.CATEGORIES);

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    q: $('q'), clear: $('q-clear'), list: $('suggestions'), quick: $('quick'),
    online: $('online'), foreign: $('foreign'), amount: $('amount'),
    verdict: $('verdict'), walletCount: $('wallet-count'), walletGroups: $('wallet-groups'),
    walletClear: $('wallet-clear'), exampleNote: $('example-note'),
    valuesFields: $('values-fields'), valuesReset: $('values-reset'),
    rotation: $('rotation'), rotationBody: $('rotation-body'), dataDate: $('data-date')
  };

  // ---------- state ----------

  var saved = load();
  var state = {
    wallet: saved && Array.isArray(saved.wallet) ? saved.wallet.filter(function (id) { return cardsById[id]; }) : EXAMPLE_WALLET.slice(),
    example: saved ? !!saved.example : true,
    values: (saved && saved.values) || {},
    rotation: (saved && saved.rotation) || {},       // quarter -> [option ids], user overrides
    activated: (saved && saved.activated) || {},     // quarter -> bool
    place: (saved && saved.place) || { id: EXAMPLE_PLACE },
    online: false,
    foreign: false,
    amount: ''
  };
  var ui = { hits: [], active: -1, preview: null, unknown: '', rotEdit: false };

  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        wallet: state.wallet, example: state.example, values: state.values,
        rotation: state.rotation, activated: state.activated, place: state.place
      }));
    } catch (e) { /* storage unavailable: settings last for this visit only */ }
  }

  // ---------- helpers ----------

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function fmtNum(n) {
    return (Math.round(n * 100) / 100).toString();
  }

  function fmtRate(row) {
    return row.isCash ? fmtNum(row.rate) + '%' : fmtNum(row.rate) + 'x';
  }

  function fmtMoney(n) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function walletCards() {
    return CPO.CARDS.filter(function (c) { return state.wallet.indexOf(c.id) !== -1; });
  }

  function resolvePlace(p) {
    if (!p) return null;
    if (p.custom) {
      var cat = placesById[p.categoryId] || placesById['cat-other'];
      return { kind: 'custom', id: 'custom', name: p.custom, tags: cat.tags.slice(), categoryLabel: cat.short };
    }
    return placesById[p.id] || null;
  }

  function quarterInfo(date) {
    var key = CPO.quarterKey(date);
    var cal = CPO.ROTATION_CALENDAR[key] || null;
    var chosen = state.rotation[key] || (cal ? cal.options : []);
    var options = chosen.map(function (id) { return CPO.ROTATION_OPTIONS[id]; }).filter(Boolean);
    var rotation = null;
    if (options.length) {
      rotation = {
        label: options.map(function (o) { return o.label; }).join(', '),
        tags: [].concat.apply([], options.map(function (o) { return o.tags || []; })),
        merchants: [].concat.apply([], options.map(function (o) { return o.merchants || []; }))
      };
    }
    return {
      key: key, calendar: cal, chosen: chosen, rotation: rotation,
      overridden: !!state.rotation[key],
      activated: state.activated[key] !== false
    };
  }

  function placeTagsText(place) {
    var labels = [];
    (place.tags || []).forEach(function (t) {
      var l = CPO.TAG_LABELS[t];
      if (l && labels.indexOf(l) === -1 && t !== 'travel') labels.push(l);
    });
    if (!labels.length && (place.tags || []).indexOf('travel') !== -1) labels.push('Travel');
    return labels;
  }

  // ---------- search box ----------

  function onInput() {
    var q = els.q.value;
    els.clear.hidden = !q;
    ui.hits = CPO.search(q, index, 8);
    ui.active = ui.hits.length ? 0 : -1;
    ui.preview = ui.hits.length ? ui.hits[0].place : null;
    ui.unknown = q.trim() && !ui.hits.length ? q.trim() : '';
    renderSuggestions();
    renderVerdict();
  }

  function renderSuggestions() {
    var open = ui.hits.length > 0 && document.activeElement === els.q;
    els.list.hidden = !open;
    els.q.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!open) { els.q.removeAttribute('aria-activedescendant'); return; }
    els.list.innerHTML = ui.hits.map(function (hit, i) {
      var place = placesById[hit.place.id];
      var kind = place.kind === 'category' ? 'Kind of place' : placeTagsText(place).slice(0, 2).join(' · ');
      return '<li role="option" id="opt-' + i + '" data-index="' + i + '" aria-selected="' + (i === ui.active) + '">' +
        '<span class="s-name">' + esc(place.name) + '</span><span class="s-kind">' + esc(kind) + '</span></li>';
    }).join('');
    if (ui.active >= 0) els.q.setAttribute('aria-activedescendant', 'opt-' + ui.active);
  }

  function choose(placeId) {
    state.place = { id: placeId };
    ui.hits = []; ui.active = -1; ui.preview = null; ui.unknown = '';
    var place = placesById[placeId];
    els.q.value = place ? place.name : '';
    els.clear.hidden = !els.q.value;
    save();
    renderSuggestions();
    renderVerdict();
  }

  function chooseCustom(name, categoryId) {
    state.place = { custom: name, categoryId: categoryId };
    ui.hits = []; ui.active = -1; ui.preview = null; ui.unknown = '';
    els.q.value = name;
    save();
    renderVerdict();
  }

  els.q.addEventListener('input', onInput);
  els.q.addEventListener('focus', function () {
    if (els.q.value) els.q.select();
  });
  els.q.addEventListener('blur', function () {
    setTimeout(function () { els.list.hidden = true; els.q.setAttribute('aria-expanded', 'false'); }, 120);
  });
  els.q.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!ui.hits.length) return;
      e.preventDefault();
      var step = e.key === 'ArrowDown' ? 1 : -1;
      ui.active = (ui.active + step + ui.hits.length) % ui.hits.length;
      ui.preview = ui.hits[ui.active].place;
      renderSuggestions();
      renderVerdict();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (ui.hits.length) {
        choose(ui.hits[Math.max(0, ui.active)].place.id);
        els.q.blur();
      }
    } else if (e.key === 'Escape') {
      if (!els.list.hidden) { els.list.hidden = true; els.q.setAttribute('aria-expanded', 'false'); }
      else { els.q.value = ''; onInput(); }
    }
  });
  els.list.addEventListener('mousedown', function (e) {
    var li = e.target.closest('li[data-index]');
    if (!li) return;
    e.preventDefault();
    choose(ui.hits[+li.getAttribute('data-index')].place.id);
    els.q.blur();
  });
  els.clear.addEventListener('click', function () {
    els.q.value = '';
    onInput();
    els.q.focus();
  });

  // ---------- quick picks ----------

  function renderQuick() {
    els.quick.innerHTML = QUICK.map(function (id) {
      var p = placesById[id];
      if (!p) return '';
      var pressed = !ui.preview && !ui.unknown && state.place && state.place.id === id;
      return '<button type="button" class="chip" data-place="' + id + '" aria-pressed="' + pressed + '">' +
        esc(p.short || p.name) + '</button>';
    }).join('');
  }

  els.quick.addEventListener('click', function (e) {
    var b = e.target.closest('[data-place]');
    if (b) choose(b.getAttribute('data-place'));
  });

  // ---------- modifiers ----------

  els.online.addEventListener('change', function () { state.online = els.online.checked; renderVerdict(); });
  els.foreign.addEventListener('change', function () { state.foreign = els.foreign.checked; renderVerdict(); });
  els.amount.addEventListener('input', function () {
    state.amount = els.amount.value.replace(/[^0-9.]/g, '');
    renderVerdict();
  });

  // ---------- verdict ----------

  function faceHtml(card, mini) {
    var f = card.face || ['#3a3f47', '#1d2026', '#fff'];
    var style = '--c1:' + f[0] + ';--c2:' + f[1] + ';--ink:' + (f[2] || '#fff');
    var inner = '<span class="cf-chip"></span>';
    if (!mini) {
      inner += '<span class="cf-bottom"><span class="cf-name">' + esc(card.name) + '</span>' +
        '<span class="cf-net">' + esc(card.network) + '</span></span>';
    }
    return '<span class="cardface' + (mini ? ' mini' : '') + '" style="' + style + '" aria-hidden="true">' + inner + '</span>';
  }

  function mathHtml(row) {
    var parts;
    if (row.isCash) {
      parts = '<b>' + fmtRate(row) + '</b> back = ' + fmtNum(row.gross) + '¢ per $1';
    } else {
      parts = '<b>' + fmtRate(row) + '</b> × ' + fmtNum(row.cpp) + '¢/pt = ' + fmtNum(row.gross) + '¢ per $1';
    }
    if (row.fee) parts += ' − ' + row.fee + '¢ foreign fee';
    return parts;
  }

  function earnedHtml(row) {
    if (row.rewards == null) return '';
    var amt = fmtMoney(parseFloat(state.amount));
    if (row.isCash) return '<p class="earned">On ' + amt + ': <b>' + fmtMoney(row.rewards) + '</b> back</p>';
    var unit = (CPO.CURRENCIES[row.card.currency] || {}).unit || 'points';
    return '<p class="earned">On ' + amt + ': <b>' + row.rewards.toLocaleString('en-US') + ' ' + esc(unit) +
      '</b> ≈ ' + fmtMoney(row.dollars) + '</p>';
  }

  function notesFor(row, place, result) {
    var notes = [];
    if (row.rule && row.rule.cap) notes.push({ text: row.rule.cap });
    if (row.rule && row.rule.note) notes.push({ text: row.rule.note });
    if (row.rule && row.rule.rotating) {
      var qi = quarterInfo(new Date());
      if (!qi.activated) notes.push({ text: 'You marked this quarter’s 5% categories as not activated.', warn: true });
      else notes.push({ text: 'Make sure you activated this quarter’s categories at chase.com.' });
    }
    if (row.fee) notes.push({ text: row.card.name + ' charges a 3% foreign transaction fee, which is already subtracted here.', warn: true });
    if (place.note) notes.push({ text: place.note });
    if (row.card.currency === 'ur' && !result.pooled && row.card.pointsOnly) {
      notes.push({ text: 'Points from this card are only worth 1¢ each unless you also hold a card that can transfer them.' });
    }
    if (row.card.note) notes.push({ text: row.card.note });
    return notes;
  }

  function renderVerdict() {
    renderQuick();
    var cards = walletCards();
    var place = ui.preview ? placesById[ui.preview.id] : (ui.unknown ? null : resolvePlace(state.place));

    if (ui.unknown) {
      els.verdict.innerHTML = '<div class="empty"><h2>No match for “' + esc(ui.unknown) + '” yet</h2>' +
        '<p>What kind of place is it? Pick one and you’ll get the best card for that kind of purchase.</p>' +
        '<div class="cat-grid">' + CPO.CATEGORIES.map(function (c) {
          return '<button type="button" class="chip" data-custom="' + c.id + '">' + esc(c.short) + '</button>';
        }).join('') + '</div></div>';
      return;
    }
    if (!cards.length) {
      els.verdict.innerHTML = '<div class="empty"><h2>Add the cards you carry</h2>' +
        '<p>Check your Chase cards under “Cards you own” and the best one for each purchase shows up here.</p>' +
        '<p><a class="text-button" href="#wallet">Pick your cards</a></p></div>';
      return;
    }
    if (!place) {
      els.verdict.innerHTML = '<div class="empty"><h2>Type a store, restaurant, airline or hotel</h2>' +
        '<p>Or tap one of the kinds of places above.</p></div>';
      return;
    }

    var qi = quarterInfo(new Date());
    var result = CPO.recommend({
      place: place,
      cards: cards,
      currencies: CPO.CURRENCIES,
      values: state.values,
      rotation: qi.rotation,
      rotationActive: qi.activated,
      online: state.online,
      foreign: state.foreign,
      amount: parseFloat(state.amount) || 0,
      date: new Date()
    });

    var best = result.best;
    var tagLabels = place.kind === 'custom' ? [place.categoryLabel] : placeTagsText(place);
    var html = '<div class="place-line"><span class="eyebrow">' + (ui.preview ? 'Best match' : 'Paying at') + '</span>' +
      '<strong>' + esc(place.name) + '</strong>' +
      '<span class="tagline">' + tagLabels.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</span></div>';

    if (!best) {
      html += '<div class="empty"><h2>None of your cards work here</h2><p>' + esc(place.note || '') + '</p></div>';
      els.verdict.innerHTML = html;
      return;
    }

    var notes = notesFor(best, place, result);
    html += '<article class="winner">' + faceHtml(best.card) +
      '<div class="winner-copy"><p class="eyebrow">Use</p><h2>' + esc(best.card.name) + '</h2>' +
      '<div class="rate-line"><span class="big">' + fmtRate(best) + '</span>' +
      '<span class="big-unit">' + (best.isCash ? 'back' : 'points') + '</span>' +
      '<span class="value-pill">≈ ' + fmtNum(best.effective) + '% value</span></div>' +
      '<p class="math">' + esc(fmtRate(best)) + ' on ' + esc(best.reason) + '<br>' + mathHtml(best) + '</p>' +
      earnedHtml(best) +
      (notes.length ? '<ul class="notes">' + notes.map(function (n) {
        return '<li' + (n.warn ? ' class="warn"' : '') + '>' + esc(n.text) + '</li>';
      }).join('') + '</ul>' : '') +
      '</div></article>';

    result.alternatives.forEach(function (alt) {
      // Promo add-ons (Paze) carry their own fine print; otherwise show the rule's note.
      var tipNote = alt.row.addOns.length
        ? alt.row.addOns.map(function (a) { return a.note; }).join(' ')
        : (alt.row.rule && alt.row.rule.note) || '';
      html += '<div class="tip"><p class="eyebrow">Could earn more</p><strong>' + esc(alt.label) + '</strong>' +
        '<p>' + esc(alt.row.card.name) + ' earns ' + esc(fmtRate(alt.row)) + ' on ' + esc(alt.row.reason) +
        ' (≈ ' + fmtNum(alt.row.effective) + '% value) instead of ' + fmtNum(best.effective) + '%.' +
        (tipNote ? ' ' + esc(tipNote) : '') + '</p></div>';
    });

    if (result.ranked.length > 1) {
      var top = Math.max(best.effective, 0.01);
      html += '<section aria-label="All your cards for this purchase"><h3 class="section-title">All your cards here</h3><ol class="ranked">' +
        result.ranked.map(function (r) {
          var w = Math.max(2, Math.round(Math.max(r.effective, 0) / top * 100));
          return '<li' + (r === best ? ' class="is-best"' : '') + '>' + faceHtml(r.card, true) +
            '<div><span class="r-name">' + esc(r.card.name) + '</span>' +
            (r === best ? '<span class="badge">Best</span>' : r.tied ? '<span class="badge">Tie</span>' : '') +
            (r.fee ? '<span class="badge fee">3% fee</span>' : '') +
            '<div class="r-why">' + esc(fmtRate(r)) + ' on ' + esc(r.reason) + '</div></div>' +
            '<div class="r-rate">' + fmtNum(r.effective) + '%<small>' + (r.isCash ? 'cash' : fmtNum(r.cpp) + '¢/pt') + '</small></div>' +
            '<div class="bar"><span style="width:' + w + '%"></span></div></li>';
        }).join('') + '</ol></section>';
    }

    if (result.notAccepted.length) {
      html += '<p class="excluded">Won’t work here: ' + result.notAccepted.map(function (r) {
        return esc(r.card.name) + ' (' + esc(r.card.network) + ')';
      }).join(', ') + '. ' + esc(place.note || '') + '</p>';
    }

    els.verdict.innerHTML = html;
  }

  els.verdict.addEventListener('click', function (e) {
    var b = e.target.closest('[data-custom]');
    if (b) chooseCustom(ui.unknown, b.getAttribute('data-custom'));
  });

  // ---------- wallet ----------

  function renderWallet() {
    var n = state.wallet.length;
    els.walletCount.textContent = n + (n === 1 ? ' card' : ' cards');
    els.exampleNote.hidden = !state.example;
    var openState = {};
    els.walletGroups.querySelectorAll('details[data-family]').forEach(function (d) {
      openState[d.getAttribute('data-family')] = d.open;
    });
    els.walletGroups.innerHTML = CPO.FAMILIES.map(function (fam) {
      var cards = CPO.CARDS.filter(function (c) { return c.family === fam.id; });
      var owned = cards.filter(function (c) { return state.wallet.indexOf(c.id) !== -1; }).length;
      var open = fam.id in openState ? openState[fam.id] : (fam.open || owned > 0);
      return '<details class="family" data-family="' + fam.id + '"' + (open ? ' open' : '') + '>' +
        '<summary>' + esc(fam.label) + ' <span class="count">' + owned + ' of ' + cards.length + '</span></summary>' +
        '<div class="wcards">' + cards.map(function (c) {
          var checked = state.wallet.indexOf(c.id) !== -1;
          var fee = c.annualFee ? '$' + c.annualFee + '/yr' : 'No annual fee';
          return '<label class="wcard"><input type="checkbox" value="' + c.id + '"' + (checked ? ' checked' : '') + '>' +
            faceHtml(c, true) +
            '<span class="wname"><b>' + esc(c.name) + '</b><small>' + esc(c.blurb) + ' · ' + fee +
            (c.legacy ? ' · ' + esc(c.legacy) : '') + '</small></span></label>';
        }).join('') + '</div></details>';
    }).join('');
  }

  els.walletGroups.addEventListener('change', function (e) {
    var input = e.target;
    if (input.type !== 'checkbox') return;
    var id = input.value;
    var i = state.wallet.indexOf(id);
    if (input.checked && i === -1) state.wallet.push(id);
    if (!input.checked && i !== -1) state.wallet.splice(i, 1);
    state.example = false;
    save();
    renderAll();
  });

  els.walletClear.addEventListener('click', function () {
    state.wallet = [];
    state.example = false;
    save();
    renderAll();
  });

  // ---------- point values ----------

  function renderValues() {
    var cards = walletCards();
    var pooled = CPO.canTransferUR(cards);
    var used = {};
    cards.forEach(function (c) { used[c.currency] = true; });
    var rows = [];
    if (used.ur) {
      var key = pooled ? 'urTransfer' : 'ur';
      var cur = CPO.CURRENCIES.ur;
      rows.push(valueRow(key,
        pooled ? 'Ultimate Rewards points' : 'Ultimate Rewards points (cash back only)',
        pooled ? 'Your wallet can transfer points to airline and hotel partners.'
               : 'Add a Sapphire or Ink Preferred to transfer points and raise this.',
        pooled ? cur.transferValue : cur.value));
    }
    Object.keys(CPO.CURRENCIES).forEach(function (id) {
      var cur = CPO.CURRENCIES[id];
      if (id === 'ur' || !used[id] || cur.kind === 'cash') return;
      rows.push(valueRow(id, cur.name, cur.hint || '', cur.value));
    });
    els.valuesFields.innerHTML = rows.length ? rows.join('') :
      '<p class="panel-note">Your cards earn cash back, so there’s nothing to set.</p>';
  }

  function valueRow(key, label, hint, fallback) {
    var v = state.values[key];
    return '<label class="value-row"><span>' + esc(label) + (hint ? '<small>' + esc(hint) + '</small>' : '') + '</span>' +
      '<span class="value-input"><input type="text" inputmode="decimal" id="val-' + key + '" data-key="' + key + '" value="' +
      esc(v != null ? v : fallback) + '" aria-label="' + esc(label) + ' value in cents"><span>¢</span></span></label>';
  }

  els.valuesFields.addEventListener('input', function (e) {
    var key = e.target.getAttribute('data-key');
    if (!key) return;
    var n = parseFloat(e.target.value);
    if (isFinite(n) && n >= 0) state.values[key] = n;
    else delete state.values[key];
    save();
    renderVerdict();
  });

  els.valuesReset.addEventListener('click', function () {
    state.values = {};
    save();
    renderValues();
    renderVerdict();
  });

  // ---------- rotating categories ----------

  function renderRotation() {
    var hasRotating = walletCards().some(function (c) {
      return (c.earn || []).some(function (r) { return r.rotating; });
    });
    els.rotation.hidden = !hasRotating;
    if (!hasRotating) return;
    var qi = quarterInfo(new Date());
    var cal = qi.calendar;
    var intro = cal
      ? (qi.overridden ? 'You changed this quarter’s categories.' : 'Chase’s categories for this quarter are selected.')
      : 'This quarter’s categories aren’t in the app yet. Tap the ones Chase announced.';
    var editing = ui.rotEdit || !qi.chosen.length;
    var chips = editing
      ? Object.keys(CPO.ROTATION_OPTIONS).map(function (id) {
          return '<button type="button" class="chip" data-rot="' + id + '" aria-pressed="' + (qi.chosen.indexOf(id) !== -1) + '">' +
            esc(CPO.ROTATION_OPTIONS[id].label) + '</button>';
        })
      : qi.chosen.map(function (id) {
          return '<span class="chip is-on">' + esc(CPO.ROTATION_OPTIONS[id].label) + '</span>';
        });
    els.rotationBody.innerHTML =
      '<p class="rot-quarter">' + esc(cal ? cal.period : qi.key) + '</p>' +
      '<p class="panel-note">' + esc(intro) + ' 5% on up to $1,500 in combined purchases per quarter, then 1%.' +
      (cal && cal.activateBy ? ' Activate by ' + esc(cal.activateBy) + '.' : '') + '</p>' +
      '<div class="rot-chips">' + chips.join('') + '</div>' +
      '<label class="toggle"><input type="checkbox" id="rot-active"' + (qi.activated ? ' checked' : '') +
      '><span>I activated this quarter’s categories</span></label>' +
      '<div class="rot-actions"><button type="button" class="text-button" id="rot-edit">' +
      (editing ? 'Done' : 'Change categories') + '</button>' +
      (qi.overridden && cal ? '<button type="button" class="text-button" id="rot-reset">Use Chase’s categories</button>' : '') +
      '</div>';
  }

  els.rotationBody.addEventListener('click', function (e) {
    var qi = quarterInfo(new Date());
    var chip = e.target.closest('[data-rot]');
    if (chip) {
      var id = chip.getAttribute('data-rot');
      var list = qi.chosen.slice();
      var i = list.indexOf(id);
      if (i === -1) list.push(id); else list.splice(i, 1);
      state.rotation[qi.key] = list;
      save();
      renderRotation();
      renderVerdict();
    } else if (e.target.id === 'rot-edit') {
      ui.rotEdit = !ui.rotEdit;
      renderRotation();
    } else if (e.target.id === 'rot-reset') {
      delete state.rotation[qi.key];
      save();
      renderRotation();
      renderVerdict();
    }
  });
  els.rotationBody.addEventListener('change', function (e) {
    if (e.target.id !== 'rot-active') return;
    state.activated[CPO.quarterKey(new Date())] = e.target.checked;
    save();
    renderVerdict();
  });

  // ---------- boot ----------

  function renderAll() {
    renderWallet();
    renderValues();
    renderRotation();
    renderVerdict();
  }

  els.dataDate.textContent = CPO.DATA_DATE;
  var initial = resolvePlace(state.place);
  if (initial) els.q.value = initial.name;
  els.clear.hidden = !els.q.value;
  renderAll();
})();

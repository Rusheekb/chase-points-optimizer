/*
 * Chase card catalog, rewards currencies and the Freedom rotating calendar.
 *
 * Earn rules (see bestRule in js/engine.js):
 *   { tags: [...], rate, label }           bonus when the place has any of these tags
 *   { merchants: [...], rate, label }      bonus at specific merchant ids
 *   { any: true, minAmount, rate, label }  bonus on every purchase over an amount
 *   { rotating: true, rate, stacks }       this quarter's Freedom 5% categories
 *   { tags: [...], add, label }            promo points added on top of the rate
 * Optional on any rule: cap, note (shown to the user), from / until (YYYY-MM-DD).
 *
 * `rate` is points (or miles) per dollar for points currencies and percent back
 * for cash currencies. Review this file whenever Chase changes a card.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CPO = Object.assign(root.CPO || {}, api);
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DATA_DATE = 'October 23, 2026';

  // value = default cents per point, rounded from The Points Guy's October 2026
  // valuations. Ultimate Rewards are worth `value` when they can only be cashed
  // out and `transferValue` when the wallet holds a Sapphire Preferred, Sapphire
  // Reserve, Ink Preferred or Sapphire Reserve for Business.
  var CURRENCIES = {
    ur: { name: 'Ultimate Rewards points', unit: 'points', kind: 'points', value: 1, transferValue: 2 },
    united: { name: 'United miles', unit: 'miles', kind: 'points', value: 1.2 },
    southwest: { name: 'Southwest points', unit: 'points', kind: 'points', value: 1.25 },
    aeroplan: { name: 'Aeroplan points', unit: 'points', kind: 'points', value: 1.5 },
    avios: { name: 'Avios', unit: 'Avios', kind: 'points', value: 1.4 },
    marriott: { name: 'Marriott Bonvoy points', unit: 'points', kind: 'points', value: 0.75 },
    ihg: { name: 'IHG One Rewards points', unit: 'points', kind: 'points', value: 0.6 },
    hyatt: { name: 'World of Hyatt points', unit: 'points', kind: 'points', value: 1.65 },
    cash: { name: 'Cash back', kind: 'cash' },
    amazon: { name: 'Amazon rewards', kind: 'cash' },
    disney: { name: 'Disney Rewards Dollars', kind: 'cash' }
  };

  var FAMILIES = [
    { id: 'sapphire', label: 'Sapphire', open: true },
    { id: 'freedom', label: 'Freedom', open: true },
    { id: 'business', label: 'Ink & business', open: true },
    { id: 'shopping', label: 'Amazon, Disney & delivery' },
    { id: 'airline', label: 'Airline' },
    { id: 'hotel', label: 'Hotel' }
  ];

  var LYFT_END = '2027-09-30';
  function lyft(rate) {
    return { tags: ['lyft'], rate: rate, label: 'Lyft rides', until: LYFT_END, note: 'Lyft promo runs through Sept 30, 2027.' };
  }
  var PAZE = {
    tags: ['paze'], add: 10, label: 'Paze promo', until: '2026-12-31',
    note: 'Paze promo: 10 extra points per $1, up to $1,500 a month, through Dec 31, 2026. It may be targeted, so check your Chase offers.'
  };
  var CHASE_TRAVEL_NOTE = 'Prices in Chase Travel can differ from booking direct, and hotel stays usually don’t earn elite credit.';

  var CARDS = [
    // ---------- Sapphire ----------
    {
      id: 'sapphire-preferred', name: 'Sapphire Preferred', family: 'sapphire',
      currency: 'ur', network: 'Visa', foreignFee: false, annualFee: 95, unlocksTransfers: true,
      face: ['#2a4f8f', '#14284f'],
      blurb: '3x dining, gas, streaming & online grocery',
      base: 1,
      earn: [
        { tags: ['chase_travel'], rate: 5, label: 'Chase Travel', note: CHASE_TRAVEL_NOTE },
        { tags: ['dining'], rate: 3, label: 'dining' },
        { tags: ['gas', 'ev_charging'], rate: 3, label: 'gas & EV charging', note: 'Truck stops and marinas don’t count.' },
        { tags: ['streaming'], rate: 3, label: 'select streaming', note: 'Only select streaming services count.' },
        { tags: ['online_grocery'], rate: 3, label: 'online grocery', note: 'Online grocery excludes Target, Walmart and wholesale clubs.' },
        { tags: ['vacation_rental'], rate: 3, label: 'vacation rentals booked direct' },
        { tags: ['travel'], rate: 2, label: 'travel' },
        lyft(5),
        { merchants: ['peloton'], minAmount: 150, rate: 5, label: 'Peloton equipment over $150', until: '2027-12-31',
          note: 'Peloton promo is capped at 25,000 bonus points.' },
        PAZE
      ]
    },
    {
      id: 'sapphire-reserve', name: 'Sapphire Reserve', family: 'sapphire',
      currency: 'ur', network: 'Visa', foreignFee: false, annualFee: 795, unlocksTransfers: true,
      face: ['#1f3049', '#0a111c'],
      blurb: '8x Chase Travel, 4x flights & hotels, 3x dining',
      base: 1,
      earn: [
        { tags: ['chase_travel'], rate: 8, label: 'Chase Travel',
          note: 'The first $300 of travel each year goes to the travel credit and doesn’t earn the bonus. ' + CHASE_TRAVEL_NOTE },
        { tags: ['airfare', 'hotel'], rate: 4, label: 'flights & hotels booked direct',
          note: 'Book with the airline or hotel itself. Third-party sites earn 1x.' },
        { tags: ['dining'], rate: 3, label: 'dining' },
        lyft(5),
        { merchants: ['peloton'], minAmount: 150, rate: 10, label: 'Peloton equipment over $150', until: '2027-12-31',
          note: 'Peloton promo is capped at 50,000 bonus points.' },
        PAZE
      ]
    },

    // ---------- Freedom ----------
    {
      id: 'freedom-unlimited', name: 'Freedom Unlimited', family: 'freedom',
      currency: 'ur', network: 'Visa', foreignFee: true, annualFee: 0, pointsOnly: true,
      face: ['#4c8de0', '#1f5cb0'],
      blurb: '3% dining & drugstores, 1.5% everything else',
      base: 1.5,
      earn: [
        { tags: ['chase_travel'], rate: 5, label: 'Chase Travel', note: CHASE_TRAVEL_NOTE },
        { tags: ['dining'], rate: 3, label: 'dining' },
        { tags: ['drugstore'], rate: 3, label: 'drugstores' },
        lyft(2),
        PAZE
      ]
    },
    {
      id: 'freedom-flex', name: 'Freedom Flex', family: 'freedom',
      currency: 'ur', network: 'Mastercard', foreignFee: false, annualFee: 0, pointsOnly: true,
      face: ['#2f6fc4', '#0f3a7a'],
      blurb: '5% rotating categories, 3% dining & drugstores',
      base: 1,
      earn: [
        { rotating: true, rate: 5, stacks: true, label: 'rotating 5% category',
          cap: 'The 5% applies to the first $1,500 of combined category spending each quarter, then 1%.' },
        { tags: ['chase_travel'], rate: 5, label: 'Chase Travel', note: CHASE_TRAVEL_NOTE },
        { tags: ['dining'], rate: 3, label: 'dining' },
        { tags: ['drugstore'], rate: 3, label: 'drugstores' },
        lyft(2),
        PAZE
      ]
    },
    {
      id: 'freedom', name: 'Freedom (original)', family: 'freedom',
      currency: 'ur', network: 'Visa', foreignFee: true, annualFee: 0, pointsOnly: true,
      face: ['#3a7bd0', '#1b4c93'],
      blurb: '5% rotating categories',
      legacy: 'Chase is converting these to Freedom Unlimited in late 2026',
      base: 1,
      earn: [
        { rotating: true, rate: 5, label: 'rotating 5% category',
          cap: 'The 5% applies to the first $1,500 of combined category spending each quarter, then 1%.' },
        PAZE
      ]
    },
    {
      id: 'freedom-rise', name: 'Freedom Rise', family: 'freedom',
      currency: 'ur', network: 'Visa', foreignFee: true, annualFee: 0, pointsOnly: true,
      face: ['#6f8fe0', '#3c5bb5'],
      blurb: '1.5% on everything',
      base: 1.5,
      earn: []
    },

    // ---------- Ink & business ----------
    {
      id: 'ink-preferred', name: 'Ink Business Preferred', family: 'business',
      currency: 'ur', network: 'Visa', foreignFee: false, annualFee: 95, unlocksTransfers: true,
      face: ['#2b3a4e', '#141c27'],
      blurb: '3x travel, shipping, phone/internet & ads',
      base: 1,
      earn: [
        { tags: ['travel', 'shipping', 'telecom', 'advertising'], rate: 3,
          label: 'travel, shipping, phone/internet & ads',
          cap: '3x applies to the first $150,000 of combined bonus spending each account year, then 1x.' },
        lyft(5)
      ]
    },
    {
      id: 'ink-cash', name: 'Ink Business Cash', family: 'business',
      currency: 'ur', network: 'Visa', foreignFee: true, annualFee: 0, pointsOnly: true,
      face: ['#9fb3c8', '#61788f'],
      blurb: '5% office supply & phone/internet, 2% gas & dining',
      base: 1,
      earn: [
        { tags: ['office_supply', 'telecom'], rate: 5, label: 'office supply stores & phone/internet',
          cap: '5% applies to the first $25,000 of combined spending each account year, then 1%.' },
        { tags: ['gas', 'dining'], rate: 2, label: 'gas & restaurants',
          cap: '2% applies to the first $25,000 of combined spending each account year, then 1%.' },
        lyft(5)
      ]
    },
    {
      id: 'ink-unlimited', name: 'Ink Business Unlimited', family: 'business',
      currency: 'ur', network: 'Visa', foreignFee: true, annualFee: 0, pointsOnly: true,
      face: ['#b8c2cc', '#7d8995', '#14181d'],
      blurb: '1.5% on everything',
      base: 1.5,
      earn: [lyft(5)]
    },
    {
      id: 'ink-premier', name: 'Ink Business Premier', family: 'business',
      currency: 'cash', network: 'Visa', foreignFee: false, annualFee: 195,
      face: ['#3b4048', '#16191e'],
      blurb: '2.5% on $5,000+ purchases, 2% everything else',
      note: 'Ink Premier earns cash back that can’t be combined with Ultimate Rewards points.',
      base: 2,
      earn: [
        { tags: ['chase_travel'], rate: 5, label: 'Chase Travel', note: CHASE_TRAVEL_NOTE },
        { any: true, minAmount: 5000, rate: 2.5, label: 'purchases of $5,000 or more' },
        lyft(5)
      ]
    },
    {
      id: 'sapphire-reserve-business', name: 'Sapphire Reserve for Business', family: 'business',
      currency: 'ur', network: 'Visa', foreignFee: false, annualFee: 795, unlocksTransfers: true,
      face: ['#232a33', '#07090c'],
      blurb: '8x Chase Travel, 4x flights & hotels, 3x ads',
      base: 1,
      earn: [
        { tags: ['chase_travel'], rate: 8, label: 'Chase Travel', note: CHASE_TRAVEL_NOTE },
        { tags: ['airfare', 'hotel'], rate: 4, label: 'flights & hotels booked direct',
          note: 'Book with the airline or hotel itself. Third-party sites earn 1x.' },
        { tags: ['advertising'], rate: 3, label: 'social media & search ads',
          cap: 'From Nov 15, 2026, 3x applies to the first $1 million of ad spending each account year, then 1x.' },
        lyft(5)
      ]
    },
    // ---------- Amazon, Disney & delivery ----------
    {
      id: 'prime-visa', name: 'Prime Visa', family: 'shopping',
      currency: 'amazon', network: 'Visa', foreignFee: false, annualFee: 0,
      face: ['#2f3d4e', '#111923'],
      blurb: '5% Amazon & Whole Foods, 2% dining, gas & transit (needs Prime)',
      base: 1,
      earn: [
        { tags: ['amazon'], rate: 5, label: 'Amazon, Amazon Fresh & Whole Foods',
          note: 'Needs an eligible Prime membership. Without Prime it’s 3%.' },
        { tags: ['chase_travel'], rate: 5, label: 'Chase Travel', note: CHASE_TRAVEL_NOTE },
        { tags: ['dining', 'gas', 'transit'], rate: 2, label: 'restaurants, gas & local transit' }
      ]
    },
    {
      id: 'amazon-visa', name: 'Amazon Visa', family: 'shopping',
      currency: 'amazon', network: 'Visa', foreignFee: false, annualFee: 0,
      face: ['#5e6b7a', '#303a45'],
      blurb: '3% Amazon & Whole Foods, 2% dining, gas & transit',
      base: 1,
      earn: [
        { tags: ['amazon'], rate: 3, label: 'Amazon, Amazon Fresh & Whole Foods' },
        { tags: ['chase_travel'], rate: 3, label: 'Chase Travel', note: CHASE_TRAVEL_NOTE },
        { tags: ['dining', 'gas', 'transit'], rate: 2, label: 'restaurants, gas & local transit' }
      ]
    },
    {
      id: 'instacart', name: 'Instacart Mastercard', family: 'shopping',
      currency: 'cash', network: 'Mastercard', foreignFee: false, annualFee: 0,
      face: ['#34ad55', '#0c6a2b'],
      blurb: '5% Instacart, 2% dining, gas & streaming',
      base: 1,
      earn: [
        { tags: ['instacart'], rate: 5, label: 'Instacart',
          cap: '5% applies to the first $6,000 of Instacart purchases each year, then 1%.' },
        { tags: ['chase_travel'], rate: 5, label: 'Chase Travel', note: CHASE_TRAVEL_NOTE },
        { tags: ['dining', 'gas', 'streaming'], rate: 2, label: 'restaurants, gas & select streaming' }
      ]
    },
    {
      id: 'doordash', name: 'DoorDash Rewards Mastercard', family: 'shopping',
      currency: 'cash', network: 'Mastercard', foreignFee: false, annualFee: 0,
      face: ['#ff4a2a', '#c01a00'],
      blurb: '4% DoorDash, 3% restaurants, 2% grocery',
      base: 1,
      earn: [
        { tags: ['doordash'], rate: 4, label: 'DoorDash & Caviar' },
        { tags: ['dining'], exclude: ['food_delivery'], rate: 3, label: 'restaurants (paid directly)' },
        { tags: ['grocery'], rate: 2, label: 'grocery stores' }
      ]
    },
    {
      id: 'disney-visa', name: 'Disney Visa', family: 'shopping',
      currency: 'disney', network: 'Visa', foreignFee: true, annualFee: 0,
      face: ['#4565cc', '#1c3080'],
      blurb: '1% on everything',
      base: 1,
      earn: []
    },
    {
      id: 'disney-premier', name: 'Disney Premier Visa', family: 'shopping',
      currency: 'disney', network: 'Visa', foreignFee: true, annualFee: 49,
      face: ['#24357a', '#0b1338'],
      blurb: '5% Disney+, Hulu & ESPN+, 2% gas, grocery, dining & Disney',
      base: 1,
      earn: [
        { tags: ['disney_streaming'], rate: 5, label: 'Disney+, Hulu & ESPN+',
          note: 'Only when you pay DisneyPlus.com, Hulu.com or ESPN+ directly.' },
        { tags: ['gas', 'grocery', 'dining', 'disney'], rate: 2, label: 'gas, grocery, dining & most U.S. Disney locations' }
      ]
    },
    {
      id: 'disney-inspire', name: 'Disney Inspire Visa', family: 'shopping',
      currency: 'disney', network: 'Visa', foreignFee: false, annualFee: 149,
      face: ['#7055c8', '#2e1f78'],
      blurb: '10% Disney+, Hulu & ESPN+, 3% gas & Disney',
      base: 1,
      earn: [
        { tags: ['disney_streaming'], rate: 10, label: 'Disney+, Hulu & ESPN+',
          note: 'Only when you pay DisneyPlus.com, Hulu.com or ESPN+ directly.' },
        { tags: ['gas', 'disney'], rate: 3, label: 'gas & most U.S. Disney locations' },
        { tags: ['grocery', 'dining'], rate: 2, label: 'grocery & dining' }
      ]
    },

    // ---------- Airline ----------
    {
      id: 'united-gateway', name: 'United Gateway', family: 'airline',
      currency: 'united', network: 'Visa', foreignFee: false, annualFee: 0,
      face: ['#3c7bcc', '#1d4e94'],
      blurb: '2x United, gas & local transit',
      base: 1,
      earn: [{ tags: ['united', 'gas', 'transit'], rate: 2, label: 'United, gas & local transit' }]
    },
    {
      id: 'united-explorer', name: 'United Explorer', family: 'airline',
      currency: 'united', network: 'Visa', foreignFee: false, annualFee: 150,
      face: ['#1d5db3', '#0a3271'],
      blurb: '3x United, 2x dining & hotels',
      base: 1,
      earn: [
        { tags: ['united'], rate: 3, label: 'United purchases' },
        { tags: ['dining'], rate: 2, label: 'dining' },
        { tags: ['hotel'], rate: 2, label: 'hotel stays booked direct' }
      ]
    },
    {
      id: 'united-quest', name: 'United Quest', family: 'airline',
      currency: 'united', network: 'Visa', foreignFee: false, annualFee: 350,
      face: ['#2c4268', '#111d36'],
      blurb: '4x United, 2x travel, dining & streaming',
      base: 1,
      earn: [
        { tags: ['united'], rate: 4, label: 'United purchases' },
        { tags: ['travel', 'dining', 'streaming'], rate: 2, label: 'travel, dining & select streaming' }
      ]
    },
    {
      id: 'united-club', name: 'United Club Card', family: 'airline',
      currency: 'united', network: 'Visa', foreignFee: false, annualFee: 695,
      face: ['#2d3138', '#0a0c10'],
      blurb: '5x United, 2x travel & dining',
      base: 1,
      earn: [
        { tags: ['united'], rate: 5, label: 'United purchases' },
        { tags: ['travel', 'dining'], rate: 2, label: 'travel & dining' }
      ]
    },
    {
      id: 'united-business', name: 'United Business Card', family: 'airline',
      currency: 'united', network: 'Visa', foreignFee: false, annualFee: 150,
      face: ['#335c92', '#14305a'],
      blurb: '2x United, dining, gas, office supply & transit',
      base: 1,
      earn: [{ tags: ['united', 'dining', 'gas', 'office_supply', 'transit'], rate: 2, label: 'United, dining, gas, office supply & transit' }]
    },
    {
      id: 'southwest-plus', name: 'Southwest Plus', family: 'airline',
      currency: 'southwest', network: 'Visa', foreignFee: false, annualFee: 99,
      face: ['#3f60d6', '#2238a0'],
      blurb: '2x Southwest, gas & grocery',
      base: 1,
      earn: [
        { tags: ['southwest'], rate: 2, label: 'Southwest purchases' },
        { tags: ['gas', 'grocery'], rate: 2, label: 'gas & grocery',
          cap: '2x on gas and grocery applies to the first $5,000 each account year, then 1x.' }
      ]
    },
    {
      id: 'southwest-premier', name: 'Southwest Premier', family: 'airline',
      currency: 'southwest', network: 'Visa', foreignFee: false, annualFee: 149,
      face: ['#2f42a3', '#16226b'],
      blurb: '3x Southwest, 2x grocery & dining',
      base: 1,
      earn: [
        { tags: ['southwest'], rate: 3, label: 'Southwest purchases' },
        { tags: ['grocery', 'dining'], rate: 2, label: 'grocery & dining',
          cap: '2x on grocery and dining applies to the first $8,000 each account year, then 1x.' }
      ]
    },
    {
      id: 'southwest-priority', name: 'Southwest Priority', family: 'airline',
      currency: 'southwest', network: 'Visa', foreignFee: false, annualFee: 229,
      face: ['#212a5e', '#0b102e'],
      blurb: '4x Southwest, 2x gas & dining',
      base: 1,
      earn: [
        { tags: ['southwest'], rate: 4, label: 'Southwest purchases' },
        { tags: ['gas', 'dining'], rate: 2, label: 'gas & dining' }
      ]
    },
    {
      id: 'southwest-premier-business', name: 'Southwest Premier Business', family: 'airline',
      currency: 'southwest', network: 'Visa', foreignFee: false, annualFee: 149,
      face: ['#4c5666', '#262c35'],
      blurb: '3x Southwest, 2x gas & dining',
      base: 1,
      earn: [
        { tags: ['southwest'], rate: 3, label: 'Southwest purchases' },
        { tags: ['gas', 'dining'], rate: 2, label: 'gas & dining',
          cap: '2x on gas and dining applies to the first $8,000 each account year, then 1x.' }
      ]
    },
    {
      id: 'southwest-performance-business', name: 'Southwest Performance Business', family: 'airline',
      currency: 'southwest', network: 'Visa', foreignFee: false, annualFee: 299,
      face: ['#252a32', '#08090b'],
      blurb: '4x Southwest, 2x gas, dining, hotels & transit',
      base: 1,
      earn: [
        { tags: ['southwest'], rate: 4, label: 'Southwest purchases' },
        { tags: ['gas', 'dining', 'hotel', 'transit'], rate: 2, label: 'gas, dining, hotels & local transit' }
      ]
    },
    {
      id: 'aeroplan', name: 'Air Canada Aeroplan', family: 'airline',
      currency: 'aeroplan', network: 'Mastercard', foreignFee: false, annualFee: 195,
      face: ['#2e2e33', '#0d0d0f'],
      blurb: '3x Air Canada & travel, 2x gas, dining & grocery',
      base: 1,
      earn: [
        { tags: ['air_canada', 'travel'], rate: 3, label: 'Air Canada & travel' },
        { tags: ['dining', 'grocery'], rate: 3, label: 'dining & grocery', until: '2026-12-31',
          note: 'Dining and grocery drop to 2x on Jan 1, 2027.' },
        { tags: ['dining', 'grocery'], rate: 2, label: 'dining & grocery', from: '2027-01-01' },
        { tags: ['gas'], rate: 2, label: 'gas' }
      ]
    },
    {
      id: 'british-airways', name: 'British Airways Visa', family: 'airline',
      currency: 'avios', network: 'Visa', foreignFee: false, annualFee: 95,
      face: ['#22447f', '#0c2148'],
      blurb: '3x BA, Aer Lingus, Iberia & LEVEL, 2x hotels',
      base: 1,
      earn: [
        { tags: ['avios_airline'], rate: 3, label: 'BA, Aer Lingus, Iberia & LEVEL' },
        { tags: ['hotel'], rate: 2, label: 'hotel stays booked direct' }
      ]
    },
    {
      id: 'aer-lingus', name: 'Aer Lingus Visa', family: 'airline',
      currency: 'avios', network: 'Visa', foreignFee: false, annualFee: 95,
      face: ['#13916a', '#06573c'],
      blurb: '3x Aer Lingus, BA & Iberia, 2x hotels',
      base: 1,
      earn: [
        { tags: ['avios_airline'], rate: 3, label: 'Aer Lingus, BA & Iberia flights' },
        { tags: ['hotel'], rate: 2, label: 'hotel stays booked direct' }
      ]
    },
    {
      id: 'iberia', name: 'Iberia Visa', family: 'airline',
      currency: 'avios', network: 'Visa', foreignFee: false, annualFee: 95,
      face: ['#cf1a36', '#7d0a1d'],
      blurb: '3x Iberia, BA & Aer Lingus, 2x hotels',
      base: 1,
      earn: [
        { tags: ['avios_airline'], rate: 3, label: 'Iberia, BA & Aer Lingus flights' },
        { tags: ['hotel'], rate: 2, label: 'hotel stays booked direct' }
      ]
    },

    // ---------- Hotel ----------
    {
      id: 'marriott-boundless', name: 'Marriott Bonvoy Boundless', family: 'hotel',
      currency: 'marriott', network: 'Visa', foreignFee: false, annualFee: 95,
      face: ['#3d3935', '#191715'],
      blurb: '6x Marriott, 3x grocery, gas & dining, 2x everything else',
      base: 2,
      earn: [
        { tags: ['marriott'], rate: 6, label: 'Marriott hotels' },
        { tags: ['grocery', 'gas', 'dining'], rate: 3, label: 'grocery, gas & dining',
          cap: '3x applies to the first $6,000 of combined spending each year, then 2x.' }
      ]
    },
    {
      id: 'marriott-bold', name: 'Marriott Bonvoy Bold', family: 'hotel',
      currency: 'marriott', network: 'Visa', foreignFee: false, annualFee: 0,
      face: ['#6e7783', '#3f4650'],
      blurb: '3x Marriott, 2x grocery, rideshare, delivery, streaming & phone',
      base: 1,
      earn: [
        { tags: ['marriott'], rate: 3, label: 'Marriott hotels' },
        { tags: ['grocery', 'rideshare', 'food_delivery', 'streaming', 'telecom'], rate: 2,
          label: 'grocery, rideshare, food delivery, streaming & phone/internet' }
      ]
    },
    {
      id: 'marriott-bountiful', name: 'Marriott Bonvoy Bountiful', family: 'hotel',
      currency: 'marriott', network: 'Visa', foreignFee: false, annualFee: 250,
      face: ['#5e4c3b', '#2c2219'],
      blurb: '6x Marriott, 4x grocery & dining, 2x everything else',
      base: 2,
      earn: [
        { tags: ['marriott'], rate: 6, label: 'Marriott hotels' },
        { tags: ['grocery', 'dining'], rate: 4, label: 'grocery & dining',
          cap: '4x applies to the first $15,000 of combined spending each year, then 2x.' }
      ]
    },
    {
      id: 'ritz-carlton', name: 'Ritz-Carlton', family: 'hotel',
      currency: 'marriott', network: 'Visa', foreignFee: false, annualFee: 450,
      face: ['#2d4c61', '#14242f'],
      blurb: '6x Marriott, 3x flights, car rental & dining',
      legacy: 'Closed to new applicants',
      base: 2,
      earn: [
        { tags: ['marriott'], rate: 6, label: 'Ritz-Carlton & Marriott hotels' },
        { tags: ['airfare', 'car_rental', 'dining'], rate: 3, label: 'flights booked direct, car rentals & dining' }
      ]
    },
    {
      id: 'ihg-premier', name: 'IHG One Rewards Premier', family: 'hotel',
      currency: 'ihg', network: 'Mastercard', foreignFee: false, annualFee: 150,
      face: ['#3f434a', '#16181c'],
      blurb: '10x IHG, 5x travel, gas & dining, 3x everything else',
      base: 3,
      earn: [
        { tags: ['ihg'], rate: 10, label: 'IHG hotels' },
        { tags: ['travel', 'gas', 'dining'], rate: 5, label: 'travel, gas & dining', until: '2026-12-31',
          note: 'On Jan 1, 2027 this becomes 5x on flights booked direct, car rentals, dining, gas and grocery.' },
        { tags: ['airfare', 'car_rental', 'dining', 'gas', 'grocery'], rate: 5,
          label: 'flights booked direct, car rentals, dining, gas & grocery', from: '2027-01-01' }
      ]
    },
    {
      id: 'ihg-premier-select', name: 'IHG One Rewards Premier Select', family: 'hotel',
      currency: 'ihg', network: 'Mastercard', foreignFee: false, annualFee: 350,
      face: ['#24262c', '#000000'],
      blurb: '12x IHG, 6x dining & travel, 3x everything else',
      base: 3,
      earn: [
        { tags: ['ihg'], rate: 12, label: 'IHG hotels' },
        { tags: ['dining', 'travel'], rate: 6, label: 'dining & travel' }
      ]
    },
    {
      id: 'ihg-card', name: 'IHG One Rewards (formerly Traveler)', family: 'hotel',
      currency: 'ihg', network: 'Mastercard', foreignFee: false, annualFee: 0,
      face: ['#33818a', '#174b51'],
      blurb: '5x IHG, 3x dining & gas, 2x everything else',
      base: 2,
      earn: [
        { tags: ['ihg'], rate: 5, label: 'IHG hotels' },
        { tags: ['dining', 'gas'], rate: 3, label: 'dining & gas' },
        { tags: ['utilities', 'telecom', 'streaming'], rate: 3, label: 'utilities, phone/internet & streaming',
          until: '2026-12-31', note: 'This category ends Dec 31, 2026 for existing cardholders.' },
        { tags: ['grocery'], rate: 3, label: 'grocery', from: '2027-01-01' }
      ]
    },
    {
      id: 'ihg-business', name: 'IHG One Rewards Business', family: 'hotel',
      currency: 'ihg', network: 'Mastercard', foreignFee: false, annualFee: 200,
      face: ['#4d525b', '#22252b'],
      blurb: '10x IHG, 5x travel, gas & dining, 3x everything else',
      base: 3,
      earn: [
        { tags: ['ihg'], rate: 10, label: 'IHG hotels' },
        { tags: ['travel', 'gas', 'dining', 'office_supply', 'advertising'], rate: 5,
          label: 'travel, gas, dining, office supply & ads', until: '2026-12-31',
          note: 'On Jan 1, 2027 this becomes 5x on flights booked direct, car rentals, dining and gas.' },
        { tags: ['airfare', 'car_rental', 'dining', 'gas'], rate: 5,
          label: 'flights booked direct, car rentals, dining & gas', from: '2027-01-01' }
      ]
    },
    {
      id: 'world-of-hyatt', name: 'World of Hyatt', family: 'hotel',
      currency: 'hyatt', network: 'Visa', foreignFee: false, annualFee: 95,
      face: ['#ece7dd', '#c9c0b0', '#1d1a15'],
      blurb: '4x Hyatt, 2x dining, flights, transit & gyms',
      base: 1,
      earn: [
        { tags: ['hyatt'], rate: 4, label: 'Hyatt hotels' },
        { tags: ['dining', 'airfare', 'transit', 'fitness'], rate: 2,
          label: 'dining, flights booked direct, local transit & gyms' }
      ]
    },
    {
      id: 'hyatt-business', name: 'World of Hyatt Business', family: 'hotel',
      currency: 'hyatt', network: 'Visa', foreignFee: false, annualFee: 199,
      face: ['#2c2e33', '#0e0f11'],
      blurb: '4x Hyatt, 2x in your top three business categories',
      base: 1,
      earn: [
        { tags: ['hyatt'], rate: 4, label: 'Hyatt hotels' },
        { tags: ['fitness'], rate: 2, label: 'gym memberships' },
        { tags: ['dining', 'shipping', 'airfare', 'transit', 'advertising', 'car_rental', 'gas', 'telecom'], rate: 2,
          label: 'a top-three business category',
          note: 'Only your top three of these eight categories each quarter earn 2x: dining, shipping, flights, transit, ads, car rental, gas, phone/internet.' }
      ]
    }
  ];

  // Freedom rotating categories. Each option maps to tags or merchant ids from
  // js/merchants.js. Users can pick different options in the app for any quarter.
  var ROTATION_OPTIONS = {
    grocery: { label: 'Grocery stores', tags: ['grocery'] },
    dining: { label: 'Dining', tags: ['dining'] },
    gas: { label: 'Gas stations', tags: ['gas'] },
    ev: { label: 'EV charging', tags: ['ev_charging'] },
    transit: { label: 'Public transit', tags: ['transit'] },
    entertainment: { label: 'Live entertainment', tags: ['entertainment'] },
    streaming: { label: 'Streaming', tags: ['streaming'] },
    drugstore: { label: 'Drugstores', tags: ['drugstore'] },
    amazon: { label: 'Amazon', merchants: ['amazon', 'amazon-fresh'] },
    whole_foods: { label: 'Whole Foods', merchants: ['whole-foods-market'] },
    chase_travel: { label: 'Chase Travel', tags: ['chase_travel'] },
    paypal: { label: 'PayPal', tags: ['paypal'] },
    target: { label: 'Target', merchants: ['target'] },
    walmart: { label: 'Walmart', merchants: ['walmart'] },
    warehouse: { label: 'Wholesale clubs', tags: ['warehouse_club'] },
    home_improvement: { label: 'Home improvement', tags: ['home_improvement'] },
    department: { label: 'Department stores', tags: ['department_store'] },
    fitness: { label: 'Fitness clubs', tags: ['fitness'] },
    hotels: { label: 'Hotels', tags: ['hotel'] },
    telecom: { label: 'Phone & internet', tags: ['telecom'] },
    pet: { label: 'Pet stores', tags: ['pet'] },
    red_cross: { label: 'American Red Cross', merchants: ['american-red-cross'] },
    united_way: { label: 'United Way', merchants: ['united-way'] },
    feeding_america: { label: 'Feeding America', merchants: ['feeding-america'] },
    aha: { label: 'American Heart Association', merchants: ['american-heart-association'] },
    ncl: { label: 'Norwegian Cruise Line', merchants: ['norwegian-cruise-line'] }
  };

  var ROTATION_CALENDAR = {
    '2026-Q1': { period: 'Jan 1 – Mar 31, 2026', options: ['dining', 'ncl', 'aha'] },
    '2026-Q2': { period: 'Apr 1 – Jun 30, 2026', options: ['amazon', 'whole_foods', 'chase_travel', 'feeding_america'] },
    '2026-Q3': { period: 'Jul 1 – Sep 30, 2026', options: ['gas', 'ev', 'transit', 'entertainment', 'united_way'] },
    '2026-Q4': { period: 'Oct 1 – Dec 31, 2026', options: ['grocery', 'dining', 'red_cross'], activateBy: 'Dec 14, 2026' },
    // Chase previewed Q1 2027 in its September 2026 announcement; confirm once it's official.
    '2027-Q1': { period: 'Jan 1 – Mar 31, 2027', options: ['streaming', 'grocery'] }
  };

  return {
    DATA_DATE: DATA_DATE,
    CURRENCIES: CURRENCIES,
    FAMILIES: FAMILIES,
    CARDS: CARDS,
    ROTATION_OPTIONS: ROTATION_OPTIONS,
    ROTATION_CALENDAR: ROTATION_CALENDAR
  };
});

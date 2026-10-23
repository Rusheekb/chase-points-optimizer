/*
 * Merchant directory and spending categories.
 *
 * Every place carries a list of `tags`. Card earning rules (js/cards.js) match
 * against these tags, so a place should list every tag a card could reward it
 * under, most specific first. United Airlines, for example, is
 * ['united', 'airfare', 'travel']: the United cards reward `united`, the
 * Sapphire Reserve rewards `airfare` booked direct, and the Sapphire Preferred
 * rewards general `travel`.
 *
 * Tag vocabulary
 *   dining, food_delivery, grocery, online_grocery, gas, ev_charging, drugstore,
 *   travel, airfare, hotel, lodging, vacation_rental, car_rental, rideshare, transit, cruise,
 *   chase_travel, streaming, telecom, utilities, office_supply, shipping,
 *   advertising, fitness, superstore, warehouse_club, home_improvement,
 *   department_store, online_shopping, entertainment, pet, paypal, charity,
 *   amazon, whole_foods, united, southwest, avios_airline, air_canada,
 *   marriott, ihg, hyatt, disney, disney_streaming, instacart, doordash, lyft
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CPO = Object.assign(root.CPO || {}, api);
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Human-readable names for tags, used in search hints.
  var TAG_LABELS = {
    dining: 'Dining', food_delivery: 'Food delivery', grocery: 'Grocery',
    online_grocery: 'Online grocery', gas: 'Gas', ev_charging: 'EV charging',
    drugstore: 'Drugstore', travel: 'Travel', airfare: 'Airline', hotel: 'Hotel',
    lodging: 'Lodging', vacation_rental: 'Vacation rental', charity: 'Charity', car_rental: 'Car rental', rideshare: 'Rideshare',
    transit: 'Transit', cruise: 'Cruise', chase_travel: 'Chase Travel',
    streaming: 'Streaming', telecom: 'Phone & internet', utilities: 'Utilities',
    office_supply: 'Office supply', shipping: 'Shipping', advertising: 'Online ads',
    fitness: 'Fitness', superstore: 'Superstore', warehouse_club: 'Warehouse club',
    home_improvement: 'Home improvement', department_store: 'Department store',
    online_shopping: 'Online shopping', entertainment: 'Entertainment', pet: 'Pet',
    paypal: 'PayPal', amazon: 'Amazon', whole_foods: 'Whole Foods', united: 'United',
    southwest: 'Southwest', avios_airline: 'Avios airline', air_canada: 'Air Canada',
    marriott: 'Marriott', ihg: 'IHG', hyatt: 'Hyatt', disney: 'Disney',
    disney_streaming: 'Disney streaming', instacart: 'Instacart', doordash: 'DoorDash',
    lyft: 'Lyft'
  };

  // Generic kinds of places. They power the quick-pick chips, the fallback
  // picker for unknown merchants, and searches like "coffee" or "pharmacy".
  var CATEGORIES = [
    { id: 'cat-dining', label: 'Restaurant, café or bar', short: 'Dining', tags: ['dining'],
      keywords: 'restaurant food cafe coffee coffee shop bar pub diner fast food takeout brunch bakery pizza sushi tacos dinner lunch breakfast' },
    { id: 'cat-delivery', label: 'Food delivery app', short: 'Delivery', tags: ['food_delivery', 'dining'],
      keywords: 'delivery takeout order food' },
    { id: 'cat-grocery', label: 'Grocery store', short: 'Groceries', tags: ['grocery'],
      keywords: 'grocery groceries supermarket market food store' },
    { id: 'cat-gas', label: 'Gas station', short: 'Gas', tags: ['gas'],
      keywords: 'gas fuel petrol gas station pump' },
    { id: 'cat-ev', label: 'EV charging', short: 'EV charging', tags: ['ev_charging'],
      keywords: 'ev charging electric vehicle charger supercharger' },
    { id: 'cat-drugstore', label: 'Pharmacy or drugstore', short: 'Drugstore', tags: ['drugstore'],
      keywords: 'pharmacy drugstore drug store prescription' },
    { id: 'cat-airfare', label: 'Airline, booked direct', short: 'Flights', tags: ['airfare', 'travel'],
      keywords: 'flight flights airline airfare plane ticket' },
    { id: 'cat-hotel', label: 'Hotel, booked direct', short: 'Hotels', tags: ['hotel', 'travel'],
      keywords: 'hotel motel resort inn stay' },
    { id: 'cat-lodging', label: 'Vacation rental or travel site', short: 'Travel site', tags: ['lodging', 'travel'],
      keywords: 'vacation rental travel agency online travel booking site' },
    { id: 'cat-car-rental', label: 'Car rental', short: 'Car rental', tags: ['car_rental', 'travel'],
      keywords: 'car rental rent a car rental car' },
    { id: 'cat-rideshare', label: 'Rideshare or taxi', short: 'Rideshare', tags: ['rideshare', 'transit', 'travel'],
      keywords: 'rideshare ride taxi cab' },
    { id: 'cat-transit', label: 'Transit, parking or tolls', short: 'Transit', tags: ['transit', 'travel'],
      keywords: 'transit subway metro bus train commuter rail parking toll tolls ferry' },
    { id: 'cat-cruise', label: 'Cruise or train trip', short: 'Cruise & rail', tags: ['cruise', 'travel'],
      keywords: 'cruise train rail' },
    { id: 'cat-chase-travel', label: 'Booking through Chase Travel', short: 'Chase Travel', tags: ['chase_travel', 'travel'],
      keywords: 'chase travel portal ultimate rewards travel' },
    { id: 'cat-streaming', label: 'Streaming subscription', short: 'Streaming', tags: ['streaming'],
      keywords: 'streaming subscription tv music video' },
    { id: 'cat-telecom', label: 'Phone, internet or cable bill', short: 'Phone & internet', tags: ['telecom'],
      keywords: 'phone bill cell phone wireless internet cable broadband' },
    { id: 'cat-utilities', label: 'Utility bill', short: 'Utilities', tags: ['utilities'],
      keywords: 'utility utilities electric electricity water power gas bill' },
    { id: 'cat-office', label: 'Office supply store', short: 'Office supply', tags: ['office_supply'],
      keywords: 'office supply supplies printing' },
    { id: 'cat-shipping', label: 'Shipping', short: 'Shipping', tags: ['shipping'],
      keywords: 'shipping postage mail courier package' },
    { id: 'cat-advertising', label: 'Social media or search ads', short: 'Online ads', tags: ['advertising'],
      keywords: 'ads advertising marketing social media ads search ads' },
    { id: 'cat-fitness', label: 'Gym or fitness club', short: 'Gym', tags: ['fitness'],
      keywords: 'gym fitness club workout yoga pilates' },
    { id: 'cat-superstore', label: 'Superstore or discount store', short: 'Superstore', tags: ['superstore'],
      keywords: 'superstore supercenter discount store big box dollar store' },
    { id: 'cat-warehouse', label: 'Warehouse club', short: 'Warehouse club', tags: ['warehouse_club'],
      keywords: 'warehouse club wholesale bulk' },
    { id: 'cat-home', label: 'Home improvement store', short: 'Home improvement', tags: ['home_improvement'],
      keywords: 'home improvement hardware lumber' },
    { id: 'cat-department', label: 'Department or clothing store', short: 'Shopping', tags: ['department_store'],
      keywords: 'department store clothing apparel mall shoes' },
    { id: 'cat-online', label: 'Online shopping', short: 'Online', tags: ['online_shopping'],
      keywords: 'online shopping ecommerce website' },
    { id: 'cat-entertainment', label: 'Movies, concerts or events', short: 'Entertainment', tags: ['entertainment'],
      keywords: 'movie movies cinema theater concert tickets event sports' },
    { id: 'cat-other', label: 'Something else', short: 'Everything else', tags: [],
      keywords: 'other misc miscellaneous everything else' }
  ];

  // Groups of merchants that share the same tags. Names may carry aliases
  // separated by "|"; the first entry is the display name.
  var GROUPS = [
    [['dining'], [
      'Starbucks', "Dunkin'|Dunkin Donuts", "McDonald's|mcd", 'Chipotle', 'Chick-fil-A',
      'Subway', 'Taco Bell', "Wendy's", 'Burger King', 'Panera Bread|Panera', 'Sweetgreen',
      'Shake Shack', "Domino's|Dominos Pizza", 'Pizza Hut', "Papa John's", 'Five Guys',
      'In-N-Out Burger|In n Out', 'Panda Express', 'Olive Garden', "Applebee's", "Chili's",
      'The Cheesecake Factory|Cheesecake Factory', 'Texas Roadhouse', 'Dutch Bros', 'Tim Hortons',
      "Peet's Coffee", 'Cava', "Raising Cane's", 'Popeyes', 'KFC', "Jersey Mike's",
      "Jimmy John's", 'Wingstop', 'Buffalo Wild Wings|BWW', 'IHOP', "Denny's", 'Waffle House',
      'Cracker Barrel', 'Outback Steakhouse', "P.F. Chang's", 'Noodles & Company', 'Qdoba',
      "Culver's", 'Whataburger', 'Sonic Drive-In|Sonic', "Arby's", 'Dairy Queen', 'Krispy Kreme',
      'Crumbl Cookies|Crumbl', 'Blue Bottle Coffee', 'Philz Coffee', 'Jamba', 'Smoothie King',
      'Tropical Smoothie Cafe', "Zaxby's", 'Firehouse Subs', 'Potbelly', 'Red Robin',
      'Pret A Manger|Pret', 'Joe & the Juice'
    ]],
    [['food_delivery', 'dining'], [
      'Uber Eats|UberEats', 'Grubhub', 'Postmates', 'Seamless', 'ezCater'
    ]],
    [['doordash', 'food_delivery', 'dining'], ['DoorDash|Door Dash', 'Caviar']],
    [['grocery'], [
      "Trader Joe's", 'Kroger', 'Safeway', 'Albertsons', 'Publix', 'H-E-B|HEB', 'Wegmans', 'Aldi',
      'Lidl', 'Food Lion', 'Giant Food|Giant', 'Stop & Shop', 'ShopRite', 'Harris Teeter', 'Meijer',
      'Hy-Vee', 'Sprouts Farmers Market|Sprouts', 'Ralphs', 'Fred Meyer', 'Vons', 'Jewel-Osco',
      'King Soopers', "Smith's Food & Drug", "Fry's Food", 'WinCo Foods', 'Winn-Dixie', 'Hannaford',
      'Market Basket', 'H Mart', '99 Ranch Market', 'Giant Eagle', 'Weis Markets', 'Stater Bros',
      'Raley’s|Raleys', 'Food 4 Less', 'Save A Lot', 'Ingles', 'Schnucks', 'Price Chopper',
      'Tops Friendly Markets|Tops', 'Natural Grocers', 'Fresh Thyme Market', 'The Fresh Market',
      'Erewhon', 'Central Market', 'Piggly Wiggly'
    ]],
    [['online_grocery', 'grocery'], ['Thrive Market', 'FreshDirect', 'Misfits Market', 'Weee!|Weee']],
    [['gas'], [
      'Shell', 'Chevron', 'Exxon', 'Mobil', 'BP', 'Speedway', 'Circle K', '76', 'Sunoco',
      'Marathon', 'Valero', 'Citgo', 'Arco', 'Phillips 66', 'Texaco', 'Conoco', 'Gulf',
      'RaceTrac', 'Murphy USA', 'Sinclair', 'Holiday Stationstores|Holiday'
    ]],
    [['gas'], [
      'Wawa', 'Sheetz', 'QuikTrip|QT', "Casey's", 'Kwik Trip', "Love's Travel Stop|Loves",
      'Pilot Flying J|Pilot|Flying J', "Buc-ee's|Bucees", '7-Eleven|7 Eleven|Seven Eleven', 'Cumberland Farms'
    ], { note: 'Fuel at the pump usually codes as gas. Inside-the-store purchases often code as a convenience store and earn the base rate.' }],
    [['ev_charging'], ['Tesla Supercharger|Supercharger', 'ChargePoint', 'Electrify America', 'EVgo', 'Blink Charging']],
    [['drugstore'], ['CVS Pharmacy|CVS', 'Walgreens', 'Duane Reade']],
    [['united', 'airfare', 'travel'], ['United Airlines|United']],
    [['southwest', 'airfare', 'travel'], ['Southwest Airlines|Southwest']],
    [['avios_airline', 'airfare', 'travel'], ['British Airways|BA', 'Aer Lingus', 'Iberia', 'LEVEL']],
    [['air_canada', 'airfare', 'travel'], ['Air Canada']],
    [['airfare', 'travel'], [
      'Delta Air Lines|Delta', 'American Airlines|AA', 'JetBlue', 'Alaska Airlines|Alaska',
      'Hawaiian Airlines', 'Spirit Airlines|Spirit', 'Frontier Airlines', 'Allegiant', 'Sun Country',
      'Breeze Airways', 'Lufthansa', 'Air France', 'KLM', 'Emirates', 'Qatar Airways',
      'Singapore Airlines', 'Virgin Atlantic', 'Japan Airlines|JAL', 'ANA|All Nippon Airways',
      'Turkish Airlines', 'Cathay Pacific', 'Etihad', 'Aeromexico', 'WestJet'
    ]],
    [['marriott', 'hotel', 'travel'], [
      'Marriott', 'Ritz-Carlton|Ritz Carlton', 'St. Regis', 'JW Marriott', 'W Hotels', 'Westin',
      'Sheraton', 'Le Méridien|Le Meridien', 'Renaissance Hotels', 'Autograph Collection',
      'Courtyard by Marriott|Courtyard', 'Residence Inn', 'Fairfield Inn', 'SpringHill Suites',
      'TownePlace Suites', 'Four Points by Sheraton|Four Points', 'Aloft', 'Moxy', 'Element Hotels',
      'Gaylord Hotels', 'Delta Hotels', 'The Luxury Collection', 'EDITION Hotels'
    ]],
    [['ihg', 'hotel', 'travel'], [
      'IHG|InterContinental Hotels Group', 'InterContinental', 'Holiday Inn', 'Holiday Inn Express',
      'Kimpton', 'Crowne Plaza', 'Hotel Indigo', 'Candlewood Suites', 'Staybridge Suites',
      'Six Senses', 'Regent Hotels', 'voco', 'avid hotels', 'EVEN Hotels', 'Garner'
    ]],
    [['hyatt', 'hotel', 'travel'], [
      'Hyatt', 'Park Hyatt', 'Grand Hyatt', 'Hyatt Regency', 'Andaz', 'Hyatt Place', 'Hyatt House',
      'Hyatt Centric', 'Thompson Hotels', 'Alila', 'Miraval', 'Caption by Hyatt', 'Hyatt Ziva|Hyatt Zilara'
    ]],
    [['hotel', 'travel'], [
      'Hilton', 'Hampton Inn', 'DoubleTree', 'Embassy Suites', 'Hilton Garden Inn', 'Homewood Suites',
      'Home2 Suites', 'Waldorf Astoria', 'Conrad', 'Curio Collection', 'Tapestry Collection',
      'Canopy by Hilton', 'Wyndham', 'La Quinta', 'Days Inn', 'Super 8', 'Ramada', 'Choice Hotels',
      'Comfort Inn', 'Quality Inn', 'Cambria Hotels', 'Best Western', 'Four Seasons', 'Accor',
      'Fairmont', 'Sofitel', 'Novotel', 'Motel 6', 'Red Roof Inn', 'Extended Stay America',
      'Omni Hotels', 'Loews Hotels', 'MGM Resorts|MGM Grand|Bellagio', 'Caesars Palace|Caesars'
    ]],
    [['vacation_rental', 'lodging', 'travel'], ['Airbnb', 'Vrbo|HomeAway', 'Vacasa', 'Plum Guide', 'Homestay.com']],
    [['lodging', 'travel'], [
      'Booking.com|Booking', 'Expedia', 'Hotels.com', 'Priceline', 'Kayak',
      'Hopper', 'Trip.com', 'Agoda', 'Hostelworld'
    ]],
    [['car_rental', 'travel'], [
      'Hertz', 'Enterprise Rent-A-Car|Enterprise', 'Avis', 'Budget Car Rental|Budget',
      'National Car Rental|National', 'Alamo', 'Sixt', 'Thrifty', 'Dollar Car Rental', 'Turo', 'Zipcar'
    ]],
    [['rideshare', 'transit', 'travel'], ['Uber', 'Taxi|Cab|Yellow Cab', 'Curb', 'Waymo']],
    [['lyft', 'rideshare', 'transit', 'travel'], ['Lyft']],
    [['transit', 'travel'], [
      'MTA|NYC Subway|OMNY|MetroCard', 'BART', 'WMATA|DC Metro|SmarTrip', 'CTA|Ventra', 'MBTA|CharlieCard',
      'SEPTA', 'Clipper Card|Clipper', 'Caltrain', 'NJ Transit', 'LIRR', 'Metro-North', 'LA Metro|TAP',
      'King County Metro|ORCA', 'MARTA', 'Citi Bike', 'Lime', 'E-ZPass|EZPass', 'FasTrak', 'SunPass',
      'ParkMobile', 'SpotHero', 'ParkWhiz', 'Greyhound', 'FlixBus', 'Megabus'
    ]],
    [['cruise', 'travel'], [
      'Amtrak', 'Brightline', 'Carnival Cruise Line|Carnival', 'Royal Caribbean', 'Norwegian Cruise Line|NCL',
      'Celebrity Cruises', 'Princess Cruises', 'Virgin Voyages', 'Holland America', 'Disney Cruise Line'
    ]],
    [['chase_travel', 'travel'], ['Chase Travel|Chase Ultimate Rewards travel portal|Chase portal']],
    [['streaming'], [
      'Netflix', 'Spotify', 'Apple Music', 'YouTube Premium|YouTube TV|YouTube', 'Max|HBO Max', 'Peacock',
      'Paramount+|Paramount Plus', 'Apple TV+|Apple TV Plus', 'Sling TV|Sling', 'Fubo|FuboTV',
      'SiriusXM|Sirius', 'Pandora', 'Tidal', 'Amazon Prime Video|Prime Video', 'Audible', 'Crunchyroll'
    ]],
    [['disney_streaming', 'streaming', 'disney'], ['Disney+|Disney Plus', 'Hulu', 'ESPN+|ESPN Plus']],
    [['telecom'], [
      'Verizon', 'AT&T|ATT', 'T-Mobile|TMobile', 'Xfinity|Comcast', 'Spectrum|Charter', 'Cox',
      'Optimum', 'Google Fi', 'Mint Mobile', 'Visible', 'Frontier Internet', 'Starlink',
      'Cricket Wireless', 'Metro by T-Mobile', 'US Mobile', 'Boost Mobile', 'Google Fiber'
    ]],
    [['utilities'], ['PG&E|Pacific Gas and Electric', 'Con Edison|ConEd', 'Duke Energy', 'Southern California Edison|SCE', 'Dominion Energy', 'National Grid', 'Xcel Energy']],
    [['office_supply'], ['Staples', 'Office Depot', 'OfficeMax']],
    [['shipping'], ['UPS|The UPS Store', 'FedEx', 'USPS|Post Office', 'DHL', 'Pirate Ship', 'Stamps.com']],
    [['advertising'], [
      'Google Ads', 'Meta Ads|Facebook Ads|Instagram Ads', 'LinkedIn Ads', 'Microsoft Advertising|Bing Ads',
      'TikTok Ads', 'Pinterest Ads', 'Reddit Ads', 'X Ads|Twitter Ads', 'Snapchat Ads'
    ]],
    [['fitness'], [
      'Planet Fitness', 'Equinox', 'LA Fitness', '24 Hour Fitness', 'Orangetheory', 'Crunch Fitness',
      "Gold's Gym", 'Life Time|Lifetime Fitness', 'Anytime Fitness', 'SoulCycle', 'ClassPass',
      'Peloton', 'F45 Training', 'CorePower Yoga', 'YMCA'
    ]],
    [['superstore'], ['Walmart|Wal-Mart|Walmart.com', 'Target|Target.com', 'Dollar General', 'Dollar Tree', 'Five Below', 'Big Lots']],
    [['warehouse_club'], ["Sam's Club", "BJ's Wholesale|BJs"]],
    [['home_improvement'], ['The Home Depot|Home Depot', "Lowe's", 'Menards', 'Ace Hardware', 'Harbor Freight', 'Tractor Supply']],
    [['department_store'], [
      "Macy's", 'Nordstrom', "Kohl's", 'TJ Maxx|T.J. Maxx', 'Marshalls', 'Ross Dress for Less|Ross',
      'HomeGoods', 'Old Navy', 'Gap', 'Uniqlo', 'Zara', 'H&M', 'Nike', 'Adidas', 'Lululemon',
      "Dillard's", 'JCPenney', 'Burlington', 'Ulta Beauty|Ulta', 'Sephora', 'Bath & Body Works',
      'Best Buy', 'Apple Store|Apple', 'IKEA', 'Bed Bath & Beyond', 'Michaels', 'Hobby Lobby',
      "Dick's Sporting Goods|Dicks", 'REI', 'Barnes & Noble', 'GameStop'
    ]],
    [['pet'], ['PetSmart', 'Petco']],
    [['online_shopping'], ['eBay', 'Etsy', 'Chewy', 'Wayfair', 'Temu', 'Shein', 'Apple App Store|App Store|iTunes', 'Google Play']],
    [['paypal', 'online_shopping'], ['PayPal']],
    [['charity'], ['American Red Cross|Red Cross', 'United Way', 'Feeding America', 'American Heart Association']],
    [['entertainment'], ['AMC Theatres|AMC', 'Regal Cinemas|Regal', 'Cinemark', 'Ticketmaster', 'StubHub', 'SeatGeek', 'Live Nation', 'Fandango']],
    [['amazon', 'online_shopping'], ['Amazon|Amazon.com|AMZN']],
    [['amazon', 'whole_foods', 'grocery'], ['Whole Foods Market|Whole Foods|WFM']],
    [['amazon', 'grocery'], ['Amazon Fresh', 'Amazon Go']],
    [['instacart', 'online_grocery', 'grocery'], ['Instacart']],
    [['disney'], [
      'Walt Disney World|Disney World', 'Disneyland', 'Disney Store|shopDisney', 'Disney Springs'
    ]]
  ];

  // One-off merchants whose rules don't fit a group.
  var SPECIAL = [
    { name: 'Costco', aliases: ['Costco Wholesale'], tags: ['warehouse_club'], accepts: ['visa'],
      note: 'Costco warehouses take Visa only, so a Mastercard won’t work at the register.' },
    { name: 'Costco Gas', aliases: ['Costco gas station', 'Costco fuel'], tags: ['gas'], accepts: ['visa'],
      note: 'Costco gas stations take Visa only.' },
    { name: "Sam's Club Gas", tags: ['gas'] },
    { name: "BJ's Gas", tags: ['gas'] }
  ];

  function slug(s) {
    return String(s).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/&/g, ' and ').replace(/['’.+!]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  var MERCHANTS = [];
  var seen = {};
  function add(entry) {
    entry.id = entry.id || slug(entry.name);
    if (seen[entry.id]) throw new Error('Duplicate merchant id: ' + entry.id);
    seen[entry.id] = true;
    MERCHANTS.push(entry);
  }

  GROUPS.forEach(function (group) {
    var tags = group[0], names = group[1], extra = group[2] || {};
    names.forEach(function (raw) {
      var parts = raw.split('|');
      var entry = { name: parts[0], aliases: parts.slice(1), tags: tags.slice() };
      if (extra.note) entry.note = extra.note;
      add(entry);
    });
  });
  SPECIAL.forEach(function (s) {
    add({ name: s.name, aliases: s.aliases || [], tags: s.tags, accepts: s.accepts, note: s.note });
  });

  return { TAG_LABELS: TAG_LABELS, CATEGORIES: CATEGORIES, MERCHANTS: MERCHANTS, slug: slug };
});

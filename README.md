# Chase Points Optimizer

Type where you're about to pay and see which of your Chase cards earns the most there.

- Pick the cards you own once. The list is saved in your browser.
- Search about 500 merchants, from Starbucks and Shell to Westin and Delta. If a place isn't listed, pick what kind of place it is.
- Get one answer: the card to use, its multiplier, and what that's worth in cents per dollar. Every other card in your wallet is ranked below it.

It's a static web page with no build step, no server and no tracking.

## Using it

**On your computer:** open `index.html` in a browser, or run `npm start` and visit http://localhost:8000.

**On your phone:** open https://rusheekb.github.io/chase-points-optimizer/ and use "Add to Home Screen" to get an app icon. Every push to `main` runs the tests and republishes the site (`.github/workflows/pages.yml`). This needs Settings → Pages → Source set to "GitHub Actions".

## How it picks a card

For each card in your wallet it finds the best earn rule that matches the place, then converts that rate into cents of value per dollar spent:

```
effective value = multiplier × cents per point − foreign transaction fee (if any)
```

It also accounts for these details:

| Situation | What the tool does |
| --- | --- |
| **Point pooling** | Freedom and Ink Cash/Unlimited points are worth more when you also hold a Sapphire Preferred, Sapphire Reserve, Ink Preferred or Sapphire Reserve for Business, because you can move them to that card and transfer them to airlines and hotels. Without one of those cards they're valued at 1¢. |
| **Freedom 5% categories** | The current quarter's categories are built in through Q1 2027. They stack with Freedom Flex's own 3% dining bonus, so dining earns 7% in Q4 2026. You can change the categories and mark whether you activated them. |
| **Card networks** | Costco only takes Visa, so Mastercards like Freedom Flex are listed as "won't work here". |
| **Foreign currency** | Cards with a 3% foreign transaction fee are penalized when you check "Charged in a foreign currency". |
| **Online grocery** | The Sapphire Preferred's 3x online grocery applies only when "Paying online" is checked. Target, Walmart and wholesale clubs never count as grocery. |
| **Better ways to pay** | The tool suggests booking through Chase Travel (up to 8x), ordering groceries online, or checking out with Paze (+10x through Dec 31, 2026) when that would earn more. |
| **Amount-based rules** | Enter an amount to see points earned and to unlock Ink Premier's 2.5% on purchases of $5,000 or more. |
| **Dated changes** | Category changes that Chase has already announced, such as the IHG and Aeroplan updates on Jan 1, 2027, switch over automatically on their dates. |

Point values default to The Points Guy's October 2026 valuations (Ultimate Rewards 2¢, United 1.2¢, Hyatt 1.65¢, Marriott 0.75¢ and so on). You can change them in the app.

## Cards covered

| Family | Cards |
| --- | --- |
| Sapphire | Preferred, Reserve |
| Freedom | Unlimited, Flex, Rise, original Freedom |
| Ink & business | Ink Business Preferred, Cash, Unlimited and Premier; Sapphire Reserve for Business |
| Amazon, Disney & delivery | Prime Visa, Amazon Visa, Instacart, DoorDash, Disney Visa, Disney Premier, Disney Inspire |
| Airline | United Gateway, Explorer, Quest, Club and Business; Southwest Plus, Premier, Priority, Premier Business and Performance Business; Air Canada Aeroplan; British Airways, Aer Lingus, Iberia |
| Hotel | Marriott Bonvoy Boundless, Bold and Bountiful; Ritz-Carlton; IHG One Rewards Premier, Premier Select, standard card and Business; World of Hyatt; World of Hyatt Business |

Earn rates were last checked on October 23, 2026.

## Limits

- **Spending caps aren't tracked.** Caps such as Freedom's $1,500 per quarter or Ink Cash's $25,000 per year are shown as notes, but the tool doesn't know how much you've already spent.
- **Merchant coding varies.** Merchants choose their own category codes. A gas station's convenience store or a restaurant inside a hotel may not code the way you expect.
- **Card terms change.** Check the issuer's site before a big purchase. This project isn't affiliated with JPMorgan Chase.

## Updating the data

All data lives in plain JavaScript files:

| File | What's in it |
| --- | --- |
| `js/cards.js` | Cards, earn rules, rewards currencies and default point values, and `ROTATION_CALENDAR`, the Freedom categories by quarter |
| `js/merchants.js` | The merchant directory and spending categories. Each merchant has tags that card rules match. |
| `js/engine.js` | Search and ranking logic. Pure functions, with no DOM access. |
| `js/app.js` | The page UI |

Chase announces each quarter's Freedom categories about a month ahead. To add them:

1. Add an entry to `ROTATION_CALENDAR` in `js/cards.js`, using options from `ROTATION_OPTIONS`.
2. Run the tests:

```
npm test
```

The tests check that every card rule refers to real tags and merchants, and cover the main ranking rules.

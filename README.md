# Remix of Stylist Paula

I am attaching screenshots of Paula's existing visual identity — typography, colors, spacing, and UI components are already established. Extract the full design system from these screenshots and apply it consistently across every screen. Do not invent new visual direction.

Build a consumer web application called Paula — an AI personal style companion.

This is not a landing page, not a marketing site, not a SaaS dashboard. It is a real consumer fashion app for women — the experience should feel like a personal stylist who knows your body, your taste, and your budget.

What Paula does — core product logic:

Paula responds to exactly what the user asks for. She never generates recommendations automatically. The user initiates every search — by typing a request in natural language or by uploading a photo (a dress seen on the street, an Instagram screenshot, a product from a shop). Paula understands the request, asks 1–2 clarifying questions when needed, and shows products from her database that best match the user's body proportions and the specific request. Nothing appears without the user asking for it first.

Every product shown has a Fit Score — a percentage showing how well that item matches the user's body proportions. This is calculated from the body profile built during onboarding, not from clothing size. The Fit Score is a core UI element visible on every product card.

The user can set a budget at any point in the conversation in natural language ("max 150 zł", "under 300 zł"). The budget appears as a persistent pill above the chat input for the duration of the session. The user can remove or change it without restarting the conversation.

App structure — screens to build:

1. Welcome screen Clean entry point. Paula's name, one-line description, sign up and log in actions. Tone: warm, confident, editorial.

2. Sign up / log in Minimal. Email or Google. No unnecessary fields.

3. Onboarding flow

This is the most important screen sequence in the app. It must feel like a conversation, not a form. Build it as a step-by-step flow with a progress indicator. Each step is one question at a time, presented warmly.

Steps in order:

Step 1 — Name. "What should I call you?"

Step 2 — Body scan. Ask the user to upload a full-length photo or take one. Explain that Paula uses this to understand body proportions — not size. Copy: "I'll use this to understand your proportions — not your size. This stays private." Show a simple illustrated guide of how to take the photo (standing straight, neutral background). Include a "skip for now" option.

Step 3 — Body shape confirmation. After photo upload show the detected body shape (hourglass, pear, rectangle, inverted triangle, apple) with a brief description of what it means for styling. Let the user confirm or manually select.

Step 4 — Height. Simple input in cm.

Step 5 — Style aesthetics. "Which of these feel like you?" Show a visual grid of aesthetic mood images (minimalist, romantic, structured/tailored, streetwear, bohemian, classic, oversized/relaxed). Multi-select. Images should be editorial fashion photography style.

Step 6 — Fit preferences. "How do you like clothes to fit?" Options with short visual labels: fitted, relaxed, oversized, it depends on the piece. Multi-select.

Step 7 — Occasions. "What do you mainly dress for?" Options: everyday / casual, office, going out, special occasions, sport / active, travel. Multi-select.

Step 8 — Budget range. "What's your usual budget per item?" Slider or range selector with PLN values. From under 100 zł to 500 zł+.

Step 9 — Brands. "Any brands you love?" Free text with autocomplete suggestions. Skip option.

Step 10 — Done. Short confirmation screen. "Paula is ready." Show a summary of the profile and a CTA to go to the main app.

4. Main app — tab navigation

Bottom navigation (mobile) or left sidebar (desktop) with four tabs:

— For You (home) — Search / Chat with Paula — Saved — Profile

5. For You — feed screen

At the top of the screen, before the feed, show a horizontal strip of best-matched products for this user's body profile. Headline: "Best for your proportions." These are the highest fit score products across all categories. Each card shows product image, brand, price, and fit score badge. Horizontal scroll.

Below that, show a curated feed of products and editorial groupings relevant to the user's Style DNA. This is not a search result — it is a passive discovery feed. No AI interaction needed here, just a well-designed grid or editorial layout of product cards.

Each product card contains: product image, brand name, product name, price in PLN, fit score badge (e.g. "fit 92%"), and a save/heart action.

Include a "Trending" toggle at the top to switch between "For You" and "Trending" views.

6. Search — Chat with Paula

This is the core interaction screen. Split layout on desktop: left panel is the conversation, right panel shows product results.

Left panel — chat:

At the top show the user's profile chip (name + body shape summary, e.g. "Kasia · hourglass · 165 cm").

The conversation is a standard chat UI. Paula's messages on the left, user messages on the right. Paula's tone is warm, direct, and knowledgeable — like a friend who knows fashion.

Below Paula's clarifying questions show clickable answer chips. Clicking a chip sends it as a user message and triggers Paula's next response. The user can also type freely.

At the bottom: text input with send button, and a photo upload button. When a photo is uploaded it appears as a thumbnail inside the user's chat bubble with a short caption like "Looking for something like this."

Budget pill appears above the input bar as soon as the user mentions a budget. It persists for the session. Clicking × removes it.

Right panel — results:

Product cards in a 2–3 column grid. Each card: product image, product name, brand, price, fit score badge in the top corner of the image, save action.

Above the grid: result count, active filter chips (removable), sort control (fit score / price / newest).

Right panel shows a loading state when Paula is processing, then populates with results.

On mobile, results appear below the chat as a scrollable section.

7. Brand pages

Each brand has its own page accessible from product cards. At the top of a brand page, immediately show a section: "Best matches for your proportions" — the brand's products with the highest fit score for this user, sorted by fit score descending. This section appears before anything else on the page.

Below that, show the full brand product catalogue in a grid.

8. Saved / Collections

Two tabs: Saved (all saved items in a grid) and Collections (user-created folders). Each collection has a name, cover image (first saved item), and item count. User can create new collections, move items between them, and set price drop alerts on saved items.

9. Profile / Preferences

Show the user's style profile summary: body shape, height, aesthetic tags, fit preferences, occasions, budget range, saved brands. Each section is editable. Include option to retake the body scan photo.

Mock data to use throughout:

Use realistic Polish fashion context. Products from H&M, Mango, Massimo Dutti, Arket, & Other Stories, Reserved, Sinsay, Vinted. Prices in PLN. Product names in Polish. Fit scores between 78% and 97%. Mix of new and second-hand (Vinted) items.

Prototype interaction flow for the Search screen (hardcoded states):

State 1 — empty: Paula shows a greeting. "Czego szukasz?" Input is ready.

State 2 — user types: "sukienka na wesele latem, max 150 zł". Budget pill appears. Paula responds: "Jasne! Jaki styl wesela?" with chips: "ogrodowe / plenerowe", "kościelne, eleganckie", "sala weselna".

State 3 — user clicks "ogrodowe / plenerowe". Paula asks: "Jaka długość?" with chips: "midi", "maxi", "bez preferencji".

State 4 — user clicks "midi". Paula responds: "Znalazłam 12 opcji pasujących do Twojej sylwetki." Right panel populates with product cards. Fit scores 94% down to 79%. Prices under 150 zł. Mix of H&M, Mango, Vinted.

State 5 — user types: "pokaż tylko second hand". Paula confirms. Right panel filters to Vinted items only.

State 6 — user uploads a photo. Paula responds: "Widzę sukienkę w stylu boho — szukam podobnych pasujących do Twojej sylwetki." Right panel updates with new results.

Use a subtle step indicator outside the chat frame so the demo can be advanced manually through these states.

Technical requirements:

React + Tailwind

All UI copy in Polish

Mock data only — no backend, no API calls

Conversation history stays visible as user advances through states — do not clear the chat

Desktop layout minimum 1200px, mobile layout fully responsive

Do not add any corporate, B2B, or landing page sections anywhere in the app

The onboarding body scan step must be clearly about proportions, not size — the copy must reflect this throughout

Start in Plan mode. Before building anything:

Map out the full screen-by-screen architecture, component structure, routing, and data model for mock data. Then ask any clarifying questions before implementation. Do not start coding until the plan is confirmed.

in the places of photos dont add photos

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/42dc836f-62dd-48a4-aa5f-406e4d40f8af).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

# IDEO alumni host picker

Picks who organizes the next IDEO alumni meetup, and keeps a history of who has.

Next.js 16 (App Router, Cache Components), TypeScript and Tailwind v4, scaffolded from [stuff](https://github.com/richcahill/stuff) and its design system.

## Develop

```bash
npm install
```

```bash
EDIT_PASSWORD=test npm run dev
```

With no Upstash store connected, the list is kept in memory and is gone when the server stops.

## Deploy

On Vercel, the project needs two things:

- `EDIT_PASSWORD`: the shared passcode. Anyone can view; the passcode is needed to pick or change anything. Without it set, nothing can be changed. Changing it signs everyone out.
- An Upstash Redis store connected to the project (`KV_REST_API_URL` and `KV_REST_API_TOKEN`, or the `UPSTASH_REDIS_REST_*` pair). Each location is one JSON value: London under `picker:state`, the others under `picker:state:<slug>`. `picker:places` lists the locations people added and `picker:spins` counts spins.

Both only reach a deployment made after they were added, so redeploy after changing either.

## How picking works

The draw is weighted (`src/lib/picker.ts`): a person's weight is the number of meetups since they last organized, and someone who never has counts as longer ago than anyone. Whoever organized the most recent meetup sits the next one out, and picking again never repeats the current pick.

The server makes the draw; the wheel, whose slices are as wide as each person's share, then spins round to the answer and throws confetti.

The pick stays on the page until the meetup is added to the history with its date, location and notes. Past meetups can be added, edited and deleted by hand.

## Locations

Each location has its own people, wheel, pick and history. London is at `/` and starts with the group's names; anyone with the passcode can add another, which gets its own page at `/<slug>` and starts empty. A location someone added can be removed again until it has a meetup in its history.

The count under the wheel is every spin across all locations, starting from the 34 made before it was counted.

## Analytics

Vercel Web Analytics is wired in (`<Analytics />` in `src/app/layout.tsx`), with one custom event, `wheel_spun`, which carries no names. It records only once Analytics is enabled for the project in the Vercel dashboard, and it uses no cookies.

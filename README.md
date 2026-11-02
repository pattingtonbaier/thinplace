# Thinplace

A private, gentle life RPG set in an inked Irish-folklore world. Every real thing you do gets logged at a place in your Hollow and earns XP for your Scáth.

This is **Milestone 1, the Bothy slice**: two-step intake, your Bothy, quick-log from anywhere, the evening journal with catch-up, habits, XP, levels, the seven B.O.N.F.I.R.E. embers and the bonfire, buildings that open by level, and local save with backup files that merge.

## Run it

No dependencies. You need [Bun](https://bun.sh).

```sh
bun test          # engine tests
bun run build.ts  # builds dist/ (the installable app) and dist/preview.html (one file)
```

Serve `dist/` from any static host over HTTPS (GitHub Pages works) to install it to a home screen.

## Layout

- `src/content.ts`: content as data (buildings, the log table, callings, looks).
- `src/engine.ts`: the XP engine. Everything is derived from logs, so two devices can merge.
- `src/store.ts`: the one versioned save in IndexedDB, plus backup files.
- `src/art.ts`: the Guiser, the bonfire and the buildings, drawn in code.
- `src/app.ts`: the screens.

## Next

Milestone 2: live device-to-device sync (QR pairing, encrypted, a relay that stores nothing), then the first monsters.

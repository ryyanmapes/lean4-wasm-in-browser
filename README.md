# The Natural Numbers Game in the browser

This site ships two versions of The Natural Numbers Game plus a Visual Lean capabilities demo:

- **Vanilla NNG4** — the original tactic-based Lean4Game experience.
- **Visual Lean** — the full NNG4 curriculum with direct, visual proof
  manipulation.

Both games use the same persistent Lean WebAssembly worker. Proof checking runs
locally in the browser; there is no hosted Lean server. The Lean environment is
loaded once and reused while the player moves between levels in any order.

Algorithm World is intentionally excluded from this release.

## Local development

The generated release assets are expected at:

```text
public/lean4game/                  Lean4Game client and NNG4 game data
public/visual-lean/runtime/        lean.js and lean.wasm
public/visual-lean/snapshots/      persistent NNG4 environment snapshot
public/lean-worker-persistent.worker.js
```

Start the site:

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`.

To rebuild and copy the Lean4Game client and NNG4 metadata from the sibling
`Lean4Game` checkout:

```bash
npm run sync-lean4game-client
```

The sync packages NNG4 and the Visual Capabilities Demo. It deliberately
excludes Algorithm World and the unreferenced duplicate public font tree.

## Production build

```bash
npm run build
```

The app requires these response headers because the Lean runtime uses pthreads
and `SharedArrayBuffer`:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

The generated runtime and snapshot are ignored by Git. GitHub Actions builds
them and places them inside the release container instead.

## Docker release

The release workflow builds a complete static image containing the launcher,
Lean4Game client, NNG4, VisualTest, Lean WASM runtime, and matching persistent
snapshot:

```text
.github/workflows/docker-release.yml
```

Before its first run:

1. Push the matching changes in `ryyanmapes/lean4game`. Its
   `build-browser-lean-libs.yml` workflow is called as the reusable snapshot
   builder.
2. Add `CAULI_ARTIFACT_TOKEN` to this repository's Actions secrets. It needs
   Actions read access to `cauli/lean4`.
3. Open **Actions → Browser game Docker release → Run workflow**.

The workflow publishes:

```text
ghcr.io/ryyanmapes/lean4-wasm-in-browser:latest
ghcr.io/ryyanmapes/lean4-wasm-in-browser:sha-<commit>
```

Run it with:

```bash
docker run --detach \
  --name natural-numbers-game \
  --restart unless-stopped \
  --publish 8080:80 \
  ghcr.io/ryyanmapes/lean4-wasm-in-browser:latest
```

The container is only a static nginx server. Lean proof checking still runs
locally in each player's browser. The included nginx configuration supplies
the COOP/COEP headers required by `SharedArrayBuffer`.

## Source layout

```text
src/                              small two-game release launcher
public/lean4game/                 generated Lean4Game application
public/visual-lean/               generated WASM runtime and snapshot
scripts/sync-lean4game-client.mjs release client/data synchronization
```

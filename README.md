# DSH Models Input Modalities

[![CI](https://github.com/DamonBao/dsh-models-input-modalities/actions/workflows/ci.yml/badge.svg)](https://github.com/DamonBao/dsh-models-input-modalities/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-green.svg)](#development)
[![pnpm](https://img.shields.io/badge/pnpm-11-orange.svg)](#development)

English | [简体中文](README.zh.md)

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) Web client plugin that adds a **Model capabilities** fold to every third-party (pi-ai) provider card on the **Settings → Models** page, declaring per model which inputs it accepts (whether images are allowed) and which reasoning levels it offers — the two per-model fields the page's own forms deliberately do not expose. Built against DSH `0.1.5-alpha.1` (peer range `>=0.1.5-alpha.1 <0.2.0`).

The providers themselves (provider ID, API base URL, protocol, API key, model list) are still created and edited entirely through the Models page forms; this plugin **pre-writes no provider configuration**.

## What it does

**Input modalities**

- **A three-way choice per model** — *Provider default*, *Text only*, or *Text and image*.
- **Exact adapter semantics** — *Text only* writes `input: [text]`, *Text and image* writes `input: [text, image]`, and *Provider default* removes the field so the row inherits the installed catalog's modalities, then the route's `defaultInput`.

**Reasoning levels**

- **A three-way choice per model** — *Catalog default*, *Not a reasoning model*, or *Declare levels*, which unfolds the seven levels (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`) as a tick box plus the wire spelling to send for it.
- **Exact adapter semantics** — a declared set writes the `reasoningEfforts` dict the adapter reads: every ticked level becomes a key whose value is the spelling dispatch sends, so `max: ultra` renames a level for a gateway with its own vocabulary, and an empty `off` stores a valueless `off:` — offered, and sent as no parameter at all. *Not a reasoning model* writes `reasoningEfforts: false`; *Catalog default* removes the field, keeping the installed catalog's capability, which for a hand-declared model is none.
- **This is what puts levels in the picker** — the composer's model picker lists exactly the levels a model declares, so a gateway model added by hand gains its Off/Low/Medium/High choices here and nowhere else in the UI.
- **Refused before the write** — the adapter rejects a declared set with no level beyond `off`, and any level but `off` with no wire value; the card names the offending row and keeps **Save** closed rather than answering a rejected settings mutation.

**Both claims**

- **One fold, one write** — the two claims share the fold because they share the stored `models` array: two folds would each write it and fence each other into conflicts.
- **Revision-fenced writes** — the whole `models` array is written back under the revision read when the fold was opened, with the same array semantics and conflict handling as the Models page's own cards: a concurrent edit surfaces a conflict notice and reloads instead of silently clobbering.
- **Field preservation** — every other field of every row survives verbatim, including fields this card never shows.
- **Follows the page live** — add or remove a model in the catalog above and the rows follow it in place: the fold listens for the pushed `settings/document-updated` invalidation of its own namespace, so nothing has to be closed and reopened. A commit that outruns a running read is caught by revision comparison and re-read until the fold is level. An unsaved draft is never overwritten, not even by a reopen — a change that lands mid-draft parks until the draft settles: revert the edits and the fold re-reads silently, or save and the revision fence refuses the raced write and reloads behind a conflict notice.
- **Localized UI** — English and Chinese follow the Web UI's locale.

## Usage

1. Install (see below) and restart `dsh web`.
2. **Settings → Models**: create your gateway provider with **Add custom provider** as usual, or open an existing one.
3. A **Model capabilities** fold appears under every third-party provider card; expand it and, per model, pick its input modalities and its reasoning state — for a model that reasons, choose *Declare levels* and tick the levels its endpoint serves.
4. Click **Save**. The claim lands in the user layer of `$DSH_HOME/settings.yaml`; the adapter picks it up on its next request — no restart required.

A model declared here writes exactly this (other fields of the row untouched):

```yaml
models:
  - id: acme-think
    contextWindow: 262144
    maxTokens: 32768
    input:
      - text
      - image
    reasoningEfforts:
      off: null      # offered, and sent as no parameter at all
      low: low
      medium: medium
      high: high
      max: ultra     # a gateway with its own vocabulary
```

## How it works

The plugin registers its component into the `settings.models.provider-card` extension seat exposed by the Models page (key `llm-pi-ai`, i.e. the cards of the whole pi-ai adapter family). On first expansion the fold reads the provider's stored `models` rows through the settings Remote, edits them locally, and writes the whole array back under the revision captured at read time — the same array semantics and conflict handling as the page's own cards (a concurrent edit prompts a conflict notice and a reload). All fields other than `input` and `reasoningEfforts` are preserved verbatim in every row.

The fold also subscribes to the Host's forwarded `settings/document-updated` event and filters it to `llm-pi-ai`, so the page's own model-list writes reach it without a remount. An open, clean fold re-reads silently, and keeps re-reading until its data is level with the newest announced revision; a closed one parks the notice and re-reads on the next expansion; one holding an unsaved draft parks the notice until the draft settles, so a reopen never costs edits. The card's own write is recognised by the revision it just committed and does not echo back as a refresh.

## Installation

Prerequisites: DeepSeek Harness (`dsh`) `>=0.1.5-alpha.1 <0.2.0` with the `web` profile.

**From npm:**

```sh
dsh plugin --profile web add @jcy2387/dsh-models-input-modalities
dsh web
```

**From a local checkout (development):**

```sh
git clone https://github.com/DamonBao/dsh-models-input-modalities.git
cd dsh-models-input-modalities
pnpm install && pnpm run build
dsh plugin --profile web add link:$PWD
```

- `link:` references this directory directly; after a change run `pnpm run build` and restart dsh. Without the `link:` prefix the install is a copy — update it with `dsh plugin --profile web update`.
- Uninstall: `dsh plugin --profile web remove @jcy2387/dsh-models-input-modalities`.

## Development

Requirements: Node.js `^22.19.0 || >=24.0.0` and pnpm `11.7`.

```sh
pnpm install
pnpm run check        # typecheck + test + build + publint, same as CI
```

Individual commands:

```sh
pnpm run typecheck    # host + client faces
pnpm test             # vitest suites over the pure row helpers
pnpm run build        # tsc d.ts + tsdown (lib/index.js & lib/client.cjs)
```

The client artifact is a self-contained bundle: React, Cordis, ui-slots, and ui-primitives are supplied by the Web shell, CSS Modules are inlined, and every other `@deepseek-ai/*` package is a type-only import (enforced by a build-time purity check).

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs the same gates on Node 22.22.0 and 24.x, verifies on tag pushes that the release tag matches the package version, audits the packed tarball's file list, and runs a consumer smoke test that installs the tarball into a scratch project (resolving the published peer ranges against the real registry) and imports every Node-side entry point.

### Release

Publishing is automated by the **Release** workflow ([`.github/workflows/release.yml`](.github/workflows/release.yml)), which runs whenever a GitHub Release is published. It requires the release tag to equal the package version (an optional `v` prefix is stripped), re-runs the full quality gates, packs the tarball, and publishes to npm with **provenance** via **OIDC trusted publishing** — no long-lived `NPM_TOKEN` secret is involved.

One-time setup: configure [trusted publishing](https://docs.npmjs.com/trusted-publishing) on npmjs.com for `@jcy2387/dsh-models-input-modalities`, authorizing repository `DamonBao/dsh-models-input-modalities` with workflow `release.yml` (no environment).

The dist-tag follows the GitHub Release's pre-release flag: a full release (checkbox unchecked) publishes under `latest` — including rc versions — while a pre-release publishes under the channel tag derived from the version (`0.1.1-alpha.2` → `alpha`, `0.1.1-rc.1` → `rc`). The workflow is idempotent — a version that already exists on npm is skipped, so a re-run after a partial failure republishes only what is missing.

A typical release:

```sh
# bump the version in package.json, then:
pnpm run check
VERSION="$(node -p "require('./package.json').version")"
git commit -am "release: $VERSION"
git tag "$VERSION"
git push origin main --tags
```

Then create and publish a GitHub Release for that tag.

Dependabot checks GitHub Actions dependencies weekly. npm version updates are intentionally not enabled for Dependabot: it regenerates `pnpm-lock.yaml` without the workspace overrides, so its PRs cannot pass `pnpm install --frozen-lockfile` — bump dependencies manually with `pnpm update`.

### Repository layout

```text
.
├─ src/
│  ├─ index.ts             # Host half: an intentionally empty apply (browser-only plugin)
│  ├─ model-row.ts         # the row vocabulary both claims share
│  ├─ image-input.ts       # pure row helpers for the per-model input claim
│  ├─ reasoning-efforts.ts # pure row helpers for the per-model reasoning claim
│  └─ client/              # Web half: the capability fold (controller, card, locales)
├─ tests/                  # vitest suites over the pure row helpers
├─ build/                  # tsdown preset for the self-contained client bundle
├─ .github/workflows/ci.yml       # validate + tarball audit + consumer smoke
├─ .github/workflows/release.yml  # npm publish on GitHub Release
├─ cordis.patch.yml
└─ README.md / README.zh.md
```

## Known limitations

- Dormant (not yet configured) provider cards do not render the fold; a freshly created custom provider appears **after** it is saved.
- Route-level knobs — `defaultInput`, the default `reasoning` level, and the `compat` switches — plus `modelOverrides` for built-in provider-catalog models are out of this plugin's scope; set them directly in `$DSH_HOME/settings.yaml`.
- A declared level is a claim, not a check: nothing asks the gateway whether it serves that level or honors that spelling, and how the level travels on the wire (`reasoning_effort`, a thinking budget, chat-template kwargs) is `compat`'s job. A level the endpoint refuses is refused by the provider, mid-turn.
- A level unticked and ticked again restarts from its default spelling — its own name, empty for `off` — rather than reviving what it carried before.
- In read-only settings deployments the fold is visible but cannot save.


## License

[MIT](LICENSE) © jcy2387
